import Room   from './room.js'
import Shader from './shader.js'
import Node   from '../boot/node.js'
import Rdt    from './rdt.js'
// const matrix = Node.load('boot/gl-matrix.js');

export default {
  init,
  start_game,
};

let window, camera;
const LEON = 0;
const CLAIRE = 1;
const game_var = [];

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
};


function init(_window, _camera) {
  window = _window;
  camera = _camera;
}


function start_game() {
  // logo();
  // game_select();
  begin_level();
}


function begin_level() {
  let stage = 1;
  let room_nm = 0;
  let carame_nm = 0;
  let player = LEON;
  let map;

  Room.switchWith(stage, room_nm, carame_nm);
  map = Rdt.from(stage, room_nm, player);
  map.init_script.run(gameState);
}
