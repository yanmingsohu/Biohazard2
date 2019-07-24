import Mod2   from './model2.js'
import Draw   from '../boot/draw.js'
import Shader from './shader.js'
import Tim    from './tim.js'
import File   from './file.js'
import H      from '../boot/hex.js'
import Res    from '../boot/resource.js'
import Game   from '../boot/game.js'
import node   from '../boot/node.js'
import Tool   from './tool.js'

const matrix = node.load('boot/gl-matrix.js');
const {quat} = matrix;
const {b2} = Tool;
let swap_buf = Res.localBuffer();

//
// 会动的活物
//
export default {
  // 读取文件
  loadEmd,
  // 用游戏内部编号读取模型
  fromEmd,
  fromPld,
  fromPlw : Mod2.fromPlw,
  createSprites,
};


// 处理线性动画
class AngleLinearFrame {
  constructor() {
    this.curr = [];
    this.prev = [];
    this.time = 1;
    this.qa = quat.create();
    this.qb = quat.create();
    this.w = 1;
  }

  // percentage 从 0~1, 1表示完成
  setPercentage(percentage) {
    if (percentage < 0) percentage = 0;
    else if (percentage > 1) percentage = 1;
    this.time = percentage;
  }

  setCurrent(frame_data) {
    const a = this.curr, b = frame_data.angle;
    let c, x;
    for (let i=0, len=b.length; i<len; ++i) {
      c = b[i], x = a[i];
      if (!x) x = a[i] = quat.create();
      else quat.identity(x);
      //!这种方法结果错误, 动画奇葩
      // quat.fromEuler(a[i], c.x, c.y, c.z);
      quat.rotateX(x, x, c.x);
      quat.rotateY(x, x, c.y);
      quat.rotateZ(x, x, c.z);
    }
  }

  reset() {
    for (let i=this.prev.length-1; i>=0; --i) {
      this.prev[i][0] = 0;
      this.prev[i][1] = 0;
      this.prev[i][2] = 0;
      this.prev[i][3] = 0;
    }
  }

  // 获取 x,y,z 之前先调用
  index(boneIdx) {
    let a = this.prev[boneIdx];
    if (!a) {
      a = this.prev[boneIdx] = [0,0,0,0];
    }
    quat.slerp(a, a, this.curr[boneIdx], this.time);
    
    this.x = a[0];
    this.y = a[1];
    this.z = a[2];
    this.w = a[3];
    return a;

    // 欧拉角(测试用)
    // this.x = this.curr[boneIdx].x * Math.PI / 180;
    // this.y = this.curr[boneIdx].y * Math.PI / 180;
    // this.z = this.curr[boneIdx].z * Math.PI / 180;
    // this.w = 0;
  }
};


function fromEmd(playId, emdId) {
  let e = emdId.toString(16);
  let p = playId ? '1' : '0';
  if (emdId < 0x10) throw new Error("bad emd id");
  return loadEmd(p, e);
}


// _modid: 0里昂, 1克莱尔, 2里昂(武器袋), 3克莱尔(武器袋)
// 4里昂受伤, 5克莱尔(无外套), 6里昂受伤(武器袋), 7克莱尔无外套(武器袋)
// 8里昂(无外套), 9克莱尔暴走族, 10里昂暴走族, 11克里斯, 12幸存者
// 13豆腐, 14艾达, 15雪莉,  'CH'后缀是测试模型
function fromPld(playId, _modid = 0) {
  // PL00CH.PLD PL00.PLD
  let file = 'PL'+ playId +'/PLD/PL'+ b2(_modid) +'.PLD'; 
  let mod = Mod2.pld(file);
  console.debug("Load PLD", file);
  return Living(mod, mod.tex);
}


//
// 读取并解析敌人文件, 返回可绘制对象
// playId - 0 里昂, 1 克莱尔
// emdId - 文件id, 如果是数字应该转换为 16 进制字符串
//
function loadEmd(playId, emdId) {
  const key = `pl${playId}/emd${playId}/EM${playId}${emdId}`;
  const emdfile       = key +'.emd';
  const texfile       = key +'.tim';
  
  console.debug("Load EMD", emdfile, '-', texfile);
  const mod = Mod2.emd(emdfile);
  const tex = Tim.parseStream(File.openDataView(texfile));

  const thiz = Living(mod, tex);
  thiz.texfile = texfile;
  return thiz;
}


