import Shader from './shader.js'
import Node   from '../boot/node.js'
const matrix = Node.load('boot/gl-matrix.js');
const {vec3, mat4} = matrix;

export default {
  zombie,
};


function zombie(mod, win) {
  const model_trans = mat4.create();
  const swap = new Array(16);
  // matrix.mat4.translate(tmat, tmat, [0, -4, 0]);
  // matrix.mat4.rotateZ(tmat, tmat, Math.PI);
  mod.setAnim(0, 0);
  mod.setDir(1);

  const thiz = {
    free,
    draw,
    setPos,
    setDirection,
  };
  win.add(thiz);
  return thiz;


  function setPos(x, y, z) {
    mat4.translate(model_trans, model_trans, _wrap0(x, y, z));
  }


  function setDirection(d) {
    let r = d/0x0FFF * Math.PI * 2;
    mat4.rotateY(model_trans, model_trans, r);
  }


  function draw(u, t) {
    Shader.setModelTrans(model_trans);
    mod.draw(u, t);
  }


  function free() {
    win.remove(thiz);
    mod.free();
    mod = null;
  }


  function _wrap0(x, y, z) {
    swap[0] = x;
    swap[1] = y;
    swap[2] = z;
    return swap;
  }
}