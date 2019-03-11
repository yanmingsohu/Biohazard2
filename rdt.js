//
// https://github.com/pmandin/reevengi-tools/wiki/.RDT-%28Resident-Evil-2%29
//
import hex    from '../boot/hex.js'
import Script from './script.js'
import Tim    from './tim.js'
import File   from './file.js'
import Tool   from './tool.js'
import Node   from '../boot/node.js'
import { CollisionRectangle } from './tool.js'
const matrix = Node.load('boot/gl-matrix.js');
const {vec3, mat4, vec2} = matrix;

//
// 不同的语言使用对应的目录
// RDP/RDS/RDF/RDT
//
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
  readSpace(filebuf, off, obj);

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


function readSpace(buf, offobj, obj) {
  const block = offobj.offset12;
  const floor = offobj.offset11;
  const collision = offobj.offset6;
  debug("Move Space", {block, floor, collision});
  const v = new DataView(buf, 0);
  let off = 0;

  const bcount = v.getUint32(block, true);
  const barr = obj.block = [];
  off = block + 4;
  for (let i=0; i<bcount; ++i) {
    let b = {};
    b.x1 = v.getInt16(off, true);
    b.y1 = v.getInt16(off+2, true);
    b.x3 = v.getInt16(off+4, true);
    b.y3 = v.getInt16(off+6, true);
    b.dir = v.getUint16(off+8, true);
    b.abut = v.getUint16(off+10, true);
    b.x2 = b.x3;
    b.y2 = b.y1;
    b.x4 = b.x1;
    b.y4 = b.y3; 
    if (b.dir > 0) {
      // let out = [];
      // let center = [0,0];
      // let angle = b.dir/0xFFFF * Math.PI * 2;
      // vec2.rotate(out, [b.x1, b.y1], center, angle);
      // b.x1 = out[0]; b.y1 = out[1];
      // vec2.rotate(out, [b.x3, b.y3], center, angle);
      // b.x3 = out[0]; b.y3 = out[1];
      // vec2.rotate(out, [b.x4, b.y4], center, angle);
      // b.x4 = out[0]; b.y4 = out[1];
    }
    off += 12;
    barr.push(b);
    debug('. Block', i, b);
  }

  const fcount = v.getUint16(floor, true);
  const farr = obj.floor = [];
  off = floor + 2;
  for (let i=0; i<fcount; ++i) {
    let f = {};
    f.x = v.getInt16(off, true);
    f.y = v.getInt16(off+2, true);
    f.w = v.getUint16(off+4, true); //?有符号
    f.d = v.getUint16(off+6, true);
    f.se_no = v.getUint16(off+8, true); //地面音效编号?
    f.height = v.getUint16(off+10, true);
    farr.push(f);
    off += 12;
    debug(". Floor", i, f);
  }

  const cx = v.getInt16(collision, true);
  const cz = v.getInt16(collision+2, true);
  const d0 = v.getUint32(collision+4, true)-1;
  const d1 = v.getUint32(collision+8, true);
  const d2 = v.getUint32(collision+12, true);
  debug(". Collision", cx, cz, d0, d1.toString(16), d2.toString(16));

  const carr = obj.collision = [];
  off = collision + 16;
  for (let i=0; i<d0; ++i) {
    let c = {};
    c.x = v.getInt16(off, true);
    c.y = v.getInt16(off+2, true);
    c.w = v.getUint16(off+4, true);
    c.d = v.getUint16(off+6, true);

    let id = v.getUint16(off+8, true);
    c.shape     = id & 0x000F;
    c.weapon_on = (id >>  4) & 0x08;
    c.floor_on  = (id >>  8) & 1;
    c.enemy_on  = (id >> 10) & 1;
    c.bullet_on = (id >> 13) & 1;
    c.obj_on    = (id >> 14) & 1;
    c.play_on   = (id >> 15) & 1;
    
    let type = v.getUint16(off+10, true);
    // 宽度乘数X / W（0-3）
    c.xw     = type & 3; 
    // 深度倍增器Z / D（0-3）
    c.yd     = (type >>  2) & 3; 
    // type: 楼梯/斜坡/平台访问
    // 00爬升/上升/从Z轴向下跳跃
    // 01从Z轴上升/上升/跳起
    // 02爬升/上升/从X轴向下跳跃
    // 03爬升/上升/从X轴上跳
    c.type   = (type >>  4) & 3;
    // 高度乘数（0-9）
    // 此值确定阴影和
    // 子弹偏转高度
    c.floor  = (type >>  6) & 0x3F;
    // c.nine   = (type >> 12) & 0xF;
    setShapeType(c);
    carr.push(c);

    off += 16;
    if ((type >> 12) & 0xF != 9) {
      console.error("flag fail", c);
    }
    debug('\t', c);
  }
}


