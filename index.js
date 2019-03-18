export default {}

import Draw   from '../boot/draw.js'
import Game   from '../boot/game.js'
import Room   from './room.js'
import Shader from './shader.js'
import Scenes from './scenes.js'
import Dev    from './dev.js'
import Liv    from './living.js'
import Tool   from './tool.js'
import Node   from '../boot/node.js'
import Sound  from './sound.js'
const matrix = Node.load('boot/gl-matrix.js');
const {vec3, mat4} = matrix;

const window = Draw.createWindow();
window.setClearColor([0.2, 0.3, 0.3, 1]);
window.center();

window.onKey(gl.GLFW_KEY_ESCAPE, gl.GLFW_PRESS, 0, function() {
  window.shouldClose();
});
window.prepareDraw();

const sp = Shader.init(window);
const camera = Game.createCamera(sp);
const order = Tool.createDrawOrder(Shader);
window.add(camera);
window.add(order);
camera.lookAt(0, 0, -1);
vec3.set(camera.up(), 0, -1, 0);

Sound.init(window);
Room.init(window, order, camera);
Scenes.init(window, camera, sp, order);
Scenes.start_game();

// 开发测试用
// Dev.roomBrowse(Room, window, camera);
// Dev.smallMapBrowse(Room, window);
// Dev.dataDirBrowse(Room, window);
// Dev.enemyBrowse(Liv, window, Room, camera);


// 备用游戏循环, 有戏主循环在别处
// window.add(Draw.showRate());
while (window.nextFrame()) {
}
window.destroy();
