#version 330 core
layout (triangles) in;
layout (line_strip, max_vertices = 4) out;

uniform vec3 bone_center;


void main() {    
    gl_Position = gl_in[0].gl_Position;
    EmitVertex();

    gl_Position = gl_in[1].gl_Position;
    EmitVertex();

    gl_Position = gl_in[2].gl_Position;
    EmitVertex();

    gl_Position = vec4(bone_center, 1);
    EmitVertex();

    EndPrimitive();
}  