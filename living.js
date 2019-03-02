//
// 会动的活物
//
export default {
  loadEmd,
};

import Mod2   from './model2.js'
import Draw   from '../boot/draw.js'
import Shader from './shader.js'
import Tim    from './tim.js'
import File   from './file.js'
import H      from '../boot/hex.js'
import Res    from '../boot/resource.js'
import Game   from '../boot/game.js'
import node   from '../boot/node.js'

const matrix = node.load('boot/gl-matrix.js');
let swap_buf = Res.localBuffer();


//
// 读取并解析敌人文件, 返回可绘制对象
// playId - 0 里昂, 1 克莱尔
// emdId - 文件id
//
function loadEmd(playId, emdId) {
  const key = `pl${playId}/emd${playId}/EM${playId}${emdId}`;
  const emdfile = key +'.emd';
  const texfile = key +'.tim';
  const components = [];

  let comp_len = 0;
  let currentSk;
  let currentAnim;
  // 动画索引
  let anim_idx = 0;
  // 动画帧数
  let anim_frame = 0;
  let anim_frame_length = 0;
  let frame_data;
  let a = 0;
  let speed = 300 /1000;

  init();
  setAnim(0, 0);

  return {
    texfile,
    draw,
    free,
    setAnim,
  };


  function setAnim(idx, frame) {
    anim_idx = idx % currentAnim.length;
    let anim_frms = currentAnim[anim_idx];
    anim_frame_length = anim_frms.length;
    anim_frame = frame % anim_frame_length;

    let anim = anim_frms[anim_frame];
    if (!anim) {
      console.warn("No pose frame", anim_idx, '=>', anim_frame);
      return false;
    }
    frame_data = currentSk.get_frame_data(anim.sk_idx);

    console.line("Anim", anim_idx, "Frame", anim_frame, 
      "Speed:", frame_data.spx, frame_data.spy, frame_data.spz, 
      "Offset", frame_data.x, frame_data.y, frame_data.z, "\t");
    return true;
  }


  function draw(u, t) {
    Shader.draw_living();
    
    if ((a+=u) >= speed) {
      a = 0;
      // if (frame_data.spx >= 0) {
        setAnim(anim_idx, anim_frame+1);
      // } else {
      //   if (--anim_frame < 0) anim_frame = anim_frame_length-1;
      //   setAnim(anim_idx, anim_frame);
      // }
    }

    let parent_data = [];
    currentSk[0].transform2(
      frame_data, frame_data.angle, components, parent_data);
  }


  function free() {
    for (let i=0; i<comp_len; ++i) {
      components[i].free();
    }
    components.length = 0;
  }


  function _add(t, q, i) {
    let sp = Game.createSprite(t, null, 'bone_rotate');
    sp.add(q);
    components[i] = sp;
  }


  function init() {
    console.debug("Load EMD", emdfile, '-', texfile);
    const mod = Mod2.emd(emdfile);
    const tex = Tim.parseStream(File.openDataView(texfile));
    currentSk = mod.sk1;
    currentAnim = mod.am1;
  
    for (let i=0; i<mod.mesh.length; ++i) {
      let t = mergeTriVertexBuffer(mod.mesh[i].tri, tex);
      let q = mergeQuaVertexBuffer(mod.mesh[i].qua, tex);
      _add(t, q, comp_len);
      ++comp_len;
    }
    console.debug("MODEL has", comp_len, "components");
  }
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
