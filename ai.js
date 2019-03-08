import Shader from './shader.js'
import Game   from '../boot/game.js'
import Node   from '../boot/node.js'
import Tool   from './tool.js'
const matrix = Node.load('boot/gl-matrix.js');
const {vec3, mat4} = matrix;

// 按键绑定
const defaultKeyBind = {
  up    : gl.GLFW_KEY_W,
  down  : gl.GLFW_KEY_S,
  left  : gl.GLFW_KEY_A,
  right : gl.GLFW_KEY_D,
  gun   : gl.GLFW_KEY_L,
  run   : gl.GLFW_KEY_K,
  act   : gl.GLFW_KEY_J,
};

export default {
  zombie,
  player,
};


// TODO: 模型的移动需要与动画参数偏移数据同步
function player(mod, win, gameState) {
  const WALK = 8;
  const thiz = Base(mod, win, {});
  const play_range = gameState.play_range;
  const touch = gameState.touch;
  const survey = gameState.survey;
  let one_step = WALK;

  mod.setAnim(0, 0);
  // mod.setDir(-1);
  bind_ctrl(defaultKeyBind);

  return thiz;


  function move(s, d) {
    thiz.translate(thiz.wrap0(s, 0, 0));
    mod.setDir(d);
  
    if (undefined === Tool.inRanges(play_range, thiz)) {
      // TODO: 蹭墙移动
      thiz.translate(thiz.wrap0(-s, 0, 0));
    }

    let ti = Tool.inRanges(touch, thiz);
    if (ti >= 0) {
      let t = touch[ti];
      t.act();
    }
  }


  function bind_ctrl(bind) {
    const i = win.input();
    i.onKey(bind.right, gl.GLFW_PRESS, 0, function() {
      thiz.rotateY(0.01);
    });
  
    i.onKey(bind.left, gl.GLFW_PRESS, 0, function() {
      thiz.rotateY(-0.01);
    });
  
    i.onKey(bind.up, gl.GLFW_PRESS, 0, function() {
      move(one_step, -1);
    });
  
    i.pressOnce(bind.up, null, function() {
      mod.setDir(0);
    });

    i.onKey(bind.down, gl.GLFW_PRESS, 0, function() {
      move(-one_step, 1);
    });

    i.pressOnce(bind.down, null, function() {
      mod.setDir(0);
    });

    i.pressOnce(bind.act, function() {
      let si = Tool.inRanges(survey, thiz);
      if (si >= 0) {
        survey[si].act();
      }
    });

    i.pressOnce(bind.run, function() {
      one_step = 6 *WALK;
      mod.setDir(-3);
      // mod.setAnim(1, 0);
    }, function() {
      one_step = WALK;
      mod.setDir(-1);
      // mod.setAnim(0, 0);
    });
  }
}


function zombie(mod, win) {
  mod.setAnim(0, 0);
  mod.setDir(1);

  const thiz = Base(mod, win, {
  });
  const mx = thiz.mx;
  return thiz;
}


function Base(mod, win, ext) {
  // matrix.mat4.translate(tmat, tmat, [0, -4, 0]);
  // matrix.mat4.rotateZ(tmat, tmat, Math.PI);
  const thiz = {
    setDirection,
    setPos,
    draw, 
    free,
    wrap0,
  };

  win.add(thiz);
  const Tran = Game.Transformation(thiz);
  const model_trans = Tran.objTr;
  const swap = new Array(3);

  thiz.ms = model_trans;
  thiz.swap = swap; // 使用的元素必须完全清空

  return Object.assign(thiz, Tran);

  
  function draw(u, t) {
    Shader.setModelTrans(model_trans);
    mod.draw(u, t);
  }


  function free() {
    win.remove(thiz);
    mod.free();
    mod = null;
  }

  
  function setPos(x, y, z) {
    mat4.fromTranslation(model_trans, wrap0(x, y, z));
  }


  // d 是游戏角度参数 (0-4096)
  function setDirection(d) {
    let r = d/0x0FFF * Math.PI * 2;
    mat4.rotateY(model_trans, model_trans, r);
  }

  
  // 从 xyz 参数返回一个对应的数组, 数组被复用, 
  // 不会重复创建数组对象, 返回的数组立即使用, 不要长期保存.
  function wrap0(x, y, z) {
    swap[0] = x;
    swap[1] = y;
    swap[2] = z;
    return swap;
  }
}