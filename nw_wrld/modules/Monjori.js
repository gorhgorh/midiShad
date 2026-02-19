/*
@nwWrld name: Monjori
@nwWrld category: 2D
@nwWrld imports: ModuleBase
*/


const VERTEX_SHADER = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;
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

    float intensity = a / u_brightness;
    gl_FragColor = vec4(
      intensity,
      intensity / u_colorMix,
      intensity / (u_colorMix * 2.0),
      intensity
    );
  }
`;

class Monjori extends ModuleBase {
  static methods = [
    {
      name: "allParams",
      executeOnLoad: true,
      options: [
        {
          name: "timeScale",
          defaultVal: 40,
          type: "number",
          min: 0,
          max: 100,
        },
        {
          name: "gridScale",
          defaultVal: 40,
          type: "number",
          min: 10,
          max: 100,
        },
        {
          name: "distortion",
          defaultVal: 20,
          type: "number",
          min: 0.1,
          max: 60,
        },
        {
          name: "complexity",
          defaultVal: 7,
          type: "number",
          min: 0.1,
          max: 20,
        },
        {
          name: "colorMix",
          defaultVal: 1.6,
          type: "number",
          min: 0.5,
          max: 4,
        },
        {
          name: "brightness",
          defaultVal: 350,
          type: "number",
          min: 100,
          max: 800,
        },
      ],
    },
    {
      name: "timeScale",
      executeOnLoad: false,
      options: [
        { name: "timeScale", defaultVal: 40, type: "number", min: 0, max: 100 },
      ],
    },
    {
      name: "gridScale",
      executeOnLoad: false,
      options: [
        {
          name: "gridScale",
          defaultVal: 40,
          type: "number",
          min: 10,
          max: 100,
        },
      ],
    },
    {
      name: "distortion",
      executeOnLoad: false,
      options: [
        {
          name: "distortion",
          defaultVal: 20,
          type: "number",
          min: 0.1,
          max: 60,
        },
      ],
    },
    {
      name: "complexity",
      executeOnLoad: false,
      options: [
        {
          name: "complexity",
          defaultVal: 7,
          type: "number",
          min: 0.1,
          max: 20,
        },
      ],
    },
    {
      name: "colorMix",
      executeOnLoad: false,
      options: [
        {
          name: "colorMix",
          defaultVal: 1.6,
          type: "number",
          min: 0.5,
          max: 4,
        },
      ],
    },
    {
      name: "brightness",
      executeOnLoad: false,
      options: [
        {
          name: "brightness",
          defaultVal: 350,
          type: "number",
          min: 100,
          max: 800,
        },
      ],
    },
  ];

  constructor(container) {
    super(container);
    this.canvas = null;
    this.gl = null;
    this.program = null;
    this.animationId = null;
    this.startTime = performance.now();
    this.destroyed = false;

    this.u_timeScale = 40;
    this.u_gridScale = 40;
    this.u_distortion = 20;
    this.u_complexity = 7;
    this.u_colorMix = 1.6;
    this.u_brightness = 350;

    this.positionBuffer = null;
    this.boundResize = this.resize.bind(this);
    this.init();
  }

  init() {
    if (!this.elem) return;

    this.canvas = document.createElement("canvas");
    this.canvas.style.cssText =
      "position:absolute; top:0; left:0; width:100%; height:100%; display:block;";
    this.elem.appendChild(this.canvas);

    this.gl =
      this.canvas.getContext("webgl", { alpha: true }) ||
      this.canvas.getContext("experimental-webgl", { alpha: true });
    if (!this.gl) {
      console.error("[Monjori] WebGL not supported");
      return;
    }

    const vs = this.compileShader(this.gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = this.compileShader(this.gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) return;

    this.program = this.gl.createProgram();
    this.gl.attachShader(this.program, vs);
    this.gl.attachShader(this.program, fs);
    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error(
        "[Monjori] Program link error:",
        this.gl.getProgramInfoLog(this.program)
      );
      return;
    }

    this.gl.deleteShader(vs);
    this.gl.deleteShader(fs);

    this.gl.clearColor(0, 0, 0, 0);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    this.positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      this.gl.STATIC_DRAW
    );

    this.resize();
    window.addEventListener("resize", this.boundResize);
    this.animate();
    this.show();
  }

  compileShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error(
        "[Monjori] Shader compile error:",
        this.gl.getShaderInfoLog(shader)
      );
      this.gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  resize() {
    if (!this.canvas || !this.elem) return;
    const w = this.elem.clientWidth;
    const h = this.elem.clientHeight;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      if (this.gl) {
        this.gl.viewport(0, 0, w, h);
      }
    }
  }

  allParams({
    timeScale = 40,
    gridScale = 40,
    distortion = 20,
    complexity = 7,
    colorMix = 1.6,
    brightness = 350,
  } = {}) {
    this.u_timeScale = Number(timeScale) || 40;
    this.u_gridScale = Number(gridScale) || 40;
    this.u_distortion = Number(distortion) || 20;
    this.u_complexity = Number(complexity) || 7;
    this.u_colorMix = Number(colorMix) || 1.6;
    this.u_brightness = Number(brightness) || 350;
  }

  timeScale({ timeScale = 40 } = {}) {
    this.u_timeScale = Number(timeScale) || 40;
  }

  gridScale({ gridScale = 40 } = {}) {
    this.u_gridScale = Number(gridScale) || 40;
  }

  distortion({ distortion = 20 } = {}) {
    this.u_distortion = Number(distortion) || 20;
  }

  complexity({ complexity = 7 } = {}) {
    this.u_complexity = Number(complexity) || 7;
  }

  colorMix({ colorMix = 1.6 } = {}) {
    this.u_colorMix = Number(colorMix) || 1.6;
  }

  brightness({ brightness = 350 } = {}) {
    this.u_brightness = Number(brightness) || 350;
  }

  animate() {
    if (this.destroyed || !this.gl || !this.program || !this.positionBuffer)
      return;

    this.animationId = requestAnimationFrame(() => this.animate());

    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w <= 0 || h <= 0) return;

    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.useProgram(this.program);

    const positionLoc = this.gl.getAttribLocation(this.program, "position");
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.enableVertexAttribArray(positionLoc);
    this.gl.vertexAttribPointer(positionLoc, 2, this.gl.FLOAT, false, 0, 0);

    const uTime = this.gl.getUniformLocation(this.program, "u_time");
    const uResolution = this.gl.getUniformLocation(this.program, "u_resolution");
    const uTimeScale = this.gl.getUniformLocation(
      this.program,
      "u_timeScale"
    );
    const uGridScale = this.gl.getUniformLocation(
      this.program,
      "u_gridScale"
    );
    const uDistortion = this.gl.getUniformLocation(
      this.program,
      "u_distortion"
    );
    const uComplexity = this.gl.getUniformLocation(
      this.program,
      "u_complexity"
    );
    const uColorMix = this.gl.getUniformLocation(
      this.program,
      "u_colorMix"
    );
    const uBrightness = this.gl.getUniformLocation(
      this.program,
      "u_brightness"
    );

    const time = (performance.now() - this.startTime) * 0.001;
    this.gl.uniform1f(uTime, time);
    this.gl.uniform2f(uResolution, w, h);
    this.gl.uniform1f(uTimeScale, this.u_timeScale);
    this.gl.uniform1f(uGridScale, this.u_gridScale);
    this.gl.uniform1f(uDistortion, this.u_distortion);
    this.gl.uniform1f(uComplexity, this.u_complexity);
    this.gl.uniform1f(uColorMix, this.u_colorMix);
    this.gl.uniform1f(uBrightness, this.u_brightness);

    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  }

  destroy() {
    this.destroyed = true;

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    window.removeEventListener("resize", this.boundResize);

    if (this.gl) {
      if (this.positionBuffer) {
        this.gl.deleteBuffer(this.positionBuffer);
        this.positionBuffer = null;
      }
      if (this.program) {
        this.gl.deleteProgram(this.program);
        this.program = null;
      }
    }

    if (this.canvas && this.elem && this.elem.contains(this.canvas)) {
      this.elem.removeChild(this.canvas);
    }
    this.canvas = null;
    this.gl = null;

    super.destroy();
  }
}

export default Monjori;