function Living(mod, tex) {
  const components    = [];
  const alf           = new AngleLinearFrame();
  const liner_pos     = {x:0, y:0, z:0};
  const abs_pos       = {x:0, y:0, z:0};
  const liner_pos_tr  = Game.Pos3Transition(liner_pos, 0);
  const move_speed    = [0,0,0];
  let   DEF_SPEED     = 45;

  // 动画索引
  let anim_idx = 0;
  // 动画帧数
  let anim_frame = 0;
  let anim_dir = 0;
  let frame_data;
  let a = 0;
  let speed = DEF_SPEED;
  let pose;
  let whenAnimEnd = 1;
  let animCallBack;
  let animSound;

  createSprites(mod.mesh, tex, components);
  setAnim(0, 0);
  _nextFrame(0);

  return {
    draw,
    free,
    // 设置动画片段,  动作: 11.跑动, 12.休息, 13.残疾, 14.残疾跑动
    setAnim,
    setFrame,
    // 设置动画的播放方向, 1正向播放, -1反向播放, 0停止
    setDir,
    where,
    setSpeed,
    setAnimEndAct,
    setAnimSound,
    // 返回当前动作的总帧数
    getPoseFrameLength,
    getMD,
    // 每帧动画, 移动的距离不同, 返回的数组反映移动距离
    // 返回的对象每帧都会更新.
    getMoveSpeed,
    moveImmediately,
  };


  function getMD() {
    return mod;
  }


  function getMoveSpeed() {
    return move_speed;
  }


  function setAnimSound(s) {
    animSound = s;
  }


  // 值越大, 播放速度越慢
  function setSpeed(s) {
    DEF_SPEED = s;
  }


  function where() {
    return components[0].where();
  }


  function setDir(d) {
    anim_dir = d;
  }


  function getPoseFrameLength() {
    return pose ? pose.length : 0;
  }


  function setFrame(f) {
    anim_frame = f;
  }


  function setAnim(idx, frame, end=1) {
    whenAnimEnd = end;

    anim_idx = idx; // % mod.poseCount();
    let tmp = mod.getPose(idx);
    if (!tmp) {
      console.warn("No POSE", idx);
      return false;
    }
    pose = tmp;
    if (frame >= 0) anim_frame = frame;
    a = 0;
    return true;
  }


  // 
  // 动画到结尾后, 0 停止, 1 循环, 
  //   2 停止并调用函数
  //   3 循环并调用函数
  //
  function setAnimEndAct(id, func) {
    whenAnimEnd = id;
    animCallBack = func;
  }


  function _end() {
    switch (whenAnimEnd) {
      case 0:
        anim_dir = 0;
        return false;
      case 1:
        return true;
      case 2:
        anim_dir = 0;
        animCallBack();
        return false;
      case 3:
        animCallBack();
        return true;
    }
  }


  function show_info() {
    console.line("Anim", Tool.d4(anim_idx), "Frame", Tool.d4(anim_frame), 
        "Offset", Tool.d4(frame_data.x), 
        Tool.d4(frame_data.y), Tool.d4(frame_data.z), 
        "Speed:", Tool.d4(frame_data.spx), 
        Tool.d4(frame_data.spy), Tool.d4(frame_data.spz), "\t");
  }


  //
  // 立即把模型移动到当前动画帧指定的位置(默认线性插值)
  //
  function moveImmediately() {
    liner_pos.x = frame_data.x;
    liner_pos.y = frame_data.y;
    liner_pos.z = frame_data.z;
  }


  function _nextFrame(frame) {
    if (frame < 0) {
      if (!_end()) return false;
      anim_frame = pose.length -1;
    } else if (frame >= pose.length) {
      if (!_end()) return false;
      anim_frame = 0;
    } else {
      anim_frame = parseInt(frame);
    }

    let frm = pose[anim_frame];
    if (!frm) {
      console.warn("No pose frame", anim_frame);
      return false;
    }

    frame_data = pose.get_frame_data(frm.sk_idx);
    alf.setPercentage(0);
    alf.setCurrent(frame_data);
    move_speed[0] = frame_data.spx;
    move_speed[1] = frame_data.spy;
    move_speed[2] = frame_data.spz;
    move_speed[3] = frm.flag;
    abs_pos.x = frame_data.x;
    abs_pos.y = frame_data.y + mod.getHeight();
    abs_pos.z = frame_data.z;

    if (frm.flag && animSound) {
      animSound.play(frm.flag);
    }
    // show_info();
    return true;
  }


  function draw(u, t) {
    u *= 1000;
    a += u;
    Shader.draw_living();
    const sp = speed;
    
    // console.log(a/speed, '\t', a, '\t', speed);
    alf.setPercentage(u/sp);
    liner_pos_tr.line(u, abs_pos);

    // console.line(liner_pos.y);
    Shader.setAnimOffset(liner_pos.x, liner_pos.y, liner_pos.z);
    mod.transformRoot(alf, components, 0);
    
    if (a >= sp) {
      a = 0;
      if (!_nextFrame(anim_frame + anim_dir)) return;
      // speed = DEF_SPEED/* - frame_data.spx/2000*/;
      liner_pos_tr.speed(sp);
    }
  }


  function free() {
    for (let i=0; i<components.length; ++i) {
      components[i].free();
    }
    components.length = 0;
  }
}


