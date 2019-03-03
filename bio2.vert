#version 330 core
layout (location = 0) in vec3 pos;
layout (location = 1) in vec3 iNormal;
layout (location = 2) in vec2 iTexCoord;
// layout (location = 1) in vec3 aColor;

// // 骨骼绑定 [骨骼索引 -1 无骨骼, 关联系数 1-100]
// layout (location = 2) in vec2 skBind;
// uniform vec3 skeleton[10];

uniform mat4 model;
uniform mat4 bone_rotate;
uniform mat4 camera;
uniform mat4 projection;
uniform int draw_type;

uniform vec4 bind_bones[20*8/4];
uniform int bind_len;
uniform vec3 bone_offset;

out vec2 oTexCoord;
out vec4 oColor;
out vec3 oNormal;


vec4 rotateX(vec4 p, float x) {
  vec4 r;
  r[0] = p[0];
  r[1] = p[1] * cos(x) - p[2] * sin(x);
  r[2] = p[1] * sin(x) + p[2] * cos(x);
  r[3] = p[3];
  return r;
}


vec4 rotateY(vec4 p, float c) {
  vec4 r;
  r[0] = p[2] * sin(c) + p[0] * cos(c);
  r[1] = p[1];
  r[2] = p[2] * cos(c) - p[0] * sin(c);
  r[3] = p[3];
  return r;
}


vec4 rotateZ(vec4 p, float c) {
  vec4 r;
  r[0] = p[0] * cos(c) - p[1] * sin(c);
  r[1] = p[0] * sin(c) + p[1] * cos(c);
  r[2] = p[2];
  return r;
}


vec4 rotate_vertex_position(vec4 position, vec4 quat) {
  vec4 q = quat;
  vec3 v = position.xyz;
  vec3 r = v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
  return vec4(r, 1);
}


void draw_living() {
  // 来自游戏定义的数值空间 camera ?
  vec4 mpos = bone_rotate * vec4(pos, 1);
  int i;
  for (i=(bind_len-1)*2; i>=0; i-=2) {
    vec4 off = bind_bones[i];
    vec4 rot = bind_bones[i+1];
    mpos = rotate_vertex_position(mpos, rot);
    // mpos = rotateX(mpos, rot.x);
    // mpos = rotateY(mpos, rot.y);
    // mpos = rotateZ(mpos, rot.z);
    mpos += off;
  }

  mpos += vec4(bone_offset, 0);
  // vec4 modelRot = bone_rotate * vec4(pos, 1);
  vec4 modelPos = model * vec4(vec3(mpos), 1000);
  gl_Position = projection * camera * modelPos;
  oTexCoord = iTexCoord;
  oNormal = iNormal;
}


void draw_background() {
  gl_Position = vec4(pos.x, pos.y, pos.z, 1);
  oTexCoord = iTexCoord;
}


void main() {
  switch (draw_type) {
    case 1:
      draw_living();
      break;

    case 2:
      draw_background();
      break;
  }
}