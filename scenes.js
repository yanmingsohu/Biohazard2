import Room   from './room.js'
import Shader from './shader.js'
import Node   from '../boot/node.js'
import Rdt    from './rdt.js'
import Liv    from './living.js'
import Ai     from './ai.js'
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

let map_data;
let stage = 1;
let room_nm = 0;
let camera_nm = 0;
let player = LEON;


const gameState = {
  get_bitarr(arr, num) {
    let a = game_var[arr];
    if (!a) return 0;
    return a[num] || 0;
  },

  set_bitarr(arr, num, v) {
    let a = game_var[arr];
    if (!a) a = game_var[arr] = [];
    a[num] = v;
  },

  reverse(a, n) {
    let v = this.get_bitarr(a, n);
    this.set_bitarr(a, n, v == 0 ? 1 : 0);
  },

  addEnemy(zb) {
    if (killed[zb.killed_id]) 
      return;

    let mod = Liv.fromEmd(player, zb.model);
    let ai = Ai.zombie(mod, window);
    free_objects.push(ai);
    ai.setPos(zb.x, zb.y, zb.z);
    ai.setDirection(zb.dir);
    script_internal_array[zb.id] = ai;
  },
};


function init(_window, _camera, _shader_pro) {
  window = _window;
  camera = _camera;

  vec3.set(camera.up(), 0, -1, 0);

  _window.input().pressOnce(gl.GLFW_KEY_F, function() {
    camera_nm++;
    if (camera_nm>7) camera_nm = 0;
    switch_camera(camera_nm);
    console.line("cam", camera_nm);
  });

  _window.input().pressOnce(gl.GLFW_KEY_E, function() {
    load_map(stage, room_nm+1);
    switch_camera(0);
  });
}


function start_game() {
  // logo();
  // game_select();
  begin_level();
}


function switch_camera(num) {
  camera_nm = num;
  let cd = map_data.cameras[num];
  camera.setPos(cd.from_x, cd.from_y, cd.from_z);
  camera.lookAt(cd.to_x, cd.to_y, cd.to_z);
  Room.switchWith(stage, room_nm, camera_nm, cd.mask);
}


function free_map() {
  for (let i = free_objects.length-1; i>=0; --i) {
    free_objects[i].free();
  }
  free_objects.length = 0;
  script_internal_array.length = 0;
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
  load_map(1, 0);
  switch_camera(0);
}
