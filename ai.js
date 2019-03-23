import Shader from './shader.js'
import Game   from '../boot/game.js'
import Tool   from './tool.js'
import Node   from '../boot/node.js'
import Sound  from './sound.js'
import { Point2, Triangle2 } from './tool.js'
const matrix = Node.load('boot/gl-matrix.js');
const {vec2, mat4} = matrix;
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
  const RUN_SP     = 27;
  const WALK       = 15;
  const ROT        = 0.018;
  const WALK_SPEED = 30;

  const input      = win.input();
  const play_range = gameState.play_range;
  const touch      = gameState.touch;
  const survey     = gameState.survey;
  const collisions = gameState.collisions;
  const floors     = gameState.floors;
  const thiz       = Base(mod, win, order, {
    able_to_control,
    back,
    traverse,
    draw,
  });

  let one_step = WALK;
  // 前进
  let forward;
  // 跑步
  let run = 0;
  let dir = 0;
  // 后退
  let goback = 0;
  // 左转/右转
  let gleft, gright;
  let currpose;
  let current_floor = Sound.floorSE(0);

  mod.setSpeed(WALK_SPEED);
  bind_ctrl(input, defaultKeyBind);
  changePose(12);
  changeDir(1);

  return thiz;


  function able_to_control(able) {
    input.pause(!able);
  }


  function changePose(id) {
    if (id != currpose) {
      currpose = id;
      mod.setAnim(id, 0);
      mod.setDir(dir);
    }
  }


  function changeDir(d) {
    if (dir != d) {
      mod.setDir(d);
      dir = d;
    }
  }


  function draw(u) {
    let stand;
    if (forward) {
      one_step = WALK;
      if (run) {
        changeDir(1);
        changePose(11);
      } else {
        changeDir(-1);
        changePose(0);
      }
      move();
    } else if (goback) {
      changeDir(1);
      one_step = -WALK;
      changePose(0);
      move();
    } else {
      stand = true;
    }
    
    if (gleft) {
      thiz.rotateY(-ROT);
      stand && changePose(0);
    } else if (gright) {
      thiz.rotateY(ROT);
      stand && changePose(0);
    } else if (stand) {
      changePose(12);
    }
  }


  function move() {
    thiz.translate(thiz.wrap0(one_step + run, 0, 0));
    // w 是对 where 返回对象的引用, 调用 where 会影响 w 的值.
    const w = thiz.where();
    const p = new Point2(w[0], w[2]);
  
    if (undefined === Tool.inRanges(play_range, w[0], w[2])) {
      back();
    }

    for (let i=0; i<touch.length; ++i) {
      let t = touch[i];
      if (Tool.inRange(t, w[0], w[2])) {
        t.act(thiz);
      } else if (t.leave) {
        t.leave(thiz);
      }
    }
    
    for (let i=0, l=collisions.length; i<l; ++i) {
      let c = collisions[i];
      if (c.play_on && c.block && c.py) {
        c.py.in(p, thiz);
        thiz.where();
        p.x = w[0];
        p.y = w[2];
      }
    }

    for (let i=0; i<floors.length; ++i) {
      let f = floors[i];
      if (f.range && Tool.inRange(f.range, w[0], w[2])) {
        if (current_floor != f) {
          current_floor = f;
          mod.setAnimSound(f);
        }
        break;
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


  function check_front() {
    const w = thiz.frontPoint();
    const x = w[0];
    const y = w[2];
    for (let i=survey.length-1; i>=0; --i) {
      let s = survey[i];
      if (Tool.inRange(s, x, y)) {
        s.act();
      }
    }

    // 可视化检测点
    // let r = Tool.xywd2range({x, y, w:100, d:100});
    // let color = new Float32Array([0.5, 0.5, 1]);
    // Tool.showRange(r, win, color, -110);
  }


  // 返回角色在屏幕上的坐标(测试用)
  function screenPos() {
    let pos = thiz.where();
    let out = [pos[0], pos[1], pos[2], 1];
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


  function bind_ctrl(i, bind) {
    i.pressOnce(bind.left,  ()=>{ gleft = 1     }, ()=>{ gleft = 0   });
    i.pressOnce(bind.right, ()=>{ gright = 1    }, ()=>{ gright = 0  });
    i.pressOnce(bind.up,    ()=>{ forward = 1   }, ()=>{ forward = 0 });
    i.pressOnce(bind.down,  ()=>{ goback = 1    }, ()=>{ goback = 0; });
    i.pressOnce(bind.run,   ()=>{ run = RUN_SP; }, ()=>{ run = 0;    });
    i.pressOnce(bind.act, check_front);
  }
}


function zombie(mod, win, order, gameState, se, data) {
  mod.setAnim(0, 0);
  mod.setAnim(0, parseInt(Math.random() * mod.getPoseFrameLength()));
  if (data.state != 64 && data.state != 0) {
    mod.setDir(1);
  }

  const thiz = Base(mod, win, order, {
  });

  // mod.setAnimSound(se);
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
    setAnim,
    frontPoint,
    lookAt,
  };

  order.addMod(thiz);
  const ch_free = ext.free;
  const Tran = Game.Transformation(thiz);
  const model_trans = Tran.objTr;
  const swap = new Array(3);
  const zero = [0,0,0];
  let angle = 0;

  thiz.ms = model_trans;
  thiz.swap = swap; // 使用的元素必须完全清空
  delete ext.free;

  return Object.assign(Tran, thiz, ext);


  //
  // 动作说明, 0,1:步行, 2:后退, 3:倒下, 4,6:被攻击后倾, 5:被攻击前倾
  // 7:蹲下, 8,9:不明, 10:步行, 11:跑动, 12:原地站立, 13:受伤步行
  // 14: 受伤跑步, 15:原地站立叉腰?, 16-26:举枪/射击, 26:重装子弹
  //
  function setAnim(a, b) {
    mod.setAnim(a, 0, 0);
  }


  // neck: x,y,z, spx,spz, op
  function lookAt(neck) {
    // let to = mat4.create();
    // mat4.targetTo(to, Tran.where(), [neck.x, neck.y, neck.z], [0,-1,0]);
    // mat4.multiply(this.objTr, this.objTr, to);
    console.log("Look AT", neck, '-========================================');
  }


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
    ext.draw && ext.draw(u, t);
    Shader.setModelTrans(model_trans);
    mod.draw(u, t);
  }


  function free() {
    // win.remove(thiz);
    order.rmMod(thiz);
    mod.free();
    mod = null;
    ch_free && ch_free();
  }

  
  function setPos(x, y, z) {
    model_trans[12] = x;
    model_trans[13] = y;
    model_trans[14] = z;
    // mat4.fromTranslation(model_trans, wrap0(x, y, z));
  }


  //
  // 返回角色前方检测点, 返回的对象立即使用, 之后该对象将被复用.
  //
  function frontPoint() {
    const w = Tran.where();
    // 向前方探出触角的长度(游戏单位)
    swap[0] = 800;
    swap[1] = 0;
    vec2.rotate(swap, swap, zero, -angle);
    swap[0] = swap[0] + w[0];
    swap[2] = swap[1] + w[2];
    return swap;
  }


  // d 是游戏角度参数 (0-4096)
  function setDirection(d) {
    angle = d/0x0FFF * Math.PI * 2;
    // mat4.rotateY(model_trans, model_trans, r);
    let s = Math.sin(angle);
    let c = Math.cos(angle);
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
