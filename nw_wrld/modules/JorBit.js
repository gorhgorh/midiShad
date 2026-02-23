/*
@nwWrld name: JorBit
@nwWrld category: 3D
@nwWrld imports: BaseThreeJsModule, THREE
*/

const VERTS_PER_POINT = 3; // center + 2 satellites

class JorBitModule extends BaseThreeJsModule {
  static methods = [
    ...BaseThreeJsModule.methods,
    {
      name: "orbit",
      executeOnLoad: true,
      options: [
        { name: "orbitX", defaultVal: 0.5, type: "number", min: 0, max: 1 },
        { name: "orbitY", defaultVal: 0.5, type: "number", min: 0, max: 1 },
        { name: "orbitZ", defaultVal: 0.5, type: "number", min: 0, max: 1 },
      ],
    },
    {
      name: "style",
      executeOnLoad: true,
      options: [
        { name: "persistence", defaultVal: 0.92, type: "number", min: 0, max: 0.999 },
        { name: "pointSize", defaultVal: 0.18, type: "number", min: 0.01, max: 1.0 },
        { name: "spread", defaultVal: 6, type: "number", min: 1, max: 20 },
        { name: "rotationSpeed", defaultVal: 0.1, type: "number", min: 0, max: 2 },
        { name: "satOrbit", defaultVal: 0.3, type: "number", min: 0.05, max: 1.0 },
      ],
    },
    {
      name: "setColor",
      executeOnLoad: true,
      options: [
        { name: "headColor", defaultVal: "#6ee7b7", type: "color" },
        { name: "tailColor", defaultVal: "#1e3a5f", type: "color" },
      ],
    },
    {
      name: "clear",
    },
  ];

  constructor(container) {
    super(container);
    if (!THREE) return;

    this.MAX_POINTS = 2000;
    this._persistence = 0.92;
    this._spread = 6;
    this._rotSpeed = 0.1;
    this._pointSize = 0.18;
    this._satOrbit = 0.3;
    this._hr = 0.43; this._hg = 0.91; this._hb = 0.72;
    this._tr = 0.12; this._tg = 0.23; this._tb = 0.37;

    this._ix = 0.5;
    this._iy = 0.5;
    this._iz = 0.5;

    const totalVerts = this.MAX_POINTS * VERTS_PER_POINT;
    this._positions = new Float32Array(totalVerts * 3);
    this._colors = new Float32Array(totalVerts * 3);
    this._sizes = new Float32Array(totalVerts);
    this._ages = new Float32Array(this.MAX_POINTS);

    // Center positions stored separately for satellite computation
    this._centerPos = new Float32Array(this.MAX_POINTS * 3);

    // Per-satellite orbital data (2 per logical point)
    this._satAngles = new Float32Array(this.MAX_POINTS * 2);
    this._satSpeeds = new Float32Array(this.MAX_POINTS * 2);
    this._satRadii = new Float32Array(this.MAX_POINTS * 2);
    // Random phase offsets for 3D orbits
    this._satPhase = new Float32Array(this.MAX_POINTS * 2);

    this._head = 0;
    this._count = 0;

    this._group = new THREE.Group();
    this._points = null;

    this._setup();
  }

