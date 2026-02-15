import type { ShaderDefinition } from './types'

const vertexShader = /* glsl */ `
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform float u_speed;
  uniform float u_scale1;
  uniform float u_scale2;
  uniform float u_redShift;
  uniform float u_greenShift;
  uniform float u_blueShift;

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float t = u_time * u_speed;

    float v1 = sin(uv.x * u_scale1 + t);
    float v2 = sin(u_scale1 * (uv.x * sin(t * 0.5) + uv.y * cos(t * 0.3)) + t);
    float cx = uv.x + 0.5 * sin(t * 0.3);
    float cy = uv.y + 0.5 * cos(t * 0.4);
    float v3 = sin(sqrt(u_scale2 * (cx * cx + cy * cy) + 1.0) + t);
    float v = v1 + v2 + v3;

    gl_FragColor = vec4(
      sin(v * 3.14159 + u_redShift) * 0.5 + 0.5,
      sin(v * 3.14159 + u_greenShift) * 0.5 + 0.5,
      sin(v * 3.14159 + u_blueShift) * 0.5 + 0.5,
      1.0
    );
  }
`

export const plasma: ShaderDefinition = {
  id: 'plasma',
  name: 'Plasma',
  vertexShader,
  fragmentShader,
  params: [
    { name: 'u_speed', label: 'Speed', min: 0, max: 5, default: 1 },
    { name: 'u_scale1', label: 'Scale 1', min: 1, max: 30, default: 10 },
    { name: 'u_scale2', label: 'Scale 2', min: 10, max: 200, default: 100 },
    { name: 'u_redShift', label: 'Red Shift', min: 0, max: 6.28, default: 0 },
    { name: 'u_greenShift', label: 'Green Shift', min: 0, max: 6.28, default: 2.09 },
    { name: 'u_blueShift', label: 'Blue Shift', min: 0, max: 6.28, default: 4.18 },
  ],
}
