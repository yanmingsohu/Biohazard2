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

const matrix = Node.load('boot/gl-matrix.js');
const LEON = 0;
const CLAIRE = 1;
const game_var = [];

let runtime_data = {
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

const sp = Draw.createProgram();
sp.readVertexShader("bio2/map.vert");
sp.readFragShader("bio2/map.frag");
sp.link();
sp.setProjection(45, 4/3, 0.01, 1000);

const camera = Game.createCamera(sp);
window.add(camera);
camera.lookAt(0, 0, 0);


// drawRoom();
living();
runGame();


function living() {
  let mod = Liv.loadEmd(LEON, '3A', sp);
  window.add(mod);

  var model = sp.getUniform('model');
  var tmat = matrix.mat4.create(1);
  model.setMatrix4fv(1, gl.GL_FALSE, tmat);

  window.onKey(gl.GLFW_KEY_D, gl.GLFW_PRESS, 0, function() {
    matrix.mat4.rotateY(tmat, tmat, 0.03);
    model.setMatrix4fv(1, gl.GL_FALSE, tmat);
  });

  let z = 3;
  window.onKey(gl.GLFW_KEY_S, gl.GLFW_PRESS, 0, function() {
    z -= 0.01;
    camera.setPos(0, 1, z);
  });
}


function drawRoom() {
  // ROOM1010.RDT  ROOM1000.RDT
  // let map0 = Rdt.load('Pl0/Rdt/ROOM1000.RDT');
  // Dev.runAllScript(map0, runtime_data);

  // 房间渲染器
  Room.init(window);
  Dev.roomBrowse(Room, window);
}


function runGame() {
  // window.add(Draw.showRate());

  window.onKey(gl.GLFW_KEY_ESCAPE, gl.GLFW_PRESS, 0, function() {
      window.shouldClose();
  });

  window.prepareDraw();
  while (window.nextFrame()) {
  }
  window.destroy();
}