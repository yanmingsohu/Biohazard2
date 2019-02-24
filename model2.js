import File from './file.js'
import H from '../boot/hex.js'

const MESH_IDX = 7;

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
  const mesh_offset = buf.ulong(h_dir_offset + MESH_IDX * 4);
  const obj = {};

  obj.mesh = mesh(buf, mesh_offset);
  return obj;
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
