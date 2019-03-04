//
// 方便开发使用的过程
//
export default {
  roomBrowse,
  runAllScript,
  enemyBrowse,
};

import File   from './file.js'
import Shader from './shader.js'
import Node   from '../boot/node.js'
const matrix = Node.load('boot/gl-matrix.js');


//
// 房间浏览器
//
function roomBrowse(Room, window, cam) {
  let roomIdx = -1;
  let cameraFront = cam.lookWhere();
  let cameraCenter = cam.pos();

  console.log("Total room", Room.count);
  // Room.switchRoom(roomIdx++);
  Room.showPic('common/data/Tit_bg.adt');
  // Room.showPic('common/file/map10.adt'); // 小地图
  // Room.showPic('pl0/emd0/EM03A.TIM');
  // Room.showPic('pl0/emd0/EM03A.tim');

  window.input().pressOnce(gl.GLFW_KEY_J, function() {
    _sw(1);
  });

  window.input().pressOnce(gl.GLFW_KEY_K, function() {
    _sw(-1);
  });

  window.onKey(gl.GLFW_KEY_Z, gl.GLFW_PRESS, 0, function() {
    matrix.vec3.rotateY(cameraFront, cameraFront, cameraCenter, 0.01);
  });

  console.log("Press J/K switch picture");

  function _sw(x) {
    roomIdx += x;
    if (roomIdx >= Room.count) roomIdx = 0;
    else if (roomIdx < 0) roomIdx = Room.count-1;

    while (!Room.switchRoom(roomIdx)) {
      console.warn("Blank room index", roomIdx.toString(16));
      roomIdx += x;
      if (roomIdx >= Room.count) roomIdx = 0;
      else if (roomIdx < 0) roomIdx = Room.count-1;
    }
    console.log('room', roomIdx.toString(16));
  }
}


function enemyBrowse(Liv, window, Room, camera) {
  let mods = [];
  // 39:艾达, 51:里昂, 94:机械臂, 91:食人花, 71:鳄鱼
  let mindex = 51;
  _dir('Pl0/emd0');
  _dir('pl1/emd1');

  let mod;
  let anim_idx = 0;
  let anim_frame = 0;
  let q = 0;
  let one_step = 5;

  let tmat = matrix.mat4.create(1);
  matrix.mat4.translate(tmat, tmat, [0, -4300, -3500]);
  matrix.mat4.rotateZ(tmat, tmat, Math.PI);
  Shader.setModelTrans(tmat);
  switchMod(0);

  window.onKey(gl.GLFW_KEY_D, gl.GLFW_PRESS, 0, function() {
    matrix.mat4.rotateY(tmat, tmat, 0.01);
    Shader.setModelTrans(tmat);
  });

  window.onKey(gl.GLFW_KEY_A, gl.GLFW_PRESS, 0, function() {
    matrix.mat4.rotateY(tmat, tmat, -0.01);
    Shader.setModelTrans(tmat);
  });

  window.onKey(gl.GLFW_KEY_S, gl.GLFW_PRESS, 0, function() {
    matrix.mat4.translate(tmat, tmat, [-one_step, 0, 0]);
    Shader.setModelTrans(tmat);
  });

  window.onKey(gl.GLFW_KEY_W, gl.GLFW_PRESS, 0, function() {
    matrix.mat4.translate(tmat, tmat, [one_step ,0, 0]);
    Shader.setModelTrans(tmat);
  });

  window.input().pressOnce(gl.GLFW_KEY_U, function() {
    switchMod(1);
  });

  window.input().pressOnce(gl.GLFW_KEY_I, function() {
    switchMod(-1);
  });

  window.input().pressOnce(gl.GLFW_KEY_Q, function() {
    if (mod) {
      if (!mod.setAnim(anim_idx++, 0)) {
        mod.setAnim(0, 0);
        anim_idx = 0;
      }
    }
  });

  window.input().pressOnce(gl.GLFW_KEY_1, function() {
    if (mod) {
      mod.setDir(-1);
    }
  });

  window.input().pressOnce(gl.GLFW_KEY_2, function() {
    if (mod) {
      mod.setDir(0);
    }
  });

  window.input().pressOnce(gl.GLFW_KEY_3, function() {
    if (mod) {
      mod.setDir(1);
    }
  });

  console.log("Press U/I next model");
  console.log("Press A/D rotate");
  console.log("Press W/S far/near");
  console.log("Press Q next pose");
  console.log("Press 1/2/3 play anim");


  function switchMod(x) {
    if (mod) {
      window.remove(mod);
      mod.free();
    }

    mindex += x;
    if (mindex < 0) mindex = mods.length-1;
    else if (mindex >= mods.length) mindex = 0;

    let info = mods[mindex];
    mod = Liv.loadEmd(info.player, info.id);
    window.add(mod);
    camera.lookAtSprite(mod);
    // 切换模型的同时, 用模型纹理做背景
    // Room.showPic(mod.texfile);
    console.log("Mod index:", mindex, info.player, info.id);
  }


  function _dir(d) {
    let dirfiles = File.read_dir(d);
    let reg = /em(.)(..)\.emd/;

    dirfiles.forEach(function(f) {
      let test = f.toLowerCase();
      if (! test.endsWith('.emd')) {
        return;
      }

      let match = reg.exec(test);
      if (! match) {
        console.log("Skip match", test);
        return;
      }

      mods.push({
        player : parseInt(match[1]),
        id : match[2],
      });
    });
  }
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