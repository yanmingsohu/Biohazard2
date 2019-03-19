import Shader from './shader.js'
import Game   from '../boot/game.js'
import Tool   from './tool.js'
import Node   from '../boot/node.js'
import { Point2, Triangle2 } from './tool.js'
const matrix = Node.load('boot/gl-matrix.js');
const {vec4, mat4} = matrix;
const PI_360 = Math.PI * 2;

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
function player(mod, win, order, gameState, camera) {
  const WALK       = 15;
  const ROT        = 0.015;
  const WALK_SPEED = 30 / 1000;

  const play_range = gameState.play_range;
  const touch      = gameState.touch;
  const survey     = gameState.survey;
  const collisions = gameState.collisions;
  const thiz       = Base(mod, win, order, {
    back,
    traverse,
  });

  let one_step = WALK;
  let run = 0;
  let dir = -1;

  mod.setAnim(0, 0);
  mod.setSpeed(WALK_SPEED);
  // mod.setDir(-1);
  bind_ctrl(defaultKeyBind);

  return thiz;


  function move() {
    thiz.translate(thiz.wrap0(one_step + run, 0, 0));
    mod.setDir(dir);
  
    if (undefined === Tool.inRanges(play_range, thiz)) {
      back();
    }

    let ti = Tool.inRanges(touch, thiz);
    if (ti >= 0) {
      let t = touch[ti];
      t.act();
    }
    
    // w 是对 where 返回对象的引用, 调用 where 会影响 w 的值.
    const w = thiz.where();
    const p = new Point2(w[0], w[2]);
    
    for (let i=0, l=collisions.length; i<l; ++i) {
      let c = collisions[i];
      if (c.play_on && c.block && c.py) {
        c.py.in(p, thiz);
        thiz.where();
        p.x = w[0];
        p.y = w[2];
      }
    }
    // console.line('player:', thiz.where());
  }


  // 横向移动, rate(0,1)
  function traverse(rate) {
    thiz.translate(thiz.wrap0(0, 0, (one_step + run) * rate));
  }


  function back() {
    thiz.translate(thiz.wrap0(-one_step - run, 0, 0));
  }


  // 返回角色在屏幕上的坐标(测试用)
  function screenPos() {
    let pos = thiz.where();
    let out = [pos[0], pos[1]+2100, pos[2], 1];
    // vec4.transformMat4(out, out, thiz.objTr);
    camera.transform(out, out);
    out[3] = 1;
    Shader.transformProjection(out, out);
    // vec4.normalize(out, out);
    out[0] /= out[3];
    out[1] /= out[3];
    out[2] /= out[3];
    out[3] /= out[3];
    return out;
  }


  function bind_ctrl(bind) {
    const i = win.input();
    i.onKey(bind.right, gl.GLFW_PRESS, 0, function() {
      thiz.rotateY(ROT);
    });
  
    i.onKey(bind.left, gl.GLFW_PRESS, 0, function() {
      thiz.rotateY(-ROT);
    });
  
    i.onKey(bind.up, gl.GLFW_PRESS, 0, function() {
      one_step = WALK;
      dir = -1;
      move();
    });
  
    i.pressOnce(bind.up, null, function() {
      mod.setDir(0);
    });

    i.onKey(bind.down, gl.GLFW_PRESS, 0, function() {
      one_step = -WALK;
      dir = 1;
      move();
    });

    i.pressOnce(bind.down, null, function() {
      mod.setDir(0);
    });

    i.pressOnce(bind.act, function() {
      let si = Tool.inRanges(survey, thiz);
      if (si >= 0) {
        survey[si].act();
      }
      console.line('player:', thiz.where());
    });

    i.pressOnce(bind.run, function() {
      if (one_step < 0) return;
      run = 3 *WALK;
      dir = -3;
      // TODO: 切换到跑步动画
      // mod.setAnim(1, 0);
      let z = screenPos()[2];
      console.line('screen-z:', z, (45000-16)* z + 16);
    }, function() {
      run = 0;
      // mod.setAnim(0, 0);
    });
  }
}


function zombie(mod, win, order) {
  mod.setAnim(0, 0);
  mod.setDir(1);

  const thiz = Base(mod, win, order, {
  });
  const mx = thiz.mx;
  return thiz;
}


function Base(mod, win, order, ext) {
  const thiz = {
    setDirection,
    setPos,
    draw, 
    free,
    wrap0,
    rotateY,
    getAngle,
  };

  order.addMod(thiz);
  const Tran = Game.Transformation(thiz);
  const model_trans = Tran.objTr;
  const swap = new Array(3);
  let angle = 0;

  thiz.ms = model_trans;
  thiz.swap = swap; // 使用的元素必须完全清空

  return Object.assign(Tran, thiz, ext);


  function rotateY(rad) {
    mat4.rotateY(this.objTr, this.objTr, rad);
    angle += rad;
    if (angle > PI_360) angle = angle - PI_360;
    else if (angle < 0) angle = PI_360 + angle;
  }


  // 角度可以大于 2PI 小于 0
  function getAngle() {
    return angle;
  }

  
  function draw(u, t) {
    Shader.setModelTrans(model_trans);
    mod.draw(u, t);
  }


  function free() {
    // win.remove(thiz);
    order.rmMod(thiz);
    mod.free();
    mod = null;
  }

  
  function setPos(x, y, z) {
    model_trans[12] = x;
    model_trans[13] = y;
    model_trans[14] = z;
    // mat4.fromTranslation(model_trans, wrap0(x, y, z));
  }


  // d 是游戏角度参数 (0-4096)
  function setDirection(d) {
    let r = d/0x0FFF * Math.PI * 2;
    // mat4.rotateY(model_trans, model_trans, r);
    let s = Math.sin(r);
    let c = Math.cos(r);
    model_trans[0] = c;
    model_trans[2] = -s;
    model_trans[8] = s;
    model_trans[10] = c;
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
