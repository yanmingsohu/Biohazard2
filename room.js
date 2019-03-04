import Adt  from './adt.js'
import Bin  from './bin.js'
import H    from '../boot/hex.js'
import Tim  from './tim.js'
import File from './file.js'
import Shader from './shader.js'
import Res  from '../boot/resource.js'


// const roomcut = Bin.load('common/bin/osp.bin');
const roomcut = Bin.load('common/bin/roomcut.bin');
const roomCache = Res.createLimitCache(loadRoom, freeRoom, 10);
const z = 0.99999;

let background;
let bgtex;
let mask;
let w, h; // 背景图片的宽x高

const vertices = new Float32Array([
  // positions   // texture coords
   1,  1, z,    1.0, 0.0,   // top right
   1, -1, z,    1.0, 1.0,   // bottom right
  -1, -1, z,    0.0, 1.0,   // bottom left
  -1,  1, z,    0.0, 0.0,   // top left 
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


function init(window) {
  Shader.check_init();

  background = Shader.createBasicDrawObject();
  background.addVerticesElements(vertices, indices);
  background.setAttr({ index: 0, vsize: 3, stride: 5*gl.sizeof$float });
  background.setAttr({ index: 2, vsize: 2, stride: 5*gl.sizeof$float, 
              offset: 3*gl.sizeof$float });

  window.add({ draw });

  bgtex = background.getTexture();
}


function draw(u, t) {
  Shader.draw_background();
  if (mask) mask.draw();
  background.draw(u, t);
}


function loadRoom(id) {
  // console.log("load from file");
  var binbuf = roomcut.get8(id);
  if (!binbuf) {
    return;
  }
  return Adt.unpack(binbuf);
}


function freeRoom(id, room) {
  // console.log('free room', id);
}


//
// 用图像索引切换背景
//
function switchRoom(id) {
  let room = roomCache.get(id);
  if (room) {
    room.bindTexTo(bgtex);
    w = room.width / 2;
    h = room.height / 2;
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
function switchWith(stage, room, carame) {
  let id = (stage-1) *512 + room*16 + carame;
  return switchRoom(id);
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


function setMask(m) {
  if (mask) {
    mask.free();
    mask = null;
  }
  if (!m || m.length == 0) {
    return;
  }

  // | x,y,z | u, v |
  const buf = new Float32Array(m.length * 5 * 4);
  const idx = new Uint32Array(m.length * 6);
  let bi = 0, ii = 0;

  // {"src_x":8,"src_y":48,"dst_x":80,"dst_y":0,"depth":86,
  //  "x":232,"y":120,"width":8,"height":8}
  for (let i=0, len=m.length; i<len; ++i) {
    bi = i * 5 * 4;
    buf[bi + 0] =  (m[i].dst_x) /w -1;
    buf[bi + 1] = -(m[i].dst_y) /h +1;
    buf[bi + 2] =  -m[i].depth / 0xFFFF;
    buf[bi + 3] =  (m[i].src_x) / 0xFF; // 这不对!!
    buf[bi + 4] =  (m[i].src_y) / 0xFF;
    bi += 5;
    buf[bi + 0] =  (m[i].dst_x + m[i].w) /w -1;
    buf[bi + 1] = -(m[i].dst_y) /h +1;
    buf[bi + 2] =  -m[i].depth / 0xFFFF;
    buf[bi + 3] =  (m[i].src_x + m[i].w) / 0xFF;
    buf[bi + 4] =  (m[i].src_y) / 0xFF;
    bi += 5;
    buf[bi + 0] =  (m[i].dst_x + m[i].w) /w -1;
    buf[bi + 1] = -(m[i].dst_y + m[i].h) /h +1;
    buf[bi + 2] =  -m[i].depth / 0xFFFF;
    buf[bi + 3] =  (m[i].src_x + m[i].w) / 0xFF;
    buf[bi + 4] =  (m[i].src_y + m[i].h) / 0xFF;
    bi += 5;
    buf[bi + 0] =  (m[i].dst_x) /w -1;
    buf[bi + 1] = -(m[i].dst_y + m[i].h) /h +1;
    buf[bi + 2] =  -m[i].depth / 0xFFFF;
    buf[bi + 3] =  (m[i].src_x) / 0xFF;
    buf[bi + 4] =  (m[i].src_y + m[i].h) / 0xFF;
    bi += 5;

    ii = i * 6;
    idx[ii + 0] = 0 + i*4;
    idx[ii + 1] = 3 + i*4;
    idx[ii + 2] = 2 + i*4;
    idx[ii + 3] = 0 + i*4;
    idx[ii + 4] = 1 + i*4;
    idx[ii + 5] = 2 + i*4;
  };

  mask = Shader.createBasicDrawObject();
  mask.addVerticesElements(buf, idx);
  mask.setAttr({ index: 0, vsize: 3, stride: 5*gl.sizeof$float });
  mask.setAttr({ index: 2, vsize: 2, stride: 5*gl.sizeof$float, 
              offset: 3*gl.sizeof$float });
  
}