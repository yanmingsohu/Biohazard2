import Room   from './room.js'
import Shader from './shader.js'
import Node   from '../boot/node.js'
import Rdt    from './rdt.js'
import Liv    from './living.js'
import Ai     from './ai.js'
import Tool,  {DrawArray} from './tool.js'
import Tbl    from './init-tbl.js'
import Sound  from './sound.js';

const matrix = Node.load('boot/gl-matrix.js');
const {vec3, mat4} = matrix;


export default {
  init,
  start_game,
};


let window, camera, draw_order;
const LEON = 0;
const CLAIRE = 1;
const DISK_A = 0;
const DISK_B = 1;
const HARD = 2;
const NORMAL = 1;
const EASY = 0;
// 切换镜头的等待时间, 太短刺眼
const CAM_SW_WAIT = 0; //300;

// game_var 常量定义
const V_CAMERA = 26;

// 在整个游戏过程中保存变量
// 26: 当前摄像机号码
const game_var = [];
// CK? 变量, 
//  0:游戏状态,  1:场景设置,  4:事件id
//  5:?, 6:实体被杀身份, 7:与实体健康状况有关
//  8:项目抓取状态, 0B:1F玩家回答问题（0 =是，1 =否）
//  1D:游戏状态，通过几次重播保持?
const ck_flag = [];
// 当前地图上的所有需要释放资源的对象
const scenes_garbage = [];
// 当前地图上的对象, 用于 bio2 脚本
const object_arr = [];
const enemy = [];
// 被杀死的敌人
const killed = [];
// 角色的活动范围.
const play_range = [];
// 地图上的障碍物
const collisions = [];
// 当玩家进入范围, 时间被触发, 调用 act()
const touch = [];
// 地图上的可调查对象, 当玩家在范围内调查时, 事件被触发, 调用 act()
const survey = [];
// 地板, 用于步行音效
const floors = [];
// 记录摄像机切换顺序
const cut_stack = [];

// 当前房间脚本上下文
let script_context;
let goto_next_door;
let map_data;
let stage = 1;
let room_nm = 0;
let camera_nm = -1;
let play_mode = LEON;
let ab = DISK_A;
// 玩家对象
let p1;


const gameState = {
  // 属性
  survey,
  touch,
  play_range,
  collisions,
  script_running : false,
  floors,

  // js 脚本函数
  switch_camera,
  next_frame,
  reverse,
  setDoor,
  bind_ex_anim,

  // bio 脚本函数
  waittime:0,
  cut_chg,
  cut_restore,
  cut_auto,
  aot_set,
  addEnemy,
  setGameVar,
  getGameVar,
  get_bitarr,
  set_bitarr,
  calc,
  pos_set,
  get_game_object,
  play_se,
  play_voice,
  show_message,
  garbage,
};


function init(_window, _camera, _shader_pro, order) {
  window = _window;
  camera = _camera;
  draw_order = order;
  vec3.set(camera.up(), 0, -1, 0);
  // _test();
}


function start_game() {
  // logo();
  // game_select();
  begin_level();
}


function switch_camera() {
  let cd = map_data.cameras[camera_nm];
  camera.setPos(cd.from_x, cd.from_y, cd.from_z);
  camera.lookAt(cd.to_x, cd.to_y, cd.to_z);
  Room.switchWith(stage, room_nm, camera_nm, cd.mask);
  game_var[V_CAMERA] = camera_nm;
  Shader.setFov(cd.fov);
  setup_lights(cd);

  for (let i=touch.length-1; i>=0; --i) {
    if (touch[i].cam1 >= 0) {
      touch.splice(i, 1);
    }
  }

  find_camera_switcher();
  Tool.debug("Current Camera", camera_nm, 'fov', cd.fov);
}


