//
// 方便开发使用的过程
//
export default {
  roomBrowse,
  runAllScript,
};


//
// 房间浏览器
//
function roomBrowse(Room, window) {
  let roomIdx = -1;
  let notrel = 0;

  console.log("Total room", Room.count);
  // Room.switchRoom(roomIdx++);
  Room.showPic('common/data/Tit_bg.adt');
  // Room.showPic('pl0/emd0/EM03A.TIM');
  // Room.showPic('pl0/emd0/EM03A.tim');

  window.onKey(gl.GLFW_KEY_J, gl.GLFW_PRESS, 0, function() {
    if (notrel) return;
    notrel = true;
    if (++roomIdx >= Room.count) roomIdx = 0;
    while (!Room.switchRoom(roomIdx)) {
      console.warn("Blank room index", roomIdx.toString(16));
      ++roomIdx;
    }
    console.log('room', roomIdx.toString(16));
  });

  window.onKey(gl.GLFW_KEY_J, gl.GLFW_RELEASE, 0, function() {
    notrel = false;
  });

  window.onKey(gl.GLFW_KEY_K, gl.GLFW_PRESS, 0, function() {
    roomIdx = 0;
  });
}


//
// 尝试运行 bio 脚本, 并打印过程
//
function runAllScript(mapObj, runtime_data) {
  _all(mapObj.init_script);
  _all(mapObj.room_script);
  // console.log("Map:", JSON.stringify(map0, 0, 2));

  function _all(script) {
    for (var i=0; i<script.count; ++i) {
      console.debug("------------ Run script", i);
      script.run(runtime_data);
    }
  }
}