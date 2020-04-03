import Adt  from './adt.js'
import Bin  from './bin.js'
import H    from '../boot/hex.js'
import Tim  from './tim.js'
import File from './file.js'
import Shader from './shader.js'
import Res  from '../boot/resource.js'


// const roomcut = Bin.load('common/bin/itemdata.bin');
const roomcut = Bin.load('common/bin/roomcut.bin');
const roomCache = Res.createLimitCache(loadRoom, freeRoom, 10);
const z = 0.99999;

let background;
let bgtex;
let mask;
let draw_order;
let camera;

// 上下颠倒
const vertices = new Float32Array([
  // positions  // texture coords
   1,  1, z,    1.0, 0.0,  
   1, -1, z,    1.0, 1.0, 
  -1, -1, z,    0.0, 1.0, 
  -1,  1, z,    0.0, 0.0, 
]);

const indices = new Uint32Array([
  0, 1, 3,   // first triangle
  1, 2, 3    // second triangle
]);

export default {
  switchRoom,
  setMask,
  switchWith,
  showPic,
  init,
  count : roomcut.count,
};


function init(window, _order, _camera) {
  Shader.check_init();
  draw_order = _order;
  camera = _camera;

  background = Shader.createBasicDrawObject();
  background.addVerticesElements(vertices, indices);
  background.setAttr({ index: 0, vsize: 3, stride: 5*gl.sizeof$float });
  background.setAttr({ index: 2, vsize: 2, stride: 5*gl.sizeof$float, 
              offset: 3*gl.sizeof$float });

  draw_order.setBackground(background);
  bgtex = background.getTexture();
}


function loadRoom(id) {
  // console.log("load from file");
  var binbuf = roomcut.get8(id);
  if (!binbuf) {
    return;
  }
  return Adt.room(binbuf);
}


function freeRoom(id, room) {
  // console.log('free room', id);
}


//
// 用图像索引切换背景
//
function switchRoom(id, mask_dat) {
  let room = roomCache.get(id);
  if (room) {
    room.bindTexTo(bgtex);

    // 测试: 显示蒙版, 可能崩溃
    // if (room.bindMaskTexTo) {
    //   room.bindMaskTexTo(bgtex);
    // }
    
    setMask(mask_dat, room.maskbuf, room.buf,
          room.width, room.height, room.maskw, room.maskh);
    return true;
  }
  return false;
}


//
// 用房间信息切换背景
// stage - 关卡编号, 总是从 1 开始
// room  - 房间编号, 从 0 开始
// carame - 摄像机编号, 从 0 开始, 最多 0xF 个.
//
function switchWith(stage, room, carame, mask) {
  let id = (stage-1) *512 + room*16 + carame;
  return switchRoom(id, mask);
}


//
// 在背景上显示图像, 方便调试
//
function showPic(file) {
  let check = file.toLowerCase();

  if (check.indexOf(".adt") >= 0) {
    Adt.load(file).bindTexTo(bgtex);
  } 
  else if (check.indexOf(".tim") >= 0) {
    let vi = File.openDataView(file);
    Tim.parseStream(vi).bindTexTo(bgtex);
  }
}


//
// 在切换房间之前设置遮掩数据
// maskbuf - 背景蒙版缓冲区
// bg部分- 背景图像缓冲区
//
function setMask(m, maskbuf, bgbuf, ow, oh, mw, mh) {
  // 删除之前的蒙版数据
  if (mask) {
    draw_order.setMask(null);
    mask.free();
    mask = null;
  }
  if (!m || m.length == 0) {
    return;
  }

  const BUFLEN = 5;
  // 纹理缓冲区
  const texbuf = new Uint32Array(mw * mh);
  // | x,y,z | u, v | 顶点缓冲区
  const buf = new Float32Array(m.length * BUFLEN * 4);
  // 索引缓冲区
  const idx = new Uint32Array(m.length * 6);

  let bi = 0, ii = 0, vi = 0;
  let dx, dy, sx, sy, z, ww, hh, alpha, r, g, b, c1555;
  let rw = ow/2;
  let rh = oh/2;

  // {"src_x":8,"src_y":48,"dst_x":80,"dst_y":0,"depth":86,
  //  "x":232,"y":120,"width":8,"height":8}
  for (let i=0, len=m.length; i < len; ++i) {
    dx = m[i].dst_x;
    dy = m[i].dst_y;
    sx = m[i].src_x;
    sy = m[i].src_y;
    ww = m[i].w;
    hh = m[i].h;
    z = Shader.maskDepth(m[i].depth, camera);
    // console.log(i, m[i].depth, z, 1-z, z-1);

    bi = i * BUFLEN * 4;
    buf[bi + 0] =  dx        / rw -1;
    buf[bi + 1] = -dy        / rh +1;
    buf[bi + 2] =  z;
    buf[bi + 3] =  sx        / mw;
    buf[bi + 4] =  sy        / mh;
    bi += BUFLEN;
    buf[bi + 0] =  (dx + ww) / rw -1;
    buf[bi + 1] = -dy        / rh +1;
    buf[bi + 2] =  z;
    buf[bi + 3] =  (sx + ww) / mw;
    buf[bi + 4] =  sy        / mh;
    bi += BUFLEN;
    buf[bi + 0] =  (dx + ww) / rw -1;
    buf[bi + 1] = -(dy + hh) / rh +1;
    buf[bi + 2] =  z;
    buf[bi + 3] =  (sx + ww) / mw;
    buf[bi + 4] =  (sy + hh) / mh;
    bi += BUFLEN;
    buf[bi + 0] =  dx        / rw -1;
    buf[bi + 1] = -(dy + hh) / rh +1;
    buf[bi + 2] =  z;
    buf[bi + 3] =  sx        / mw;
    buf[bi + 4] =  (sy + hh) / mh;

    vi = i * 4;
    ii = i * 6;
    idx[ii + 0] = 0 + vi;
    idx[ii + 1] = 1 + vi;
    idx[ii + 2] = 2 + vi;
    idx[ii + 3] = 0 + vi;
    idx[ii + 4] = 3 + vi;
    idx[ii + 5] = 2 + vi;

    for (ii = 0; ii < hh; ++ii) {
      let y0 = sy * mw;
      let y1 = dy * ow;
      for (vi = 0; vi < ww; ++vi) {
        alpha = maskbuf[sx + vi + y0] >0 ? 0xFF : 0;
        c1555 = bgbuf[dx + vi + y1];
        b = (c1555 & 0x7c00) >> 10;
        g = (c1555 & 0x3e0) >> 5;
        r = (c1555 & 0x1F);
        // r = g = b= 0xfff; // 白色测试
        texbuf[sx + vi + y0] = (r << 27) | (g << 19) | (b << 11) | alpha;
      }
      ++sy; ++dy;
    }
  };

  mask = Shader.createBasicDrawObject();
  mask.addVerticesElements(buf, idx);
  mask.setAttr({ index: 0, vsize: 3, stride: BUFLEN*gl.sizeof$float });
  mask.setAttr({ index: 2, vsize: 2, stride: BUFLEN*gl.sizeof$float, 
                 offset: 3*gl.sizeof$float });

  let tex = mask.getTexture();
  tex.bindTexImage(texbuf, mw, mh, 
      gl.GL_RGBA, gl.GL_UNSIGNED_INT_8_8_8_8, gl.GL_RGBA);
  tex.setParameter(gl.GL_TEXTURE_MAG_FILTER, gl.GL_NEAREST);
  draw_order.setMask(mask);
  return true;
}