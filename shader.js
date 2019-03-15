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
  // 设置环境光颜色
  setEnvLight,
  // 设置三个灯光
  setLights,
  // 返回蒙版深度对应的 z 值
  maskDepth,
};

import Draw from '../boot/draw.js'
import Node from '../boot/node.js'
const matrix = Node.load('boot/gl-matrix.js');
const {vec4, mat4} = matrix;

const MASK_DEPTH_X = 0x1E0;
const FOVY = 60;
const NEAR = 16;
const FAR  = 45000;
const DEF_RGB = new Float32Array([0.5, 0.5, 0.5]);
const COLOR_DIV = 0xFF;
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
let env_light;
let lights;
let view_pos;
let n = NEAR, r = FOVY, f = FAR;


class UiLight {
  constructor(sp, i) {
    const pri   = 'lights['+ i +']';
    this.type   = sp.getUniform(pri +'.type', true);
    this.color  = sp.getUniform(pri +'.color', true);
    this.pos    = sp.getUniform(pri +'.pos', true);
    this.bright = sp.getUniform(pri +'.bright', true);
  }
}


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
  env_light   = sp.getUniform('env_light');
  view_pos    = sp.getUniform('view_pos');
  lights      = [ new UiLight(sp, 0), 
                  new UiLight(sp, 1), 
                  new UiLight(sp, 2) ];
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
    // console.log(--MASK_DEPTH_X);
  });

  i.pressOnce(gl.GLFW_KEY_9, function() {
    f -= 1; setp();
    // console.log(++MASK_DEPTH_X);
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


function setFov(_fov) {
  if (_fov > 0) {
    r = radians(_fov);
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


function setEnvLight(color) {
  env_light.setUniform3f(
    color.r/COLOR_DIV, color.g/COLOR_DIV, color.b/COLOR_DIV);
}


function setLights(camera, def, l1, l2) {
  set(lights[0], def);
  set(lights[1], l1);
  set(lights[2], l2);

  const cpos = camera.pos();
  view_pos.setUniform4f(cpos[0], cpos[1], cpos[2], 1);

  function set(u, l) {
    u.type.setUniform1i(l.type);
    u.color.setUniform3f(l.color.r, l.color.g, l.color.b);
    u.pos.setUniform4f(l.pos.x, l.pos.y, l.pos.z, 1);
    u.bright.setUniform1f(l.bright);
  }
}


function maskDepth(d) {
  // TODO: 深度值需要进一步精确
  // d = MASK_DEPTH_X - d;
  // return (1/d - 1/NEAR) / (1/FAR - 1/NEAR);
  return 1- (MASK_DEPTH_X - d - NEAR) / (FAR - NEAR);
}