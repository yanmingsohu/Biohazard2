//
// https://github.com/pmandin/reevengi-tools/wiki/.RDT-%28Resident-Evil-2%29
//
import hex from '../boot/hex.js'
import Script from './script.js'
import Tim from './tim.js'
import File from './file.js'

export default {
  load,
  from,
};


//
// 按照编号读取
//
function from(stage, room, player) {
  let r = room.toString(16);
  if (room < 0x10) r = '0'+r;

  let file = [
    'Pl', player, '/Rdt/ROOM', 
    stage.toString(16), r, player, '.RDT'
  ].join('');

  return load(file);
}


//
// 直接从文件读取
//
function load(file) {
  debug("Load RDT, room dest file", file);
  if (!file.toLowerCase().endsWith('.rdt'))
    throw new Error("Not RDT file "+ file);

  const filebuf = File.open(file).buf;
  let obj = {
    state : parseInt(file.substr(file.length-8, 1), 16),
    room  : parseInt(file.substr(file.length-7, 2), 16),
  };

  let Head = new Uint8Array(filebuf, 0, 8);
  let camera_count = Head[1];
  let num_obj10 = Head[2];
  debug(Head, 'obj7', camera_count, 'obj10', num_obj10);

  let off = readOffset(filebuf);
  readCameraPos(filebuf, off, obj, camera_count);
  readCameraSwitch(filebuf, off, obj);
  readLight(filebuf, off, obj);
  readVAB(filebuf, off, obj);
  readSpritesAnim(filebuf, off, obj);
  readSpritesTim(filebuf, off, obj);

  if (num_obj10) {
    readTim(filebuf, off, obj);
  }
  if (off.init_script > 0) {
    obj.init_script = readScript(filebuf, off.init_script);
  }
  if (off.room_script > 0) {
    obj.room_script = readScript(filebuf, off.room_script);
  }
  return obj;
}


function readScript(filebuf, off) {
  // debug("read script from", off);
  let script_buf = new DataView(filebuf, off);
  // hex.printHex(new Uint8Array(filebuf, off, 0x20));
  return Script.compile(script_buf);
}


function readVAB(filebuf, off, ret) {
  // debug("VAB", vab);
  let buf = new Uint8Array(filebuf, off, 333);
  debug("VAB",);
  hex.printHex(buf);
}


function readTim(filebuf, off, obj) {
  debug("TIM", new Uint8Array(filebuf, off, 333));
}


function readSpritesTim(buf, off, obj) {
  const count = obj.sprites_anim.length;
  const tim = obj.sprites_tim = [];
  let file_offset = off.list_tim;
  debug("Sprites Tim count", count);

  for (let i=0; i<count; ++i) {
    debug("Read TIM on", file_offset);
    const v = new DataView(buf, file_offset);
    tim[i] = Tim.parseStream(v);
    file_offset += tim[i].byteLength;
  }
}


function readSpritesAnim(filebuf, off, obj) {
  // debug("Sp Anim:");
  // hex.printHex(new Uint8Array(filebuf, off.sprites_tim, 1500));

  const v = new DataView(filebuf, off.sprites_tim);
  let block = [];
  for (let i=0; i<8; ++i) {
    let c = v.getUint8(i);
    if (c == 0xFF || c == 0) break;
    block.push(c);
    console.log("SAB", i, c);
  }

  //
  // obj.sprites_anim: { frames, sprites, height, width, 
  //                     num_frames, num_sprites }
  //
  let header = obj.sprites_anim = [];
  let vi = 8;
  for (let i=0; i<block.length; ++i) {
    const begin_at = vi;
    let h = {
      num_frames  : v.getUint16(vi, true),
      num_sprites : v.getUint16(vi +2, true),
      height      : v.getUint8( vi +4),
      width       : v.getUint8( vi +5),
      unknow      : v.getUint16(vi +6, true),
    };
    vi += 8;
    header.push(h);
    debug("Anim Head:", i, J(h));

    for (let f=0; f<h.num_frames; ++f) {
      let frm = {
        un0 : v.getUint8(vi+ 0),
        un1 : v.getUint8(vi+ 1),
        un2 : v.getUint8(vi+ 2),
        un3 : v.getUint8(vi+ 3),
        un4 : v.getUint8(vi+ 4),
        un5 : v.getUint8(vi+ 5),
        un6 : v.getUint8(vi+ 6),
        un7 : v.getUint8(vi+ 7),
      };
      vi += 8;
      h.frames = frm;
      debug("   Frames:", J(frm));
    }

    for (let s=0; s<h.num_sprites; ++s) {
      // x和y是TIM图像中精灵的左上角位置。偏移x，y是精灵中心的有符号值
      // 用于在动画缓冲区中正确偏移图像部分。
      let sp = {
        x : v.getUint8(vi+ 0),
        y : v.getUint8(vi+ 1),
        offset_x : v.getInt8(vi+ 2),
        offset_y : v.getInt8(vi+ 3),
      };
      vi += 4;
      h.sprites = sp;
      debug("  Sprites:", J(sp));
    }

    let unknow_offsets = [];
    let max_offset = 0;
    for (let o=0; o<8; ++o) {
      var _off = v.getUint16(vi+o*2, true);
      unknow_offsets.push(_off);
      max_offset = _off > max_offset ? _off : max_offset;
    }
    // vi += 16;
    debug(" Unknow offset:", unknow_offsets, max_offset);
    let blk_len = unknow_offsets[1] 
                ? (unknow_offsets[1] - unknow_offsets[0]) * 4
                : 0x38;

    for (let un=0; un<unknow_offsets.length; ++un) {
      if (unknow_offsets[un] == 0) break;
      let x = vi + (unknow_offsets[un]) * 4;
      let unknow_block = [];
      for (let b = 0; b < blk_len; b+=1) {
        unknow_block.push(v.getInt8(x + b, true));
      }
      console.log("  Unknow block:", unknow_block);
    }
    vi += (max_offset) * 4 + blk_len;

    var total_long = v.getInt32(vi, true);
    if (total_long + begin_at - vi) throw new Error("bad offset");
    debug("  total:", total_long);
    vi += 4;
  }
}