function find_camera_switcher() {
  for (let i = map_data.cameras_sw.length-1; i>=0; --i) {
    let sw = map_data.cameras_sw[i];
    if (sw.cam0 == camera_nm && sw.cam0 != sw.cam1) {
      bind_cm(sw);
    }
  }

  function bind_cm(sw) {
    // TODO: 如果角色离开摄像机开关, 恢复开关的功能
    const w = p1.where();
    let isStanding = Tool.inRange(sw, w[0], w[2]);

    if (!isStanding) {
      sw.act = function() {
        if (sw.floor == 0xFF || sw.floor == p1.floor()) {
          // thread.wait(CAM_SW_WAIT);
          camera_nm = this.cam1;
          switch_camera();
        }
      };
      touch.push(sw);
    }
  }
}


function setup_lights(cr) {
  // Tool.debug("Env:", cr.env_color);
  // Tool.debug(" l0:", cr.light0);
  // Tool.debug(" l1:", cr.light1);
  // Tool.debug(" l2:", cr.light2);
  Shader.setEnvLight(cr.env_color);
  Shader.setLights(camera, cr.light0, cr.light1, cr.light2);
}


function free_map() {
  for (let i = scenes_garbage.length-1; i>=0; --i) {
    scenes_garbage[i].free();
  }
  scenes_garbage.length = 0;
  object_arr.length = 0;
  play_range.length = 0;
  survey.length = 0;
  touch.length = 0;
  collisions.length = 0;
  enemy.length = 0;
  floors.length = 0;
  cut_stack.length = 0;
}


function load_map() {
  free_map();
  map_data = Rdt.from(stage, room_nm, play_mode);

  for (let i=0; i<map_data.collision.length; ++i) {
    let c = map_data.collision[i];
    collisions.push(c);
    // 显示碰撞体
    const color2 = new Float32Array([0.1, 0.7, 0.9*Math.random()]);
    scenes_garbage.push(Tool.showCollision(c, window, color2));
  }

  const color = new Float32Array([0.9, 0.1, 0.3]);
  for (let i=map_data.block.length-1; i>=0; --i) {
    let b = map_data.block[i];
    play_range.push(b);
    // 调试 block
    scenes_garbage.push(Tool.showRange(b, window, color));
  }

  for (let i=map_data.floor.length-1; i>=0; --i) {
    let f = map_data.floor[i];
    let se = Sound.floorSE(f);
    scenes_garbage.push(se);
    floors.push(se);
  }

  try {
    Tool.debug("0----------------------- Start init script");
    gameState.script_running = true;
    map_data.init_script.run(gameState);
    Tool.debug("0----------------------- script end");
  } catch(e) {
    console.error(e.stack);
  }
}


function load_bgm() {
  const STOP_FLAG = 0x40;
  const UK_FLAG = 0xC0;

  let cfg = Tbl.get(stage, room_nm, play_mode, ab);
  let m   = cfg.main != 0xFF ? cfg.main : -1;
  let s   = cfg.sub  != 0xFF ? cfg.sub  : -1;
  let mid, sid;

  if (m >= 0) {
    if (m == 0x0B) {
      mid = '00_1';
    } else {
      mid = Tool.b2(m & 0x3F);
    }
  }
  if (s >= 0) {
    sid = Tool.b2(s & 0x3F);
  }
  
  Sound.bgm(mid, sid);
  Tool.debug("BGM", cfg, mid, sid);

  if (m>=0 && (m & STOP_FLAG) == 0) {
    Sound.getBgm(0).play();
  }
  if (s>=0 && (s & STOP_FLAG) == 0) {
    Sound.getBgm(1).play();
  }
}


