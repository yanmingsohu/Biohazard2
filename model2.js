import File from './file.js'
import H    from '../boot/hex.js'
import node from '../boot/node.js'
import Shader from './shader.js'
import Tim  from './tim.js'

const matrix = node.load('boot/gl-matrix.js');
const {vec3, mat4} = matrix;

const VERTEX_LEN = 2 * 4; 
const NORMAL_LEN = VERTEX_LEN;
const TRI_IDX_LEN = 2 * 6;
const TRI_TEX_LEN = (1+1+2) * 3;
const QUA_IDX_LEN = 2 * 8;
const QUA_TEX_LEN = (1+1+2) * 4;

export default {
  emd,
  pld,
};


function _open(file) {
  const buf = File.dataViewExt(File.openDataView(file));
  const h_dir_offset = buf.ulong();
  const h_dir_count = buf.ulong();
  buf._offset = _offset;
  console.log(file, "DIR", h_dir_count, h_dir_offset);
  return buf;

  function _offset(typeIdx) {
    let r = buf.ulong(h_dir_offset + typeIdx * 4);
    // console.log("OFFSET h", r);
    return r;
  }
}


function emd(file) {
  const buf = _open(file);
  const obj = {};

  obj.mesh = mesh(buf, buf._offset(7));
  obj.sk1  = skeleton(buf,  buf._offset(2));
  obj.am1  = animation(buf, buf._offset(1));
  obj.sk2  = skeleton(buf,  buf._offset(4));
  obj.am2  = animation(buf, buf._offset(3));
  obj.sk3  = skeleton(buf,  buf._offset(6));
  obj.am3  = animation(buf, buf._offset(5));

  return obj;
}


function pld(file) {
  const buf = _open(file);
  const h_dir_offset = buf.ulong();
  const obj = {};

  obj.am1  = animation(buf, buf._offset(0));
  obj.sk1  = skeleton(buf, buf._offset(1));
  obj.mesh = mesh(buf, buf._offset(2));

  let timbuf = new DataView(buf.buffer, buf._offset(3));
  obj.tex = Tim.parseStream(timbuf);
  return obj;
}


function animation(buf, am_off) {
  // 从第一个元素计算数量
  // const count = buf.ushort(am_off);
  const aoff  = buf.ushort(am_off+2);
  const total = aoff >> 2;
  const ret = [];
  console.log("Anim", am_off, total);
  if (total <= 0) return;

  for (let i=0; i<total; ++i) {
    let ec = buf.ushort(am_off + i*4);
    let offset = buf.ushort();
    let group = ret[i] = [];
    buf.setpos(am_off + offset);

    for (let j=0; j<ec; ++j) {
      let t = buf.ulong();
      group[j] = {
        flag   : (t & 0xFFFFF800) >> 11,
        sk_idx : (t &      0x7FF),
      };
      // console.log('  -', i, j, group[j].flag, group[j].sk_idx, t);
    }
    // console.log(' >', i/4, group.length);
  }
  console.log("Anim count", ret.length);
  return ret;
}


class SkeletonBone {
  constructor(dat, i) {
    this.dat = dat;
    this.parent = null;
    this.idx = i;
    this.child = [];
    this._pos = [];
  }


  toString() {
    return JSON.stringify(this.dat);
  }


  transform2(bind_bone, alf, sprites, count) {
    const idx = this.idx;
    alf.index(idx);
    
    let boffset = count * 8;
    bind_bone[0 +boffset] = this.dat.x;
    bind_bone[1 +boffset] = this.dat.y;
    bind_bone[2 +boffset] = this.dat.z;
    bind_bone[3 +boffset] = 1;
    bind_bone[4 +boffset] = alf.x;
    bind_bone[5 +boffset] = alf.y;
    bind_bone[6 +boffset] = alf.z;
    bind_bone[7 +boffset] = alf.w;
    count++;

    Shader.bindBoneOffset(bind_bone, count);
    sprites[idx].draw();

    for (let i=0, len=this.child.length; i<len; ++i) {
      this.child[i].transform2(bind_bone, alf, sprites, count);
    }
  }
};


function skeleton(buf, sk_offset) {
  // console.log("\nSK");
  // buf.print(sk_offset, 500);
  const ref_val     = buf.ushort(sk_offset);
  const anim_val    = buf.ushort();
  const count       = buf.ushort();
  const size        = buf.ushort();
  const ref_offset  = ref_val + sk_offset;
  const anim_offset = anim_val + sk_offset;
  const bind        = {};
  const bone        = [];
  let   xyoff       = sk_offset + 8;

  if (ref_val > 0) {
    for (let i=0; i<count; ++i) {
      let sk = { child: [] };
      sk.x = buf.short(xyoff);
      sk.y = buf.short();
      sk.z = buf.short();
      xyoff += 6;

      // 子节点的数量
      let num_mesh = buf.ushort(ref_offset + 4*i);
      // 子节点引用数组偏移
      let ch_offset = buf.ushort() + ref_offset;
      // console.log('ch_offset', ch_offset, ref_offset);
      // 只有骨骼偏移, 复用绑定
      if (num_mesh >= count) {
        console.debug("No bone bind");
        return;
      }

      bone[i] = new SkeletonBone(sk, i);
      for (let m=0; m<num_mesh; ++m) {
        let chref = buf.byte(ch_offset + m);
        sk.child.push(chref);
        bind[chref] = bone[i];
      }
      // console.debug("SK", i, JSON.stringify(sk));
    }

    for (let i=0; i<count; ++i) {
      if (bind[i]) {
        bone[i].parent = bind[i];
        bind[i].child.push(bone[i]);
        // console.log(bone[i]);
      }
    }
  }

  //
  // 生化危机用的是关节骨骼模型, 有一个整体的 xyz 偏移和每个关节的角度.
  // 一个关节的转动会牵连子关节的运动
  //
  if (size) {
    bone.get_frame_data = 
      create_anim_frame_data(buf, anim_offset, size);
  } else {
    return null;
  }
  console.log("Bone count:", count, 'size:', size);
  return bone;
}


