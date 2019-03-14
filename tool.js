import Shader from './shader.js'

const PI_90  = Math.PI / 2;
const PI_270 = Math.PI * 1.5;
const PI_360 = Math.PI * 2;
const PI     = Math.PI;

export default {
  inRanges,
  inRange,
  showRange,
  showBox,
  showCollision,
  xywh2range,
  xywd2range,
  xywhBindRange,
  bindWindow,
  createDrawOrder,
  debug,
};


function debug() {
  const a = arguments;
  let v;
  for (let i=0; i<a.length; ++i) {
    v = a[i];
    if (v === null) v = 'null';
    else if (v === undefined) v = 'undefined';
    else if (v.constructor != Number && 
        v.constructor != String &&
        v.constructor != Boolean &&
        v.constructor != Array &&
        !ArrayBuffer.isView(v)
    ) {
      a[i] = JSON.stringify(v);
    } 
  }
  console.debug.apply(console, a);
}


//
// 成功返回位置在 range 的索引, (注意返回 0 索引).
// 失败返回 false.
//
function inRanges(range, who) {
  const w = who.where();
  const x = w[0], y = w[2];
  let r, a, b, c, d;

  for (let i=range.length-1; i>=0; --i) {
    r = range[i];

    a = (r.x2 - r.x1)*(y - r.y1) - (r.y2 - r.y1)*(x - r.x1);
		b = (r.x3 - r.x2)*(y - r.y2) - (r.y3 - r.y2)*(x - r.x2);
		c = (r.x4 - r.x3)*(y - r.y3) - (r.y4 - r.y3)*(x - r.x3);
    d = (r.x1 - r.x4)*(y - r.y4) - (r.y1 - r.y4)*(x - r.x4);

    if ((a > 0 && b > 0 && c > 0 && d > 0) ||
        (a < 0 && b < 0 && c < 0 && d < 0)) {
			return i;
		}
  }
  return;
}


function inRange(r, who) {
  const w = who.where();
  const x = w[0], y = w[2];
  let a, b, c, d;

  a = (r.x2 - r.x1)*(y - r.y1) - (r.y2 - r.y1)*(x - r.x1);
  b = (r.x3 - r.x2)*(y - r.y2) - (r.y3 - r.y2)*(x - r.x2);
  c = (r.x4 - r.x3)*(y - r.y3) - (r.y4 - r.y3)*(x - r.x3);
  d = (r.x1 - r.x4)*(y - r.y4) - (r.y1 - r.y4)*(x - r.x4);

  if ((a > 0 && b > 0 && c > 0 && d > 0) ||
      (a < 0 && b < 0 && c < 0 && d < 0)) {
    return true;
  }
  return;
}


//
// 4属性转换为4个坐标
//
function xywh2range(n) {
  return {
    id: n.id,
    x1: n.x + n.w,
    y1: n.y + n.h,
    x2: n.x,
    y2: n.y + n.h,
    x3: n.x,
    y3: n.y,
    x4: n.x + n.h,
    y4: n.y,
  };
}


function xywd2range(n) {
  return {
    x1: n.x,
    y1: n.y,
    x2: n.x,
    y2: n.y + n.d,
    x3: n.x + n.w,
    y3: n.y + n.d,
    x4: n.x + n.w,
    y4: n.y,
  };
}


//
// 把自身的 xywh 属性转换为4个坐标保存在自身
//
function xywhBindRange(n) {
  if (isNaN(n.x1) && isNaN(n.x2) && 
      isNaN(n.x3) && isNaN(n.x4) &&
      isNaN(n.y1) && isNaN(n.y2) &&
      isNaN(n.y3) && isNaN(n.y4) ) 
  {
    n.x1 = n.x + n.w;
    n.y1 = n.y + n.h;
    n.x2 = n.x;
    n.y2 = n.y + n.h;
    n.x3 = n.x;
    n.y3 = n.y;
    n.x4 = n.x + n.h;
    n.y4 = n.y;
  } else {
    throw new Error("bad arg");
  }
  return n;
}


//
// 测试用, 可视化范围(x1~4, y1~4)
//
function showRange(range, window, color, y) {
  if (!y) y = 0;
  const vertices = new Float32Array([
    range.x1, y, range.y1,
    range.x2, y, range.y2,
    range.x3, y, range.y3,
    range.x1, y, range.y1,
    range.x4, y, range.y4,
    range.x3, y, range.y3,
  ]);

  let r = Shader.createBasicDrawObject();
  r.addVertices(vertices, 6);
  r.setAttr({ index: 0, vsize: 3, stride: 3*gl.sizeof$float });

  return bindWindow(window, r, Shader.draw_invisible, color);
}


