import Game   from '../boot/game.js'
import Node   from '../boot/node.js'
import Sound  from './sound.js'
import Shader from './shader.js'
import Tool, { Point2, Triangle2 } from './tool.js'

const matrix = Node.load('boot/gl-matrix.js');
const {vec2, mat4} = matrix;
const PI_360 = Math.PI * 2;
const ANTENNA_LEN = 800;
const FLOOR_PER_PIXEL = 1800;

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




//
// 玩家模型动作说明, 0:步行, 1:恐惧后退, 2:死亡倒下, 3:从正面被攻击, 4:从背面被攻击
// 5:?, 6:蹲下/站起, 7:准备推动, 8:向前推动, 9:轻伤前进
// 10:步行, 11:跑步, 12:站立, 13:轻伤步行, 14: 轻伤跑步, 15:轻伤站立
// 16:重伤步行, 17:重伤跑步, 18:重伤站立, 
// 19:向前方举枪, 20:向前方开枪, 21:向前方瞄准(不动)
// 22:向上方开枪, 23:向上方瞄准(不动), 24:向下方开枪, 25:向下方瞄准(不动)
// 26:重装子弹
//
// TODO: 模型的移动需要与动画参数偏移数据同步
function player(mod, win, order, gameState, camera) {
  // 转圈系数: 原地, 走路, 奔跑
  const ROT_COE    = [0.022, 0.011, 0.015]
  const RUN_SP     = 25;
  const WALK       = 16;
  const WALK_SPEED = 30;

  const input      = win.input();
  const play_range = gameState.play_range;
  const touch      = gameState.touch;
  const survey     = gameState.survey;
  const collisions = gameState.collisions;
  const floors     = gameState.floors;
  const thiz       = Base(gameState, mod, win, order, {
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
  let current_floor;
  // 举枪
  let gun, rot = ROT_COE[0];

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
    if (gun) {
      changePose(21);
    }
    else if (forward) {
      one_step = WALK;
      if (run) {
        rot = ROT_COE[2];
        changeDir(1);
        changePose(11);
      } else {
        rot = ROT_COE[1];
        changeDir(-1);
        changePose(0);
      }
      move();
    } 
    else if (goback) {
      rot = ROT_COE[1];
      changeDir(1);
      one_step = -WALK;
      changePose(0);
      move();
    } else {
      stand = true;
      rot = ROT_COE[0];
    }
    
    if (gleft) {
      thiz.rotateY(-rot);
      stand && changePose(0);
    } else if (gright) {
      thiz.rotateY(rot);
      stand && changePose(0);
    } else if (stand) {
      changePose(12);
    }
  }


  function move() {
    let step = (one_step + run) + ((thiz.move_speed[2]+0.1)/15) + thiz.move_speed[0]/800;
    thiz.translate(thiz.wrap0(step, 0, 0));
    // w 是对 where 返回对象的引用, 调用 where 会影响 w 的值.
    const w = thiz.where();
    const p = new Point2(w[0], w[2]);
    const floor = thiz.floor();
  
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
      // TODO: 每个碰撞物对 flag 的处理方式不同, 这样处理错误!
      if (c.play_on && c.floor_block[floor] && c.py) {
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
    let r = Tool.xywd2range({x, y, w:100, d:100});
    let color = new Float32Array([0.5, 0.5, 1]);
    gameState.garbage(Tool.showRange(r, win, color, -110));
    console.log(x, y);
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
    i.pressOnce(bind.gun,   ()=>{ gun = 0.5; rot=ROT_COE[0]; }, 
                            ()=>{ gun = 0; rot=ROT_COE[0]; });
    i.pressOnce(bind.act, check_front);
  }
}


//
// 僵尸动作说明: 0.手放下缓慢前进; 1.手放下稍快前进; 2.3.手放下大步前进; 
// 4.抬手八字步前进; 5.抬手八字步快速前进; 6.抬手直立前进; 7.抬手快速前进;
// 8.原地徘徊; 9.向前倒地; 10.向后倒地; 11.向前趔趄; 12.向后趔趄;
// 13.向前爬; 14.爬行时中枪; 15.爬行死亡; 16.面朝下爬起并站立; 17.面朝上爬起并站立;
// 18.双手向前扑倒; 19.??站立双手抬起,尝试攻击(过渡动作); 20.站立啃咬; 
// 21.向后趔趄(腿部动作不同); 22.爬行时尝试攻击(过渡动作); 23.爬行啃咬;
// 24.???啃咬时被攻击; 25.站立被射击; 26.跪在地上啃咬; 27.跪在地上啃咬2;
// 28.跪在地上啃咬3; 29.跪在地上并站起; 30.面朝上抽动; 31.面朝下抽动;
// 32.彻底扑倒后撕咬(应该是玩家空血后被扑倒);
// 33.由原地站立后抬手(?); 34.原地抬手(不动); 35.向前扑空;
// 36.被机枪攻击1; 37.被机枪攻击2; 38.被机枪攻击3; 39.??过渡动作,一只手抬起
// 40.??一只手向前推(铁砂掌?); 41.用肩膀撞击, 后巷用到这个动作;
// 42.向43的过渡动作(尝试攻击?); 43.站立啃咬动作?; 44.??站立甩头浑身扭动
// 45.向46的过渡动作; 46.踩蟑螂?????; 47.向48的过渡动作; 48.??射门,球进了(一点没开玩笑)
// 49.向50的过渡动作; 50.瘸了一条腿前进; 51.瘸了一条腿转身????;
// 52.向后倒地, 并作出死不瞑目的手部动作;
// 53.面朝上躺在地上, 头部似乎要转向; 54.向前倒地, 手部抬起似乎在喊着我还不能死;
// 55.和54有某种关系;
//
function zombie(mod, win, order, gameState, se, data) {
  // mod.setAnim(8, 0);
  // mod.setAnim(0, parseInt(Math.random() * mod.getPoseFrameLength()));
  // if (data.state != 64 && data.state != 0) {
  //   mod.setDir(1);
  // }

  const thiz = Base(gameState, mod, win, order, {
  });

  // mod.setAnimSound(se);
  return thiz;
}


//
// 舔食者动画编号与说明:
// 0.中速爬行; 1.缓慢爬行; 2.站立前进; 3.趴着原地徘徊; 4.站立原地徘徊(警戒);
// 5.趴着与站立过渡,慢速; 6.趴着与站立过渡,快速; 7.吼叫; 8.被攻击;
// 9.面朝上倒地; 10.面朝下倒地; 11.面朝上扭动直到死亡; 12.从平面横向爬到右手边的墙壁上;
// 13.准备起跳?; 14.跳跃; 15.??某种过渡动作; 16.从平面向前爬下垂直的墙壁;
// 17.从平面向前爬上垂直的墙壁; 18.在天花板上转身准备落地; 19.落到地面上缓冲;
// 20.??在地面上抖动; 21.右爪攻击; 22.面朝上倒地后翻身回到爬行态; 23-26???
// 27.横向移动; 28.从站立状态(被攻击)向后仰倒; 29.跪着(被攻击)向前扑倒挣扎死亡;
// 30.向前爬行; 31.站立攻击第一部分(抬起手); 32.站立攻击第二部分(命中); 
// 33.站立攻击第三部分(结束); 34.35.36 被攻击的三部分.
//
function licker(mod, win, order, gameState, se, data) {
  // mod.setAnim(8, 0);
  // if (data.state != 64 && data.state != 0) {
  //   mod.setDir(1);
  // }

  const thiz = Base(gameState, mod, win, order, {
  });

  // mod.setAnimSound(se);
  return thiz;
}


function Base(gameState, mod, win, order, ext) {
  const thiz = {
    setDirection,
    setPos,
    moveTo,
    turnAround,
    lookAt,
    draw, 
    free,
    wrap0,
    rotateY,
    getAngle,
    setAnim,
    frontPoint,
    floor,
  };

  order.addMod(thiz);
  const ch_free = ext.free;
  const Tran = Game.Transformation(thiz);
  const model_trans = Tran.objTr;
  const moving_destination = [];
  const swap = new Array(3);
  const zero = [0,0,0];
  const move_speed = mod.getMoveSpeed();
  let angle = 0;
  let ex_anim_index = -1;
  let _state = 0;

  thiz.ms = model_trans;
  thiz.swap = swap; // 使用的元素必须完全清空
  thiz.move_speed = move_speed;
  delete ext.free;
  mod.moveImmediately();

  return Object.assign(Tran, thiz, ext);


  function setAnim(flag, type, idx) {
    const reverse_dir = flag & 0x80;
    const part = flag & 0x10;
    
    if (type == 1) {
      mod.setAnim(idx, 0, 0);
    } else if (type == 0) {
      if (ex_anim_index <= 0) {
        const md = mod.getMD();
        ex_anim_index = md.poseCount();
        gameState.bind_ex_anim(md, ex_anim_index);
      }
      mod.setAnim(idx + ex_anim_index, 0, 0);
    }

    if (reverse_dir) {
      mod.setDir(-1);
      let len = mod.getPoseFrameLength();
      mod.setFrame(len-1);
    } else {
      mod.setDir(1);
    }
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
    if (_state == 1) _move();
    ext.draw && ext.draw(u, t);
    Shader.setModelTrans(model_trans);
    mod.draw(u, t);
  }


  function _move() {
    const STEP = 10;
    let x = model_trans[12] - moving_destination[0];
    let y = model_trans[13] - moving_destination[1];
    let z = model_trans[14] - moving_destination[2];
    let need = Math.abs(x) > 10 || Math.abs(y) > 10 || Math.abs(z) > 10;

    if (need) {
      model_trans[12] -= Math.min(x, STEP);
      model_trans[13] -= Math.min(y, STEP);
      model_trans[14] -= Math.min(z, STEP);
    } else {
      mod.setAnim(12, 0);
      _state = 0;
    }
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
  }

  
  function moveTo(x, y, z, abs = 1) {
    _state = 1;
    mod.setAnim(0);
    mod.setDir(-1);
    if (abs) {
      moving_destination[0] = x;
      moving_destination[1] = y;
      moving_destination[2] = z;
    } else {
      moving_destination[0] = x + model_trans[12];
      moving_destination[1] = y + model_trans[13];
      moving_destination[2] = z + model_trans[14];
    }
    // mat4.fromTranslation(model_trans, wrap0(x, y, z));
    Tool.debug("Move TO", x, y, z, '====================================');
  }


  function lookAt(x, y, z) {
    // mat4.lookAt(this.objTr, Tran.where(), [x,y,z], [0,1,0]);
    Tool.debug("Look AT", x, y, z, '-========================================');
  }


  // neck: x,y,z, spx,spz, op
  function turnAround(neck) {
    // mat4.lookAt(this.objTr, Tran.where(), [neck.x,neck.y,neck.z], [0,1,0]);
    Tool.debug("Turn Around", neck, '-========================================');
  }


  //
  // 返回角色前方检测点, 返回的对象立即使用, 之后该对象将被复用.
  //
  function frontPoint() {
    const w = Tran.where();
    // 向前方探出触角的长度(游戏单位)
    swap[0] = ANTENNA_LEN;
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


  //
  // 返回角色所在楼层的高度, 一个高度为1800像素, 总是>0
  //
  function floor() {
    // x 像素误差, 使接近上层也认为在上层
    const x = 10;
    let f = -parseInt((this.where()[1] - x) / FLOOR_PER_PIXEL); 
    //console.line(this.where()[1], f)
    return f;
  }
}
