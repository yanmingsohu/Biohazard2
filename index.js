export default {}

import Draw   from '../boot/draw.js'
import Node   from '../boot/node.js'
import Game   from '../boot/game.js'
import Res    from '../boot/resource.js'
import Rdt    from './rdt.js'
import Bin    from './bin.js'
import H      from '../boot/hex.js'
import Adt    from './adt.js'
import Room   from './room.js'
import Dev    from './dev.js'
import Mod2   from './model2.js'
import Liv    from './living.js'
import Shader from './shader.js'

const matrix = Node.load('boot/gl-matrix.js');
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

const window = Draw.createWindow();
window.setClearColor([0.2, 0.3, 0.3, 1]);
window.center();

const sp = Shader.init(window);
const camera = Game.createCamera(sp);
window.add(camera);
camera.lookAt(0, 0, 0);


Room.init(window);
Dev.roomBrowse(Room, window);
Dev.enemyBrowse(Liv, window, Room);
gameLoop();


function gameLoop() {
  // window.add(Draw.showRate());

  window.onKey(gl.GLFW_KEY_ESCAPE, gl.GLFW_PRESS, 0, function() {
      window.shouldClose();
  });

  window.prepareDraw();
  while (window.nextFrame()) {
  }
  window.destroy();
}