export default {}

import Draw   from '../boot/draw.js'
import Node   from '../boot/node.js'
import Game   from '../boot/game.js'
import Res    from '../boot/resource.js'
import Rdt    from './rdt.js'
import Bin    from './bin.js'
import H      from '../boot/hex.js'
import Adt    from './adt.js'
import Room   from './room.js'
import Dev    from './dev.js'

const matrix = Node.load('boot/gl-matrix.js');
const LEON = 0;
const CLAIRE = 1;
const game_var = [];

let runtime_data = {
  get_bitarr(arr, num) {
    let a = game_var[arr];
    if (!a) return 0;
    return a[num] || 0;
  },

  set_bitarr(arr, num, v) {
    let a = game_var[arr];
    if (!a) a = game_var[arr] = [];
    a[num] = v;
  },

  reverse(a, n) {
    let v = this.get_bitarr(a, n);
    this.set_bitarr(a, n, v == 0 ? 1 : 0);
  },
};

// ROOM1010.RDT  ROOM1000.RDT
let map0 = Rdt.load('Pl0/Rdt/ROOM1000.RDT');
// Dev.runAllScript(map0, runtime_data);

let window = Draw.createWindow();
window.setClearColor([0.2, 0.3, 0.3, 1]);
window.center();
// window.add(Draw.showRate());

window.onKey(gl.GLFW_KEY_ESCAPE, gl.GLFW_PRESS, 0, function() {
    window.shouldClose();
});

// 房间渲染器
Room.init(window);
Dev.roomBrowse(Room, window);


window.prepareDraw();
while (window.nextFrame()) {
}
window.destroy();


// var m = matrix.mat4.create(1);
// matrix.mat4.rotateX(m, m, -90*PI/180);
// // matrix.mat4.translate(m, m, [0,0,0]);

// var sp = res_ctx.load('art/chr_rain.sprite.yaml');
// sp.reset(m);

// window.add(sp);

// var camera = Game.createCamera(shaderProgram, { draw: surroundOP });
// var cameraLookAt = Game.Vec3Transition(camera.lookWhere());
// var camMoveTo = Game.Vec3Transition(camera.pos(), 4);
// window.add(camera);


// // 镜头切换时间
// var switchTime = 3;
// function surroundOP(used, time, cm) {
//   var time = gl.glfwGetTime();
//   var modwhere = sp.where();
//   // 线性移动摄像头
//   modwhere[1] += 0.6;
//   cameraLookAt.line(used, modwhere);
//   camMoveTo.line(used, [modwhere[0]+0.5, 1, modwhere[2]+3]);
// }

// while (window.nextFrame()) {
// }
// // res_ctx.free();