  _setup() {
    if (this.destroyed) return;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this._positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(this._colors, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(this._sizes, 1));
    geo.setDrawRange(0, 0);

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uPointSize: { value: this._pointSize },
      },
      vertexShader: /* glsl */ `
        attribute vec3 color;
        attribute float aSize;
        varying vec3 vColor;
        uniform float uPointSize;
        void main() {
          vColor = color;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uPointSize * aSize * (300.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, d);
          alpha *= alpha;
          gl_FragColor = vec4(vColor * alpha, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this._points = new THREE.Points(geo, mat);
    this._points.frustumCulled = false;
    this._group.add(this._points);
    this.setModel(this._group);
    this.setCustomAnimate(this._tick.bind(this));
  }

  orbit({ orbitX, orbitY, orbitZ } = {}) {
    if (orbitX !== undefined) this._ix = Number(orbitX);
    if (orbitY !== undefined) this._iy = Number(orbitY);
    if (orbitZ !== undefined) this._iz = Number(orbitZ);
  }

  style({ persistence, pointSize, spread, rotationSpeed, satOrbit } = {}) {
    if (persistence !== undefined) this._persistence = Number(persistence);
    if (spread !== undefined) this._spread = Number(spread);
    if (rotationSpeed !== undefined) this._rotSpeed = Number(rotationSpeed);
    if (satOrbit !== undefined) this._satOrbit = Number(satOrbit);
    if (pointSize !== undefined) {
      this._pointSize = Number(pointSize);
      if (this._points) this._points.material.uniforms.uPointSize.value = this._pointSize;
    }
  }

  setColor({ headColor, tailColor } = {}) {
    if (headColor) {
      const c = parseInt(String(headColor).replace("#", ""), 16);
      this._hr = ((c >> 16) & 0xff) / 255;
      this._hg = ((c >> 8) & 0xff) / 255;
      this._hb = (c & 0xff) / 255;
    }
    if (tailColor) {
      const c = parseInt(String(tailColor).replace("#", ""), 16);
      this._tr = ((c >> 16) & 0xff) / 255;
      this._tg = ((c >> 8) & 0xff) / 255;
      this._tb = (c & 0xff) / 255;
    }
  }

  clear() {
    this._ages.fill(0);
    this._colors.fill(0);
    this._sizes.fill(0);
    this._head = 0;
    this._count = 0;
    if (this._points) {
      this._points.geometry.attributes.color.needsUpdate = true;
      this._points.geometry.attributes.aSize.needsUpdate = true;
      this._points.geometry.setDrawRange(0, 0);
    }
  }

  _tick() {
    if (this.destroyed || !this._points) return;

    const half = this._spread / 2;
    const cx = this._ix * this._spread - half;
    const cy = this._iy * this._spread - half;
    const cz = this._iz * this._spread - half;
    const h = this._head;

    // Store center position
    this._centerPos[h * 3] = cx;
    this._centerPos[h * 3 + 1] = cy;
    this._centerPos[h * 3 + 2] = cz;

    // Center vertex
    const vi = h * VERTS_PER_POINT;
    const v3 = vi * 3;
    this._positions[v3] = cx;
    this._positions[v3 + 1] = cy;
    this._positions[v3 + 2] = cz;
    this._sizes[vi] = 1.0;
    this._colors[v3] = this._hr;
    this._colors[v3 + 1] = this._hg;
    this._colors[v3 + 2] = this._hb;

    // Init 2 satellites with random orbital params
    const orbitR = this._satOrbit;
    for (let s = 0; s < 2; s++) {
      const si = h * 2 + s;
      this._satAngles[si] = Math.random() * Math.PI * 2;
      this._satSpeeds[si] = 1.5 + Math.random() * 3.0;
      this._satRadii[si] = (0.4 + Math.random() * 0.6) * orbitR;
      this._satPhase[si] = Math.random() * Math.PI * 2;

      // Initial satellite position
      const svi = vi + 1 + s;
      const sv3 = svi * 3;
      const angle = this._satAngles[si];
      const r = this._satRadii[si];
      const phase = this._satPhase[si];
      this._positions[sv3] = cx + Math.cos(angle) * r;
      this._positions[sv3 + 1] = cy + Math.sin(angle) * r;
      this._positions[sv3 + 2] = cz + Math.sin(angle + phase) * r * 0.5;
      this._sizes[svi] = 0.5 + Math.random() * 0.3;
      this._colors[sv3] = this._hr * 0.6;
      this._colors[sv3 + 1] = this._hg * 0.6;
      this._colors[sv3 + 2] = this._hb * 0.6;
    }

    this._ages[h] = 1.0;
    this._head = (h + 1) % this.MAX_POINTS;
    if (this._count < this.MAX_POINTS) this._count++;

    // Decay + update satellites
    const decay = this._persistence;
    const hr = this._hr, hg = this._hg, hb = this._hb;
    const tr = this._tr, tg = this._tg, tb = this._tb;
    const ages = this._ages;
    const colors = this._colors;
    const positions = this._positions;
    const sizes = this._sizes;
    const centerPos = this._centerPos;
    const satAngles = this._satAngles;
    const satSpeeds = this._satSpeeds;
    const satRadii = this._satRadii;
    const satPhase = this._satPhase;
    const count = this._count;

    for (let i = 0; i < count; i++) {
      const age = ages[i];
      if (age < 0.005) {
        if (age > 0) {
          ages[i] = 0;
          const vi0 = i * VERTS_PER_POINT;
          for (let v = 0; v < VERTS_PER_POINT; v++) {
            const c3 = (vi0 + v) * 3;
            colors[c3] = 0;
            colors[c3 + 1] = 0;
            colors[c3 + 2] = 0;
            sizes[vi0 + v] = 0;
          }
        }
        continue;
      }

      const a = age * decay;
      ages[i] = a;
      const t = 1.0 - a;

      // Center vertex color
      const vi0 = i * VERTS_PER_POINT;
      const c3 = vi0 * 3;
      const cr = (hr + (tr - hr) * t) * a;
      const cg = (hg + (tg - hg) * t) * a;
      const cb = (hb + (tb - hb) * t) * a;
      colors[c3] = cr;
      colors[c3 + 1] = cg;
      colors[c3 + 2] = cb;

      // Update satellites
      const pcx = centerPos[i * 3];
      const pcy = centerPos[i * 3 + 1];
      const pcz = centerPos[i * 3 + 2];

      for (let s = 0; s < 2; s++) {
        const si = i * 2 + s;
        satAngles[si] += satSpeeds[si] * 0.02;
        const angle = satAngles[si];
        const r = satRadii[si] * a; // orbit shrinks as point ages
        const phase = satPhase[si];

        const svi = vi0 + 1 + s;
        const sv3 = svi * 3;

        // 3D orbit: sat0 in XY+Z, sat1 in YZ+X
        if (s === 0) {
          positions[sv3] = pcx + Math.cos(angle) * r;
          positions[sv3 + 1] = pcy + Math.sin(angle) * r;
          positions[sv3 + 2] = pcz + Math.sin(angle + phase) * r * 0.5;
        } else {
          positions[sv3] = pcx + Math.sin(angle + phase) * r * 0.5;
          positions[sv3 + 1] = pcy + Math.cos(angle) * r;
          positions[sv3 + 2] = pcz + Math.sin(angle) * r;
        }

        // Satellite color: dimmer than center
        colors[sv3] = cr * 0.5;
        colors[sv3 + 1] = cg * 0.5;
        colors[sv3 + 2] = cb * 0.5;
      }
    }

    const geo = this._points.geometry;
    geo.setDrawRange(0, count * VERTS_PER_POINT);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    geo.attributes.aSize.needsUpdate = true;

    if (this._rotSpeed > 0) {
      this._group.rotation.y += 0.001 * this._rotSpeed * this.cameraSettings.cameraSpeed;
    }
  }

  destroy() {
    if (this.destroyed) return;
    if (this._points) {
      this._points.geometry.dispose();
      this._points.material.dispose();
      this._group.remove(this._points);
      this._points = null;
    }
    if (this._group) {
      this.scene.remove(this._group);
      this._group = null;
    }
    super.destroy();
  }
}

export default JorBitModule;
