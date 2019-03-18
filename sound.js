import File   from './file.js'
import Sound  from '../boot/Sound.js'

const SOUND = 'COMMON/Sound/'
// 背景音乐, sub01 里昂第一个场景音乐
const BGM   = SOUND +'BGM/';
// fs 是地板声音, room 是机关/水/电梯等房间中的音效
const ROOM  = SOUND +'room/';
// 开枪的声音
const ARMS  = SOUND +'arms/';
// 开门的声音, 开门是上楼梯等
const DOOR  = SOUND +'door/';
// 敌人发出的声音
const ENEMY = SOUND +'enemy/';
// 各种声音音效, core16 是标题音乐.
const CORE  = SOUND +'core/';

let core;
let background;


export default {
  init,
  bgm,
};


function bgm(file) {
  let f = File.open(BGM_DIR + file);
  if (background) {
    background.free();
    background = null;
  }
  background = sap(f.buf, true, true);
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
  test(BGM, win);
}


function test(dir, win) {
  let bg = File.read_dir(dir);
  let arr = [];
  let wav = new Sound.Wav(core);
  let i = 61;

  bg.forEach(function(f) {
    if (f.endsWith('.sap')) {
      arr.push(f);
    }
  });

  play();

  let it = win.input();
  it.pressOnce(gl.GLFW_KEY_U, function() {
    if (++i >= arr.length) i = 0; 
    play();
  });

  it.pressOnce(gl.GLFW_KEY_I, function() {
    if (--i < 0) i = arr.length -1; 
    play();
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

    wav = sap(f.buf, true, true);
    console.log('  length:', wav.length(), 's');
  }
}
