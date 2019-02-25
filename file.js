const pwd = (global.game.bio2 || '.') + '/';
import H from '../boot/hex.js'

//
// 图像功能文件
//
const pic_map = {
  // 游戏启动时的提示: "本游戏包含暴..."
  'info' : 'common/data/gw2.adt',
  // 选择 B 面的画面
  'selectb' : 'common/data/SELECT_B.adt',
  // 恭喜过关画面, 显示秘籍
  'congratulations' : 'common/data/sp_e.adt',
  // 里昂通关评分画面
  'rank_leon' : 'common/data/end10.adt',
  // 克莱尔通关评分画面
  'rank_claire' : 'common/data/end11.adt',
  // 第四幸存者通关评分画面
  'rank_4' : 'common/data/end12.adt',
  // 豆腐通关评分画面
  'rank_doufu' : 'common/data/end14.adt',
  // 第四幸存者通关评分画面, 在直升机上.
  'end15' : 'common/data/END15.adt',
  // 第四幸存者通关评分画面, 在直升机上吃豆腐.
  'end16' : 'common/data/END16.adt',
  // 夕阳
  'end17' : 'common/data/END17.adt',
  // 某种模式通关评分
  'end18' : 'common/data/END18.adt',
  // 警署大厅画面
  'clear1' : 'common/data/Clear1.adt',
  // 下水道某处画面
  'clear2' : 'common/data/Clear2.adt',
  // 明暗度调整画面
  'color' : 'common/data/color2.adt',
  // 游戏配置画面
  'config' : 'common/data/conf10.adt',
  // 房间中的镜子
  'config1' : 'common/data/room.adt',
  // 回忆, 艾达坠落画面
  'mm0': 'common/data/open12.adt',
  // 回忆, 克莱额与雪莉
  'mm1': 'common/data/open13.adt',
  // 大奖牌
  'rank': 'common/data/RESULT.adt',
  // 打字机存档画面
  'saveload': 'common/data/type00.adt',

  // 标题1 大眼睛
  'title1': 'common/data/Tit_bg.adt',
  // 标题2 幸存者
  'title2': 'common/data/Title_o.adt',
  // 标题3 豆腐
  'title3': 'common/data/Title_o2.adt',

  // 物品选择框: UI 元素
  'itemui0': 'common/data/SELECT_W.tim',
  // 物品选择框: ui 元素
  'itemui1': 'common/data/st0_jp.tim',
  // 物品选择框 道具
  'item1': 'common/data/SELECT_i.tim',
  // 记事本纹理 3种调色板
  'item_book': 'common/data/ST_FILE.tim',

  // 开场介绍 骷髅头
  'start_0' : 'common/data/open10.adt',
  // 开场介绍 细胞, 一张图片做动画化处理
  'start_1' : 'common/data/open00.adt',
  // 开场介绍 黑白照片, 1代洋馆门口
  'start_2' : '',
  // 开场介绍 黑白照片, 大爆炸 -> 伞动画
  'start_3' : 'common/data/open11.adt',
  // 伞图片 
  'start_3.1': 'common/data/open02.adt',
  // 开场介绍 黑白照片, 实验室内部
  'start_4' : '',
/* ------------------------------------------- 功能未知的图片 */
  // 僵尸的背影, 在警察局门口的通道下
  'u0' : 'common/data/end13.adt',
  // 不能正常解析的字体 ?
  'cfont' : 'common/data/cfont.adt',
};

const LITTLE_ENDIAN = true;
const BIG_ENDIAN  = false;
let defaultEndian = LITTLE_ENDIAN;


export default {
  open,
  openArrayBuffer,
  openDataView,
  openHandle,
  open_pic,
  fileSize,
  pic_map,
  dataViewExt,
  read_dir,
  LITTLE_ENDIAN,
  BIG_ENDIAN,
};


function read_dir(d) {
  return fs.read_dir(pwd + d);
}


//
// 在功能图片字典中寻找对应的文件
//
function open_pic(name_from_pic_map) {
  return open(pic_map[name_from_pic_map]);
}


function open(file) {
  const size = fs.fileSize(pwd + file);
  const buf = new ArrayBuffer(size);
  let fd = fs.open(pwd + file, 'rb');
  fs.read(fd, buf, 0, size, 0);
  fs.close(fd);
  
  return { 
    buf, 
    size, 
  };
}


function openHandle(file) {
  return fs.open(pwd + file, 'rb');
}


function fileSize(file) {
  return fs.fileSize(pwd + file);
}


function openArrayBuffer(file) {
  return open(file).buf;
}


//
// 返回一个 DataView
//
function openDataView(file) {
  return new DataView(open(file).buf);
}


//
// TODO: set方法
// 扩展 DataView 增加方法
//
// 函数中的 i 为读取位置, 如果该参数未提供, 则使用内置指针
// 内置指针在函数返回后增加相应的步幅.
//
function dataViewExt(v) {
  let littleEndian = defaultEndian;
  let pos = 0;

  return Object.assign(v, {

    // 返回内置指针的值, 内置指针总是指向即将读取的数值的位置
    getpos() {
      return pos;
    },

    // 设置内置指针
    setpos(i) {
      if (i >=0 ) pos = i;
      else throw new Error("bad pos:"+ i);
    },

    // 设置小端字节序, 默认为 LittleEndian
    setLittleEndian() {
      littleEndian = true;
    },

    // 设置为大端字节序
    setBigEndian() {
      littleEndian = false;
    },

    isLittleEndian() {
      return littleEndian;
    },

    // 返回一个字节的无符号整型
    byte(i) {
      return v.getUint8(P(i, 1), littleEndian);
    },

    // 返回一个字节的有符号整型
    char(i) {
      return v.getInt8(P(i, 1), littleEndian);
    },

    // 2个字节有符号整型
    short(i) {
      return v.getInt16(P(i, 2), littleEndian);
    },

    // 2个字节无符号整型
    ushort(i) {
      return v.getUint16(P(i, 2), littleEndian);
    },

    // 4字节有符号整型
    long(i) {
      return v.getInt32(P(i, 4), littleEndian);
    },

    // 4字节无符号整型
    ulong(i) {
      return v.getUint32(P(i, 4), littleEndian);
    },

    // 4字节浮点数
    float(i) {
      return v.getFloat32(P(i, 4), littleEndian);
    },

    // 8字节浮点数
    float64(i) {
      return v.getFloat64(P(i, 8), littleEndian);
    },

    // 16进制格式打印缓冲区内容, begin 未设置使用内置指针
    // length 默认为 0x100 字节, 该方法不改变内置指针的位置
    print(begin, length) {
      let buf = this.build(Uint8Array, begin||pos, length||0x100);
      H.printHex(buf);
    },

    // 用视图中的缓冲区构建 T 类型的 TypedArray
    // 该方法不会引起内存复制, 任何修改都会反映在原始视图和创建的视图上.
    build(T, begin, length) {
      try {
        // console.log("build buf:", v.byteOffset, v.byteOffset + begin, length);
        return new T(v.buffer, v.byteOffset + begin, length);
      } catch(e) {
        throw new Error(e.message +' Offset:'+ begin 
            + " Length:"+ length +" Total:"+ v.byteLength);
      }
    },
  });

  function P(i, o) {
    if (isNaN(i)) {
      i = pos;
      pos += o;
    } else {
      pos = i + o;
    }
    return i;
  }
}