function readCameraPos(filebuf, off, ret, count) {
  const len = 4 + 6*4 + 4;
  const cameras = ret.cameras = [];
  cameras.length = count;

  for (let i = 0; i<count; ++i) {
    let v = new DataView(filebuf, off.cam_pos + len*i, len);
    let c = {
      from_x : v.getInt32(4, true),
      from_y : v.getInt32(8, true),
      from_z : v.getInt32(12, true),
      to_x   : v.getInt32(16, true),
      to_y   : v.getInt32(20, true),
      to_z   : v.getInt32(24, true),
      unknow : v.getUint16(0, true),
      const0 : v.getUint16(2, true),
    };
    let mask_off = v.getUint32(28, true);
    debug("camera", J(c));
    if (mask_off != 0xffffffff) {
      c.mask = readMask(filebuf, mask_off);
    }
    cameras[i] = c;
  }
}


function readMask(filebuf, off) {
  let v = new DataView(filebuf, off, 4);
  let c_offset = v.getUint16(0, true);
  let c_masks  = v.getUint16(2, true);
  debug("Mask OFFset", c_offset, c_masks);
  off += 4;
  if (c_offset == 0xFFFF || c_masks == 0xFFFF) {
    return;
  }
  let offset_obj = [];
  
  for (let i = 0; i<c_offset; ++i) {
    let mask = offset_obj[i] = {};
    v = new DataView(filebuf, off, 8);
    off += 8;
    let ct = mask.count = v.getUint16(0, true);
    mask.unknow = v.getUint16(2, true);
    mask.x = v.getUint16(4, true);
    mask.y = v.getUint16(6, true);
    // debug(off-8, ct, mask.x, mask.y);
    c_masks -= ct;
    if (c_masks < 0) {
      throw new Error("bad mask count");
    }
    debug('Mask info', ct, J(mask));
  }

  let ret = [];
  for (let i=0; i<c_offset; ++i) {
    let mask = offset_obj[i];

    for (let j=0; j<mask.count; ++j) {
      let chip = {};
      ret.push(chip);

      v = new DataView(filebuf, off, 12);
      // 共同的源位置/ objspr / rsRXXP.adt图像文件
      chip.src_x = v.getUint8(0);
      chip.src_y = v.getUint8(1);
      // 背景图像/屏幕上的目的地位置
      chip.dst_x = v.getUint8(2);
      chip.dst_y = v.getUint8(3);
      // “深度”值是掩模与相机的Z距离（低值=近，高值=远）。
      chip.depth = v.getUint16(4, true);
      // 要添加的背景图像/屏幕上的目的地位置
      chip.x     = mask.x;
      chip.y     = mask.y;

      let type = v.getUint16(6, true);
      if (type == 0) {
        chip.type   = 'rect';
        chip.width  = v.getUint16(8, true);
        chip.height = v.getUint16(10, true);
        off += 12;
      } else {
        chip.type = 'square';
        off += 8;
      }
      debug("Mask chip", J(chip));
    }
  }
  return ret;
}


