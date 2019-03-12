import {Triangle2, Point2} from './tool.js'

const X = 12;
const Y = 14;
const PI_90  = Math.PI * 0.5;
const PI_180 = Math.PI;
const PI_270 = Math.PI * 1.5;
const PI_360 = Math.PI * 2;


class Rectangle {
  constructor(c) {
    let p1 = new Point2(c.x, c.y);
    let p2 = new Point2(c.x, c.y + c.d);
    let p3 = new Point2(c.x + c.w, c.y + c.d);
    let p4 = new Point2(c.x + c.w, c.y);
    let pc = this.pc = new Point2(c.x + c.w/2, c.y + c.d/2);
    this.t1 = new Triangle2(p1, p2, pc);
    this.t2 = new Triangle2(p2, p3, pc);
    this.t3 = new Triangle2(p3, p4, pc);
    this.t4 = new Triangle2(p4, p1, pc);
  }

  in(p, target) {
    if (this.t1.in(p)) {
      target.objTr[X] += this.t1.p1.x - p.x;
    }
    else if (this.t2.in(p)) {
      // 索引 14 是 z 偏移 (2D平面上的y)
      target.objTr[Y] += this.t2.p1.y - p.y;
    }
    else if (this.t3.in(p)) {
      // 索引 12 是 x 偏移
      target.objTr[X] += this.t3.p1.x - p.x;
    }
    else if (this.t4.in(p)) {
      target.objTr[Y] += this.t4.p1.y - p.y;
    }
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
  }

  in(p, target) {
    const t = p.minus(this.ct);
    let x2 = t.x * t.x;
    let y2 = t.y * t.y;

    if ((x2 / this.a2 + y2 / this.b2) <= 1) {
      const ta = Math.atan(t.x / t.y);
      const tb = target.getAngle();
      const tc = Math.asin(t.y / Math.sqrt(x2 + y2));

      // console.log(r(ta), r(tb), r(tc));

      if (t.x >= 0 && t.y >= 0) {
        if (tb > PI_90) {
          console.log('+1');
          t.y = (this.b* Math.sqrt(this.a2 - x2))/ this.a;
        } else {
          console.log('-1', this.rt);
          if (this.rt > 1) {
            let y = (this.b* Math.sqrt(this.a2 - x2))/ this.a;
            t.y = t.y + (y - t.y)*(1 - 1/this.rt);
            y2 = t.y * t.y;
          }
          t.x = (this.a* Math.sqrt(this.b2 - y2))/ this.b;
        }
      } 
      else if (t.x >= 0 && t.y < 0) {
        console.log('2');
      }
      else if (t.x < 0 && t.y < 0) {
        console.log('3');
      }
      else {
        console.log('4');
      }

      target.objTr[X] = t.x + this.ct.x;
      target.objTr[Y] = t.y + this.ct.y;
      // target.back();
    }
  }
}


function r(a) {
  return a * 180 / Math.PI;
}


function installCollision(c) {
  switch(c.shape) {
    case  0: 
      c.name = 'Rectangle';
      c.py = new Rectangle(c);
      break;

    case  1: 
      c.name = 'Right Triangle x-- z-- \\|';
      break;

    case  2: 
      c.name = 'Right Triangle x++ z-- |/';
      break;

    case  3: 
      c.name = 'Right Triangle x-- z++ /|';
      break;

    case  4: 
      c.name = 'Right Triangle x++ z++ |\\';
      break;

    case  5: 
      c.name = 'Rhombus |x/w| + |z/d| = 1';
      break;

    case  6: 
      c.name = 'Circle';
      break;

    // Ellipse, Rectangle w/Rounded corners on X-Axis'
    case  7: 
      c.name = 'Oval x=(-x,0), z=(z,0)';
      c.py = new Oval(c, true);
      break;

    // Ellipse, Rectangle w/Rounded corners on Z-Axis
    case  8: 
      c.name = 'Oval x=(x,0), z=(-z,0)';
      c.py = new Oval(c, false);
      break;

    // Found in 304
    case  9: 
      c.name = 'Rectangle Climb Up'; 
      break;

    // Found in 304
    case 10: 
      c.name = 'Rectangle Jump Down';
      break;

    // Found in 200
    case 11: 
      c.name = 'Reflex Angle';
      break;

    // Found in 200
    case 12: 
      c.name = 'Rectangle Stairs';
      break;

    // found in 40B and 40F
    case 13: 
      c.name = 'Cylinder';
      break;

    default: 
      c.name = 'Unknow shape '+s;
      break;
  }
}


export default {
  installCollision,
};