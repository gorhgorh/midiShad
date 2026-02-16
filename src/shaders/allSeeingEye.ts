import type { ShaderDefinition } from './types'

const vertexShader = /* glsl */ `
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
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
    // Normalize direction to hemisphere angles
    float theta = atan(dir.z, dir.x); // horizontal angle [-pi, pi]
    float phi = asin(clamp(dir.y, -1.0, 1.0)); // vertical angle

    // Dark sky gradient base
    vec3 sky = mix(vec3(0.02, 0.01, 0.05), vec3(0.0, 0.0, 0.02), smoothstep(-0.2, 0.8, dir.y));

    // Building silhouettes — hash-based columns from horizontal angle
    float colId = floor(theta * 8.0); // ~50 columns around horizon
    float colHash = hash(colId * 73.19);
    float buildingHeight = 0.05 + colHash * 0.35; // varies per column
    float inBuilding = step(dir.y, buildingHeight) * step(-0.1, dir.y);

    // Building body (dark with slight variation)
    vec3 buildingColor = vec3(0.02, 0.02, 0.04) * (0.5 + colHash * 0.5);

    // Neon window bands — horizontal strips at varying heights
    float windowY = fract(dir.y * 25.0 + colHash * 3.0);
    float windowX = fract(theta * 8.0);
    float windowMask = step(0.7, windowY) * step(0.15, windowX) * step(windowX, 0.85);

    // Window colors — cycle through neon palette per column
    float colorSel = hash(colId * 17.31);
    vec3 windowColor = colorSel < 0.33
      ? vec3(0.2, 0.8, 1.0)   // cyan
      : (colorSel < 0.66
        ? vec3(1.0, 0.2, 0.7) // magenta
        : vec3(1.0, 0.6, 0.1) // orange
      );

    // Scattered neon signs (bright points)
    float signHash = hash(floor(theta * 20.0) * 113.7 + floor(dir.y * 30.0) * 271.3);
    float signMask = step(0.92, signHash) * inBuilding;
    vec3 signColor = vec3(hash(signHash * 91.0), hash(signHash * 137.0), hash(signHash * 197.0));
    signColor = normalize(signColor + 0.1) * 1.5; // bright saturated

    // Horizontal LED strips at building tops
    float topStrip = smoothstep(buildingHeight - 0.02, buildingHeight, dir.y)
                   * smoothstep(buildingHeight + 0.02, buildingHeight, dir.y);
    vec3 stripColor = windowColor * 2.0;

    // Compose
    vec3 col = sky;
    col = mix(col, buildingColor, inBuilding);
    col += windowColor * windowMask * inBuilding * 0.8;
    col += signColor * signMask * 0.6;
    col += stripColor * topStrip * inBuilding;

    return col;
  }

  // --- Chaotic overlapping viewports ---
  // Each viewport has a random position, wild aspect ratio, and depth (z-index).
  // Highest depth viewport containing this pixel wins.
  // Returns vec4(xMin, yMin, xMax, yMax), sets camIndex.
  vec4 chaoticViewport(vec2 uv, int numCams, out int camIndex) {
    camIndex = -1;
    vec4 bestVp = vec4(0.0);
    int bestDepth = -1;

    for (int i = 0; i < 9; i++) {
      if (i >= numCams) break;

      float fi = float(i);
      float seed = fi * 31.17 + float(numCams) * 173.29;

      // spread centers across the full screen, including edges
      vec2 center = hash2(seed + 1.0);

      // wild random dimensions — elongated ratios like 2:10, 1:8, etc.
      float dimSeed = hash(seed + 50.0);
      float w, h;
      if (dimSeed < 0.3) {
        // very wide strip
        w = 0.5 + hash(seed + 60.0) * 0.5;
        h = 0.05 + hash(seed + 61.0) * 0.12;
      } else if (dimSeed < 0.6) {
        // very tall strip
        w = 0.05 + hash(seed + 62.0) * 0.12;
        h = 0.5 + hash(seed + 63.0) * 0.5;
      } else if (dimSeed < 0.8) {
        // medium chaotic rectangle
        w = 0.2 + hash(seed + 64.0) * 0.5;
        h = 0.2 + hash(seed + 65.0) * 0.5;
      } else {
        // large block
        w = 0.4 + hash(seed + 66.0) * 0.5;
        h = 0.4 + hash(seed + 67.0) * 0.5;
      }

      // viewport bounds, clamped to screen
      float xMin = max(center.x - w * 0.5, 0.0);
      float yMin = max(center.y - h * 0.5, 0.0);
      float xMax = min(center.x + w * 0.5, 1.0);
      float yMax = min(center.y + h * 0.5, 1.0);

      // higher index = higher depth (drawn on top)
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
    float golden = 2.399963; // pi * (3 - sqrt(5))

    // base position on sphere
    float theta = golden * fi;
    float phi = acos(1.0 - 2.0 * (fi + 0.5) / n);

    // orbit animation
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

    // Chaotic overlapping layout
    int camIdx;
    vec4 vp = chaoticViewport(uv, numCams, camIdx);

    // No viewport — transparent
    if (camIdx < 0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
      return;
    }

    // White frame — uniform pixel width on all sides
    vec2 pixelSize = vec2(1.0) / u_resolution;
    float borderPx = u_gap * u_resolution.y; // convert to pixel count
    vec2 border = pixelSize * borderPx;
    if (uv.x < vp.x + border.x || uv.x > vp.z - border.x ||
        uv.y < vp.y + border.y || uv.y > vp.w - border.y) {
      gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
      return;
    }

    // Remap UV to viewport-local [-1, 1], aspect-corrected
    vec2 vpSize = vec2(vp.z - vp.x, vp.w - vp.y);
    vec2 localUV = (uv - vp.xy) / vpSize * 2.0 - 1.0;
    float vpAspect = (vpSize.x * u_resolution.x) / (vpSize.y * u_resolution.y);
    localUV.x *= vpAspect;

    // Camera
    vec3 camPos = calcCameraPos(camIdx, numCams);
    vec3 target = vec3(0.0);
    vec3 forward = normalize(target - camPos);
    vec3 worldUp = vec3(0.0, 1.0, 0.0);
    // handle degenerate case when camera is near poles
    if (abs(dot(forward, worldUp)) > 0.99) {
      worldUp = vec3(0.0, 0.0, 1.0);
    }
    vec3 right = normalize(cross(forward, worldUp));
    vec3 up = cross(right, forward);

    vec3 rd = normalize(forward + localUV.x * right + localUV.y * up);

    // Ray march
    float t = rayMarch(camPos, rd);

    vec3 col = vec3(0.03, 0.03, 0.03); // near-black matte background

    if (t > 0.0) {
      vec3 p = camPos + rd * t;
      vec3 n = calcNormal(p);

      // Dark blue base color
      vec3 baseColor = vec3(0.05, 0.08, 0.2);

      vec3 viewDir = normalize(camPos - p);

      // 3 orbiting neon lights
      vec3 lightColors[3];
      lightColors[0] = vec3(0.2, 0.8, 1.0);  // cyan
      lightColors[1] = vec3(1.0, 0.2, 0.7);  // magenta
      lightColors[2] = vec3(1.0, 0.6, 0.1);  // warm orange

      vec3 diffuse = baseColor * 0.08; // ambient
      vec3 specular = vec3(0.0);

      for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float angle = u_time * u_lightOrbitSpeed * (0.5 + fi * 0.3) + fi * 2.094;
        float y = sin(u_time * u_lightOrbitSpeed * 0.3 + fi * 1.5) * 0.5;
        vec3 lightPos = vec3(cos(angle) * 3.0, y * 3.0, sin(angle) * 3.0);
        vec3 lightDir = normalize(lightPos - p);

        // Blinn-Phong per light
        float diff = max(dot(n, lightDir), 0.0);
        vec3 halfVec = normalize(lightDir + viewDir);
        float spec = pow(max(dot(n, halfVec), 0.0), u_shininess);

        diffuse += baseColor * diff * lightColors[i] * 0.7;
        specular += lightColors[i] * spec * 0.6;
      }

      // Fresnel
      float fresnel = pow(1.0 - max(dot(viewDir, n), 0.0), 3.0);
      vec3 rim = vec3(0.15, 0.2, 0.5) * fresnel;

      // Self-illumination / emissive glow
      vec3 emissive = baseColor * 2.0 * u_glow;

      // Lit surface color
      vec3 litColor = diffuse + specular + rim + emissive;

      // Procedural env map reflection
      vec3 reflDir = reflect(-viewDir, n);
      vec3 envColor = envMap(reflDir);
      float reflAmount = fresnel * u_reflectivity;

      col = mix(litColor, envColor, reflAmount);
    }

    // Tone mapping (simple Reinhard)
    col = col / (col + vec3(1.0));

    gl_FragColor = vec4(col, 1.0);
  }
`

