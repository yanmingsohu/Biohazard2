import Rdt  from './rdt.js'
import Adt  from './adt.js'
import Draw from '../boot/draw.js'
import Bin  from './bin.js'
import H    from '../boot/hex.js'
import Tim  from './tim.js'
import File from './file.js'


const roomcut = Bin.load('common/bin/roomcut.bin');
const MAX_CACHE = 10;
const cache = [];
let cptr = 0;
let background;
let tex;


export default {
  switchRoom,
  switchWith,
  showPic,
  init,
  count : roomcut.count,
};


function init(window) {
  var shaderProgram = Draw.createProgram();
  shaderProgram.readVertexShader('bio2/bg.vert');
  shaderProgram.readFragShader('bio2/bg.frag');
  shaderProgram.link();

  var vertices = new Float32Array([
    // positions  // texture coords
    1,  1, 0.0,   1.0, 0.0,   // top right
    1, -1, 0.0,   1.0, 1.0,   // bottom right
    -1, -1, 0.0,  0.0, 1.0,   // bottom left
    -1,  1, 0.0,  0.0, 0.0,   // top left 
  ]);

  var indices = new Uint32Array([
    0, 1, 3,   // first triangle
    1, 2, 3    // second triangle
  ]);

  background = Draw.createBasicDrawObject(shaderProgram);
  background.addVerticesElements(vertices, indices);
  background.setAttr({ index: 0, vsize: 3, stride: 5*gl.sizeof$float });
  background.setAttr({ index: 1, vsize: 2, stride: 5*gl.sizeof$float, 
              offset: 3*gl.sizeof$float });

  window.add(background);
  tex = background.getTexture();
}


function _get(id) {
  for (let i=0; i<MAX_CACHE; ++i) {
    if (cache[i] && cache[i].id == id) {
      // console.log("get room from cache", id);
      return cache[i].room;
    }
  }

  var binbuf = roomcut.get8(id);
  if (!binbuf) {
    return;
  }
  // H.printHex(binbuf, null, 200);

  let room = Adt.unpack(binbuf);
  cache[cptr] = { id, room };
  if (++cptr >= MAX_CACHE) cptr = 0;
  return room;
}


//
// 用图像索引切换背景
//
function switchRoom(id) {
  let room = _get(id);
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
  } else if (check.indexOf(".tim") >= 0) {
    let vi = File.openDataView(file);
    Tim.parseStream(vi).bindTexTo(tex);
  }
}