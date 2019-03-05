export default {}

import Draw   from '../boot/draw.js'
import Game   from '../boot/game.js'
import Room   from './room.js'
import Shader from './shader.js'
import Scenes from './scenes.js'
import Dev    from './dev.js'
import Liv    from './living.js'

const window = Draw.createWindow();
window.setClearColor([0.2, 0.3, 0.3, 1]);
window.center();

const sp = Shader.init(window);
const camera = Game.createCamera(sp);
window.add(camera);
camera.lookAt(0, 0, -1);


Room.init(window);
Scenes.init(window, camera, sp);
Scenes.start_game();

// 开发测试用
// Dev.roomBrowse(Room, window, camera);
// Dev.smallMapBrowse(Room, window);
// Dev.dataDirBrowse(Room, window);
// Dev.enemyBrowse(Liv, window, Room, camera);

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