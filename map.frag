#version 330 core
out vec4 FragColor;
  
// in vec2 TexCoord;
in vec4 outColor;

// uniform sampler2D ourTexture;

void main()
{
    // FragColor = texture(ourTexture, TexCoord);
    FragColor = outColor;
}