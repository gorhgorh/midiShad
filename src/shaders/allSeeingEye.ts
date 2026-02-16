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

  // --- BSP viewport subdivision ---
  // Returns: vec4(xMin, yMin, xMax, yMax) for the viewport this pixel belongs to,
  // and sets camIndex to identify which camera.
  vec4 bspViewport(vec2 uv, int numCams, out int camIndex) {
    float xMin = 0.0, yMin = 0.0, xMax = 1.0, yMax = 1.0;
    int remaining = numCams;
    camIndex = 0;

    for (int i = 0; i < 9; i++) {
      if (remaining <= 1) break;

      float w = xMax - xMin;
      float h = yMax - yMin;

      // how many cameras go in the "left/bottom" partition
      int leftCount = remaining / 2;
      int rightCount = remaining - leftCount;
      float ratio = float(leftCount) / float(remaining);

      // perturb ratio a bit with hash for visual variety
      ratio = mix(ratio, ratio + (hash(float(i) * 7.3 + 0.5) - 0.5) * 0.2, 0.5);
      ratio = clamp(ratio, 0.25, 0.75);

      if (w >= h) {
        // split vertically
        float splitX = xMin + w * ratio;
        if (uv.x < splitX) {
          xMax = splitX;
          remaining = leftCount;
        } else {
          xMin = splitX;
          camIndex += leftCount;
          remaining = rightCount;
        }
      } else {
        // split horizontally
        float splitY = yMin + h * ratio;
        if (uv.y < splitY) {
          yMax = splitY;
          remaining = leftCount;
        } else {
          yMin = splitY;
          camIndex += leftCount;
          remaining = rightCount;
        }
      }
    }

    return vec4(xMin, yMin, xMax, yMax);
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

    // BSP layout
    int camIdx;
    vec4 vp = bspViewport(uv, numCams, camIdx);

    // Gap check — black border between viewports
    float gapPx = u_gap;
    if (uv.x < vp.x + gapPx || uv.x > vp.z - gapPx ||
        uv.y < vp.y + gapPx || uv.y > vp.w - gapPx) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
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

    vec3 col = vec3(0.0); // black background

    if (t > 0.0) {
      vec3 p = camPos + rd * t;
      vec3 n = calcNormal(p);

      // Dark blue base color
      vec3 baseColor = vec3(0.05, 0.08, 0.2);

      // Two light sources
      vec3 light1 = normalize(vec3(1.0, 1.0, 0.8));
      vec3 light2 = normalize(vec3(-0.5, 0.5, -1.0));

      vec3 viewDir = normalize(camPos - p);

      // Blinn-Phong for light 1
      float diff1 = max(dot(n, light1), 0.0);
      vec3 half1 = normalize(light1 + viewDir);
      float spec1 = pow(max(dot(n, half1), 0.0), u_shininess);

      // Blinn-Phong for light 2
      float diff2 = max(dot(n, light2), 0.0);
      vec3 half2 = normalize(light2 + viewDir);
      float spec2 = pow(max(dot(n, half2), 0.0), u_shininess);

      // Ambient
      float ambient = 0.08;

      // Diffuse contribution
      vec3 diffuse = baseColor * (ambient + diff1 * 0.7 + diff2 * 0.35);

      // Specular (white highlights)
      vec3 specular = vec3(1.0) * (spec1 * 0.8 + spec2 * 0.4);

      // Fresnel rim light
      float fresnel = pow(1.0 - max(dot(viewDir, n), 0.0), 3.0);
      vec3 rim = vec3(0.15, 0.2, 0.5) * fresnel;

      // Self-illumination / emissive glow
      vec3 emissive = baseColor * 2.0 * u_glow;

      col = diffuse + specular + rim + emissive;
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
    { name: 'u_gap', label: 'Viewport Gap', min: 0, max: 0.05, default: 0.01 },
  ],
}