function setShapeType(c) {
  switch(c.shape) {
    case  0: 
      c.name = 'Rectangle';
      c.py = new CollisionRectangle(c);
      break;

    case  1: 
      c.name = 'Right Triangle x--	z--';
      break;

    case  2: 
      c.name = 'Right Triangle x++	z--';
      break;

    case  3: 
      c.name = 'Right Triangle x--	z++';
      break;

    case  4: 
      c.name = 'Right Triangle x++	z++';
      break;

    case  5: 
      c.name = 'Rhombus |x/w| + |z/d| = 1';
      break;

    case  6: 
      c.name = 'Circle';
      break;

    // Ellipse, Rectangle w/Rounded corners on X-Axis'
    case  7: 
      c.name = 'Oval x=(-x,0), z=(z,0)';
      break;

    // Ellipse, Rectangle w/Rounded corners on Z-Axis
    case  8: 
      c.name = 'Oval x=(x,0), z=(-z,0)';
      break;

    // Found in 304
    case  9: 
      c.name = 'Rectangle Climb Up'; 
      break;

    // Found in 304
    case 10: 
      c.name = 'Rectangle Jump Down';
      break;

    // Found in 200
    case 11: 
      c.name = 'Reflex Angle';
      break;

    // Found in 200
    case 12: 
      c.name = 'Rectangle Stairs';
      break;

    // found in 40B and 40F
    case 13: 
      c.name = 'Cylinder';
      break;

    default: 
      c.name = 'Unknow shape '+s;
      break;
  }
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
  // hex.printHex(buf);
}


function readTim(filebuf, off, obj) {
  debug("Obj10 TIM", new Uint8Array(filebuf, off, 333));
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
  debug("Sprites Anim: ("+ off.sprites_anim +")");
  // hex.printHex(new Uint8Array(filebuf, off.sprites_anim, 1500));

  const v = new DataView(filebuf, off.sprites_anim);
  const p = new DataView(filebuf);
  const header = obj.sprites_anim = [];
  // hex.printHex(p);

  for (let i=0; i<8; ++i) {
    let c = v.getUint8(i);
    if (c == 0xFF || c == 0) break;
    let point = p.getUint32(off.offset19 - i*4, true);
    debug("Sprites Anim Block", i, c, point);
    // block.push({c, point});
    parseSp(c, point);
  }

  //
  // obj.sprites_anim: { frames, sprites, height, width, 
  //                     num_frames, num_sprites }
  //
  function parseSp(id, begin_at) {
    let vi = begin_at;
    let h = {
      id,
      num_frames  : v.getUint16(vi, true),
      num_sprites : v.getUint16(vi +2, true),
      height      : v.getUint8( vi +4),
      width       : v.getUint8( vi +5),
      unknow      : v.getUint16(vi +6, true),
    };
    vi += 8;
    header.push(h);
    debug("Anim Head:", id, J(h));

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

    // let unknow_offsets = [];
    // let max_offset = 0;
    // for (let o=0; o<8; ++o) {
    //   var _off = v.getUint16(vi+o*2, true);
    //   unknow_offsets.push(_off);
    //   max_offset = _off > max_offset ? _off : max_offset;
    // }
    // // vi += 16;
    // let blk_len = unknow_offsets[1] 
    //             ? (unknow_offsets[1] - unknow_offsets[0]) * 4
    //             : 0x38;
    // debug(" Unknow offset:", unknow_offsets, max_offset, blk_len);

    // for (let un=0; un<unknow_offsets.length; ++un) {
    //   if (unknow_offsets[un] == 0) break;
    //   let x = vi + (unknow_offsets[un]) * 4;
    //   let unknow_block = [];
    //   for (let b = 0; b < blk_len; b+=1) {
    //     unknow_block.push(v.getInt8(x + b, true));
    //   }
    //   debug("  Unknow block:", unknow_block);
    // }
    // vi += (max_offset) * 4 + blk_len;

    // var total_long = v.getInt32(vi, true);
    // debug("  total:", total_long, begin_at, vi);
    // if (total_long + begin_at != vi) {
    //   console.warn('bad total count or offset !!');
    //   // throw new Error("bad offset");
    // }
  }
}


function readCameraPos(filebuf, off, ret, count) {
  const len = 4 + 6*4 + 4;
  const cameras = ret.cameras = [];
  const v = new DataView(filebuf, off.cam_pos, len*count);
  cameras.length = count;
  debug("camera count", count, '('+off.cam_pos+')');

  for (let i = 0; i<count; ++i) {
    let vi = len * i;
    // let v = new DataView(filebuf, off.cam_pos + len*i, len);
    let c = {
      unknow : v.getUint16(0 +vi, true),
      const0 : v.getUint16(2 +vi, true),
      from_x : v.getInt32(4 +vi, true),
      from_y : v.getInt32(8 +vi, true),
      from_z : v.getInt32(12 +vi, true),
      to_x   : v.getInt32(16 +vi, true),
      to_y   : v.getInt32(20 +vi, true),
      to_z   : v.getInt32(24 +vi, true),
    };
    let mask_off = v.getUint32(28 +vi, true);
    // debug("camera", i, J(c));
    if (mask_off != 0xffffffff) {
      c.mask = readMask(filebuf, mask_off);
    }
    cameras[i] = c;
  }
}


