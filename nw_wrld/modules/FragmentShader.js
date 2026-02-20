/*
@nwWrld name: FragmentShader
@nwWrld category: 2D
@nwWrld imports: ModuleBase
*/

const VS = `#version 300 es
in vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

const FS = `#version 300 es
precision highp float;

out vec4 fragColor;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_time_delta;
uniform float u_frame;
uniform vec4 u_mouse;
uniform vec4 u_date;
uniform vec3 u_color;
uniform float u_ripple_scale;

void main()
{
    fragColor = vec4(0.0);
    vec3 w,
    p;
    for(float z, d = 0.1, i, f; i++ < 1e2; fragColor += 0.03 / abs(mix(p, w, 0.1).y + vec4(0, 1, 2, 3) / 1e2) * d, z += d = 0.3 * (length(cos(p.xz * u_ripple_scale)) - 0.4))
    {
        for(p = z * (gl_FragCoord.rgb * 2.0 - vec3(u_resolution, 1.0).xyy) / vec3(u_resolution, 1.0).y + 1.0, w = p, f = 0.0; f++ < 5.0; )
        {
            w += sin(w.zxy * f - 9.0 * exp( - d / 0.1) + u_time) / f;
        }
    }
    fragColor.rgb *= u_color;
    fragColor = tanh(fragColor);
}
`;

class FragmentShader extends ModuleBase {
  static methods = [
    {
      name: "speed",
      executeOnLoad: true,
      options: [
        { name: "timeScale", defaultVal: 1.0, type: "number", min: 0.0, max: 5.0 },
      ],
    },
    {
      name: "mousePosition",
      executeOnLoad: false,
      options: [
        { name: "mouseX", defaultVal: 0.5, type: "number", min: 0.0, max: 1.0 },
        { name: "mouseY", defaultVal: 0.5, type: "number", min: 0.0, max: 1.0 },
      ],
    },
    {
      name: "ripple",
      executeOnLoad: true,
      options: [
        { name: "scale", defaultVal: 1.0, type: "number", min: 0.1, max: 5.0 },
      ],
    },
    {
      name: "color",
      executeOnLoad: true,
      options: [
        { name: "red", defaultVal: 1.0, type: "number", min: 0.0, max: 2.0 },
        { name: "green", defaultVal: 1.0, type: "number", min: 0.0, max: 2.0 },
        { name: "blue", defaultVal: 1.0, type: "number", min: 0.0, max: 2.0 },
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
    this.positionBuffer = null;
    this.frame = 0;
    this.lastTime = 0;
    this.timeScale = 1.0;
    this.mouse = [0, 0, 0, 0];
    this.colorR = 1.0;
    this.colorG = 1.0;
    this.colorB = 1.0;
    this.rippleScale = 1.0;
    this.loc = {};

    this.boundResize = this.resizeCanvas.bind(this);
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseDown = this.onMouseDown.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);

    this.init();
  }

  init() {
    if (!this.elem) return;

    this.canvas = document.createElement("canvas");
    this.canvas.style.cssText =
      "position:absolute; top:0; left:0; width:100%; height:100%; display:block;";
    this.elem.appendChild(this.canvas);

    this.gl = this.canvas.getContext("webgl2", {
      alpha: true,
      preserveDrawingBuffer: true,
    });
    if (!this.gl) {
      console.error("[FragmentShader] WebGL2 not supported");
      return;
    }

    const vs = this.compileShader(this.gl.VERTEX_SHADER, VS);
    const fs = this.compileShader(this.gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return;

    this.program = this.gl.createProgram();
    this.gl.attachShader(this.program, vs);
    this.gl.attachShader(this.program, fs);
    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error(
        "[FragmentShader] Program link error:",
        this.gl.getProgramInfoLog(this.program)
      );
      return;
    }

    this.gl.deleteShader(vs);
    this.gl.deleteShader(fs);

    this.positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      this.gl.STATIC_DRAW
    );

    const aPos = this.gl.getAttribLocation(this.program, "a_position");
    this.gl.useProgram(this.program);
    this.gl.enableVertexAttribArray(aPos);
    this.gl.vertexAttribPointer(aPos, 2, this.gl.FLOAT, false, 0, 0);

    this.loc = {
      res: this.gl.getUniformLocation(this.program, "u_resolution"),
      time: this.gl.getUniformLocation(this.program, "u_time"),
      delta: this.gl.getUniformLocation(this.program, "u_time_delta"),
      frame: this.gl.getUniformLocation(this.program, "u_frame"),
      mouse: this.gl.getUniformLocation(this.program, "u_mouse"),
      date: this.gl.getUniformLocation(this.program, "u_date"),
      color: this.gl.getUniformLocation(this.program, "u_color"),
      rippleScale: this.gl.getUniformLocation(this.program, "u_ripple_scale"),
    };

    this.canvas.addEventListener("mousemove", this.boundMouseMove);
    this.canvas.addEventListener("mousedown", this.boundMouseDown);
    this.canvas.addEventListener("mouseup", this.boundMouseUp);

    this.resizeCanvas();
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
        "[FragmentShader] Shader compile error:",
        this.gl.getShaderInfoLog(shader)
      );
      this.gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  resizeCanvas() {
    if (!this.canvas || !this.elem) return;
    const w = this.elem.clientWidth;
    const h = this.elem.clientHeight;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  onMouseMove(e) {
    const r = this.canvas.getBoundingClientRect();
    this.mouse[0] =
      ((e.clientX - r.left) / r.width) * this.canvas.width;
    this.mouse[1] =
      (1 - (e.clientY - r.top) / r.height) * this.canvas.height;
  }

  onMouseDown() {
    this.mouse[2] = this.mouse[0];
    this.mouse[3] = this.mouse[1];
  }

  onMouseUp() {
    this.mouse[2] = 0;
    this.mouse[3] = 0;
  }

  speed({ timeScale = 1.0 } = {}) {
    this.timeScale = Number(timeScale) || 1.0;
  }

  mousePosition({ mouseX = 0.5, mouseY = 0.5 } = {}) {
    if (!this.canvas) return;
    this.mouse[0] = mouseX * this.canvas.width;
    this.mouse[1] = mouseY * this.canvas.height;
  }

  ripple({ scale = 1.0 } = {}) {
    this.rippleScale = Number(scale) || 1.0;
  }

  color({ red = 1.0, green = 1.0, blue = 1.0 } = {}) {
    this.colorR = Number(red);
    this.colorG = Number(green);
    this.colorB = Number(blue);
  }

  animate() {
    if (this.destroyed || !this.gl || !this.program) return;

    this.animationId = requestAnimationFrame(() => this.animate());

    const now = performance.now();
    const t = ((now - this.startTime) * 0.001) * this.timeScale;
    const dt = this.lastTime ? (now - this.lastTime) * 0.001 : 0;
    this.lastTime = now;

    this.resizeCanvas();
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w <= 0 || h <= 0) return;

    this.gl.viewport(0, 0, w, h);
    this.gl.uniform2f(this.loc.res, w, h);
    this.gl.uniform1f(this.loc.time, t);
    this.gl.uniform1f(this.loc.delta, dt);
    this.gl.uniform1f(this.loc.frame, this.frame++);
    this.gl.uniform4f(
      this.loc.mouse,
      this.mouse[0],
      this.mouse[1],
      this.mouse[2],
      this.mouse[3]
    );
    this.gl.uniform3f(this.loc.color, this.colorR, this.colorG, this.colorB);
    this.gl.uniform1f(this.loc.rippleScale, this.rippleScale);
    const d = new Date();
    this.gl.uniform4f(
      this.loc.date,
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      d.getTime() % 86400000
    );

    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  }

  destroy() {
    this.destroyed = true;

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.canvas) {
      this.canvas.removeEventListener("mousemove", this.boundMouseMove);
      this.canvas.removeEventListener("mousedown", this.boundMouseDown);
      this.canvas.removeEventListener("mouseup", this.boundMouseUp);
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
    this.loc = {};

    super.destroy();
  }
}

export default FragmentShader;
