//
// 解压缩 ADT 数据
//
export default {
  unpack,
};

import H from '../boot/hex.js'


//
// 如果缓冲区数据异常, 会导致 bio2_adt_unpack_img 崩溃.
//
function unpack(srcbuf) {
  console.log("unpack", srcbuf.byteOffset, srcbuf.byteLength);
  // H.printHex(srcbuf, null, 100);
  let width = 256;
  let height = 240 + 100;
  let ibuf = new Uint8Array(srcbuf.buffer, 
      srcbuf.byteOffset + 4, srcbuf.byteLength - 4);
  let abuf = special.bio2_adt_unpack_img(ibuf);
  let obuf = new Uint16Array(abuf);

  console.log("XX", obuf.length, height, width, obuf.length/width);
  // H.printHex(obuf, null, 100);

  return {
    buf : obuf,
    height,
    width,
    bindTexTo,
  };

  function bindTexTo(draw) {
    draw.bindTexImage(obuf, width, height, 
      gl.GL_RGBA, gl.GL_UNSIGNED_SHORT_1_5_5_5_REV);
  }
}