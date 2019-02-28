#version 330 core
in vec2 oTexCoord;
in vec4 oColor;
in vec3 oNormal;
uniform int draw_type;

out vec4 FragColor;
uniform sampler2D ourTexture;
const float opacity = 1/255; 


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
    FragColor = vec4(vec3(c), a);
    // 所有过程都必须修改深度值
    gl_FragDepth = z;
}


void draw_background() {
  FragColor = texture(ourTexture, oTexCoord);
  // 越接近0越近, 越接近1越远, 但是 1 在可视范围外(不显示)
  // 只要有一处写入深度值, 默认值将被禁用, 所有过程都必须写入深度值
  gl_FragDepth = 0.99999;
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