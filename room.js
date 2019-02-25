import Adt  from './adt.js'
import Bin  from './bin.js'
import H    from '../boot/hex.js'
import Tim  from './tim.js'
import File from './file.js'
import Shader from './shader.js'
import Res  from '../boot/resource.js'


const roomcut = Bin.load('common/bin/roomcut.bin');
const roomCache = Res.createLimitCache(loadRoom, freeRoom, 10);

let background;
let tex;

const vertices = new Float32Array([
  // positions   // texture coords
   1,  1, -1,    1.0, 0.0,   // top right
   1, -1, -1,    1.0, 1.0,   // bottom right
  -1, -1, -1,    0.0, 1.0,   // bottom left
  -1,  1, -1,    0.0, 0.0,   // top left 
]);

const indices = new Uint32Array([
  0, 1, 3,   // first triangle
  1, 2, 3    // second triangle
]);

export default {
  switchRoom,
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

  window.add({
    draw(u, t) {
      Shader.draw_background();
      background.draw(u, t);
    }
  });

  tex = background.getTexture();
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
    room.bindTexTo(tex);
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
    Adt.load(file).bindTexTo(tex);
  } 
  else if (check.indexOf(".tim") >= 0) {
    let vi = File.openDataView(file);
    Tim.parseStream(vi).bindTexTo(tex);
  }
}