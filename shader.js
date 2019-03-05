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
  // 创建绘制对象, 无参数
  createBasicDrawObject,
  // 设置模型变换矩阵
  setModelTrans,
  // 设置骨骼总偏移向量
  boneOffset,
  // // 设置骨骼旋转矩阵
  // boneRotate,
  bindBoneOffset,
};

import Draw from '../boot/draw.js'

const FOVY = 60;
const NEAR = 1;
const FAR  = 45;
//
// 单例模式, 任何模块都引用同一个着色器程序
// 并且只能初始化一次
//
let program;
let draw_type;
let model;
let bind_bones;
let bind_len;
let bone_offset;


function init(window) {
  if (!window) throw new Error("window object not ready");
  if (program) throw new Error("cannot init repeat");

  const sp = Draw.createProgram();
  sp.readVertexShader("bio2/bio2.vert");
  // sp.readGeoShader("bio2/bio2.geo");
  sp.readFragShader("bio2/bio2.frag");
  sp.link();
  sp.setProjection(radians(FOVY), 4/3, NEAR, FAR);
  // test(sp, window);

  gl.glEnable(gl.GL_BLEND);
  gl.glBlendFunc(gl.GL_SRC_ALPHA, gl.GL_ONE_MINUS_SRC_ALPHA);
  
  draw_type   = sp.getUniform('draw_type');
  model       = sp.getUniform('model');
  bind_bones  = sp.getUniform('bind_bones');
  bind_len    = sp.getUniform('bind_len');
  bone_offset = sp.getUniform('bone_offset');

  program = sp;
  return sp;
}


function test(sp, w) {
  const i = w.input();
  let n = NEAR, r = FOVY, f = FAR;

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

  function setp() {
    sp.setProjection(radians(r), 4/3, n, f);
    console.line("Fov", r, "near", n, 'far', f);
  }
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


function boneOffset(x, y, z) {
  bone_offset && bone_offset.setUniform3f(x, y, z);
}


function radians(degress) {
  return degress * Math.PI/180;
}