export const allSeeingEye: ShaderDefinition = {
  id: 'allSeeingEye',
  name: 'All Seeing Eye',
  note: 'Multi-camera surveillance of a glossy cube',
  credit: 'gorhgorh',
  vertexShader,
  fragmentShader,
  params: [
    { name: 'u_rotationSpeed', label: 'Rotation Speed', min: 0, max: 3, default: 0.5 },
    { name: 'u_numCameras', label: 'Cameras', min: 1, max: 9, default: 4 },
    { name: 'u_camOrbitSpeed', label: 'Cam Orbit', min: 0, max: 2, default: 0.3 },
    { name: 'u_shininess', label: 'Glossiness', min: 2, max: 128, default: 32 },
    { name: 'u_cubeSize', label: 'Cube Size', min: 0.2, max: 1.5, default: 0.7 },
    { name: 'u_camDistance', label: 'Cam Distance', min: 2, max: 8, default: 4 },
    { name: 'u_glow', label: 'Glow', min: 0, max: 1, default: 0.15 },
    { name: 'u_gap', label: 'Viewport Gap', min: 0, max: 0.02, default: 0.002 },
    { name: 'u_lightOrbitSpeed', label: 'Light Orbit', min: 0, max: 3, default: 0.8 },
    { name: 'u_reflectivity', label: 'Reflectivity', min: 0, max: 1, default: 0.5 },
  ],
}