function init_pos(t) {
  switch (t) {
    case 0: // LEON A 初始位置
      p1.setPos(19771.0371, 0, -2603.186);
      p1.rotateY(Math.PI);
      // 首先改变这些参数, 再调用 load_map/switch_camera
      stage = 1; room_nm = 0; camera_nm = 0;
      break;

    case 1: // 警署大厅
      p1.setPos(-12780.552734375, 0, -20381.51953125);
      stage = 0x2; room_nm = 0; camera_nm = 10;
      break;

    case 2: // 有楼梯的城市一角
      p1.setPos(-9874.8447265625,0,3555.011962890625);
      stage = 1; room_nm = 0x18; camera_nm = 0;
      break;

    case 3: // 图书馆 ROOM1120.RDT
      p1.setPos(-15589.3955078125,0,-26244.947265625);
      stage = 1; room_nm = 0x12, camera_nm = 6;
      break;

    case 4: // 下水道1
      p1.setPos(-7114.603515625,0,-3748.042724609375);
      stage = 3; room_nm = 0x7, camera_nm = 3;
      break;

    case 5: // 火炬谜题房间 ROOM20d0.RDT, 椭圆碰撞反馈优化
      p1.setPos(-24400.1015625,0,-10989.9453125);
      stage = 2; room_nm = 0xd, camera_nm = 7;
      break;

    case 6: // 下水道, 脚本死循环 ROOM4020.RDT
      p1.setPos(-16256.4697265625,0,-25555.30078125);
      stage = 4; room_nm = 0x2; camera_nm = 0;
      break;

    case 7: // 监狱, 大量对话和过场剧情 ROOM3010.RDT
      p1.setPos(-25099.73046875,0,-15760);
      stage = 3; room_nm = 0x1; camera_nm = 0;
  }
}


function begin_level() {
  // 游戏参数初始化
  // 难度
  set_bitarr(0, 0x19, EASY);
  // 角色类型
  set_bitarr(1, 0x00, play_mode);
  // 二周目 0:A, 1:B
  set_bitarr(1, 0x01, ab);
  // 游戏模式 0:Leon/Claire, 1:Hunk/Tofu, or vice versa
  set_bitarr(1, 0x06, 0);

  // TODO: 加载玩家角色模型, pld 的部分动作来自 plw.
  let liv = Liv.fromEmd(play_mode, 0x50);
  // let liv = Liv.fromPld(play_mode);
  p1 = Ai.player(liv, window, draw_order, gameState, camera);
  set_weapon(liv, 7);

  init_pos(0);

  while (window.notClosed()) {
    p1.able_to_control(false);
    goto_next_door = false;
    load_map();
    load_bgm();
    switch_camera();
    script_context = map_data.room_script.createContext(gameState, 0);
    p1.able_to_control(true);
    // vm.gc();

    // TODO: 这里是补丁, 房间脚本应该不会退出?
    while (!goto_next_door && window.notClosed()) {
      window.nextFrame();
      for (let i=0; i<100; ++i) {
        if (script_context.frame(window.usedTime()) == 1) {
          break;
        }
      }
    }
  }
}


function next_frame() {
  return window.nextFrame();
}


function get_bitarr(arr, num) {
  let a = ck_flag[arr];
  if (!a) return 0;
  return a[num] || 0;
}


function set_bitarr(arr, num, v) {
  let a = ck_flag[arr];
  if (!a) a = ck_flag[arr] = [];
  a[num] = v;
}


function setGameVar(i, v) {
  game_var[i] = v;
}


function getGameVar(i) {
  return game_var[i] || 0;
}


function reverse(a, n) {
  let v = this.get_bitarr(a, n);
  this.set_bitarr(a, n, v == 0 ? 1 : 0);
}


function addEnemy(zb) {
  if (get_bitarr(6, zb.killed_id))
    return;

  let mod = Liv.fromEmd(play_mode, zb.model);
  let se = Sound.enemySE(zb.sound_bank);
  let ai = Ai.zombie(mod, window, draw_order, gameState, se, zb);
  scenes_garbage.push(ai, se);
  ai.setPos(zb.x, zb.y, zb.z);
  ai.setDirection(zb.dir);
  enemy[zb.id] = ai;
}


// 进入后触发一次, 直到离开后再次进入触发
function LeaveTrigger(obj, callback) {
  let td = false;
  obj.act = function() {
    if (td) return;
    td = true;
    Tool.debug('!!!!!!!!!!!!!!!!!!!! LeaveTrigger +++', obj)
    callback();
  };
  obj.leave = function() {
    td = false;
  };
}