function readLight(filebuf, off, ret) {
  const cameras = ret.cameras;
  const len = 2*2 + 3*3 + 3 + 3*6 + 3*2;
  let v;

  function rcolor(i) {
    return {
      r: v.getUint8(i),
      g: v.getUint8(i+1),
      b: v.getUint8(i+2),
    };
  }

  function rpos(i) {
    return {
      x: v.getUint16(i, true),
      y: v.getUint16(i+2, true),
      z: v.getUint16(i+4, true),
    };
  }

  for (let i=0; i<cameras.length; ++i) {
    v = new DataView(filebuf, off.lights + len*i, len);
    let light0 = {
      type   : v.getUint16(0, true),
      color  : rcolor(4),
      pos    : rpos(16),
      bright : v.getUint16(34, true),
    };
    let light1 = {
      type   : v.getUint16(2, true),
      color  : rcolor(7),
      pos    : rpos(22),
      bright : v.getUint16(36, true),
    };
    let lightdef = {
      type   : 0,
      color  : rcolor(10),
      pos    : rpos(28),
      bright : v.getUint16(38, true),
    };
    cameras.light0 = light0;
    cameras.light1 = light1;
    cameras.lightdef = lightdef;
    cameras.env_color = rcolor(13);

    debug("light", i, new Uint8Array(filebuf, off.lights + len*i, len));
    debug(J({light0, light1, lightdef}), cameras.env_color);
  }
}


function readCameraSwitch(filebuf, off, ret) {
  const len = 4 + 8*2;
  let cameras = ret.cameras_sw = [];
  let c = 0;

  for (let i=0; i<100; ++i) {
    let beg = off.cam_sw + len * i;
    let v = new DataView(filebuf, beg, len);
    if (v.getUint32(0) == 0xFFFFFFFF) {
      break;
    }
    let cam = {
      cam0 : v.getUint8(2),
      cam1 : v.getUint8(3),
      x1 : v.getInt16(4,  true), y1 : v.getInt16(6,  true),
      x2 : v.getInt16(8,  true), y2 : v.getInt16(10, true),
      x3 : v.getInt16(12, true), y3 : v.getInt16(14, true),
      x4 : v.getInt16(16, true), y4 : v.getInt16(18, true),
    }
    cameras.push(cam);

    debug("Camera Switch", ++c, new Uint8Array(filebuf, beg, len));
    debug(J(cam));
  }
}


function readOffset(filebuf) {
  const len = 4*23;
  let Offset = new DataView(filebuf, 8, len);
  let off = {};
  off.offset0       = Offset.getUint32(0*4, true);
  off.vab           = Offset.getUint32(1*4, true);
  off.offset2       = Offset.getUint32(2*4, true);
  off.offset3       = Offset.getUint32(3*4, true);
  off.offset4       = Offset.getUint32(4*4, true);
  off.offset5       = Offset.getUint32(5*4, true);
  off.offset6       = Offset.getUint32(6*4, true);
  off.cam_pos       = Offset.getUint32(7*4, true);
  off.cam_sw        = Offset.getUint32(8*4, true);
  off.lights        = Offset.getUint32(9*4, true);
  off.tim           = Offset.getUint32(10*4, true);
  off.offset11      = Offset.getUint32(11*4, true);
  off.offset12      = Offset.getUint32(12*4, true);
  off.lang1         = Offset.getUint32(13*4, true);
  off.lang2         = Offset.getUint32(14*4, true);
  off.offset15      = Offset.getUint32(15*4, true);
  off.init_script   = Offset.getUint32(16*4, true);
  off.room_script   = Offset.getUint32(17*4, true);
  off.sprites_tim   = Offset.getUint32(18*4, true);
  off.offset19      = Offset.getUint32(19*4, true);
  off.list_tim      = Offset.getUint32(20*4, true);
  off.another_tim   = Offset.getUint32(21*4, true);
  off.offset22      = Offset.getUint32(22*4, true);

  debug(J(off, 0, 2));
  // showOffsetBuf(filebuf, off);
  return off;
}


function J(o, x, n) {
  return JSON.stringify(o, x, n);
}


function debug() {
  // console.debug.apply(console, arguments);
}


function showOffsetBuf(filebuf, off) {
  for (var n in off) {
    debug("================== BUFFER", 
          n, '0x'+off[n].toString(16),
          "==================");
    try {
      hex.printHex(new Uint8Array(filebuf, off[n], 500));
    } catch(e) {
      debug(e.message);
    }
  }
}