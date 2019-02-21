#version 330 core
out vec4 FragColor;
  
in vec3 ourColor;

void main()
{
  FragColor = vec4(ourColor, gl_FrontFacing ? 1.0: 0.5);
  // FragColor = vec4(ourColor.x, gl_FragCoord.z, gl_FragCoord.z, 1.0);
}