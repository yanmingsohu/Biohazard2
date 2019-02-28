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
uniform vec3 bone_offset;
uniform mat4 camera;
uniform mat4 projection;
uniform int draw_type;

out vec2 oTexCoord;
out vec4 oColor;
out vec3 oNormal;


void draw_living() {
  // 来自游戏定义的数值空间 camera ?
  vec4 modelRot = bone_rotate * vec4(pos, 1);
  vec4 modelPos = model * vec4(vec3(modelRot) + bone_offset, 1000);
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