import h from '../boot/hex.js'

export default {
  parseStream,
};

//
// 解析二进制数据流为图像缓冲区, 图像缓冲区使用固定格式,
// buf -- DataView
//
function parseStream(buf) {
  // h.printHex(new Uint8Array(buf.buffer, buf.byteOffset, 100));
  const head = buf.getUint32(0, true);
  if (head != 0x10) {
    throw new Error("bad TIM stream");
  }

  const type = buf.getUint32(4, true);
  const offset = buf.getUint32(8, true);
  const pal_x = buf.getUint16(12, true);
  const pal_y = buf.getUint16(14, true);
  const palette_colors = buf.getUint16(16, true);
  const nb_palettes = buf.getUint16(18, true);
  let vi = 20;

  console.debug('TIM palettes color', palette_colors, 'nb', nb_palettes, 
    'pal-x', pal_x, 'pal-y', pal_y, 'offset', offset);

  // 调色板被纵向平均应用到图像上
  const palettes = [];
  for (let p = 0; p<nb_palettes; ++p) {
    palettes[p] = new Uint16Array(buf.buffer, buf.byteOffset + vi, palette_colors);
    vi += palette_colors * 2;
    // console.debug("Palette", p);
    // h.printHex(palettes[p]);
  }

  const width = _width(buf.getUint16(vi + 8, true));
  const height = buf.getUint16(vi + 10, true);
  const wxh = width * height;
  const byteLength = wxh + vi + 12;

  // if (buf.getUint16(vi, true) - 12 != width * height) 
  //   throw new Error("bad size");
  console.debug("Tim pic Size:", wxh, '[', width, 'x', height, ']');

  const buffer_index_offset = buf.byteOffset + offset + 20;
  const imgbuf = new Uint16Array(wxh); // new Float32Array(wxh *4);
  const set_color = _set_short; // _set_float
  fill_image(0);

  return {
    // 图像缓冲区
    buf : imgbuf,
    // 调色板数量/图像分割数量
    nb_palettes,
    // 像素高度
    height,
    // 像素宽度
    width,
    // TIM 数据块的总长度
    byteLength,
    // 作为贴图绑定到模型
    bindTexTo,
  };


  function bindTexTo(draw) {
    draw.bindTexImage(imgbuf, width, height, 
        gl.GL_RGBA, gl.GL_UNSIGNED_SHORT_1_5_5_5_REV);
  }


  // 留作备用
  // A1B5G5R5 to Float{r,g,b,a}
  function _set_float(pixel, color /* A1B5G5R5 */) {
    const i = pixel * 4;
    /* R */ imgbuf[i] = (0x1F & color) / 0x1F;
    /* G */ imgbuf[i+1] = ((0x03E0 & color) >> 5) / 0x1F;
    /* B */ imgbuf[i+2] = ((0x7C00 & color) >> 10) / 0x1F;
    /* A */ imgbuf[i+3] = (0x0F000 & color) >> 15;
  }


  function _set_short(pixel, color) {
    imgbuf[pixel] = color;
  }


  function _width(w) {
    switch (type) {
      case 0x02: return w;      // 16bit 
      case 0x08: return w << 2; //  4bit * 4
      case 0x09: return w << 1; //  8bit * 2
    }
  }


  //
  // 切换调色板, 使用调色板颜色重新填充 imbuf 缓冲区.
  //
  function fill_image() {
    switch (type) {
      case 0x02:
        console.debug("16 bit color");
        bit16color();
        break;

      case 0x08:
        console.debug("4 bit color");
        bit4color();
        break;

      case 0x09:
        console.debug("8 bit color");
        bit8color();
        break;

      default:
        throw new Error("unsupport color type "+ type);
    }
  }


  function bit16color() {
    const index = new Uint16Array(buf.buffer, buffer_index_offset, wxh);
    for (let i=0; i<wxh; ++i) {
      set_color(i, index[i]);
    }
  }


  function bit4color() {
    const index = new Uint8Array(buf.buffer, buffer_index_offset, wxh/2);
    const pl = parseInt(width / palettes.length);

    for (let i=0; i<wxh; i+=2) {
      let pal = palettes[parseInt(i % width / pl)];
      let color = index[i/2];
      let c1 = pal[(color & 0xF0) >> 4];
      set_color(i, c1);
      let c2 = pal[color & 0x0F];
      set_color(i+1, c2);
    }
  }


  function bit8color() {
    const index = new Uint8Array(buf.buffer, buffer_index_offset, wxh);
    const pl = parseInt(width / palettes.length);

    for (let i=0; i<wxh; ++i) {
      let pal = palettes[parseInt(i % width / pl)];
      if (pal) {
        let _a = index[i];
        set_color(i, pal[_a]);
      } else {
        console.error(i, width, pl, i % width / pl, pal, palettes.length);
      }
    }
  }
}