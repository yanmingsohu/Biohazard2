import Tool, {Triangle2, Point2, Rectangle2, RectangleMark} from './tool.js'

const X = 12;
const Y = 14; // 逻辑 Y 轴, 纵深
const Z = 13; // 逻辑 Z 轴, 上下
const PI_90  = Math.PI * 0.5;
const PI_180 = Math.PI;
const PI_270 = Math.PI * 1.5;
const PI_360 = Math.PI * 2;
const FLOOR_PER_PIXEL = 1800;


class Rectangle {
  constructor(c) {
    let d = c.d;
    let w = c.w;
    // if (c.xw > 0) w /= c.xw;
    // if (c.yd > 0) d /= c.yd;
    let p1 = new Point2(c.x, c.y);
    let p2 = new Point2(c.x, c.y + d);
    let p3 = new Point2(c.x + w, c.y + d);
    let p4 = new Point2(c.x + w, c.y);
    let pc = this.pc = new Point2(c.x + w/2, c.y + d/2);
    this.t1 = new Triangle2(p1, p2, pc);
    this.t2 = new Triangle2(p2, p3, pc);
    this.t3 = new Triangle2(p3, p4, pc);
    this.t4 = new Triangle2(p4, p1, pc);
    this._mark = new RectangleMark(c.x, c.y, c.w, c.d);
    // this.msg = 'x:'+ c.x +' y:'+c.y +' w:'+w +' d:'+d
    //          + ' xw:'+c.xw +' yd:'+ c.yd;
    // this.w = w * c.xw;
    // this.d = d * c.yd;
  }

  in(p, target) {
    // if (p.x >= this.w || p.y >= this.d) {
    //   Tool.debug('Rectangle', this.msg, p);
    //   return;
    // }
    switch (this.check(p)) {
    case -1:
      target.objTr[X] += this.t1.p1.x - p.x;
      break;
    case -2:
      // 索引 14 是 z 偏移 (2D平面上的y)
      target.objTr[Y] += this.t2.p1.y - p.y;
      break;
    case -3:
      // 索引 12 是 x 偏移
      target.objTr[X] += this.t3.p1.x - p.x;
      break;
    case -4:
      target.objTr[Y] += this.t4.p1.y - p.y;
      break;
    }
  }

  check(p) {
    if (this.t1.in(p)) {
      return -1;
    }
    else if (this.t2.in(p)) {
      return -2;
    }
    else if (this.t3.in(p)) {
      return -3;
    }
    else if (this.t4.in(p)) {
      return -4;
    }
    return 0;
  }

  mark(step, fn) {
    this._mark.mark(step, fn, this);
  }
}


class Circle {
  constructor(c) {
    let r = this.r = c.w/2;
    this.ct = new Point2(c.x + r, c.y + r);
    this.r2 = this.r * this.r;
    this._mark = new RectangleMark(c.x, c.y, c.w, c.w);
    this.d = new Point2(0, 0);
  }

  resetPos(x, y) {
    this.ct.x = x + this.r;
    this.ct.y = y + this.r;
  }

  in(p, target) {
    let t = p.minus(this.ct);
    if (this.check(p, t) != 0) {
      this.d.x = t.x;
      this.d.y = t.y;
      this.d.y = Math.sqrt(this.r2 - t.x * t.x);
      if (t.y < 0) {
        this.d.y = -this.d.y;
      }
      target.objTr[X] = this.d.x + this.ct.x;
      target.objTr[Y] = this.d.y + this.ct.y;
    }
  }

  check(p, _quick) {
    let t = _quick || p.minus(this.ct);
    if (t.len() <= this.r) {
      return -1;
    }
    return 0;
  }

  mark(step, fn) {
    this._mark.mark(step, fn, this);
  }
}


class Oval {
  constructor(c, isXaxis) {
    let a = c.w /2;
    let b = c.d /2;
    // 中心
    this.ct = new Point2(c.x + a, c.y + b);
    this.a2 = a*a;
    this.b2 = b*b;
    this.a  = a;
    this.b  = b;
    this.rt = a/b;
    this.xa = isXaxis;
    this._mark = new RectangleMark(c.x, c.y, c.w, c.d);
    this.d = new Point2(0, 0);
  }

  in(p, target) {
    const t = p.minus(this.ct);
    let x2 = t.x * t.x;
    let y2 = t.y * t.y;

    if (this.check(p, x2, y2) != 0) {
      this.d.x = t.x;
      this.d.y = t.y;

      if (this.xa) {
        this.d.y = (this.b* Math.sqrt(this.a2 - x2))/ this.a;
      } else {
        this.d.x = (this.a* Math.sqrt(this.b2 - y2))/ this.b;
      }

      if (t.y < 0 && this.xa) {
        this.d.y = -this.d.y;
      }
      if (t.x < 0 && !this.xa) {
        this.d.x = -this.d.x;
      }

      target.objTr[X] = this.d.x + this.ct.x;
      target.objTr[Y] = this.d.y + this.ct.y;
    }
  }

