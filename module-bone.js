import node from '../boot/node.js'
const matrix = node.load('boot/gl-matrix.js');
const {vec3, mat4} = matrix;

const person = {
  body      : 0,
  waist     : 1,
  lThigh    : 2,
  lCalf     : 3,
  lFoot     : 4,
  rThigh    : 5,
  rCalf     : 6,
  rFoot     : 7,
  head      : 8,
  lBigarm   : 9,
  lForearm  : 10,
  lHand     : 11,
  rBigarm   : 12,
  rForearm  : 13,
  rHand     : 14,
}


const _mapp = {
  // Leon module
  50: person,
}


function fixMoveStep() {
  return 30;
}


function _getBonePos(initPos, trans) {
  let v = vec3.create();
  vec3.transformMat4(v, v, trans);
  return v;
}


function calculateFootstepLength(bone) {
  const l  = _getBonePos(bone[this.lFoot]._pos, bone[this.lFoot].lastTrans);
  const r  = _getBonePos(bone[this.rFoot]._pos, bone[this.rFoot].lastTrans);
  const res = l;
  return l[0] - r[0];
  // vec3.subtract(res, l, r);
  // return vec3.length(res);
}


function bind(name, md) {
  let boneIdx = md.boneIdx = {
    // 返回模型两脚间的距离
    stepLength : fixMoveStep,
  };

  let reg = /.\/em(.)(..)\.emd/i;
  let match = reg.exec(name);
  if (! match) {
    console.warn("invaild module file name", name);
    return;
  }

  let map = _mapp[ match[2] ];
  if (! map) {
    // TODO: 默认绑定 person !!!
    console.warn("not found Module Bind", match[2], 'use person.');
    map = person; 
  }

  if (! md.bone) {
    console.warn("Module not bone");
    return;
  }

  for (let name in map) {
    boneIdx[name] = map[name];
  }

  if (boneIdx.lFoot >= 0 && boneIdx.lFoot >= 0) {
    boneIdx.stepLength = calculateFootstepLength;
  }
}

export default {
  bind,
}