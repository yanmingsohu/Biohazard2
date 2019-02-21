#version 330 core
layout (location = 0) in vec3 aPos;
layout (location = 1) in vec3 aColor;

// 骨骼绑定 [骨骼索引 -1 无骨骼, 关联系数 1-100]
layout (location = 2) in vec2 skBind;
uniform vec3 skeleton[10];

uniform mat4 model;
uniform mat4 camera;
uniform mat4 projection;

uniform float colorCoefficient;
uniform float sizeCoefficient;


out vec3 ourColor;


void main()
{
  vec4 pos = vec4(aPos[0]*sizeCoefficient, 
                  aPos[1]*sizeCoefficient,
                  aPos[2]*sizeCoefficient, 1.0);

  if (skBind.x >= 0) {
    vec4 sk = vec4(skeleton[ int(skBind.x) ], 0);
    
    if (skBind.y > 99 || skBind.y < 0) {
      pos = sk + pos;
    } else {
      float w = skBind.y / 100.0;
      pos = sk*w + pos;
    }
  }

  gl_Position = projection * camera * model * pos;

  ourColor = vec3(aColor[0]*colorCoefficient, 
                  aColor[1]*colorCoefficient, 
                  aColor[2]*colorCoefficient);
}