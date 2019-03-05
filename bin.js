//
// 读取 bin 格式, 每种 bin 的格式都略微不同
//
import File from './file.js'

export default {
  load,
};


//
// 按文件名解析不同的格式, 每种格式返回对象可能不同.
//
function load(file) {
  console.log("Load bin:", file);
  if (file.indexOf('roomcut') > 0) {
    return _bin(file);
  }
  if (file.indexOf('espdat') > 0) {
    return _bin(file);
  }
  if (file.indexOf('file') > 0) {
    return _file(file);
  }
  _bin(file);
  // throw new Error("cannot open BIN: "+ file);
}


function _file(file) {
  const dv = File.dataViewExt(File.openDataView(file));
  const offset = dv.ulong();
  if (!offset) {
    throw new Error("no adt in "+ file);
  }
  throw new Error("no implements read "+ file);
}


//
// 返回的对象可以长期缓存
// file - String 
//
function _bin(file) {
  const fd = File.openHandle(file);
  const count = _count();
  const fileIndex = _header();

  return {
    // 读取 i 索引处的文件, 返回 DataView
    get,
    // 返回 Uint8Array 缓冲区
    get8,
    // 可用的最大索引, 有的索引指向空文件 (TODO:指向同一个文件?)
    count,
  };

  function _count() {
    let buf = new Uint32Array(1);
    fs.read(fd, buf, 0, 4, 0);
    return buf[0] / 4;
  }

  function _header() {
    let buf = new Uint32Array(1);
    let lastCur = File.fileSize(file);
    let fileIndex = [];
    console.debug('BIN file maybe count:', count);
    
    for (let i=count-1; i>=0; --i) {
      fs.read(fd, buf, 0, 4, i*4);
      if (buf[0]) {
        fileIndex[i] = { begin : buf[0], end : lastCur };
        lastCur = buf[0];
        // console.debug("RoomINF", i, JSON.stringify(fileIndex[i]));
      }
    }
    return fileIndex;
  }

  function get(i) {
    return _buf(i, DataView);
  }

  function get8(i) {
    return _buf(i, Uint8Array);
  }

  function _buf(i, T) {
    if (i >= count) throw new Error("index outof file count");
    let f = fileIndex[i];
    if (!f) return;
    let len = f.end-f.begin;
    if (len <= 0) return;

    let buf = new ArrayBuffer(len);
    fs.read(fd, buf, 0, len, f.begin);
    return new T(buf);
  }
}