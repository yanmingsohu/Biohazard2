import Game   from '../boot/game.js'
import Node   from '../boot/node.js'
import Sound  from './sound.js'
import Shader from './shader.js'
import Tool, { Point2, Triangle2, Counter } from './tool.js'
import Coll   from './collision.js'

const matrix = Node.load('boot/gl-matrix.js');
const {vec2, mat4} = matrix;
const PI_360 = Math.PI * 2;
const PI_180 = Math.PI;
const PI_90  = Math.PI / 2;
const PI_45  = 45 * Math.PI/180;
const PI_315 = -45 * Math.PI/180;
const PI_270 = 270 * Math.PI/180;
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
  Npc,
};


//
// 玩家模型动作说明, 0:后退, 1:恐惧后退, 2:死亡倒下, 3:从正面被攻击, 4:从背面被攻击
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
    be_attacked,
    break_free,
    set_weapon,
  });

  let one_step = WALK;
  // 前进
  let forward;
  // 跑步
  let run = 0;
  // 后退
  let goback = 0;
  // 左转/右转
  let gleft, gright;
  let current_floor;
  // 举枪
  let gun, rot = ROT_COE[0];
  let attacked_time = 0;
  let wait;
  let be_attacked_pose = 3;
  let break_free_pose = 5;
  let bullet = 0;
  let weapon;

  mod.setSpeed(WALK_SPEED);
  bind_ctrl(input, defaultKeyBind);
  thiz.changePose(12, 1);
  thiz.installCollision(1500);

  return thiz;


  function set_weapon(w) {
    if (w == null) throw new Error("null weapon");
    weapon = w;
    bullet = weapon.clip;
  }


  function able_to_control(able) {
    input.pause(!able);
    thiz.setAnimFrame(0);
  }


  function be_attacked(time, att_pose_data, break_pose_data) {
    attacked_time = time;
    if (!att_pose_data) {
      be_attacked_pose = 3;
    } else {
      be_attacked_pose = 27;
      mod.getMD().addPose(att_pose_data, be_attacked_pose);
    }
    if (!break_pose_data) {
      break_free_pose = 5;
    } else {
      break_free_pose = 28;
      mod.getMD().addPose(break_pose_data, break_free_pose);
    }
  }


  function break_free() {
    return attacked_time <= 0;
  }


  function draw(u, t) {
    // mod.show_info();
    if (wait) return;

    if (attacked_time > 0) { // TODO: 上子弹时被攻击无效
      if (t - attacked_time > 5) {
        wait = true;
        attacked_time = 0;
        thiz.changePose(break_free_pose, 1);
        thiz.setAnimFrame(0);
        mod.setAnimEndAct(2, function() {
          wait = false;
        });
      } else {
        thiz.changePose(be_attacked_pose, -1);
      }
      return;
    }

    let stand;
    if (gun == 1) {
      wait = 1;
      thiz.changePose(19, 1);
      thiz.setAnimFrame(0);
      mod.setAnimEndAct(2, function() {
        gun = 2;
        wait = 0;
        thiz.changePose(21, -1);
      });
    }
    else if (gun == 2) {
      if (forward) {
        thiz.changePose(23, 1);
      } else if (goback) {
        thiz.changePose(25, 1);
      } else {
        thiz.changePose(21, 1);
      }
    }
    else if (forward) {
      one_step = WALK;
      if (run) {
        rot = ROT_COE[2];
        thiz.changePose(11, 1);
      } else {
        rot = ROT_COE[1];
        thiz.changePose(10, 1);
      }
      move(u);
    } 
    else if (goback) {
      run = 0;
      rot = ROT_COE[1];
      one_step = -WALK;
      thiz.changePose(0, 1);
      move(u);
    } else {
      stand = true;
      rot = ROT_COE[0];
    }
    
    if (gleft) {
      thiz.rotateY(-rot*(u*140));
      stand && thiz.changePose(0, 1);
    } else if (gright) {
      thiz.rotateY(rot*(u*140));
      stand && thiz.changePose(0, -1);
    } else if (stand) {
      thiz.changePose(12, 1);
    }
  }


  function action() {
    // gun == 1.正在举枪; 2.瞄准; 3.开枪
    if (gun) {
      if (gun == 2) { 
        gun = 3;
        wait = 1;
        let anim_gun_shot;

        if (--bullet < 0) {
          anim_gun_shot = 26;
          bullet = weapon.clip; // TODO:装弹计算
        }
        else if (forward) {
          anim_gun_shot = 22;
        } else if (goback) {
          anim_gun_shot = 24;
        } else {
          anim_gun_shot = 20;
        }
        
        thiz.changePose(anim_gun_shot, 1);
        thiz.setAnimFrame(0);
        mod.setAnimEndAct(2, function() {
          if (gun) gun = 2;
          wait = 0;
        });

        // 对敌人进行伤害计算
        if (anim_gun_shot != 26) {
          if (weapon.mul) {
            multiple_attacks();
          }
        }
      }
    } else {
      check_front();
    }
  }


  function multiple_attacks() {
    const PI_SCOPE = 20 * Math.PI/180;
    let an = -thiz.getAngle();
    let p1 = thiz.getPosPoint();
    let p2 = new Point2(p1.x + weapon.scope, p1.y);
    let t = new Triangle2(p1, 
        p2.rotate(p1, an+PI_SCOPE), p2.rotate(p1, an-PI_SCOPE));
    // gameState._show_point(t.p2.x, t.p2.y);
    // gameState._show_point(t.p3.x, t.p3.y);
    // gameState._show_point(p1.x, p1.y);

    for (let i=0; i<gameState.enemy.length; ++i) {
      const e = gameState.enemy[i];
      if (t.in(e.getPosPoint())) {
        e.attack(weapon);
      }
    }
  }


  function move(u) {
    // step/rot 基于 140 帧来调试的, 在其他帧率需要乘以倍数.
    let step = ((one_step + run) + 
        ((thiz.anim_speed_addition[2]+0.1)/15) 
        + thiz.anim_speed_addition[0]/800) *(u*140);
    thiz.translate(thiz.wrap0(step, 0, 0));
    // thiz.moveForward(u);

    // w 是对 where 返回对象的引用, 调用 where 会影响 w 的值.
    // const w = thiz.where();
    let p = thiz.getPosPoint();
    const floor = thiz.floor();
  
    if (undefined === Tool.inRanges(play_range, p.x, p.y)) {
      back();
    }

    for (let i=0; i<touch.length; ++i) {
      let t = touch[i];
      if (Tool.inRange(t, p.x, p.y)) {
        t.act(thiz);
      } else if (t.leave) {
        t.leave(thiz);
      }
    }
    
    for (let i=0, l=collisions.length; i<l; ++i) {
      let c = collisions[i];
      // TODO: 每个碰撞物对 flag 的处理方式不同, 这样处理不完整!
      if (c.play_on && c.floor_block[floor] && c.py) {
        c.py.in(p, thiz);
        p = thiz.getPosPoint();
      }
    }

    for (let i=0; i<floors.length; ++i) {
      let f = floors[i];
      if (f.range && Tool.inRange(f.range, p.x, p.y)) {
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
    // gameState._show_point(x, y);
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
    i.pressOnce(bind.gun,   ()=>{ gun = 1; rot=ROT_COE[0]; }, 
                            ()=>{ gun = 0; rot=ROT_COE[0]; });
    i.pressOnce(bind.act, action);
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
// 33.由原地站立后抬手(?); 34.原地抬手(不动); 35.(向前扑空x)吐东西;
// 36.被机枪攻击1; 37.被机枪攻击2; 38.被机枪攻击3; 39.??过渡动作,一只手抬起

// * 从 40 号动作开始为玩家动作
// 40.从正面被僵尸咬, 41.用肩膀撞开正面的僵尸
// 42.向43的过渡动作(尝试攻击?); 43.从背面被僵尸咬; 44.从后面被僵尸咬
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
  let state = 8;
  let thepath = null;
  let frame = 0;
  let hp = 10;
  let counter = new Counter();
  let quick_run_pose = random_choose(2, 4, 6);
  let faster_run_pose = random_choose(3, 5, 7);
  let twitch = 1;
  mod.setAnimSound(se);

  const thiz = Base(gameState, mod, win, order, {
    draw,
    initAiState,
    attack,
  });

  thiz.installCollision(2000);


  //
  // 游戏状态转换为 ai 状态
  //
  function initAiState(game_state) {
    switch (game_state) {
    case 0: // 和警局中从木板中伸出的手有关
    case 1:
    case 16:
      break;

    case 70: // 普通僵尸, (血量不同?)
    case 64:
    case 6:
      state = 0;
      break;
    
    case 198: // 着火的僵尸
      state = 0;
      break;

    case 194: // 着火的僵尸躺在地上
      state = 17;
      break;

    case 72: // 趴在地上撕咬
    case 8:
      state = random_choose(26, 27, 28);
      break;

    case 2: // 已经死了, 抽搐
    case 4:
      state = 30;
      hp = 0;
      twitch = 1;
      break;

    case 7: // 已经死了(不动)
      state = 31;
      hp = 0;
      twitch = 0;
      break;

    case 67: // 在地上爬行(不可站立)
      state = 13;
      break;
    }
  }


  function draw(u, t) {
    counter.next(u);

    switch (state) {
    case 1000: // wait
      break;

    case 1001: // 站立攻击玩家(纠缠), 并等待玩家反抗
      const pl = gameState.getPlayer(1);
      if (pl.break_free()) {
        state = 12;
      }
      break;

    case 1002: { // 站立攻击, 检测范围
      const pl = gameState.getPlayer(1);
      const w = thiz.frontPoint(1200);
      if (dist2(w, pl.where()) < 800) {
        state = 20;
        const md = mod.getMD();
        if (thiz.isRightToMe(pl)) { // 正面攻击
          pl.be_attacked(t, md.getPose(40), md.getPose(41));
          pl.setDirectionAngle(thiz.getAngle() + PI_180);
        } else {
          pl.be_attacked(t, md.getPose(43), md.getPose(44));
          pl.setDirectionAngle(thiz.getAngle());
        }
      }
    } break;

    case 1003: // 站立被攻击
      _setpose_wait_when(random_choose(36, 37, 38), 1, function() {
        if (hp <0) {
          state = 9;
        } else {
          state = 0;
        }
      });
      break;

    case 1004: { // 爬行攻击
      const pl = gameState.getPlayer(1);
      if (dist2(thiz.frontPoint(2000), pl.where()) < 800) {
        state = 23;
        pl.be_attacked(t, md.getPose(46), md.getPose(48));
      } else {
        state = 13;
      }
    } break;

    case 1005: {// 爬行攻击玩家(纠缠), 并等待玩家反抗
      const pl = gameState.getPlayer(1);
      if (pl.break_free()) {
        if (hp < 0) {
          state = 31;
        } else {
          state = 13;
        }
      }
    } break;

    case 0: // 前进, 寻找敌人
      goto_player(0, quick_run_pose, 8, 1, 19);  
      break;

    case 8: // 原地徘徊
      _wait_find(8, 0, 1000);
      break;

    case 9: // 向前倒地
      _setpose_wait_when(9, 1, function() {
        counter.randomSet(10, ()=>{
          if (hp <0) {
            state = 31;
          } else {
            state = 16;
          }
        });
      });
      break;

    case 10: // 向后倒地
      _setpose_wait_when(10, 1, function() {
        counter.randomSet(10, ()=>{
          if (hp < 0) {
            state = 30;
          } else {
            state = 17;
          }
        });
      });
      break;

    case 11: // 向前趔趄
      _setpose_wait_when(11, 1, function() {
        state = 0;
      });
      break;

    case 12: // 向后趔趄
      thiz.changePose(21, 1);
      thiz.setAnimFrame(0);
      state = 1000;
      mod.setAnimEndAct(2, function() {
        state = 0;
      });
      break;

    case 13: // 向前爬
      // thiz.changePose(13, 1);
      goto_player(13, 13, 31, 0, 22);  
      break;

    case 14: // 爬行时中枪
      _setpose_wait_when(14, 1, ()=>{
        if (hp < 0) {
          state = 15;
        } else {
          state = 13;
        }
      });
      break;

    case 15: // 爬行死亡
      _setpose_wait_when(15, 1, ()=>{
        state = 31;
      });
      break;

    case 16: // 面朝下爬起并站立
      _setpose_wait_when(16, 1, function() {
        state = 0;
      });
      break;

    case 17: // 向上躺在地上并站立
      thiz.changePose(17, 1);
      thiz.setAnimFrame(0);
      state = 1000;
      mod.setAnimEndAct(2, function() {
        state = 0;
      });
      break;

    case 19: // 向前扑
      state = 1002;
      thiz.changePose(33, 1);
      thiz.setAnimFrame(0);
      mod.setAnimEndAct(2, function() {
        if (state == 1002) {
          state = 35;
        }
      });
      break;

    case 20: // 站立啃咬
      state = 1001;
      thiz.changePose(20, 1);
      thiz.setAnimFrame(0);
      break;

    case 22: // 爬行时尝试攻击
      state = 1004;
      thiz.changePose(22, 1);
      thiz.setAnimFrame(0);
      mod.setAnimEndAct(2, function() {
        if (state == 1004) {
          state = 13;
        }
      });
      break;

    case 23:
      state = 1005;
      thiz.changePose(23, 1);
      thiz.setAnimFrame(0);
      break;

    case 26: // 跪在地上啃咬1
      _wait_find(26, 29, 5000);
      break;

    case 27: // 跪在地上啃咬2
      _wait_find(27, 29, 5000);
      break;

    case 28: // 跪在地上啃咬3
      _wait_find(28, 29, 5000);
      break;

    case 29: // 跪在地上并站起
      _setpose_wait_when(29, 1, ()=>{
        state = 0;
      });
      break;
    
    case 30: // 面朝上抽动
      thiz.changePose(30, (twitch && hp<=0)?1:0 );
      state = 1000;
      break;

    case 31: // 面朝下抽动
      thiz.changePose(31, (twitch && hp<=0)?1:0 );
      state = 1000;
      break;
    
    case 35: // 向前扑空
      state = 1000;
      thiz.changePose(35, 1);
      thiz.setAnimFrame(0);
      mod.setAnimEndAct(2, function() {
        state = 0;
      });
      break;
    }
  }


  function _wait_find(pose, npose, d) {
    thiz.changePose(pose, 1);
    if (dist3(thiz, gameState.getPlayer(1)) < d) {
      state = npose;
    }
  }


  function _setpose_wait_when(pos, dir, fn) {
    state = 1000;
    thiz.changePose(pos, dir);
    thiz.setAnimFrame(0);
    mod.setAnimEndAct(2, fn);
  }


  function attack(weapon) {
    if (hp <= 0) return;
    const pose = thiz.getPose();
    thiz.stopMove();

    if (pose == 9 || pose == 13) {
      hp -= weapon.hurt;
      state = 14;
      return;
    }

    if (state == 1000) return;
    hp -= weapon.hurt;
    switch (weapon.id) {
      case 7: 
        state = random_choose(9, 10);
        break;
      default: 
        state = 1003; 
        break;
    }
  }


  function goto_player(move_pose, run_pose, wait_pose, wait_adir, attack) {
    const w = thiz.where();
    const pl = gameState.getPlayer(1).where();
    const d = dist2(w, pl);

    if (d < 1000) {
      thiz.stopMove();
      state = attack; //19;
      return;
    }
    
    if (d < 5000) {
      thiz.changePose(run_pose, 1);
      thiz.moveTo(pl[0], 0, pl[2]);
      thepath = null;
      return;
    }

    if (thepath == 1) {
      return;
    }

    if (++frame > 300) {
      thepath = null;
      frame = 0;
    }

    if (!thepath) {
      gameState.frame_task.findRoad(w[0], w[2], pl[0], pl[2], (_pt)=>{
        if (_pt && _pt.length > 0) {
          thepath = _pt;
          // console.log(thepath.length, 'found path !');
          thiz.changePose(move_pose, 1);
        } else {
          thepath = null;
          // console.log(w[0], w[2], pl[0], pl[2], ' not found path')
        }
      });
      thepath = 1;
      thiz.changePose(wait_pose, wait_adir);
      return;
    } 

    const m = gameState.map_mblock;
    const p = gameState.map_pblock /2;
    let node = thepath[thepath.length-1];
    if (node) {
      let x = (node.x-p) * m;
      let y = (node.y-p) * m;
      if ((dist(w[0], x) + dist(w[2], y)) < m) thepath.pop();
      thiz.moveTo(x, 0, y);
    } else {
      thepath = null;
    }
  }

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
    initAiState,
  });

  function initAiState() {}

  // mod.setAnimSound(se);
  return thiz;
}


