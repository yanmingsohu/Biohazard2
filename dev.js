//
// 方便开发使用的过程
//
export default {
  roomBrowse,
  runAllScript,
  enemyBrowse,
  smallMapBrowse,
  dataDirBrowse,
  bgm,
};

import File   from './file.js'
import Shader from './shader.js'
import Node   from '../boot/node.js'
import BGM    from './bgm.js'
import Tool, {DrawArray} from './tool.js'
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
  // Room.showPic('common/file/map00d.adt'); // 小地图
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


function adtBrowse(dir, Room, window) {
  let mapIdx = 0;
  const maps = [];
  const p = dir.split('/')[0];

  let tmp = File.read_dir(dir);
  tmp.forEach(function(f) {
    if (f.endsWith('.adt') || f.endsWith('.tim')) {
      let x = f.indexOf(p);
      maps.push(f.substr(x));
    }
  });

  console.log("Total map", maps.length);
  Room.showPic(maps[0]); // 小地图

  window.input().pressOnce(gl.GLFW_KEY_J, function() {
    _sw(1);
  });

  window.input().pressOnce(gl.GLFW_KEY_K, function() {
    _sw(-1);
  });

  console.log("Press J/K switch picture");

  function _sw(x) {
    mapIdx += x;
    if (mapIdx < 0) mapIdx = maps.length-1;
    else if (mapIdx >= maps.length) mapIdx = 0;
    console.line(mapIdx, maps[mapIdx]);
    try {
      Room.showPic(maps[mapIdx]);
    } catch(e) {
      console.error(e.stack);
    }
  }
}


function smallMapBrowse(Room, window) {
  adtBrowse('common/file', Room, window);
}


function dataDirBrowse(Room, window) {
  adtBrowse('common/data', Room, window);
}


function enemyBrowse(Liv, window, Room, camera) {
  camera.setPos(3000, -1000, 0);
  let mods = [];
  // 46: 枪店老板
  // 动画不正常: 51:里昂, 94:机械臂, 91:食人花, 70:舔舐者, 71:鳄鱼
  // 模型不正常: 39:艾达, 20:暴君
  let mindex = 51;
  _dir('Pl0/emd0');
  _dir('pl1/emd1');

  let mod;
  let anim_idx = 0;
  let anim_frame = 0;
  // let q = 0;
  let one_step = 5;
  let weaponid = 0;
  let player;
  let curr_weapon;

  let tmat = matrix.mat4.create(1);
  matrix.mat4.translate(tmat, tmat, [0, 0, 0]);
  // matrix.mat4.rotateZ(tmat, tmat, Math.PI);
  Shader.setModelTrans(tmat);
  Shader.setEnvLight({r:255, g:255, b:255});
  switchMod(0);
  mod.setAnim(0, 0);
  // mod.setDir(1);

  const d = 100000;
  const color3 = new Float32Array([0.01, 0.01, 0.01]);
  const range3 = Tool.xywd2range({x:0, y:-d, d:d<<1, w:10});
  Tool.showRange(range3, window, color3);
  const color2 = new Float32Array([0.9, 0.9, 0.9]);
  const range1 = Tool.xywd2range({x:-d, y:0, d:10, w:d<<1});
  Tool.showRange(range1, window, color3);
  const range = Tool.xywd2range({x:-d, y:-d, d:d<<1, w:d<<1});
  Tool.showRange(range, window, color2);

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

  window.input().pressOnce(gl.GLFW_KEY_4, function() {
    if (++anim_frame > mod.getPoseFrameLength()) 
      anim_frame = 0;
    mod.setAnim(anim_idx, anim_frame);
    console.log("Frame", anim_frame);
  });

  window.input().pressOnce(gl.GLFW_KEY_Q, function() {
    if (!mod) return;
    if (!mod.setAnim(++anim_idx, 0)) {
      mod.setAnim(0, 0);
      anim_idx = 0;
    }
    console.log("POSE", anim_idx);
  });

  window.input().pressOnce(gl.GLFW_KEY_E, function() {
    if (!mod) return;
    console.log("weapon", weaponid);
    switchWeapon(weaponid++);
    if (weaponid > 18) weaponid = 0;
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
    player = info.player;

    mod = Liv.loadEmd(player, info.id);
    // mod = Liv.fromPld(info.player, x);
    
    window.add(mod);
    camera.lookAtSprite(mod);
    // 切换模型的同时, 用模型纹理做背景
    // Room.showPic(mod.texfile);
    camera.lookAt(tmat[12], tmat[13]-1000, tmat[14]);
    console.log("Mod index:", mindex, player, info.id);
  }


  function switchWeapon(i) {
    let weapon = Liv.fromPlw(player, i);
    let comp = new DrawArray();
    Liv.createSprites(weapon.mesh, weapon.tex, comp.array);
    mod.getMD().setPoseFromMD(weapon, 10);
    mod.getMD().combinationDraw(11/*right hand*/, comp);
    if (curr_weapon) {
      curr_weapon.free();
    }
    curr_weapon = comp;
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


function bgm() {
  Tool.debug(audio.F_WaveShaperFilter);
  let sub0 = 'COMMON/Sound/BGM/SUB_01.BGM';
  let main0 = 'COMMON/Sound/BGM/MAIN0C.BGM';
  let main1 = 'COMMON/Sound/BGM/MAIN05.BGM';
  // let seq = BGM.main(main0);
  let seq = BGM.sub(sub0)[0];
  // for (;;) {
    seq.play();
  //   console.log("LOOP");
  // }
  // allnote(seq);

  function allnote(seq) {
    let ch = seq.getChannel(0);
    ch.setProgram(2);
    for (let i=48; i<127; ++i) {
      console.log("Note", i);
      ch.play(i, 120);
      thread.wait(1200);
    }
  }
}