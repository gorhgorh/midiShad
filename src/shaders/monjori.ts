import type { ShaderDefinition } from './types'

const vertexShader = /* glsl */ `
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform float u_timeScale;
  uniform float u_gridScale;
  uniform float u_distortion;
  uniform float u_complexity;
  uniform float u_colorMix;
  uniform float u_brightness;

  void main() {
    vec2 p = gl_FragCoord.xy / u_resolution.xy;
    float t = u_time / u_timeScale;
    float a = 0.0;

    for (float i = 0.0; i < 15.0; i++) {
      float x = sin(t + i / u_distortion) * u_complexity;
      a += 1.0 / length(
        vec2(
          p.x - 0.5 + x / u_gridScale,
          p.y - 0.5 + (cos(t + i / 5.0) * u_complexity) / u_gridScale
        )
      );
    }

    gl_FragColor = vec4(
      a / u_brightness,
      a / u_brightness / u_colorMix,
      a / u_brightness / (u_colorMix * 2.0),
      1.0
    );
  }
`

export const monjori: ShaderDefinition = {
  id: 'monjori',
  name: 'Monjori',
  vertexShader,
  fragmentShader,
  params: [
    { name: 'u_timeScale', label: 'Time Speed', min: 0, max: 100, default: 40 },
    { name: 'u_gridScale', label: 'Grid Scale', min: 10, max: 100, default: 40 },
    { name: 'u_distortion', label: 'Distortion', min: 0.1, max: 60, default: 20 },
    { name: 'u_complexity', label: 'Complexity', min: 0.1, max: 20, default: 7 },
    { name: 'u_colorMix', label: 'Color Mix', min: 0.5, max: 4, default: 1.6 },
    { name: 'u_brightness', label: 'Brightness', min: 100, max: 800, default: 350 },
  ],
}
