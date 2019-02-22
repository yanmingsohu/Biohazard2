export default {}

import Draw   from '../boot/draw.js'
import Node   from '../boot/node.js'
import Game   from '../boot/game.js'
import Res    from '../boot/resource.js'
import Rdt    from './rdt.js'
import Bin    from './bin.js'
import H      from '../boot/hex.js'
import Adt    from './adt.js'

const matrix = Node.load('boot/gl-matrix.js');
const PI = Math.PI;
const LEON = 0;
const CLAIRE = 1;

var game_var = [];

var bio0 = {
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
    var v = this.get_bitarr(a, n);
    this.set_bitarr(a, n, v == 0 ? 1 : 0);
  },
};

var map0 = Rdt.load('Pl0/Rdt/ROOM1000.RDT');
// map0.init_script.run(bio0, 0);
// map0.room_script.run(bio0, 0);
// console.log("Map:", JSON.stringify(map0, 0, 2));

var roomcut = Bin.load('COMMON/bin/roomcut.bin');


var window = Draw.createWindow();
window.setClearColor([0.2, 0.3, 0.3, 1]);
window.center();
window.add(Draw.showRate());

window.onKey(gl.GLFW_KEY_ESCAPE, gl.GLFW_PRESS, 0, function() {
    window.shouldClose();
});

//
// 编译/链接着色器
//
// var shaderProgram = Draw.createProgram();
// shaderProgram.readVertexShader("bio2/map.vert");
// shaderProgram.readFragShader("bio2/map.frag");
// shaderProgram.link();
// shaderProgram.setProjection(45, 4/3, 0.01, 100);

// var res_ctx = Res.context(shaderProgram);
box();

function box() {
  //
  // 顶点着色器
  //
  var shaderSource = `
  #version 330 core
  layout (location = 0) in vec3 aPos;
  layout (location = 1) in vec3 aColor;
  layout (location = 2) in vec2 aTexCoord;

  out vec3 ourColor;
  out vec2 TexCoord;
  uniform mat4 transform;


  void main()
  {
      gl_Position = transform * vec4(aPos, 1.0);
      ourColor = aColor;
      TexCoord = aTexCoord;
  }`;

  var vertexShader = Draw.createShader(
      shaderSource, gl.GL_VERTEX_SHADER);

  //
  // 片段着色器
  //
  var fragmentSource = `
  #version 330 core
  out vec4 FragColor;
    
  in vec3 ourColor;
  in vec2 TexCoord;

  uniform sampler2D ourTexture;

  void main()
  {
      FragColor = texture(ourTexture, TexCoord);
  }`;

  var fragmentShader = Draw.createShader(
      fragmentSource, gl.GL_FRAGMENT_SHADER);

  //
  // 编译/链接着色器
  //
  var shaderProgram = Draw.createProgram();
  shaderProgram.attach(vertexShader);
  shaderProgram.attach(fragmentShader);
  shaderProgram.link();


  var vertices = new Float32Array([
    // positions          // colors           // texture coords
     1,  1, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0,   // top right
     1, -1, 0.0,   0.0, 1.0, 0.0,   1.0, 1.0,   // bottom right
    -1, -1, 0.0,   0.0, 0.0, 1.0,   0.0, 1.0,   // bottom left
    -1,  1, 0.0,   1.0, 1.0, 0.0,   0.0, 0.0,   // top left 
  ]);
  var indices = new Uint32Array([  // note that we start from 0!
    0, 1, 3,   // first triangle
    1, 2, 3    // second triangle
  ]);
  var d1 = Draw.createBasicDrawObject(shaderProgram);
  // d1.addVertices(vertices, 3);
  d1.addVerticesElements(vertices, indices);
  d1.setAttr({ index: 0, vsize: 3, stride: 8*gl.sizeof$float });
  d1.setAttr({ index: 1, vsize: 3, stride: 8*gl.sizeof$float, 
              offset: 4*gl.sizeof$float });
  d1.setAttr({ index: 2, vsize: 2, stride: 8*gl.sizeof$float, 
              offset: 6*gl.sizeof$float });
  window.add(d1);

  d1.loadTexImage("./art/container.jpg");
  // var imgobj = map0.sprites_tim[0];
  // imgobj.bindTexTo(d1);
  
  var roomIdx = 0;
  var notrel = 0;
  
  window.onKey(gl.GLFW_KEY_J, gl.GLFW_PRESS, 0, function() {
    if (notrel) return;
    notrel = true;
    if (roomIdx >= roomcut.count) roomIdx = 0;
    console.log('room', roomIdx);
    let room0 = Adt.unpack(roomcut.get8(roomIdx++));
    room0.bindTexTo(d1);
  });

  window.onKey(gl.GLFW_KEY_J, gl.GLFW_RELEASE, 0, function() {
    notrel = false;
  });

  window.onKey(gl.GLFW_KEY_K, gl.GLFW_PRESS, 0, function() {
    roomIdx = 0;
  });

  var transform = shaderProgram.getUniform('transform');
  var tmat = matrix.mat4.create(1);
  transform.active();
  transform.setMatrix4fv(1, gl.GL_FALSE, tmat);

  while (window.nextFrame()) {
  }
}

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

// window.prepareDraw();
// while (window.nextFrame()) {
// }
// // res_ctx.free();
// window.destroy();
