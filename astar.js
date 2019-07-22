// 
// 用一维数组表示二维平面图, 一个节点最多有8个方向, 没有边;
// 节点中保存一个权重, 越高表示通过的开销越大, <0 表示不可通过;
// by. yanming [https://github.com/yanmingsohu/ASharpPathFind]
//
class AStarFindPath {
  
  constructor(row, column) {
    this.$arr = new Array(row * column + 1);
    this.$row = row;
    this.$col = column;
    this.$obl = true;
  }
  
  setWeights(x, y, w) {
    if (x >= this.$col) throw new Error("x> max column");
    if (y >= this.$row) throw new Error("y> max row");
    this.$arr[this.$col *y +x +1] = w;
  }
  
  getWeights(x, y) {
    return this.$arr[this.$col *y +x +1] || 0;
  }
  
  setAllWeights(w) {
    for (let i= this.$row *this.$col; i>0; --i) {
      this.$arr[i] = w;
    }
  }
  
  setOblique(bool) {
    this.$obl = bool;
  }
  
  find(begin_x0, y0, end_x1, y1) {
    if (begin_x0 >= this.$col) throw new Error("begin x> max column");
    if (y0       >= this.$row) throw new Error("begin y> max row");
    if (end_x1   >= this.$col) throw new Error("end x> max column");
    if (y1       >= this.$row) throw new Error("end y> max row");
    
    const thiz  = this;
    const route = {};
    const stack = [];
    const top   = {x:begin_x0, y:y0, cost:0};
    let count   = 0;
    stack.push(top);
    
    while (stack.length > 0) {
      ++count;
      stack.sort(_by_cost);
      let next = stack.shift();
      route[next.x +'|'+ next.y] = 1;
      // Show Calculation overhead
      //console.log(count, stack.length, next.x, next.y);
      //console.log(count, route);
      
      if (next.x == end_x1 && next.y == y1) {
        this.$cal_count = count;
        return next;
      }
      
      let by0 = next.y -1 >=0;
      let by1 = next.y +1 < this.$row;
      let bx0 = next.x -1 >=0;
      let bx1 = next.x +1 < this.$col;
      
      if (bx0) _push(next.x-1, next.y, next);
      if (bx1) _push(next.x+1, next.y, next);
      if (by0) {
        _push(next.x, next.y-1, next);
        if (this.$obl && bx0) _push(next.x-1, next.y-1, next);
        if (this.$obl && bx1) _push(next.x+1, next.y-1, next);
      }
      if (by1) {
        _push(next.x, next.y+1, next);
        if (this.$obl && bx0) _push(next.x-1, next.y+1, next);
        if (this.$obl && bx1) _push(next.x+1, next.y+1, next);
      }
    }
    
    function _push(x, y, from) {
      const key = x +'|'+ y;
      if (route[key] == null) {
        route[key] = 1;
        let cost = thiz.$arr[thiz.$col *y +x +1];
        if (cost >= 0) {
          let distance = _distance(x, end_x1) + _distance(y, y1);
          let newnode = {x, y, from, cost: cost + distance};
          stack.push(newnode);
        }
      }
    }
    
    function _distance(a, b) {
      return a>b ? a-b : b-a;
    }
    
    function _by_cost(a, b) {
      return a.cost - b.cost;
    }
  }
}

// IF running on Nodejs >>>
// module.exports = AStarFindPath;
export default {
  AStarFindPath,
}