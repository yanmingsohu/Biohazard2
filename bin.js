//
// 读取 bin 格式, 每种 bin 的格式都略微不同
//
const pwd = (global.game.bio2 || '.') + '/';

export default {
  load,
  roomcut,
};


//
// 按文件名解析不同的格式, 每种格式返回对象可能不同.
//
function load(file) {
  if (file.indexOf('roomcut')) {
    return roomcut(open(file));
  }
}


function open(file) {
  const size = fs.fileSize(pwd + file);
  const buf = new ArrayBuffer(size);
  let fd = fs.open(pwd + file, 'rb');
  fs.read(fd, buf, 0, size, 0);
  fs.close(fd);
  return { buf, size, };
}


//
// 返回的对象可以长期缓存
// buf -- ArrayBuffer
//
function roomcut(file) {
  const data = new DataView(file.buf);
  const count = data.getUint32(0, true) / 4;
  const fileIndex = [];
  // fileIndex.length = count;
  console.log('BIN roomcat file maybe count:', count);

  for (let i=0; i<count-1; ++i) {
    let fi = {
      begin: data.getUint32(i*4, true),
      end  : data.getUint32(i*4+4, true),
    };
    if (fi.end - fi.begin > 0) {
      fileIndex.push(fi);
    }
    // console.log("RoomINF", i, fi.begin, fi.end, fi.end-fi.begin);
  }

  // 最后一空块
  // fileIndex.push({
  //   begin: data.getUint32(count*4-4, true),
  //   end  : file.size,
  // });
  // console.log(JSON.stringify(fileIndex));

  return {
    // 读取 i 索引处的文件, 返回 DataView
    get,
    // 返回 Uint8Array 缓冲区
    get8,
    count : fileIndex.length,
  };

  function get(i) {
    var f = fileIndex[i];
    if (!f) throw new Error("index outof file count");
    return new DataView(file.buf, f.begin, f.end-f.begin);
  }

  function get8(i) {
    var f = fileIndex[i];
    if (!f) throw new Error("index outof file count");
    return new Uint8Array(file.buf, f.begin, f.end-f.begin);
  }
}