  check(p, _qx, _qy) {
    let x2, y2;
    if (_qx || _qy) {
      x2 = _qx;
      y2 = _qy;
    } else {
      const t = p.minus(this.ct);
      x2 = t.x * t.x;
      y2 = t.y * t.y;
    }
    if ((x2 / this.a2 + y2 / this.b2) <= 1) {
      return -1;
    }
    return 0;
  }

  mark(step, fn) {
    this._mark.mark(step, fn, this);
  }
}


class Triangle {
  constructor(p1, p2, p3) {
    this.t  = new Triangle2(p1, p2, p3);
    let ct  = this.ct = new Point2((p1.x+p2.x+p3.x)/3, (p1.y+p2.y+p3.y)/3);
    this.t1 = new Triangle2(p1, p2, ct);
    this.t2 = new Triangle2(p2, p3, ct);
    this.t3 = new Triangle2(p3, p1, ct);
  }

  setMark(x, y, w, d) {
    this._mark = new RectangleMark(x, y, w, d);
  }

  in(p, target) {
    if (this.t.in(p)) {
      let cp, tp;
      if (this.t1.in(p)) {
        cp = this.t1.p2;
        tp = this.t1.p1;
      } 
      else if (this.t2.in(p)) {
        cp = this.t2.p2;
        tp = this.t2.p1;
      } 
      else if (this.t3.in(p)) {
        cp = this.t3.p2;
        tp = this.t3.p1;
      } 
      else {
        target.back();
        return;
      }

      const pt = p.minus(cp);
      const ct = tp.minus(cp);
      const a = PI_90 - pt.angle(ct);
      let sa = Math.sin(a);
      let ca = Math.cos(a);
      pt.x = pt.x * ca - pt.y * sa;
      pt.y = pt.x * sa + pt.y * ca;
      target.objTr[X] = pt.x + cp.x;
      target.objTr[Y] = pt.y + cp.y;
    }
  }

  check(p) {
    if (this.t.in(p)) {
      return -1;
    }
    return 0;
  }

  mark(step, fn) {
    this._mark.mark(step, fn, this);
  }
}


class Stairs {
  constructor(c) {
    let p1 = new Point2(c.x, c.y);
    let p2 = new Point2(c.x, c.y + c.d);
    let p3 = new Point2(c.x + c.w, c.y + c.d);
    let p4 = new Point2(c.x + c.w, c.y);
    this.rect = new Rectangle2(p1, p2, p3, p4);
    this.type = c.type;
    this.yslope = (c.floor * FLOOR_PER_PIXEL) / c.d;
    this.xslope = (c.floor * FLOOR_PER_PIXEL) / c.w;
    this.x = c.x;
    this.y = c.y;
    this.w = c.w;
    this.d = c.d;
    this._mark = new RectangleMark(c.x, c.y, c.w, c.d);
  }

  // TODO: 上楼动画
  in(p, target) {
    if (this.rect.in(p)) {
      switch (this.type) {
        case 3:
          target.objTr[Z] = (p.y - (this.y + this.d)) * this.yslope;
          break;
        
        case 0:
          target.objTr[Z] = (this.x - p.x) * this.xslope;
          break;

        case 1: // ???
          target.objTr[Z] = (p.x - (this.x + this.w)) * this.xslope;
          break;
        
        default:
          target.back();
          console.log('stairs', this.type);
      }
    }
  }

  check(p) {
    if (this.rect.in(p)) {
      return -1;
    }
    return 0;
  }

  mark(step, fn) {
    this._mark.mark(step, fn, this);
  }
}


class ReflexAngle {
  constructor(c) {
    let p1 = new Point2(c.x, c.y);
    let p2 = new Point2(c.x, c.y + c.d);
    let p3 = new Point2(c.x + c.w, c.y + c.d);
    let p4 = new Point2(c.x + c.w, c.y);
    this.rect = new Rectangle2(p1, p2, p3, p4);
    this.x = c.x;
    this.y = c.y;
    this.w = c.w;
    this.d = c.d;
    this.yslope = (c.floor * FLOOR_PER_PIXEL) / c.d;
    this.xslope = (c.floor * FLOOR_PER_PIXEL) / c.w;
    this.type = c.type;
    this._mark = new RectangleMark(c.x, c.y, c.w, c.d);

    switch (c.type) {
      case 2:
        this.slope = (c.floor * FLOOR_PER_PIXEL) / c.d;
        break;
      
      default:
        this.slope = 0;
    }
  }

