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
// 在整个游戏过程中保存变量
const game_var = [];
// 当前地图上的所有需要释放资源的对象
const free_objects = [];
// 当前地图上的对象, 用于 bio2 脚本
const script_internal_array = [];
// 被杀死的敌人
const killed = [];
// 角色的活动范围.
const play_range = [];
// 当玩家进入范围, 时间被触发, 调用 act()
const touch = [];
// 地图上的可调查对象, 当玩家在范围内调查时, 事件被触发, 调用 act()
const survey = [];

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
  get_bitarr,
  set_bitarr,
  reverse,
  addEnemy,
  addPlyRange,
  obstacle,
  setDoor,
};


function init(_window, _camera, _shader_pro) {
  window = _window;
  camera = _camera;

  vec3.set(camera.up(), 0, -1, 0);

  // 测试用
  // _window.input().pressOnce(gl.GLFW_KEY_F, function() {
  //   camera_nm++;
  //   // if (camera_nm>7) camera_nm = 0;
  //   try {
  //     switch_camera(camera_nm);
  //     console.line("cam", camera_nm);
  //   } catch(e) {
  //     camera_nm = -1;
  //   }
  // });

  // _window.input().pressOnce(gl.GLFW_KEY_E, function() {
  //   load_map(stage, room_nm+1);
  //   switch_camera(0);
  // });
}


function start_game() {
  // logo();
  // game_select();
  begin_level();
}


function switch_camera(num) {
  // if (num == camera_nm) return;
  camera_nm = num;
  let cd = map_data.cameras[num];
  camera.setPos(cd.from_x, cd.from_y, cd.from_z);
  camera.lookAt(cd.to_x, cd.to_y, cd.to_z);
  Room.switchWith(stage, room_nm, camera_nm, cd.mask);

  for (let i=touch.length-1; i>=0; --i) {
    if (touch[i].cam1 >= 0) {
      touch.splice(i, 1);
    }
  }

  for (let i = map_data.cameras_sw.length-1; i>=0; --i) {
    let sw = map_data.cameras_sw[i];
    if (sw.cam1 && sw.cam0 == camera_nm) {
      touch.push(sw);

      sw.act = function() {
        thread.wait(200);
        switch_camera(this.cam1);
      }
    }
  }
}


function free_map() {
  for (let i = free_objects.length-1; i>=0; --i) {
    free_objects[i].free();
  }
  free_objects.length = 0;
  script_internal_array.length = 0;
  play_range.length = 0;
  survey.length = 0;
  touch.length = 0;
  camera_nm = -1;
}


function load_map(_stage, _room_num) {
  free_map();
  stage = _stage;
  room_nm = _room_num;
  map_data = Rdt.from(stage, room_nm, player);

  try {
    map_data.init_script.run(gameState);
  } catch(e) {
    console.error(e.stack);
  }
}


function begin_level() {
  // TODO: 加载玩家角色模型
  let mod = Liv.fromEmd(player, 0x50);
  p1 = Ai.player(mod, window, gameState);
  p1.setPos(19771.0371, 0, -2603.186);
  p1.rotateY(Math.PI);

  load_map(1, 0);
  switch_camera(0);
}


function get_bitarr(arr, num) {
  let a = game_var[arr];
  if (!a) return 0;
  return a[num] || 0;
}


function set_bitarr(arr, num, v) {
  let a = game_var[arr];
  if (!a) a = game_var[arr] = [];
  a[num] = v;
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
  script_internal_array[zb.id] = ai;
}


function addPlyRange(wall) {
  play_range.push(wall);
  // Tool.showRange(wall, window);
}


function obstacle(npo) {
  switch (npo.type) {
    case 3:  // 长方形地板, 转为可移动空间
      let range = Tool.xywh2range(npo);
      addPlyRange(range);
      return;

    case 11: // 燃烧的火, 走进后被灼伤
      break;
  }
  // Tool.showBox(npo.x, npo.y, npo.w, npo.h, window);
}


function setDoor(d) {
  let range = Tool.xywh2range(d);
  survey.push(range);

  range.act = function opendoor() {
    p1.setPos(d.next_x, d.next_y, d.next_z);
    p1.setDirection(d.next_dir);

    load_map(d.stage + 1, d.room);
    switch_camera(d.camera);
  };
}
