import Room   from './room.js'
import Shader from './shader.js'
import Node   from '../boot/node.js'
import Rdt    from './rdt.js'
import Liv    from './living.js'
import Ai     from './ai.js'
import Tool   from './tool.js'
const matrix = Node.load('boot/gl-matrix.js');
const {vec3, mat4} = matrix;

export default {
  init,
  start_game,
};

let window, camera;
const LEON = 0;
const CLAIRE = 1;
const HARD = 2;
const NORMAL = 1;
const EASY = 0;
// 切换镜头的等待时间, 太短刺眼
const CAM_SW_WAIT = 300;

// game_var 常量定义
const V_CAMERA = 26;

// 在整个游戏过程中保存变量
// 26: 当前摄像机号码
const game_var = [];
// CK? 变量
const ck_flag = [];
// 当前地图上的所有需要释放资源的对象
const free_objects = [];
// 当前地图上的对象, 用于 bio2 脚本
const object_arr = [];
// 被杀死的敌人
const killed = [];
// 角色的活动范围.
const play_range = [];
// 当玩家进入范围, 时间被触发, 调用 act()
const touch = [];
// 地图上的可调查对象, 当玩家在范围内调查时, 事件被触发, 调用 act()
const survey = [];

let room_script;
let map_data;
let stage = 1;
let room_nm = 0;
let camera_nm = -1;
let player = LEON;
let p1;


const gameState = {
  survey,
  touch,
  play_range,
  switch_camera,
  next_frame,
  reverse,
  setDoor,
  script_running : false,

  aot_set,
  addEnemy,
  setGameVar,
  getGameVar,
  get_bitarr,
  set_bitarr,
  calc,
  object_arr,
};


function init(_window, _camera, _shader_pro) {
  window = _window;
  camera = _camera;
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

  for (let i=touch.length-1; i>=0; --i) {
    if (touch[i].cam1 >= 0) {
      touch.splice(i, 1);
    }
  }

  find_camera_switcher();
}


function find_camera_switcher() {
  let cam0 = 0;
  Tool.debug("Current Camera", camera_nm);

  for (let i = map_data.cameras_sw.length-1; i>=0; --i) {
    let sw = map_data.cameras_sw[i];
    if (sw.cam0 == camera_nm && sw.cam0 != sw.cam1) {
      bind_cm(sw);
    }
  }

  function bind_cm(sw) {
    // TODO: 如果角色离开摄像机开关, 恢复开关的功能
    let isStanding = Tool.inRange(sw, p1);
    if (!isStanding) {
      sw.act = function() {
        // if (isStanding) return;
        thread.wait(CAM_SW_WAIT);
        camera_nm = this.cam1;
        switch_camera();
      };
      touch.push(sw);
    }
  }
}


function free_map() {
  for (let i = free_objects.length-1; i>=0; --i) {
    free_objects[i].free();
  }
  free_objects.length = 0;
  object_arr.length = 0;
  play_range.length = 0;
  survey.length = 0;
  touch.length = 0;
}


function load_map() {
  free_map();
  map_data = Rdt.from(stage, room_nm, player);
  room_script = map_data.room_script;

  const color = new Float32Array([0.9, 0.1, 0.3]);
  for (let i=map_data.block.length-1; i>=0; --i) {
    let b = map_data.block[i];
    play_range.push(b);
    // 调试 block
    free_objects.push(Tool.showRange(b, window, color));
  }

  // 显示碰撞体
  for (let i=0; i<map_data.collision.length; ++i) {
    let c = map_data.collision[i];
    
  }

  try {
    gameState.script_running = true;
    map_data.init_script.run(gameState);
  } catch(e) {
    console.error(e.stack);
  }
}


function begin_level() {
  // 游戏参数初始化
  // 难度
  set_bitarr(0, 0x19, EASY);
  // 角色类型
  set_bitarr(1, 0x00, player);
  // 二周目 0:A, 1:B
  set_bitarr(1, 0x01, 0);
  // 游戏模式 0:Leon/Claire, 1:Hunk/Tofu, or vice versa
  set_bitarr(1, 0x06, 0);

  // TODO: 加载玩家角色模型
  let mod = Liv.fromEmd(player, 0x50);
  p1 = Ai.player(mod, window, gameState);
  p1.setPos(19771.0371, 0, -2603.186);
  p1.rotateY(Math.PI);

  // 首先改变这些参数, 再调用 load_map/switch_camera
  stage = 1;
  room_nm = 0;
  camera_nm = 0;

  while (window.notClosed()) {
    load_map();
    switch_camera();
    run_room_script();

    // TODO: 这里是补丁, 房间脚本应该不会退出?
    while (gameState.script_running && window.notClosed()) {
      window.nextFrame();
    }
  }
}


function run_room_script() {
  // TODO: 脚本不应该出错, 调试结束后无需 try/cache
  try {
    gameState.script_running = true;
    console.debug("---------- Start room script");
    room_script.run(gameState);
    console.debug('----------------- script exit');
  } catch(e) {
    console.error(e.stack);
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
  if (killed[zb.killed_id]) 
    return;

  let mod = Liv.fromEmd(player, zb.model);
  let ai = Ai.zombie(mod, window);
  free_objects.push(ai);
  ai.setPos(zb.x, zb.y, zb.z);
  ai.setDirection(zb.dir);
  object_arr[zb.id] = ai;
}


//
// 设置一个对象, 必须有 x1-4, y1-4 属性
//
function aot_set(npo) {
  const type = isNaN(npo.type) ? npo.sce : npo.type;
  switch (type) {
    case 3:  // 长方形地板, 转为可移动空间??
      Tool.debug("地板");
      // play_range.push(npo);
      break;

    case 2: // item
      Tool.debug("物品"); 
      setItem(npo);
      break;

    case 11: // 燃烧的火, 走进后被灼伤
      Tool.debug("伤害"); break;
    case 0: // auto?
      Tool.debug("自动?"); break;
    case 1: // door
      Tool.debug("门"); break;
    case 4: // message
      Tool.debug("信息"); break;
    case 5: // event?
      Tool.debug("事件"); break;
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
  free_objects.push(Tool.showRange(npo, window));
}


function setDoor(d) {
  let range = Tool.xywh2range(d);
  survey.push(range);
  object_arr[d.id] = d;

  range.act = function opendoor() {
    // TODO: 检查门锁 locked 和对应的钥匙 key, lock 无法打开.
    p1.setPos(d.next_x, d.next_y, d.next_z);
    p1.setDirection(d.next_dir);
    stage = d.stage + 1;
    room_nm = d.room;
    camera_nm = d.camera;
    gameState.script_running = false;
  };

  _test_bind_key_sw_room(d.id, range.act);
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
  free_objects.push({
    free() {
      ip.unbind(gl.GLFW_KEY_1 + door_id);
    }
  });
}