//
// 每个骨骼状态, 保护一组坐标, 一组速度和一组旋转数组,
// 旋转数组用 9 个字节保存2组旋转坐标.
// <防止闭包引用过多变量>
//
function create_anim_frame_data(buf, anim_offset, data_size) {
  const xy_size    = 2*6;
  const angle_size = data_size - xy_size;
  const MAX_ANGLE  = 0x0FFF;
  const RLEN       = parseInt(angle_size/9*2);
  const skdata     = { angle: [] };
  const PI2        = 2 * Math.PI;
  const angle_fn   = degrees; // radian & degrees
  const OFF_MASK   = 0x7ff;
  let curr_sk_idx  = -1;

  if (angle_size <= 0) {
    console.warn("NO more anim frame data");
    return;
  }

  skdata.angle = new Array(RLEN);
  for (let i=0; i<RLEN; ++i) {
    skdata.angle[i] = {x:0, y:0, z:0};
  }
  
  //
  // sk_index - 骨骼状态索引
  //
  return function get_frame_data(sk_index) {
    // 没有改变骨骼索引直接返回最后的数据
    if (curr_sk_idx === sk_index) return skdata;
    // 整体位置偏移量, 一个半字节有效
    let xy_off = anim_offset + data_size * sk_index;
    skdata.x = buf.short(xy_off)// & OFF_MASK;
    skdata.y = buf.short()// & OFF_MASK;
    skdata.z = buf.short()// & OFF_MASK;
    // 动画速度?
    skdata.spx = buf.short();
    skdata.spy = buf.short();
    skdata.spz = buf.short();

    compute_angle();
    // console.log(JSON.stringify(skdata), RLEN);
    curr_sk_idx = sk_index;
    return skdata;
  }

  function compute_angle() {
    let i = -1;
    while (++i < RLEN) {
      let r = skdata.angle[i];
      let a0 = buf.byte();
      let a1 = buf.byte();
      let a2 = buf.byte();
      let a3 = buf.byte();
      let a4 = buf.byte();
      // console.log('joint', i, a0, a1, a2, a3, a4);
      r.x = angle_fn(a0 + ((a1 & 0xF) << 8));
      r.y = angle_fn((a1 >> 4) + (a2 << 4));
      r.z = angle_fn(a3 + ((a4 & 0xF) << 8));
      // console.log(r.x, r.y, r.z);

      if (++i < RLEN) {
        r = skdata.angle[i];
        a0 = a4;
        a1 = buf.byte();
        a2 = buf.byte();
        a3 = buf.byte();
        a4 = buf.byte();
        // console.log('joint', i, a0, a1, a2, a3, a4);
        r.x = angle_fn((a0 >> 4) + (a1 << 4));
        r.y = angle_fn(a2 + ((a3 & 0xF) << 8));
        r.z = angle_fn((a3 >> 4) + (a4 << 4));
        // console.log(r.x, r.y, r.z);
      } else {
        return;
      }
    }
  }

  // 返回弧度
  function radian(n) {
    return (n/MAX_ANGLE) * PI2;
  }

  // 返回角度
  function degrees(n) {
    return (n/MAX_ANGLE) * 360;
  }
}


function mesh(buf, offset) {
  const length = buf.ulong(offset);
  const obj_count = buf.ulong(offset + 8) >> 1;
  const meshObj = [];
  const beginAt = buf.getpos();
  // console.log('beginAt', beginAt.toString(16), offset, 'count', obj_count);

  let o, c;

  for (let i=0; i<obj_count; ++i) {
    // 三角形 index_offset 为顶点索引, tex 数量与 index 数量相同
    let tri = {};
    o = buf.ulong() + beginAt;
    c = buf.ulong();
    tri.vertex = buildBuffer(Int16Array, o, c, VERTEX_LEN);

    o = buf.ulong() + beginAt;
    c = buf.ulong();
    tri.normal = buildBuffer(Int16Array, o, c, NORMAL_LEN);

    o = buf.ulong() + beginAt;
    c = buf.ulong();
    tri.index = buildBuffer(Uint16Array, o, c, TRI_IDX_LEN);

    o = buf.ulong() + beginAt;
    tri.tex = buildBuffer(Uint8Array, o, c, TRI_TEX_LEN);

    // 四边形
    let qua = {};
    o = buf.ulong() + beginAt;
    c = buf.ulong();
    qua.vertex = buildBuffer(Int16Array, o, c, VERTEX_LEN);

    o = buf.ulong() + beginAt;
    c = buf.ulong();
    qua.normal = buildBuffer(Int16Array, o, c, NORMAL_LEN);

    o = buf.ulong() + beginAt;
    c = buf.ulong();
    qua.index = buildBuffer(Uint16Array, o, c, QUA_IDX_LEN);

    o = buf.ulong() + beginAt;
    qua.tex = buildBuffer(Uint8Array, o, c, QUA_TEX_LEN);

    meshObj.push({ tri, qua });
  }

  function buildBuffer(T, offset, count, stride) {
    // console.debug("BUFFER", count, stride, 'AT:', offset.toString(16));
    return {
      // 缓冲区
      buf : buf.build(T, offset, count * stride),
      // 元素数量
      count,
      // 单个元素长度/元素间隔, 字节
      stride,
    };
  }

  return meshObj;
}
