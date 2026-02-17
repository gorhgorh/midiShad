/*
@nwWrld name: AllSeeingEye
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
  uniform float u_rotationSpeed;
  uniform float u_numCameras;
  uniform float u_camOrbitSpeed;
  uniform float u_shininess;
  uniform float u_cubeSize;
  uniform float u_camDistance;
  uniform float u_glow;
  uniform float u_gap;
  uniform float u_lightOrbitSpeed;
  uniform float u_reflectivity;

  // --- Hash / pseudo-random ---
  float hash(float n) {
    return fract(sin(n) * 43758.5453123);
  }

  // --- SDF: rounded box ---
  float sdBox(vec3 p, vec3 b, float r) {
    vec3 d = abs(p) - b + r;
    return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0) - r;
  }

  // --- Rotation matrices ---
  mat3 rotateY(float a) {
    float c = cos(a), s = sin(a);
    return mat3(c,0,s, 0,1,0, -s,0,c);
  }
  mat3 rotateX(float a) {
    float c = cos(a), s = sin(a);
    return mat3(1,0,0, 0,c,-s, 0,s,c);
  }
  mat3 rotateZ(float a) {
    float c = cos(a), s = sin(a);
    return mat3(c,-s,0, s,c,0, 0,0,1);
  }

  // --- Scene SDF ---
  float sceneSDF(vec3 p) {
    float t = u_time * u_rotationSpeed;
    mat3 rot = rotateY(t * 0.7) * rotateX(t * 0.5) * rotateZ(t * 0.3);
    vec3 rp = rot * p;
    return sdBox(rp, vec3(u_cubeSize), 0.05);
  }

  // --- Normal estimation ---
  vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
      sceneSDF(p + e.xyy) - sceneSDF(p - e.xyy),
      sceneSDF(p + e.yxy) - sceneSDF(p - e.yxy),
      sceneSDF(p + e.yyx) - sceneSDF(p - e.yyx)
    ));
  }

  // --- Ray march ---
  float rayMarch(vec3 ro, vec3 rd) {
    float t = 0.0;
    for (int i = 0; i < 80; i++) {
      vec3 p = ro + rd * t;
      float d = sceneSDF(p);
      if (d < 0.001) return t;
      if (t > 20.0) break;
      t += d;
    }
    return -1.0;
  }

  // --- Hash helpers ---
  vec2 hash2(float n) {
    return vec2(hash(n), hash(n + 137.91));
  }

  // --- Procedural neon city environment map ---
  vec3 envMap(vec3 dir) {
    float theta = atan(dir.z, dir.x);
    float phi = asin(clamp(dir.y, -1.0, 1.0));

    vec3 sky = mix(vec3(0.02, 0.01, 0.05), vec3(0.0, 0.0, 0.02), smoothstep(-0.2, 0.8, dir.y));

    float colId = floor(theta * 8.0);
    float colHash = hash(colId * 73.19);
    float buildingHeight = 0.05 + colHash * 0.35;
    float inBuilding = step(dir.y, buildingHeight) * step(-0.1, dir.y);

    vec3 buildingColor = vec3(0.02, 0.02, 0.04) * (0.5 + colHash * 0.5);

    float windowY = fract(dir.y * 25.0 + colHash * 3.0);
    float windowX = fract(theta * 8.0);
    float windowMask = step(0.7, windowY) * step(0.15, windowX) * step(windowX, 0.85);

    float colorSel = hash(colId * 17.31);
    vec3 windowColor = colorSel < 0.33
      ? vec3(0.2, 0.8, 1.0)
      : (colorSel < 0.66
        ? vec3(1.0, 0.2, 0.7)
        : vec3(1.0, 0.6, 0.1)
      );

    float signHash = hash(floor(theta * 20.0) * 113.7 + floor(dir.y * 30.0) * 271.3);
    float signMask = step(0.92, signHash) * inBuilding;
    vec3 signColor = vec3(hash(signHash * 91.0), hash(signHash * 137.0), hash(signHash * 197.0));
    signColor = normalize(signColor + 0.1) * 1.5;

    float topStrip = smoothstep(buildingHeight - 0.02, buildingHeight, dir.y)
                   * smoothstep(buildingHeight + 0.02, buildingHeight, dir.y);
    vec3 stripColor = windowColor * 2.0;

    vec3 col = sky;
    col = mix(col, buildingColor, inBuilding);
    col += windowColor * windowMask * inBuilding * 0.8;
    col += signColor * signMask * 0.6;
    col += stripColor * topStrip * inBuilding;

    return col;
  }

  // --- Chaotic overlapping viewports ---
  vec4 chaoticViewport(vec2 uv, int numCams, out int camIndex) {
    camIndex = -1;
    vec4 bestVp = vec4(0.0);
    int bestDepth = -1;

    for (int i = 0; i < 9; i++) {
      if (i >= numCams) break;

      float fi = float(i);
      float seed = fi * 31.17 + float(numCams) * 173.29;

      vec2 center = hash2(seed + 1.0);

      float dimSeed = hash(seed + 50.0);
      float w, h;
      if (dimSeed < 0.3) {
        w = 0.5 + hash(seed + 60.0) * 0.5;
        h = 0.05 + hash(seed + 61.0) * 0.12;
      } else if (dimSeed < 0.6) {
        w = 0.05 + hash(seed + 62.0) * 0.12;
        h = 0.5 + hash(seed + 63.0) * 0.5;
      } else if (dimSeed < 0.8) {
        w = 0.2 + hash(seed + 64.0) * 0.5;
        h = 0.2 + hash(seed + 65.0) * 0.5;
      } else {
        w = 0.4 + hash(seed + 66.0) * 0.5;
        h = 0.4 + hash(seed + 67.0) * 0.5;
      }

      float xMin = max(center.x - w * 0.5, 0.0);
      float yMin = max(center.y - h * 0.5, 0.0);
      float xMax = min(center.x + w * 0.5, 1.0);
      float yMax = min(center.y + h * 0.5, 1.0);

      int depth = i;

      if (uv.x >= xMin && uv.x <= xMax && uv.y >= yMin && uv.y <= yMax) {
        if (depth > bestDepth) {
          bestDepth = depth;
          camIndex = i;
          bestVp = vec4(xMin, yMin, xMax, yMax);
        }
      }
    }

    return bestVp;
  }

  // --- Camera from golden-ratio spiral on sphere ---
  vec3 calcCameraPos(int idx, int total) {
    float fi = float(idx);
    float n = float(total);
    float golden = 2.399963;

    float theta = golden * fi;
    float phi = acos(1.0 - 2.0 * (fi + 0.5) / n);

    float orbitPhase = fi * 1.7;
    theta += u_time * u_camOrbitSpeed + orbitPhase;

    float sp = sin(phi);
    return vec3(
      cos(theta) * sp,
      cos(phi),
      sin(theta) * sp
    ) * u_camDistance;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    int numCams = int(floor(u_numCameras));
    if (numCams < 1) numCams = 1;

    int camIdx;
    vec4 vp = chaoticViewport(uv, numCams, camIdx);

    if (camIdx < 0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
      return;
    }

    vec2 pixelSize = vec2(1.0) / u_resolution;
    float borderPx = u_gap * u_resolution.y;
    vec2 border = pixelSize * borderPx;
    if (uv.x < vp.x + border.x || uv.x > vp.z - border.x ||
        uv.y < vp.y + border.y || uv.y > vp.w - border.y) {
      gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
      return;
    }

    vec2 vpSize = vec2(vp.z - vp.x, vp.w - vp.y);
    vec2 localUV = (uv - vp.xy) / vpSize * 2.0 - 1.0;
    float vpAspect = (vpSize.x * u_resolution.x) / (vpSize.y * u_resolution.y);
    localUV.x *= vpAspect;

    vec3 camPos = calcCameraPos(camIdx, numCams);
    vec3 target = vec3(0.0);
    vec3 forward = normalize(target - camPos);
    vec3 worldUp = vec3(0.0, 1.0, 0.0);
    if (abs(dot(forward, worldUp)) > 0.99) {
      worldUp = vec3(0.0, 0.0, 1.0);
    }
    vec3 right = normalize(cross(forward, worldUp));
    vec3 up = cross(right, forward);

    vec3 rd = normalize(forward + localUV.x * right + localUV.y * up);

    float t = rayMarch(camPos, rd);

    vec3 col = vec3(0.03, 0.03, 0.03);

    if (t > 0.0) {
      vec3 p = camPos + rd * t;
      vec3 n = calcNormal(p);

      vec3 baseColor = vec3(0.05, 0.08, 0.2);
      vec3 viewDir = normalize(camPos - p);

      vec3 lightColors[3];
      lightColors[0] = vec3(0.2, 0.8, 1.0);
      lightColors[1] = vec3(1.0, 0.2, 0.7);
      lightColors[2] = vec3(1.0, 0.6, 0.1);

      vec3 diffuse = baseColor * 0.08;
      vec3 specular = vec3(0.0);

      for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float angle = u_time * u_lightOrbitSpeed * (0.5 + fi * 0.3) + fi * 2.094;
        float y = sin(u_time * u_lightOrbitSpeed * 0.3 + fi * 1.5) * 0.5;
        vec3 lightPos = vec3(cos(angle) * 3.0, y * 3.0, sin(angle) * 3.0);
        vec3 lightDir = normalize(lightPos - p);

        float diff = max(dot(n, lightDir), 0.0);
        vec3 halfVec = normalize(lightDir + viewDir);
        float spec = pow(max(dot(n, halfVec), 0.0), u_shininess);

        diffuse += baseColor * diff * lightColors[i] * 0.7;
        specular += lightColors[i] * spec * 0.6;
      }

      float fresnel = pow(1.0 - max(dot(viewDir, n), 0.0), 3.0);
      vec3 rim = vec3(0.15, 0.2, 0.5) * fresnel;

      vec3 emissive = baseColor * 2.0 * u_glow;

      vec3 litColor = diffuse + specular + rim + emissive;

      vec3 reflDir = reflect(-viewDir, n);
      vec3 envColor = envMap(reflDir);
      float reflAmount = fresnel * u_reflectivity;

      col = mix(litColor, envColor, reflAmount);
    }

    col = col / (col + vec3(1.0));

    gl_FragColor = vec4(col, 1.0);
  }
`;

class AllSeeingEye extends ModuleBase {
  static methods = [
    {
      name: "allParams",
      executeOnLoad: true,
      options: [
        { name: "rotationSpeed", defaultVal: 0.5, type: "number", min: 0, max: 3 },
        { name: "numCameras", defaultVal: 4, type: "number", min: 1, max: 9 },
        { name: "camOrbitSpeed", defaultVal: 0.3, type: "number", min: 0, max: 2 },
        { name: "shininess", defaultVal: 32, type: "number", min: 2, max: 128 },
        { name: "cubeSize", defaultVal: 0.7, type: "number", min: 0.2, max: 1.5 },
        { name: "camDistance", defaultVal: 4, type: "number", min: 2, max: 8 },
        { name: "glow", defaultVal: 0.15, type: "number", min: 0, max: 1 },
        { name: "gap", defaultVal: 0.002, type: "number", min: 0, max: 0.02 },
        { name: "lightOrbitSpeed", defaultVal: 0.8, type: "number", min: 0, max: 3 },
        { name: "reflectivity", defaultVal: 0.5, type: "number", min: 0, max: 1 },
      ],
    },
    {
      name: "rotationSpeed",
      executeOnLoad: false,
      options: [
        { name: "rotationSpeed", defaultVal: 0.5, type: "number", min: 0, max: 3 },
      ],
    },
    {
      name: "numCameras",
      executeOnLoad: false,
      options: [
        { name: "numCameras", defaultVal: 4, type: "number", min: 1, max: 9 },
      ],
    },
    {
      name: "camOrbitSpeed",
      executeOnLoad: false,
      options: [
        { name: "camOrbitSpeed", defaultVal: 0.3, type: "number", min: 0, max: 2 },
      ],
    },
    {
      name: "shininess",
      executeOnLoad: false,
      options: [
        { name: "shininess", defaultVal: 32, type: "number", min: 2, max: 128 },
      ],
    },
    {
      name: "cubeSize",
      executeOnLoad: false,
      options: [
        { name: "cubeSize", defaultVal: 0.7, type: "number", min: 0.2, max: 1.5 },
      ],
    },
    {
      name: "camDistance",
      executeOnLoad: false,
      options: [
        { name: "camDistance", defaultVal: 4, type: "number", min: 2, max: 8 },
      ],
    },
    {
      name: "glow",
      executeOnLoad: false,
      options: [
        { name: "glow", defaultVal: 0.15, type: "number", min: 0, max: 1 },
      ],
    },
    {
      name: "gap",
      executeOnLoad: false,
      options: [
        { name: "gap", defaultVal: 0.002, type: "number", min: 0, max: 0.02 },
      ],
    },
    {
      name: "lightOrbitSpeed",
      executeOnLoad: false,
      options: [
        { name: "lightOrbitSpeed", defaultVal: 0.8, type: "number", min: 0, max: 3 },
      ],
    },
    {
      name: "reflectivity",
      executeOnLoad: false,
      options: [
        { name: "reflectivity", defaultVal: 0.5, type: "number", min: 0, max: 1 },
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

    this.u_rotationSpeed = 0.5;
    this.u_numCameras = 4;
    this.u_camOrbitSpeed = 0.3;
    this.u_shininess = 32;
    this.u_cubeSize = 0.7;
    this.u_camDistance = 4;
    this.u_glow = 0.15;
    this.u_gap = 0.002;
    this.u_lightOrbitSpeed = 0.8;
    this.u_reflectivity = 0.5;

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
      console.error("[AllSeeingEye] WebGL not supported");
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
        "[AllSeeingEye] Program link error:",
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
        "[AllSeeingEye] Shader compile error:",
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
    rotationSpeed = 0.5,
    numCameras = 4,
    camOrbitSpeed = 0.3,
    shininess = 32,
    cubeSize = 0.7,
    camDistance = 4,
    glow = 0.15,
    gap = 0.002,
    lightOrbitSpeed = 0.8,
    reflectivity = 0.5,
  } = {}) {
    this.u_rotationSpeed = Number(rotationSpeed) || 0.5;
    this.u_numCameras = Number(numCameras) || 4;
    this.u_camOrbitSpeed = Number(camOrbitSpeed) || 0.3;
    this.u_shininess = Number(shininess) || 32;
    this.u_cubeSize = Number(cubeSize) || 0.7;
    this.u_camDistance = Number(camDistance) || 4;
    this.u_glow = Number(glow) || 0.15;
    this.u_gap = Number(gap) || 0.002;
    this.u_lightOrbitSpeed = Number(lightOrbitSpeed) || 0.8;
    this.u_reflectivity = Number(reflectivity) || 0.5;
  }

  rotationSpeed({ rotationSpeed = 0.5 } = {}) {
    this.u_rotationSpeed = Number(rotationSpeed) || 0.5;
  }

  numCameras({ numCameras = 4 } = {}) {
    this.u_numCameras = Number(numCameras) || 4;
  }

  camOrbitSpeed({ camOrbitSpeed = 0.3 } = {}) {
    this.u_camOrbitSpeed = Number(camOrbitSpeed) || 0.3;
  }

  shininess({ shininess = 32 } = {}) {
    this.u_shininess = Number(shininess) || 32;
  }

  cubeSize({ cubeSize = 0.7 } = {}) {
    this.u_cubeSize = Number(cubeSize) || 0.7;
  }

  camDistance({ camDistance = 4 } = {}) {
    this.u_camDistance = Number(camDistance) || 4;
  }

  glow({ glow = 0.15 } = {}) {
    this.u_glow = Number(glow) || 0.15;
  }

  gap({ gap = 0.002 } = {}) {
    this.u_gap = Number(gap) || 0.002;
  }

  lightOrbitSpeed({ lightOrbitSpeed = 0.8 } = {}) {
    this.u_lightOrbitSpeed = Number(lightOrbitSpeed) || 0.8;
  }

  reflectivity({ reflectivity = 0.5 } = {}) {
    this.u_reflectivity = Number(reflectivity) || 0.5;
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

    const time = (performance.now() - this.startTime) * 0.001;
    this.gl.uniform1f(this.gl.getUniformLocation(this.program, "u_time"), time);
    this.gl.uniform2f(this.gl.getUniformLocation(this.program, "u_resolution"), w, h);
    this.gl.uniform1f(this.gl.getUniformLocation(this.program, "u_rotationSpeed"), this.u_rotationSpeed);
    this.gl.uniform1f(this.gl.getUniformLocation(this.program, "u_numCameras"), this.u_numCameras);
    this.gl.uniform1f(this.gl.getUniformLocation(this.program, "u_camOrbitSpeed"), this.u_camOrbitSpeed);
    this.gl.uniform1f(this.gl.getUniformLocation(this.program, "u_shininess"), this.u_shininess);
    this.gl.uniform1f(this.gl.getUniformLocation(this.program, "u_cubeSize"), this.u_cubeSize);
    this.gl.uniform1f(this.gl.getUniformLocation(this.program, "u_camDistance"), this.u_camDistance);
    this.gl.uniform1f(this.gl.getUniformLocation(this.program, "u_glow"), this.u_glow);
    this.gl.uniform1f(this.gl.getUniformLocation(this.program, "u_gap"), this.u_gap);
    this.gl.uniform1f(this.gl.getUniformLocation(this.program, "u_lightOrbitSpeed"), this.u_lightOrbitSpeed);
    this.gl.uniform1f(this.gl.getUniformLocation(this.program, "u_reflectivity"), this.u_reflectivity);

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

export default AllSeeingEye;