// 只触发一次
function OnceTrigger(obj, callback) {
  obj.act = function() {
    for (let i=0; i<touch.length; ++i) {
      if (touch[i] == obj) {
        touch.splice(i, 1);
        break;
      }
    }
    Tool.debug('!!!!!!!!!!!!!!!!!!!! OnceTrigger', obj)
    callback();
  };
}


function createTriggerType(obj, cb) {
  const sat = obj.sat;
  // 由谁触发
  let _player  = sat & 1;
  let _enemy   = sat & (1<<1);
  let _splayer = sat & (1<<2);
  let _obj     = sat & (1<<3);
  // 如何触发
  let _manual  = sat & (1<<4);
  let _front   = sat & (1<<5);
  let _under   = sat & (1<<6);
  let _uk      = sat & (1<<7);

  if (_player) {
    if (_manual) {
      obj.act = cb;
      survey.push(obj);
    } else if (_under || _front) {
      OnceTrigger(obj, cb);
      touch.push(obj);
    }
  } else {
    console.warn("Unsupport trigger "+ Tool.b2(sat));
  }
}


//
// 设置一个对象, 必须有 x1-4, y1-4 属性
//
function aot_set(npo) {
  const type = isNaN(npo.type) ? npo.sce : npo.type;
  switch (type) {
    case 3:  // NORMAL 设置事件触发器

      Tool.debug("触发器");
      // createTrigger(npo);
      break;

    case 2: // item
      Tool.debug("物品"); 
      setItem(npo);
      break;

    case 11: // 燃烧的火, 走进后被灼伤
      Tool.debug("伤害"); 
      break;

    case 0: // auto? 
      Tool.debug("自动?"); 
      // createAuto(npo, '自动?');
      break;

    case 5: // event?
      Tool.debug("事件"); 
      createTriggerType(npo, function() {
        script_context.callSub(npo.d3);
      });
      break;

    case 1: // door
      Tool.debug("门"); break;
    case 4: // message
      Tool.debug("信息"); break;
    case 6: // flag_chg
      Tool.debug("flag_chg"); break;
    case 7: // water
      Tool.debug("水/玻璃?"); break;
    case 8: // move,
      Tool.debug("移动?"); break;
    case 9: // save
      Tool.debug("存档"); break;
    case 0xA: // itembox
      Tool.debug("道具箱"); break;
    case 0xC: // status
      Tool.debug("状态"); break;
    case 0xD: // HIKIDASHI
      Tool.debug("抽屉"); break;
    case 0xE: // windows
      Tool.debug("窗"); break;
    default:
      throw new Error("unknow aot", type);
  }
  object_arr[npo.id] = npo;
  scenes_garbage.push(Tool.showRange(npo, window));
}


function setDoor(d) {
  let range = Tool.xywh2range(d);
  survey.push(range);
  object_arr[d.id] = d;

  range.act = function opendoor() {
    // TODO: 检查门锁 locked 和对应的钥匙 key, lock 无法打开.
    p1.able_to_control(false);
    p1.setPos(d.next_x, d.next_y, d.next_z);
    p1.setDirection(d.next_dir);
    stage = d.stage + 1;
    room_nm = d.room;
    camera_nm = d.camera;
    goto_next_door = true;
  };

  _test_bind_key_sw_room(d.id, range.act);
  scenes_garbage.push(Tool.showRange(range, window));
}


function setItem(item) {
  // TODO: 忽略拾起的物品, 显示物品, 绑定触发事件
  set_bitarr(8, item.array08_idx, 1);

  switch (item.itemid) {
    case 0x07: 
      Tool.debug('色带');
      break;

    case 0x14: 
      Tool.debug('子弹包');
      break;
  }
}