  in(p, target) {
    if (this.rect.in(p)) {
      switch (this.type) {
        case 0:
          target.objTr[Z] = (this.x - p.x) * this.xslope;
          break;

        case 1:
          target.objTr[Z] = (p.x - (this.x + this.w)) * this.xslope;
          break;

        case 2:
          target.objTr[Z] = (this.y - p.y) * this.yslope;
          break;
          
        case 3:
          target.objTr[Z] = (p.y - (this.y + this.d)) * this.yslope;
          break;
        
        default:
          target.back();
          console.log('ReflexAngle', this.type);
      }
    }
  }

  check(p) {
    if (this.rect.in(p)) {
      return -1;
    }
    return 0;
  }

  mark(step, fn) {
    this._mark.mark(step, fn, this);
  }
}


class Climb {
  constructor(c, targetFloor) {
    let p1 = new Point2(c.x, c.y);
    let p2 = new Point2(c.x, c.y + c.d);
    let p3 = new Point2(c.x + c.w, c.y + c.d);
    let p4 = new Point2(c.x + c.w, c.y);
    this.rect = new Rectangle2(p1, p2, p3, p4);
    this.floor = c.floor * FLOOR_PER_PIXEL;
    this.floor2 = targetFloor * FLOOR_PER_PIXEL;
    this._mark = new RectangleMark(c.x, c.y, c.w, c.d);
  }

  in(p, target) {
    if (this.check(p, target.floor()) == -1) {
      target.objTr[Z] = -this.floor2;
    }
  }

  check(p, floor) {
    if (this.floor == floor && this.rect.in(p)) {
      return -1;
    }
    return 0;
  }

  mark(step, fn) {
    this._mark.mark(step, fn, this);
  }
}


function r(a) {
  return a * 180 / Math.PI;
}


function installCollision(c) {
  let p1, p2, p3;
  switch(c.shape) {
    case  0: 
      c.name = 'Rectangle';
      c.py = new Rectangle(c);
      break;

    case  1: 
      c.name = 'Triangle \\|';
      p1 = new Point2(c.x,       c.y + c.d);
      p2 = new Point2(c.x + c.w, c.y + c.d);
      p3 = new Point2(c.x + c.w, c.y);
      c.py = new Triangle(p1, p2, p3);
      c.py.setMark(c.x, c.y, c.w, c.d);
      break;

    case  2: 
      c.name = 'Triangle |/';
      p1 = new Point2(c.x,       c.y);
      p2 = new Point2(c.x,       c.y + c.d);
      p3 = new Point2(c.x + c.w, c.y + c.d);
      c.py = new Triangle(p1, p2, p3);
      c.py.setMark(c.x, c.y, c.w, c.d);
      break;

    case  3: 
      c.name = 'Triangle /|';
      p1 = new Point2(c.x,       c.y);
      p2 = new Point2(c.x + c.w, c.y + c.d);
      p3 = new Point2(c.x + c.w, c.y);
      c.py = new Triangle(p1, p2, p3);
      c.py.setMark(c.x, c.y, c.w, c.d);
      break;

    case  4: 
      c.name = 'Triangle |\\';
      p1 = new Point2(c.x,       c.y);
      p2 = new Point2(c.x,       c.y + c.d);
      p3 = new Point2(c.x + c.w, c.y);
      c.py = new Triangle(p1, p2, p3);
      c.py.setMark(c.x, c.y, c.w, c.d);
      break;

    case  5: 
      c.name = 'Rhombus |x/w| + |z/d| = 1';
      break;

    case  6: 
      c.name = 'Circle';
      c.py = new Circle(c);
      break;

    // Ellipse, Rectangle w/Rounded corners on X-Axis'
    case  7: 
      c.name = 'Oval X-Axis';
      c.py = new Oval(c, true);
      break;

    // Ellipse, Rectangle w/Rounded corners on Z-Axis
    case  8: 
      c.name = 'Oval Z-Axis';
      c.py = new Oval(c, false);
      break;

    // Found in 304
    case  9: 
      c.name = 'Rectangle Climb Up'; 
      c.py = new Climb(c, 1);
      break;

    // x,y= -22927 -14663 w,d= 2390 4290 x/w= 2 z/d= 2 type= 0 floor= 3 sw= 0
    // Found in 304
    case 10: 
      c.name = 'Rectangle Jump Down';
      c.py = new Climb(c, 0);
      break;

    // Found in 200, 斜坡
    case 11: 
      c.name = 'Reflex Angle';
      c.py = new ReflexAngle(c);
      break;

    // Found in 200, 楼梯
    case 12: 
      c.name = 'Rectangle Stairs';
      c.py = new Stairs(c);
      break;

    // found in 40B and 40F
    case 13: 
      c.name = 'Cylinder';
      c.py = new Circle(c);
      break;

    default: 
      throw new Error('Unknow shape '+ c.shape);
  }
}


export default {
  installCollision,
  FLOOR_PER_PIXEL,
  Circle,
};