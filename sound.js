import File   from './file.js'
import Sound  from '../boot/Sound.js'
import Tool   from './tool.js'
import * as Adpcm from '../boot/imaadpcm.js'

const SOUND = 'COMMON/Sound/'
// 背景音乐, sub01 里昂第一个场景音乐
const BGM   = SOUND +'BGM/';
// fs 是地板声音, room 是机关/水/电梯等房间中的音效
const ROOM  = SOUND +'room/';
const FLOOR = ROOM;
// 开枪的声音
const ARMS  = SOUND +'arms/';
// 开门的声音, 开门是上楼梯等
const DOOR  = SOUND +'door/';
// 敌人发出的声音
const ENEMY = SOUND +'enemy/';
// 各种声音音效, core16 是标题音乐.
const CORE  = SOUND +'core/';

let core;
let main;
let sub0;
let sub1;


export default {
  init,
  bgm,
  vab,
  getBgm,
  playSE,
  playVoice,
  floorSE,
  enemySE,
  mapSE,
};


// 暂时不用
function vab(buf, rate, ch) {
  let wavbuf = new Int16Array(Adpcm.decode(buf, 16));
  console.log(buf.length, wavbuf.length);
  let wav = new Sound.Wav(core);
  wav.rawBuffer(wavbuf, rate || 44100, ch || 1);
  wav.play();
  wav.loop(true);
  return wav;
}


//
// 允许内部 wav 对象被释放而不会崩溃.
//
class AnimSound {
  constructor(fname, _wav) {
    this.state = 0;
    try {
      if (fname) {
        const file = File.open(fname);
        this.wav = sap(file.buf, false, false);
        this.state = 1;
      } else if (_wav) {
        this.wav = _wav;
        this.state = 1;
      } else {
        console.warn("not se");
      }
    } catch(e) {
      console.error("cannot init AnimSound", fname || e);
      this.state = -1;
    }
  }

  free() {
    if (this.state == -1) return;
    this.state = -1;
    if (this.wav) {
      this.wav.free();
      this.wav = null;
    }
  }

  // flag: 0x8 左脚? 0xC 右脚?
  play(flag) {
    if (this.state == 1) {
      let cp = this.wav.clone();
      cp.play();
    }
  }

  length() {
    if (this.state == 1) {
      return this.wav.length();
    }
    return 0;
  }
}


function enemySE(sound_bank) {
  const fname = ENEMY +'enemy'+ Tool.d2(sound_bank) +'.sap';
  return new AnimSound(fname);
}


function floorSE(floor, vab) {
  // TODO: 整对他
  let prgIdx = ((floor.se_no & 0xF0) >>4) -1;
  let tonIdx = floor.se_no & 0x7;
  let raw = vab.raw[ vab.prog[prgIdx].tone[tonIdx].vag ];
  const se = mapSE(raw);
  se.height = floor.height;
  se.range = Tool.xywd2range(floor);
  return se;
}


function mapSE(raw) {
  let wav = null;
  if (raw) {
    wav = new Sound.Wav(core);
    wav.rawBuffer(raw, 44100/2, 1, audio.RAW_TYPE_16BIT);
  }
  return new AnimSound(null, wav);
}


function playSE(stage, se) {
  let name = ROOM +'room'+ stage + Tool.b2(se) +'.sap';
  // let name = ROOM +'room'+ se +'.sap';
  try {
    let f = File.open(name);
    return sap(f.buf, true, false);
  } catch(e) {
    console.error("Play SE", name, "fail:", e);
  }
}


function playVoice(playerid, stage, id) {
  let name = 'Pl'+ playerid +'/VOICE/stage'+ stage +'/v' + Tool.d3(id) +'.sap';
  try {
    let f = File.open(name);
    return sap(f.buf, true, false);
  } catch(e) {
    console.error("Play voice", name, 'fail:', e);
  }
}


function getBgm(id) {
  switch (id) {
    case 0:
      return main;
    case 1:
      return sub0;
    case 2:
      return sub1;
    default:
      throw new Error("bad id "+ id);
  }
}


function bgm(mainid, sub0id, sub1id) {
  if (mainid) {
    if (!main) {
      loadMain();
    } else if (main.id != mainid) {
      main.free();
      loadMain();
    }
  } else {
    main.free();
  }

  if (sub0) sub0.free();
  if (sub1) sub1.free();
  if (sub0id) sub0 = loadSub(sub0id);
  if (sub1id) sub1 = loadSub(sub1id);

  function loadMain() {
    try {
      let f = File.open(BGM +'main'+ mainid +'.sap');
      main = sap(f.buf, false, true);
      main.id = mainid;
    } catch(e) {
      console.error("Load Main sound", e.stack);
    }
  }

  function loadSub(subid) {
    try {
      let f = File.open(BGM +'sub'+ subid +'.sap');
      return sap(f.buf, false, true);
    } catch(e) {
      console.error('Load Sub sound', e.stack);
    }
  }
}


function sap(arraybuf, play, loop) {
  let wav = new Sound.Wav(core);
  wav.fromBuffer(new Uint8Array(arraybuf, 8));
  if (play) wav.play();
  wav.loop(loop);
  return wav;
}


function init(win) {
  core = new Sound.Core();
  // test(ROOM, win, true);
}


function test(dir, win, loop) {
  let bg = File.read_dir(dir);
  let arr = [];
  let wav = new Sound.Wav(core);
  let i = 0; //61; 初始场景音乐

  bg.forEach(function(f) {
    let n = f.toLowerCase();
    if (n.endsWith('.sap')) {
      arr.push(f);
    }
  });

  // play();

  let it = win.input();
  it.pressOnce(gl.GLFW_KEY_U, function() {
    if (++i >= arr.length) i = 0; 
    play();
  });

  it.pressOnce(gl.GLFW_KEY_I, function() {
    if (--i < 0) i = arr.length -1; 
    play();
  });

  it.pressOnce(gl.GLFW_KEY_O, function() {
    wav && wav.pause();
  });

  console.log("press U/I switch music");

  function play() {
    if (wav) wav.free();
    console.log('Read', i, arr[i]);
    let f = File.open(arr[i], true);
    if (f.size <= 8) {
      console.log("  bad", f.size);
      return;
    }

    wav = sap(f.buf, true, loop);
    console.log('  length:', wav.length(), 's');
  }
}
