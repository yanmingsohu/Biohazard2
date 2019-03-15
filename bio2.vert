#version 330 core
layout (location = 0) in vec3 pos;
layout (location = 1) in vec3 iNormal;
layout (location = 2) in vec2 iTexCoord;

struct Light {
  vec3 color;
  vec4 pos;
  vec4 ldir;
  vec4 vdir;
  int type;
  float bright;
};

uniform mat4 model;
uniform mat4 camera;
uniform mat4 projection;
uniform int  draw_type;

uniform vec4 bind_bones[20*8/4];
uniform int  bind_len;
uniform mat4 bone_rotate;
uniform vec4 anim_offset;
uniform Light lights[3];
uniform vec4 view_pos;

out vec2 oTexCoord;
out vec4 oColor;
out vec3 oNormal;
flat out Light f_lights[3];


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
  // quat 不是四元数而是欧拉角
  // mpos = rotateX(mpos, rot.x);
  // mpos = rotateY(mpos, rot.y);
  // mpos = rotateZ(mpos, rot.z);
  vec4 q = quat;
  vec3 v = position.xyz;
  vec3 r = v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
  return vec4(r, 0);
}


void compute_light(int i, vec4 modPos) {
  vec4 pos = camera * lights[i].pos;
  f_lights[i].ldir   = normalize(pos - modPos);
  f_lights[i].vdir   = normalize(view_pos - modPos);
  f_lights[i].pos    = pos;
  f_lights[i].color  = lights[i].color / 0xFF;
  f_lights[i].type   = lights[i].type;
  f_lights[i].bright = lights[i].bright / 0x7FFF;
}


void draw_living() {
  vec4 mpos = bone_rotate * vec4(pos, 1);
  int i;

  for (i=(bind_len-1)*2; i>=0; i-=2) {
    vec4 off = bind_bones[i];
    vec4 rot = bind_bones[i+1];
    mpos = rotate_vertex_position(mpos, rot);
    mpos += off;
  }

  vec4 modPos = model * (mpos + anim_offset);
  gl_Position = projection * camera * modPos;
  
  oTexCoord = iTexCoord;
  // oNormal = iNormal;
  oNormal = mat3(transpose(inverse(model))) * iNormal;

  compute_light(0, modPos);
  compute_light(1, modPos);
  compute_light(2, modPos);
}


void draw_background() {
  gl_Position = vec4(pos.x, pos.y, pos.z, 1);
  oTexCoord = iTexCoord;
}


void draw_invisible() {
  vec4 p = camera * vec4(pos.xyz, 1);
  gl_Position = projection * vec4(p.xyz, 1);
}


void draw_mask() {
  float z = pos.z; //-1/pos.z;
  gl_Position = vec4(pos.x, pos.y, z, 1);
  oTexCoord = iTexCoord;
}


void main() {
  switch (draw_type) {
    case 1:
      draw_living();
      break;

    case 3:
      draw_mask();
      break;

    case 2:
      draw_background();
      break;

    case 4:
      draw_invisible();
      break;
  }
}