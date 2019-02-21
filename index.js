export default {}

import Draw   from '../boot/draw.js'
import Node   from '../boot/node.js'
import Game   from '../boot/game.js'
import Res    from '../boot/resource.js'
import Rdt    from './rdt.js'

const matrix = Node.load('boot/gl-matrix.js');
const PI = Math.PI;
const LEON = 0;
const CLAIRE = 1;

var window = Draw.createWindow();
window.setClearColor([0.2, 0.3, 0.3, 1]);
window.center();
window.add(Draw.showRate());

var map0 = Rdt.load('Pl0/Rdt/ROOM1000.RDT');
map0.init_script.run({}, 0);
// map0.room_script.run({}, 0);
// console.log("Map:", JSON.stringify(map0, 0, 2));


// //
// // 编译/链接着色器
// //
// var shaderProgram = Draw.createProgram();
// shaderProgram.readVertexShader("bio2/map.vert");
// shaderProgram.readFragShader("bio2/map.frag");
// shaderProgram.link();
// shaderProgram.setProjection(45, 4/3, 0.01, 100);

// var res_ctx = Res.context(shaderProgram);

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


// window.onKey(gl.GLFW_KEY_ESCAPE, gl.GLFW_PRESS, 0, function() {
//     window.shouldClose();
// });

// window.prepareDraw();
// while (window.nextFrame()) {
// }
// res_ctx.free();
// window.destroy();
