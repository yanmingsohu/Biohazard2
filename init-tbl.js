import Tool from './tool.js'
import File from './file.js'


export default {
  init,
  get,
};


const INIT_TBL = 'COMMON/Data/INIT_TBL.DAT';
const BLOCK_SZ = 798;
const bgm = {};
const floor = {};


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
      
      // TODO: 这里不是线性映射关系
      if (++key[3] > 0x1E) {
        key[3] = 0;
        ++key[2];
      };
    }
    // floor_data(player, ab);
    b += BLOCK_SZ;
  }

  // floor 的数据可能是3个字节表示4个音频文件索引
  function floor_data(player, ab) {
    let idx = [];
    for (let x = 0x62; x < 0x100; x+=3) {
      // qqqq qqqq | wwww wwww | rrrr rrrr
      // aaaa aaee | eeee cccc | ccdd dddd
      let q = buf.getUint8(b + x);
      let w = buf.getUint8(b + x +1);
      let r = buf.getUint8(b + x +2);

      let a = ((q & 0x0C) >> 2) | ((q & 0xF0) >> 2);
      let e = ((q & 0x03) << 4) | ((w & 0xF0) >> 4);
      let c = ((w & 0x0F) << 2) | ((r & 0xC0) >> 4);
      let d = (r & 0x3F);
      idx.push(a, e, c, d);
    }
    Tool.debug(idx);
    
    for (let s = 1; s < 17; ++s) {
    }
  }
}


function get(stage, room_nm, player, ab) {
  let key = [player, ab, stage, room_nm].join('-');
  console.log("TBL key", key);
  return bgm[key] || 0xff;
}