//
// 会动的活物
//
export default {
  loadEmd,
};

import Mod2 from './model2.js'
import Draw from '../boot/draw.js'


//
// 读取并解析敌人文件, 返回可绘制对象
// playId - 0 里昂, 1 克莱尔
// emdId - 文件id
//
function loadEmd(playId, emdId, sp) {
  const emdfile = `pl${playId}/emd${playId}/EM${playId}${emdId}.emd`;
  const texfile = `pl${playId}/emd${playId}/EM${playId}${emdId}.tim`;
  const mod = Mod2.emd(emdfile);
  const arr = [];

  for (let i=0; i<mod.mesh.length; ++i) {
    let idxbuf = buildIndexBuffer(mod.mesh[i].tri.index);
    let vertex = mod.mesh[i].tri.vertex;
    let bdo = Draw.createBasicDrawObject(sp);
    bdo.addVerticesElements(vertex.buf, idxbuf);
    bdo.setAttr({ index: 0, vsize: 4, type: gl.GL_SHORT, stride: vertex.stride });
    // bdo.setMode(gl.GL_POINTS);
    // window.add(bdo);
    arr.push(bdo);

    bdo = Draw.createBasicDrawObject(sp);
    vertex = mod.mesh[i].qua.vertex;
    idxbuf = buildIndexBuffer2(mod.mesh[i].qua.index);
    bdo.addVerticesElements(vertex.buf, idxbuf);
    bdo.setAttr({index: 0, vsize: 4, type: gl.GL_SHORT, stride: vertex.stride });
    bdo.setMode(gl.GL_QUADS);
    // window.add(bdo);
    arr.push(bdo);
  }
  return {
    draw() {
      for (let i=0; i<arr.length; ++i) {
        arr[i].draw();
      }
    },
  };
}


function buildIndexBuffer(ibuf) {
  // console.log("Index", ibuf.count);
  const LEN = ibuf.count * 3;
  const obuf = new Uint32Array(LEN); 
  const src0 = ibuf.buf;

  for (let oi=0; oi<LEN; oi+=3) {
    var bi = oi << 1;
    obuf[oi]   = src0[bi+1];
    obuf[oi+1] = src0[bi+3];
    obuf[oi+2] = src0[bi+5];
  }
  return obuf;
}


function buildIndexBuffer2(ibuf) {
  // console.log("Index", ibuf.count);
  const LEN = ibuf.count * 4;
  const obuf = new Uint32Array(LEN); 
  const src0 = ibuf.buf;

  for (let oi=0; oi<LEN; oi+=4) {
    var bi = oi << 1;
    obuf[oi]   = src0[bi+1];
    obuf[oi+1] = src0[bi+3];
    obuf[oi+2] = src0[bi+7];
    obuf[oi+3] = src0[bi+5];
  }
  return obuf;
}