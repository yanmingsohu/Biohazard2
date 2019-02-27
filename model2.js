import File from './file.js'
import H from '../boot/hex.js'

const IDX_MESH = 7;
const IDX_SK_1 = 2;
const IDX_SK_2 = 4;
const IDX_SK_3 = 6;
const IDX_ANIM_1 = 1;
const IDX_ANIM_2 = 3;
const IDX_ANIM_3 = 5;

const VERTEX_LEN = 2 * 4; 
const NORMAL_LEN = VERTEX_LEN;
const TRI_IDX_LEN = 2 * 6;
const TRI_TEX_LEN = (1+1+2) * 3;
const QUA_IDX_LEN = 2 * 8;
const QUA_TEX_LEN = (1+1+2) * 4;

export default {
  emd,
};


function emd(file) {
  const buf = File.dataViewExt(File.openDataView(file));
  const h_dir_offset = buf.ulong();
  const h_dir_count = buf.ulong();
  const obj = {};

  obj.mesh = mesh(buf, _offset(IDX_MESH));
  obj.sk1  = skeleton(buf, _offset(IDX_SK_1));
  obj.am1  = animation(buf, _offset(IDX_ANIM_1));
  obj.sk2  = skeleton(buf, _offset(IDX_SK_2));
  obj.am2  = animation(buf, _offset(IDX_ANIM_2));
  obj.sk3  = skeleton(buf, _offset(IDX_SK_3));
  obj.am3  = animation(buf, _offset(IDX_ANIM_3));

  return obj;

  function _offset(typeIdx) {
    let r = buf.ulong(h_dir_offset + typeIdx * 4);
    // console.log("OFFSET h", r);
    return r;
  }
}


function animation(buf, am_off) {
  // console.log("Anim", '['+ am_off +']');
  const count = buf.ushort(am_off);
  const ret = [];

  for (let i=0; i<count; i += 4) {
    let ec = buf.ushort(am_off + i);
    let offset = buf.ushort();
    let group = ret[i/4] = [];
    buf.setpos(am_off + offset);

    for (let j=0; j<ec; ++j) {
      let t = buf.ulong();
      group[j] = {
        f: (t & 0xFFFFF000) >> 11,
        d: (t & 0xFFF),
      };
      // console.log('  -', group[j].f, group[j].d);
    }
    console.log(' >', i/4, group.length);
  }
  console.log("Anim count", ret.length);
  return ret;
}


class SkeletonBone {
  constructor(dat, parent) {
    this.dat = dat;
    this.parent = parent;
  }

  toString() {
    return JSON.stringify(this.dat);
  }

  get x() {
    if (this.parent) {
      return this.parent.x + this.dat.x;
    }
    return this.dat.x;
  }

  get y() {
    if (this.parent) {
      return this.parent.y + this.dat.y;
    }
    return this.dat.y;
  }

  get z() {
    if (this.parent) {
      return this.parent.z + this.dat.z;
    }
    return this.dat.z;
  }
};


function skeleton(buf, sk_offset) {
  // console.log("\nSK");
  // buf.print(sk_offset, 500);
  const ref_val = buf.ushort(sk_offset);
  const anim_val = buf.ushort();
  const ref_offset = ref_val + sk_offset;
  const anim_offset = anim_val + sk_offset;
  const count = buf.ushort();
  const size = buf.ushort();
  const xyoff = sk_offset + 8;
  const bind = {};
  const bone = [];

  if (ref_val > 0) {
    for (let i=0; i<count; ++i) {
      let sk = { child: [] };
      sk.x = buf.short(xyoff + 6*i);
      sk.y = buf.short();
      sk.z = buf.short();

      let num_mesh = buf.ushort(ref_offset + 4*i);
      let ch_offset = buf.ushort() + ref_offset;
      // console.log(ch_offset);

      bone[i] = new SkeletonBone(sk);
      for (let m=0; m<num_mesh; ++m) {
        let chref = buf.byte(ch_offset + m);
        sk.child.push(chref);
        bind[chref] = bone[i];
      }
    }

    for (let i=0; i<count; ++i) {
      bone[i].parent = bind[i];
      // console.log(bone[i]);
    }
  }

  if (size) {
    let skdata = {};
    buf.print(anim_offset, size);
    skdata.x_offset = buf.short(anim_offset);
    skdata.y_offset = buf.short();
    skdata.z_offset = buf.short();
    skdata.x_speed = buf.short();
    skdata.y_speed = buf.short();
    skdata.z_speed = buf.short();
    console.log(JSON.stringify(skdata));
  } else {
    return null;
  }
  console.log("Bone count:", count, 'size:', size);
  return bone;
}


function mesh(buf, offset) {
  const length = buf.ulong(offset);
  const obj_count = buf.ulong(offset + 8) >> 1;
  const meshObj = [];
  const beginAt = buf.getpos();
  // console.log('beginAt', beginAt.toString(16), 'count', obj_count);

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
