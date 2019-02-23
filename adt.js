import H from '../boot/hex.js'
import File from './file.js'

//
// 解压缩 ADT 数据
//
export default {
  unpack,
  load,
};


function load(file) {
  //TODO: 解析错误
  return unpack(File.open(file).buf);
}



//
// 如果缓冲区数据异常, 会导致 bio2_adt_unpack_img 崩溃.
// srcbuf - ArrayBuffer
//
function unpack(srcbuf) {
  const width  = 320;
  const height = 240;
  const imgbuf = rebuild(parseImg(srcbuf));

  return {
    buf : imgbuf,
    height,
    width,
    bindTexTo,
  };

  function parseImg(srcbuf) {
    let skip_buf;
    if (isNaN(srcbuf.byteOffset)) {
      // srcbuf is ArrayBuffer
      skip_buf = new Uint8Array(srcbuf, 4);
    } else {
      // srcbuf is TypedBuffer, 
      // 从字节视图取出 ArrayBuffer 重建偏移视图.
      skip_buf = new Uint8Array(srcbuf.buffer, 
        srcbuf.byteOffset + 4, srcbuf.byteLength - 4);
    }
    let abuf = special.bio2_adt_unpack_img(skip_buf);
    return new Uint16Array(abuf);
  }

  //
  // sbuf 图像 256 * (256+64)
  // 第一部分为 256*240
  // 第二部分被分割为 4 个小图片
  // 两个小图片为一组逐行交叉. 上半部分图片比下半部分多出 8 像素.
  //
  function rebuild(sbuf) {
    let img = new Uint16Array(width * height);
    let offx = 0;
    let offy = 256;
    let h = 0;

    for (let v = 0; v < height; ++v) {
      let i = 0;
      for (i=0; i<256; ++i) {
        img[i + v*width] = sbuf[i + v*256];
      }
      if (v < 128) {
        offx = ((0x01 & v) << 7);
        h = 64;
      } else {
        offx = ((0x01 & v) << 7) + 64;
        h = 60;
      }
      for (; i<width; ++i, ++offx) {
        img[i + v*width] = sbuf[offx + 256 * offy];
      }
      if (1 & v) {
        ++offy;
        if (offy >= 256 + h) offy = 256;
      }
      // console.log(offx, offy);
    }
    return img;
  }

  function bindTexTo(tex) {
    tex.bindTexImage(imgbuf, width, height, 
      gl.GL_RGBA, gl.GL_UNSIGNED_SHORT_1_5_5_5_REV);
    
    tex.setParameter(gl.GL_TEXTURE_MAG_FILTER, gl.GL_NEAREST);
  }
}