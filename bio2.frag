#version 330 core
in vec2 oTexCoord;
in vec4 oColor;
in vec3 oNormal;
uniform int draw_type;

out vec4 FragColor;
uniform sampler2D ourTexture;


void draw_living()
{
    FragColor = texture(ourTexture, oTexCoord);
    // FragColor = oColor;
    // 所有过程都必须修改深度值
    gl_FragDepth = gl_FragCoord.z;
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