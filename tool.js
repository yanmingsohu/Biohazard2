import Shader from './shader.js'

export default {
  inRanges,
  showRange,
  showBox,
  xywh2range,
};


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

    if((a > 0 && b > 0 && c > 0 && d > 0) ||
       (a < 0 && b < 0 && c < 0 && d < 0)) {
			return i;
		}
  }
  return;
}


//
// 4属性转换为4个坐标
//
function xywh2range(n) {
  return {
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


//
// 测试用, 可视化范围(x1~4, y1~4)
//
function showRange(range, window) {
  const vertices = new Float32Array([
    range.x1, 0, range.y1,
    range.x2, 0, range.y2,
    range.x3, 0, range.y3,
    range.x1, 0, range.y1,
    range.x4, 0, range.y4,
    range.x3, 0, range.y3,
  ]);

  let r = Shader.createBasicDrawObject();
  r.addVertices(vertices, 6);
  r.setAttr({ index: 0, vsize: 3, stride: 3*gl.sizeof$float });

  window.add({ 
    draw(u, t) {
      Shader.draw_invisible();
      r.draw(u, t);
    },
  });
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

  window.add({ 
    draw() {
      Shader.draw_invisible();
      box.draw();
    },
  });
}