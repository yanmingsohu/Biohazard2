export default {
  // 初始化只能调用一次
  init,
  // 如果模块未初始化抛出异常
  check_init,
  // 绘制活物
  draw_living,
  // 绘制背景
  draw_background,
  // 创建绘制对象, 无参数
  createBasicDrawObject,
  // 设置模型变换矩阵
  setModelTrans,
  // 设置骨骼偏移向量
  boneOffset,
  // 设置骨骼旋转矩阵
  boneRotate,
};

import Draw from '../boot/draw.js'


//
// 单例模式, 任何模块都引用同一个着色器程序
// 并且只能初始化一次
//
let program;
let draw_type;
let model;
let bone_rotate;
let bone_offset;


function init(window) {
  if (!window) throw new Error("window object not ready");
  if (program) throw new Error("cannot init repeat");

  const sp = Draw.createProgram();
  sp.readVertexShader("bio2/bio2.vert");
  // sp.readGeoShader("bio2/bio2.geo");
  sp.readFragShader("bio2/bio2.frag");
  sp.link();
  sp.setProjection(45, 4/3, 0.01, 1000);

  gl.glEnable(gl.GL_BLEND);
  gl.glBlendFunc(gl.GL_SRC_ALPHA, gl.GL_ONE_MINUS_SRC_ALPHA);
  
  draw_type   = sp.getUniform('draw_type');
  model       = sp.getUniform('model');
  bone_offset = sp.getUniform('bone_offset');
  bone_rotate = sp.getUniform('bone_rotate');

  program = sp;
  return sp;
}


function draw_living() {
  draw_type.setUniform1i(1);
}


function draw_background() {
  draw_type.setUniform1i(2);
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


function boneOffset(x, y, z) {
  bone_offset.setUniform3f(x, y, z);
}


function boneRotate(mat4) {
  bone_rotate.setMatrix4fv(1, gl.GL_FALSE, mat4);
}
