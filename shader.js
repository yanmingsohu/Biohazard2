export default {
  // 初始化只能调用一次
  init,
  // 如果模块未初始化抛出异常
  check_init,
  // 绘制活物
  draw_living,
  // 绘制背景
  draw_background,
  // 绘制背景蒙版
  draw_mask,
  // 绘制不可见物体(地板, 空气墙)用于测试
  draw_invisible,
  // 创建绘制对象, 无参数
  createBasicDrawObject,
  // 设置模型变换矩阵
  setModelTrans,
  // 设置骨骼旋转矩阵
  // boneRotate,
  bindBoneOffset,
  // 使用投影矩阵变换顶点
  transformProjection,
  // 设置骨骼动画偏移
  setAnimOffset,
  // 更新摄像机视野
  setFov,
};

import Draw from '../boot/draw.js'
import Node from '../boot/node.js'
const matrix = Node.load('boot/gl-matrix.js');
const {vec4, mat4} = matrix;

const FOVY = 60;
const NEAR = 16;
const FAR  = 45000;
const DEF_RGB = new Float32Array([0.5, 0.5, 0.5]);
//
// 单例模式, 任何模块都引用同一个着色器程序
// 并且只能初始化一次
//
let program;
let draw_type;
let model;
let bind_bones;
let bind_len;
let rgb;
let anim_offset;
let n = NEAR, r = FOVY, f = FAR;


function init(window) {
  if (!window) throw new Error("window object not ready");
  if (program) throw new Error("cannot init repeat");

  const sp = program = Draw.createProgram();
  sp.readVertexShader("bio2/bio2.vert");
  // sp.readGeoShader("bio2/bio2.geo");
  sp.readFragShader("bio2/bio2.frag");
  sp.link();
  sp.setProjection(radians(FOVY), 4/3, NEAR, FAR);
  // test(sp, window);

  gl.glEnable(gl.GL_BLEND);
  gl.glEnable(gl.GL_ALPHA_TEST);
  gl.glBlendFunc(gl.GL_SRC_ALPHA, gl.GL_ONE_MINUS_SRC_ALPHA);
  
  draw_type   = sp.getUniform('draw_type');
  model       = sp.getUniform('model');
  bind_bones  = sp.getUniform('bind_bones');
  bind_len    = sp.getUniform('bind_len');
  rgb         = sp.getUniform('rgb');
  anim_offset = sp.getUniform('anim_offset');

  return sp;
}


function transformProjection(outvec4, srcvec4) {
  vec4.transformMat4(outvec4, srcvec4, program.getProjection());
}


function test(sp, w) {
  const i = w.input();
  console.log("Fov +/-, Near 7/8, Far 9/0");

  i.pressOnce(gl.GLFW_KEY_0, function() {
    f += 1; setp();
  });

  i.pressOnce(gl.GLFW_KEY_9, function() {
    f -= 1; setp();
  });

  i.pressOnce(gl.GLFW_KEY_EQUAL, function() {
    r += 1; setp();
  });

  i.pressOnce(gl.GLFW_KEY_MINUS, function() {
    r -= 1; setp();
  });

  i.pressOnce(gl.GLFW_KEY_8, function() {
    n += 1; setp();
  });

  i.pressOnce(gl.GLFW_KEY_7, function() {
    n -= 1; setp();
  });

  function setp() {
    updateProjection();
    console.line("Fov", r, "near", n, 'far', f);
  }
}


function setFov(fov) {
  if (fov > 0) {
    r = radians(fov);
    updateProjection();
  }
}


function updateProjection() {
  program.setProjection(r, 4/3, n, f);
}


function draw_living() {
  draw_type.setUniform1i(1);
}


function draw_background() {
  draw_type.setUniform1i(2);
}


function draw_mask() {
  draw_type.setUniform1i(3);
}


function draw_invisible(_rgbarr) {
  draw_type.setUniform1i(4);
  rgb.setUniform3fv(_rgbarr || DEF_RGB);
}


function createBasicDrawObject() {
  return Draw.createBasicDrawObject(program);
}


function check_init() {
  if (!program)
    throw new Error("shader module not init");
}


function setModelTrans(mat4) {
  model.setMatrix4fv(1, gl.GL_FALSE, mat4);
}


function bindBoneOffset(vec4arr, len) {
  bind_bones.setUniform4fv(vec4arr);
  bind_len.setUniform1i(len);
}


function radians(degress) {
  return degress * Math.PI/180;
}


function setAnimOffset(x, y, z) {
  anim_offset.setUniform4f(x, y, z, 0);
}