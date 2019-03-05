import H from '../boot/hex.js'
import File from './file.js'

//
// 解压缩 ADT 数据
//
export default {
  unpack,
  load,
  room,
};


function load(file) {
  //TODO: 解析错误
  return unpack(File.open(file).buf);
}


//
// 解析房间图片, 带有遮掩图片
//
function room(sbuf) {
  const img = unpack_base(Uint16Array, sbuf, 320, 240);
  const mask = parseMaskBuf(img.nonbuf);

  if (mask) {
    img.bindMaskTexTo = bindMaskTexTo;
    img.maskw = mask.w;
    img.maskh = mask.h;
  }

  return img;

  function bindMaskTexTo(tex) {
    tex.bindTexImage(mask.buf, mask.w, mask.h, gl.GL_RED, gl.GL_UNSIGNED_BYTE);
    tex.setParameter(gl.GL_TEXTURE_MAG_FILTER, gl.GL_NEAREST);
  }
}


//
// 只解析图片, 并重建碎片
//
function unpack(srcbuf) {
  return unpack_base(Uint16Array, srcbuf, 320, 240);
}


//
// 如果缓冲区数据异常, 会导致 bio2_adt_unpack_img 崩溃.
// srcbuf - ArrayBuffer
// ImgType - 图像缓冲区类型, Uint16Array 表示两个字节一个像素
//
function unpack_base(ImgType, srcbuf, width, height) {
  const nonbuf = parseImgBuffer(ImgType, srcbuf);
  const imgbuf = rebuildMapPic(ImgType, nonbuf, width, height);

  return {
    // 解析完成并重建碎片的图片缓冲区
    buf : imgbuf,
    // 解析完成但没有重建碎片的图片缓冲区
    nonbuf,
    // 高度
    height,
    // 宽度
    width,
    // 绑定到纹理对象
    bindTexTo,
  };

  function bindTexTo(tex) {
    tex.bindTexImage(imgbuf, width, height, 
        gl.GL_RGBA, gl.GL_UNSIGNED_SHORT_1_5_5_5_REV);
    tex.setParameter(gl.GL_TEXTURE_MAG_FILTER, gl.GL_NEAREST);
  }
}


//
// ArrType - 输出缓冲区类型
// srcbuf - 带解析的缓冲区
//
function parseImgBuffer(ArrType, srcbuf) {
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
  return new ArrType(abuf);
}


//
// sbuf 图像 256 * (256+64)
// 第一部分为 256*240
// 第二部分被分割为 4 个小图片
// 两个小图片为一组逐行交叉. 上半部分图片比下半部分多出 8 像素.
// ImgType - 返回图像的缓冲区类型 (Uint16Array)
//
function rebuildMapPic(ImgType, sbuf, width, height) {
  let img = new ImgType(width * height);
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


function parseMaskBuf(sbuf) {
  const w = 256;
  const h = 256;
  const offy = 256 + 64 + 1;
  const beginOff = offy*w*2;
  // let x = 0, y = 0;

  if (beginOff >= sbuf.byteLength) {
    return null;
  }

  let buf = new Uint8Array(sbuf.buffer, sbuf.byteOffset + beginOff);
  // let buf = new Uint8Array(w*h);

  // for (;;) {
  //   buf[x + y*w] = ibuf[x +y*w];

  //   if (++x >= w) {
  //     x = 0;
  //     if (++y >= h) {
  //       break;
  //     }
  //   }
  // }
  return { buf, w, h };
}