function createSprites(_mesh, _tex, _appendto) {
  for (let i=0; i<_mesh.length; ++i) {
    let t = mergeTriVertexBuffer(_mesh[i].tri, _tex);
    let q = mergeQuaVertexBuffer(_mesh[i].qua, _tex);
    let sp = Game.createSprite(t, null, 'bone_rotate');
    sp.add(q);
    _appendto.push(sp);
  }
  console.debug("MODEL has", _appendto.length, "components");
}


function mergeTriVertexBuffer(tri, tex) {
  return mergeVertexBuffer(tri, tex, 3, false);
}


function mergeQuaVertexBuffer(qua, tex) {
  return mergeVertexBuffer(qua, tex, 6, true);
}


//
// (三角形)将顶点坐标, 法线, 纹理坐标合并到一个缓冲区, 
// 利用索引建立完整的顶点数据 (抛弃索引)
// 内存布局:
// | vertex | normal | texture coordinates |
// | x y z  | x y z  | u  v                |
// | 3      | 3      | 2                   |
//
function mergeVertexBuffer(tri, tex, v_multiple, isuqa) {
  const stride  = 3 + 3 + 2;
  const vCount  = tri.index.count;
  const obuf = swap_buf.float32(stride * vCount * v_multiple);
  // 没有对字节序做特殊处理
  const ibuf = tri.index.buf;
  const vbuf = tri.vertex.buf;
  const tbuf = tri.tex.buf;
  const nbuf = tri.normal.buf;
  const vfunc = isuqa ? qua_v : tri_v;
  const w = tex.width, h = tex.height;
  const off_unit = tex.width / tex.nb_palettes;
  
  let offx = 0;
  
  for (let i=0; i<vCount; ++i) {
    vfunc(i);
  }

  let bdo = Shader.createBasicDrawObject();
  bdo.addVertices(obuf, vCount * v_multiple);
  bdo.setAttr({ index: 0, vsize: 3, type: gl.GL_FLOAT, stride: stride*4 });
  bdo.setAttr({ index: 1, vsize: 3, type: gl.GL_FLOAT, stride: stride*4, offset: 3*4 });
  bdo.setAttr({ index: 2, vsize: 2, type: gl.GL_FLOAT, stride: stride*4, offset: 6*4 });
  tex.bindTexTo(bdo.getTexture());
  return bdo;
  
  // H.printFloat(obuf, 100, 8);


  function tri_v(i) {
    let ii = i * 6; // 三角形型索引, 6个元素为一组
    let ui = i * 12;
    let oi = i * stride * 3;
    offx = off_unit * (tbuf[ui+6] & 3);

    v(oi, ibuf[ii+1], ibuf[ii  ], ui  ); oi+=stride // 0
    v(oi, ibuf[ii+3], ibuf[ii+2], ui+4); oi+=stride // 1
    v(oi, ibuf[ii+5], ibuf[ii+4], ui+8); // 2
  }


  function qua_v(i) {
    let ii = i * 8;
    let ui = i * 16;
    let oi = i * stride * 6;
    offx = off_unit * (tbuf[ui+6] & 3);

    v(oi, ibuf[ii+1], ibuf[ii  ], ui   ); oi+=stride // 0
    v(oi, ibuf[ii+3], ibuf[ii+2], ui+4 ); oi+=stride // 1
    v(oi, ibuf[ii+7], ibuf[ii+6], ui+12); oi+=stride // 3
    
    v(oi, ibuf[ii+1], ibuf[ii  ], ui   ); oi+=stride // 0
    v(oi, ibuf[ii+5], ibuf[ii+4], ui+8 ); oi+=stride // 2
    v(oi, ibuf[ii+7], ibuf[ii+6], ui+12); // 3
  }


  // 作为参考, 无用
  function p(ui) {
    // 透明通道似乎用到了 clutid
    let clutid = (tbuf[ui+2] | (tbuf[ui+3] << 8));
    page = (tbuf[ui+6] | (tbuf[ui+7] << 8));
    console.log(clutid);
    offx = off_unit * (tbuf[ui+6] & 3);
  }


  function v(oi, vi, ni, ui) {
    // vertex 
    vi = vi * 4;
    obuf[oi  ] = vbuf[vi  ];
    obuf[oi+1] = vbuf[vi+1];
    obuf[oi+2] = vbuf[vi+2];
    // normal
    ni = ni * 4;
    obuf[oi+3] = nbuf[ni  ];
    obuf[oi+4] = nbuf[ni+1];
    obuf[oi+5] = nbuf[ni+2];
    // UV coordinates
    obuf[oi+6] = (tbuf[ui  ] + offx)/w;
    obuf[oi+7] = (tbuf[ui+1])/h;
  }
}