function Npc(mod, win, order, gameState, se, data) {
  const thiz = Base(gameState, mod, win, order, {
    initAiState,
    attack,
  });

  function initAiState() {}

  function attack() {
    console.log("!!! You dead !!!");
  }

  // mod.setAnimSound(se);
  return thiz;
}


function Base(gameState, mod, win, order, ext) {
  const thiz = {
    setDirection,
    setDirectionAngle,
    setPos,
    moveTo,
    stopMove,
    turnAround,
    lookAt,
    draw, 
    free,
    wrap0,
    rotateY,
    getAngle,
    setAnim,
    angleAtTran,
    angleAtPos,
    frontPoint,
    floor,
    changePose,
    getPose,
    setMoveSpeed,
    moveForward,
    setAnimFrame,
    getPosPoint,
    installCollision,
    getCollision,
    isBackToMe,
    isRightToMe,
  };

  order.addMod(thiz);
  const ch_free             = ext.free;
  const Tran                = Game.Transformation(thiz);
  const model_trans         = Tran.objTr;
  const moving_destination  = [];
  const swap                = new Array(3);
  const zero                = [0,0,0];

  let collision;
  let angle         = 0;
  let ex_anim_index = -1;
  let _state        = 0;
  let anim_pose     = 0;
  let moveSpeed     = 1;
  let rotateSpeed   = 0.022;
  let pos_point     = new Point2(0, 0);

  thiz.ms = model_trans;
  thiz.swap = swap; // 使用的元素必须完全清空
  thiz.anim_speed_addition = mod.getMoveSpeed();
  delete ext.free;

  return Object.assign(Tran, thiz, ext);;


  // 这个函数只被微代码调用
  // TODO: flag 解析不正确
  function setAnim(flag, type, idx) {
    const reverse_dir = flag & 0x80;
    const part        = flag & 0x10;
    const ext_pose    = type == 0;
    const loop        = true ? 1:0;
    
    if (ext_pose) {
      if (ex_anim_index <= 0) {
        const md = mod.getMD();
        ex_anim_index = md.poseCount();
        gameState.bind_ex_anim(md, ex_anim_index);
      }
      mod.setAnim(idx + ex_anim_index, 0, 0);
    } else {
      mod.setAnim(idx, 0, 0);
    }

    if (reverse_dir) {
      mod.setDir(-1);
      let len = mod.getPoseFrameLength();
      mod.setFrame(len-1);
    } else {
      mod.setDir(1);
    }
  }

  
  function draw(u, t) {
    if (collision) {
      updateCollision();
      // checkEnemyCollision();
    } 
    ext.draw && ext.draw(u, t);
    if (_state == 1) _move1(u);
    Shader.setModelTrans(model_trans);
    mod.draw(u, t);
  }


  // 返回的对象在下一帧之前有效
  function getPosPoint() {
    const w = Tran.where();
    pos_point.x = w[0];
    pos_point.y = w[2];
    return pos_point;
  }


  function installCollision(size) {
    collision = new Coll.Circle({x:0, y:0, w: size || 300});
  }


  function getCollision() {
    return collision;
  }


  function updateCollision() {
    const w = Tran.where();
    collision.resetPos(w[0]-collision.r, w[2]-collision.r);
    // let r = Tool.xywd2range({x:w[0], y:w[2], w:100, d:100});
    // let color = new Float32Array([1, 0, 0]);
    // Tool.showRange(r, win, color, -110);
  }


  // 直线移动
  function _move0(u) {
    const STEP = moveSpeed * u/140;
    let x = Math.abs(model_trans[12] - moving_destination[0]);
    let y = Math.abs(model_trans[13] - moving_destination[1]);
    let z = Math.abs(model_trans[14] - moving_destination[2]);
    let need = 0;

    if (x > STEP) {
      model_trans[12] += model_trans[12] > moving_destination[0] ? -STEP : STEP;
      ++need;
    }
    if (y > STEP) {
      model_trans[13] += model_trans[13] > moving_destination[1] ? -STEP : STEP;
      ++need;
    }
    if (z > STEP) {
      model_trans[14] += model_trans[14] > moving_destination[2] ? -STEP : STEP;
      ++need;
    }
    if (!need) {
      _state = 0;
    }
  }


  // 带有转身的移动
  function _move1(u) {
    const an_at = angleAtPos(moving_destination[0], moving_destination[2]);
    let r;
    if (an_at >= 0) {
      r = Math.min(an_at, rotateSpeed *(u*140));
    } else {
      r = Math.max(an_at, -rotateSpeed *(u*140));
    }
    rotateY(r);

    if (r > PI_45 || r < PI_315) {
      return;
    }
    moveForward(u);

    let x = Math.abs(model_trans[12] - moving_destination[0]);
    let z = Math.abs(model_trans[14] - moving_destination[2]);
    // console.log('-----------------', moveSpeed, model_trans[12], model_trans[14], moving_destination[0], moving_destination[2])
    if (x < 10 && z < 10) {
      _state = 0;
      // console.log("eeeeeeeeeeeeeeeeeeeeeeeeeeee")
    }
  }


  function moveForward(u) {
    let a0 = thiz.anim_speed_addition[0];
    // if (a0 < 0) {
    //   forwardstep = Math.min(forwardstep, a0);
    // }
    // if (thiz.anim_speed_addition[3] & 0x8) {
    //   forwardflag = thiz.anim_speed_addition[3] & 0x4;
    // }
    // if (forwardflag == 0) {
    //   // a0 = Math.abs(forwardstep) + a0;
    // }
    let step = (Math.abs(a0)*u - thiz.anim_speed_addition[2]*u) *moveSpeed;
    // console.log(thiz.anim_speed_addition[0], 
      //   thiz.anim_speed_addition[1], thiz.anim_speed_addition[2]);
    Tran.translate(wrap0(step || 10, 0, 0));
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


  function setMoveSpeed(s) {
    moveSpeed = s;
  }

  
  // abs - 绝对位置
  function moveTo(x, y, z, abs = 1) {
    _state = 1;
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
    //Tool.debug("Move TO", x, y, z, '====================================');
  }


  function stopMove() {
    _state = 0;
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
  // 返回角色前方检测点, 返回的对象立即使用, 因为之后该对象将被复用.
  //
  function frontPoint(antenna_len) {
    const w = Tran.where();
    // 向前方探出触角的长度(游戏单位)
    swap[0] = antenna_len || ANTENNA_LEN;
    swap[1] = 0;
    vec2.rotate(swap, swap, zero, -angle);
    swap[0] = swap[0] + w[0];
    swap[2] = swap[1] + w[2];
    return swap;
  }


  function isBackToMe(who) {
    return !isRightToMe(who);
  }


  function isRightToMe(who) {
    const fr = fix_angle(dist(thiz.getAngle(), who.getAngle()));
    return fr > PI_90 && fr < PI_270;
  }


  // 设置绝对方向, d 是游戏角度参数 (0-4096)
  function setDirection(d) {
    setDirectionAngle(d/0x0FFF * PI_360);
  }


  function setDirectionAngle(a) {
    angle = a;
    let s = Math.sin(angle);
    let c = Math.cos(angle);
    model_trans[0] = c;
    model_trans[2] = -s;
    model_trans[8] = s;
    model_trans[10] = c;
  }


  // 用弧度旋转 Y 轴 (相对于当前方向)
  function rotateY(rad) {
    mat4.rotateY(model_trans, model_trans, rad);
    angle = fix_angle(angle + rad);
  }


  // 返回的弧度在 (0, 2PI)
  function getAngle() {
    return angle;
  }


  // 计算当前对象的观察方向与目标对象之间的夹角
  function angleAtTran(other) {
    const a = other.where();
    return angleAtPos(a[0], a[2]);
  }


  // 返回的值在 (-PI, PI)
  function angleAtPos(ox, oz) {
    const b = Tran.where();
    const x = ox - b[0];
    const z = oz - b[2];
    const angle0 = Math.atan(x/z);
    let ret = angle0 - (angle > PI_180 ? -(PI_360-angle) : angle);
    if (z < 0) {
      ret += PI_90;
    }  else {
      ret -= PI_90;
    }
    // 原地转圈补丁
    if (ret > 0 && ret > PI_180) {
      ret = PI_180 - ret;
    } else if (ret < 0 && ret < -PI_180) {
      ret = PI_360 + ret;
    }
    return ret;
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


  // 当动作改变后, 动画设置为循环模式, 回调函数被删除
  function changePose(id, dir, endflag = 1) {
    if (id != anim_pose) {
      anim_pose = id;
      mod.setAnim(id, -1);
      mod.setAnimEndAct(endflag, null);
    }
    mod.setDir(dir);
  }


  function getPose() {
    return anim_pose;
  }


  function setAnimFrame(f) {
    mod.setFrame(f);
  }
}


// 计算 a 与 b 之间的距离
function dist(a, b) {
  return (a > b) ? a-b : b-a;
}


// mod[x, y, z], 计算两个二维点的距离, 忽略y
function dist2(mod1, mod2) {
  return dist(mod1[0], mod2[0]) + dist(mod1[2], mod2[2]);
}


function dist3(tr1, tr2) {
  return dist2(tr1.where(), tr2.where());
}


// 使弧度保持在 0~360 度之内
function fix_angle(a) {
  if (a > PI_360) return a - PI_360;
  else if (a < 0) return PI_360 + a;
  return a;
}


function random_choose() {
  return arguments[parseInt(Math.random() * arguments.length)];
}