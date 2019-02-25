#version 330 core
layout (location = 0) in vec3 pos;
layout (location = 1) in vec3 iNormal;
layout (location = 2) in vec2 iTexCoord;
// layout (location = 1) in vec3 aColor;

// // 骨骼绑定 [骨骼索引 -1 无骨骼, 关联系数 1-100]
// layout (location = 2) in vec2 skBind;
// uniform vec3 skeleton[10];

uniform mat4 model;
uniform mat4 camera;
uniform mat4 projection;
uniform int draw_type;

out vec2 oTexCoord;
out vec4 oColor;
out vec3 oNormal;


void draw_living() {
  float coe = 1000;
  vec4 npos = vec4(pos.z/coe, pos.x/coe, pos.y/coe, 1);
  gl_Position = projection * camera * model * npos;
  // oColor = vec4(pos.y/100, pos.x/100, pos.z/100, 1);
  oTexCoord = iTexCoord;
  oNormal = iNormal;
}


void draw_background() {
  gl_Position = vec4(pos.x, pos.y, pos.z, 1);
  oTexCoord = iTexCoord;
}


void main() {
  // vec4 pos = vec4(aPos[0]*sizeCoefficient, 
  //                 aPos[1]*sizeCoefficient,
  //                 aPos[2]*sizeCoefficient, 1.0);

  // if (skBind.x >= 0) {
  //   vec4 sk = vec4(skeleton[ int(skBind.x) ], 0);
    
  //   if (skBind.y > 99 || skBind.y < 0) {
  //     pos = sk + pos;
  //   } else {
  //     float w = skBind.y / 100.0;
  //     pos = sk*w + pos;
  //   }
  // }

  // gl_Position = projection * camera * model * pos;

  // ourColor = vec3(aColor[0]*colorCoefficient, 
  //                 aColor[1]*colorCoefficient, 
  //                 aColor[2]*colorCoefficient);
  switch (draw_type) {
    case 1:
      draw_living();
      break;

    case 2:
      draw_background();
      break;
  }
}