function readMask(filebuf, off) {
  const v = new DataView(filebuf, off);
  const c_offset = v.getUint16(0, true);
  const c_masks  = v.getUint16(2, true);
  debug("Mask OFFset", c_offset, c_masks, off);
  if (c_offset == 0xFFFF || c_masks == 0xFFFF) {
    return;
  }

  let offset_obj = [];
  let to_count = 0;
  off = 4;
  
  for (let i = 0; i<c_offset; ++i) {
    let mask = offset_obj[i] = {};
    let ct = mask.count = v.getUint16(off, true);
    mask.unknow = v.getUint16(off+2, true);
    // 要添加的背景图像/屏幕上的目的地位置块偏移
    mask.x = v.getInt16(off+4, true);
    mask.y = v.getInt16(off+6, true);
    // debug(off-8, ct, mask.x, mask.y);
    to_count += ct;
    off += 8;
    // hex.printHex(new Uint8Array(filebuf, mask.unknow, 1000));
  }
  
  if (to_count > c_masks) {
    throw new Error("bad mask count");
  }

  const ret = [];
  for (let i=0; i<c_offset; ++i) {
    const mask = offset_obj[i];
    // debug('Mask info', mask.count, J(mask));

    for (let j=0; j<mask.count; ++j) {
      const chip = {};
      ret.push(chip);

      // 蒙版图像存储于房间图片的下方
      chip.src_x = v.getUint8(off+0);
      chip.src_y = v.getUint8(off+1);
      // 背景图像/屏幕上的目的地位置
      chip.dst_x = v.getUint8(off+2) + mask.x;
      chip.dst_y = v.getUint8(off+3) + mask.y;
      // “深度”值是掩模与相机的Z距离（低值=近，高值=远）。
      chip.depth = v.getUint16(off+4, true);
      const w = v.getUint16(off+6, true);

      if (w == 0) {
        chip.w = v.getUint16(off+8, true);
        chip.h = v.getUint16(off+10, true);
        off += 12;
      } else {
        chip.w = w;
        chip.h = w;
        off += 8;
      }
      if (chip.dst_x + chip.w > 320 || chip.dst_y + chip.h >240) {
        console.error("bad size")
      }
      // debug("Mask chip", J(chip));
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

    // debug("Camera Switch", c++, cam);
  }
}


function J(o, x, n) {
  // 注释 debug 的同时, 注释这里
  // return JSON.stringify(o, x, n);
  return o;
}


function debug() {
  Tool.debug.apply(null, arguments);
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


function readOffset(filebuf) {
  const len = 4*23;
  let Offset = new DataView(filebuf, 8, len);
  let off = {};
  off.offset0       = Offset.getUint32(0*4, true); // Soundbank?
  off.vab           = Offset.getUint32(1*4, true); // Soundbank
  off.offset2       = Offset.getUint32(2*4, true); // Soundbank?
  off.offset3       = Offset.getUint32(3*4, true); // Soundbank?
  off.offset4       = Offset.getUint32(4*4, true);
  off.offset5       = Offset.getUint32(5*4, true);
  off.offset6       = Offset.getUint32(6*4, true); // collision
  off.cam_pos       = Offset.getUint32(7*4, true);
  off.cam_sw        = Offset.getUint32(8*4, true);
  off.lights        = Offset.getUint32(9*4, true);
  off.tim           = Offset.getUint32(10*4, true);
  off.offset11      = Offset.getUint32(11*4, true); // Floor?
  off.offset12      = Offset.getUint32(12*4, true); // Block?
  off.lang1         = Offset.getUint32(13*4, true);
  off.lang2         = Offset.getUint32(14*4, true);
  off.offset15      = Offset.getUint32(15*4, true); // Scroll Texture?
  off.init_script   = Offset.getUint32(16*4, true);
  off.room_script   = Offset.getUint32(17*4, true);
  off.sprites_anim  = Offset.getUint32(18*4, true);
  off.offset19      = Offset.getUint32(19*4, true); // sprites_anim offset
  off.list_tim      = Offset.getUint32(20*4, true);
  off.another_tim   = Offset.getUint32(21*4, true);
  off.offset22      = Offset.getUint32(22*4, true); // Player Animation?

  debug(J(off, 0, 2));
  // showOffsetBuf(filebuf, off);
  return off;
}