#version 330 core
struct Light {
  vec3 color;
  vec4 pos;
  vec4 ldir;
  vec4 vdir;
  int type;
  float bright;
};

in vec2 oTexCoord;
in vec4 oColor;
in vec3 oNormal;
flat in Light f_lights[3];

uniform int draw_type;
uniform vec3 rgb;
uniform vec3 env_light;

out vec4 FragColor;
uniform sampler2D ourTexture;
const float opacity = 1/255; 


vec3 illuminate(in Light li) {
  vec3 ldir = vec3(li.ldir);
  vec3 norm = normalize(oNormal);
  float diff = max(dot(norm, ldir), 0.0);
  
  if (li.type == 0) {
    return diff * li.color * li.bright;
  }

  vec3 vdir = vec3(li.vdir);
  vec3 reflectDir = reflect(-ldir, norm);  
  float spec = pow(max(dot(vdir, reflectDir), 0.0), 8);

  return diff * li.color * li.bright
       + spec * li.color * li.bright;
}


void draw_living()
{
  // FragColor = texture(ourTexture, oTexCoord);
  vec4 c = texture(ourTexture, oTexCoord);
  float a;
  float z;
  if (c.r <= opacity && c.g <= opacity && c.b <= opacity) {
    a = 0;
    z = 1; // 不显示
  } else {
    a = 1;
    z = gl_FragCoord.z;
  }

  vec3 lightC = env_light * 0.7
              + illuminate(f_lights[0]) 
              + illuminate(f_lights[1]) 
              + illuminate(f_lights[2]);

  FragColor = vec4(vec3(c) * lightC, a);
  // 所有过程都必须修改深度值
  gl_FragDepth = z;
}


void draw_background() {
  FragColor = texture(ourTexture, oTexCoord);
  // 越接近0越近, 越接近1越远, 但是 1 在可视范围外(不显示)
  // 只要有一处写入深度值, 默认值将被禁用, 所有过程都必须写入深度值
  gl_FragDepth = gl_FragCoord.z;
}


void draw_mask() {
  vec4 tex = texture(ourTexture, oTexCoord);
  // TODO: alpha 边缘柔化
  FragColor = tex;
  gl_FragDepth = gl_FragCoord.z;
}


void draw_invisible() {
  FragColor = vec4(rgb.xyz, 0.3);
  gl_FragDepth = gl_FragCoord.z;
}


void main() {
  switch (draw_type) {
    case 1:
      draw_living();
      break;

    case 2:
      draw_background();
      break;

    case 3:
      draw_mask();
      break;

    case 4:
      draw_invisible();
      break;
  }
}