function calc(op, a, b) {
  switch (op) {
    case 0x0: return a + b;
    case 0x1: return a - b;
    case 0x2: return a * b;
    case 0x3: return a / b;
    case 0x4: return a % b;
    case 0x5: return a | b;
    case 0x6: return a & b;
    case 0x7: return a ^ b;
    case 0x8: return ~a;
    case 0x9: return a << b;
    case 0xA: return a >> b;
    case 0xB: return a >>= b;
    default: throw new Error("bad op "+ op);
  }
}


function _test() {
  // 测试用
  window.input().pressOnce(gl.GLFW_KEY_F, function() {
    camera_nm++;
    // if (camera_nm>7) camera_nm = 0;
    try {
      switch_camera();
      console.line("cam", camera_nm);
    } catch(e) {
      camera_nm = -1;
    }
  });

  window.input().pressOnce(gl.GLFW_KEY_E, function() {
    load_map(stage, room_nm+1);
    switch_camera(0);
  });
}


function _test_bind_key_sw_room(door_id, act) {
  const ip = window.input();
  const fn = function() {
    ip.unbind(gl.GLFW_KEY_1 + door_id);
    act();
  };
  ip.pressOnce(gl.GLFW_KEY_1 + door_id, null, fn);
  scenes_garbage.push({
    free() {
      ip.unbind(gl.GLFW_KEY_1 + door_id);
    }
  });
}


function cut_chg(c) {
  p1.able_to_control(false);
  cut_stack.push(camera_nm);
  camera_nm = c;
  switch_camera();
}


function cut_restore() {
  p1.able_to_control(true);
  let c = cut_stack.pop();
  if (c) {
    camera_nm = c;
    switch_camera();
  }
}


function cut_auto(is_on) {
  p1.able_to_control(is_on);
}


function pos_set(x, y, z) {
  if (this.work && this.work.setPos) {
    this.work.setPos(x, y, z);
  } else {
    console.error("canot set pos", this.work);
  }
}


function get_game_object(type, id) {
  switch (type) {
    case 0x01: // player
      Tool.debug("get player");
      return p1;

    case 0x02: // SPLAYER
      Tool.debug("get splayer");
      return enemy[255];

    case 0x03: // ENEMY
      Tool.debug("get enemy");
      return enemy[id];

    case 0x04: // OBJECT
      Tool.debug("get object");
      return object_arr[id];

    case 0x05: // DOOR
      Tool.debug("get door");
      return object_arr[id];

    case 0x06: // ALL?
      Tool.debug("get all?");
      return object_arr[id];

    case 0x80: // PL_PARTS
      Tool.debug("get pl_parts");
      return object_arr[id];

    case 0xA0: // SPL_PARTS
      Tool.debug("get spl_parts");
      return object_arr[id];

    case 0xC0: // EM_PARTS
      Tool.debug("get em_parts");
      return object_arr[id];

    case 0xE0: // OM_PARTS
      Tool.debug("get om_parts");
      return object_arr[id];
    
    default:
      throw new Error("invaild type "+ type);
  }
}


function play_se(id) {
  let se = Sound.playSE(stage, id);
  if (se) {
    scenes_garbage.push(se);
    return se.length();
  }
  return 0;
}


function play_voice(id, rl) {
  let v = Sound.playVoice(play_mode, stage, id);
  if (v) {
    scenes_garbage.push(v);
    return v.length();
  }
  return 0;
}


function show_message(d0, d1, d2) {
}


function set_weapon(target, weaponid) {
  const weapon = Liv.fromPlw(play_mode, weaponid);
  const comp = new DrawArray();
  Liv.createSprites(weapon.mesh, weapon.tex, comp.array);
  const md = target.getMD();
  md.setPoseFromMD(weapon, 10/* 覆盖动画 */);
  md.combinationDraw(11/* 右手 */, comp);
}


//
// 把地图上的动画绑定给角色, 从 bindIdx 号开始覆盖
//
function bind_ex_anim(target, bindIdx) {
  target.setPoseFromMD(map_data.extern_anim, bindIdx);
}


function garbage(x) { 
  scenes_garbage.push(x) 
}