function showBox(x, y, w, h, window) {
  const v = new Float32Array([
    x,      0, y,
    x+w,    0, y,
    x+w,    0, y+h,
    x,      0, y+h,
    x,   1000, y,
    x+w, 1000, y,
    x+w, 1000, y+h,
    x,   1000, y+h,
  ]);

  const i = new Uint8Array([
    0, 1, 3, 1, 2, 3,
    4, 5, 7, 5, 6, 7,
  ]);

  let box = Shader.createBasicDrawObject();
  box.addVerticesElements(v, i);
  box.setAttr({ index: 0, vsize: 3, stride: 3*gl.sizeof$float });

  return bindWindow(window, box, Shader.draw_invisible);
}


function showCollision(c, win, color) {
  switch(c.shape) {
    default:
      var r = xywd2range(c);
      return showRange(r, win, color, c.floor * -1800);
  }
}


//
// 把窗口和可绘制对象进行绑定, 
// 绘制对象释放时从 win 中删除, 并删除自身
//
function bindWindow(win, drawer, draw_type_fn, _data) {
  const wrap = {
    draw(u, t) {
      draw_type_fn(_data);
      drawer.draw(u, t);
    },

    free() {
      win.remove(wrap);
      drawer.free();
    },
  };
  win.add(wrap);
  return wrap;
}


//
// 只管绘制顺序, 不管资源释放;
// 可以设置 null 对象以删除对象引用.
//
function createDrawOrder(shader) {
  let background;
  let mask;
  const mod = [];

  const thiz = {
    setBackground,
    setMask,
    addMod,
    rmMod,
    draw,
    free,
  };
  return thiz;

  function setBackground(b) {
    background = b;
  }

  function setMask(m) {
    mask = m;
  }

  function addMod(m) {
    mod.push(m);
  }

  function rmMod(m) {
    for (let i=0, len=mod.length; i<len; ++i) {
      if (mod[i] == m) {
        mod.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  function free() {
    throw new Error("unsupport");
  }

  function draw(u, t) {
    if (background) {
      shader.draw_background();
      background.draw(u, t);
    }

    if (mod.length > 0) {
      for (let i=0, len=mod.length; i<len; ++i) {
        mod[i].draw(u, t);
      }
    }

    if (mask) {
      // shader.draw_mask();
      // mask.draw(u, t);
    }
  }
}


export class Point2 {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  // 叉积
  cross(p) {
    return this.x * p.y - this.y * p.x;
  }

  // 点积
  dot(p) {
    return this.x * p.x + this.y + p.y;
  }

  // 减去 p
  minus(p) {
    return new Point2(this.x - p.x, this.y - p.y);
  }

  add(p) {
    return new Point2(this.x + p.x, this.y + p.y);
  }

  // 返回单位向量
  norm() {
    let len = this.x * this.x + this.y * this.y;
    if (len > 0) {
      len = 1 / Math.sqrt(len);
    }
    return new Point2(this.x * len, this.y * len);
  }

  len() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  // 与 p 的夹角
  angle(p) {
    return Math.acos(this.cross(p) / (this.len() * p.len()));
  }

  toString() {
    return '('+ this.x +','+ this.y +')';
  }
}


export class Triangle2 {
  constructor(p1, p2, p3) {
    this.p1 = p1;
    this.p2 = p2;
    this.p3 = p3;
  }

  // 点 p 在三角形内部, 返回 true
  in(p) {
    let pa = this.p1.minus(p);
    let pb = this.p2.minus(p);
    let pc = this.p3.minus(p);
    let t1 = pa.cross(pb);
    let t2 = pb.cross(pc);
    let t3 = pc.cross(pa);
    return (t1 * t2 >= 0) && (t1 * t3 >= 0);
  }

  toString() {
    return '{'+ this.p1 + this.p2 + this.p3 + '}';
  }
}


export class Rectangle2 {
  constructor(p1, p2, p3, p4) {
    this.p1 = p1;
    this.p2 = p2;
    this.p3 = p3;
    this.p4 = p4;
  }

  in(p) {
    const x = p.x, y = p.y;
    const rx1 = this.p1.x, ry1 = this.p1.y;
    const rx2 = this.p2.x, ry2 = this.p2.y;
    const rx3 = this.p3.x, ry3 = this.p3.y;
    const rx4 = this.p4.x, ry4 = this.p4.y;
    let a, b, c, d;
  
    a = (rx2 - rx1)*(y - ry1) - (ry2 - ry1)*(x - rx1);
    b = (rx3 - rx2)*(y - ry2) - (ry3 - ry2)*(x - rx2);
    c = (rx4 - rx3)*(y - ry3) - (ry4 - ry3)*(x - rx3);
    d = (rx1 - rx4)*(y - ry4) - (ry1 - ry4)*(x - rx4);
  
    if ((a > 0 && b > 0 && c > 0 && d > 0) ||
        (a < 0 && b < 0 && c < 0 && d < 0)) {
      return true;
    }
  }
}
