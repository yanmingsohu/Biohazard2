import Tool from './tool.js'
import File from './file.js'


export default {
  init,
  get,
};


const INIT_TBL = 'COMMON/Data/INIT_TBL.DAT';
const BLOCK_SZ = 798;
const bgm = {};


function init() {
  let f = File.open(INIT_TBL);
  let buf = new DataView(f.buf);
  let b = 0;

  bgm_data(0, 0); // LEON A
  bgm_data(1, 0); // CLAIRE A
  bgm_data(0, 1); // LEON B
  bgm_data(1, 1); // CLAIRE B
  bgm_data(2, 0); // Hunk / Tofu
  bgm_data(3, 0); // Extreme Battle

  function bgm_data(player, ab) {
    let key = [player, ab, 1, 0];

    for (let x = 0x22c; x < 0x346; x += 2) {
      bgm[key.join('-')] = {
        main : buf.getUint8(b + x),
        sub  : buf.getUint8(b + x + 1),
      };
      
      if (++key[3] > 0x1E) {
        key[3] = 0;
        ++key[2];
      };
    }
    b += BLOCK_SZ;
  }
}


function get(stage, room_nm, player, ab) {
  let key = [player, ab, stage, room_nm].join('-');
  console.log("TBL key", key);
  return bgm[key] || 0xff;
}