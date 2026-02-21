/*
@nwWrld name: JorBit
@nwWrld category: 3D
@nwWrld imports: BaseThreeJsModule, THREE
*/

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
        { name: "pointSize", defaultVal: 0.08, type: "number", min: 0.005, max: 0.5 },
        { name: "spread", defaultVal: 6, type: "number", min: 1, max: 20 },
        { name: "rotationSpeed", defaultVal: 0.1, type: "number", min: 0, max: 2 },
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
    this._pointSize = 0.08;
    this._hr = 0.43; this._hg = 0.91; this._hb = 0.72;
    this._tr = 0.12; this._tg = 0.23; this._tb = 0.37;

    this._ix = 0.5;
    this._iy = 0.5;
    this._iz = 0.5;

    this._positions = new Float32Array(this.MAX_POINTS * 3);
    this._colors = new Float32Array(this.MAX_POINTS * 3);
    this._ages = new Float32Array(this.MAX_POINTS);
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
    geo.setDrawRange(0, 0);

    const mat = new THREE.PointsMaterial({
      size: this._pointSize,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
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

  style({ persistence, pointSize, spread, rotationSpeed } = {}) {
    if (persistence !== undefined) this._persistence = Number(persistence);
    if (spread !== undefined) this._spread = Number(spread);
    if (rotationSpeed !== undefined) this._rotSpeed = Number(rotationSpeed);
    if (pointSize !== undefined) {
      this._pointSize = Number(pointSize);
      if (this._points) this._points.material.size = this._pointSize;
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
    this._head = 0;
    this._count = 0;
    if (this._points) {
      this._points.geometry.attributes.color.needsUpdate = true;
      this._points.geometry.setDrawRange(0, 0);
    }
  }

  _tick() {
    if (this.destroyed || !this._points) return;

    const half = this._spread / 2;
    const x = this._ix * this._spread - half;
    const y = this._iy * this._spread - half;
    const z = this._iz * this._spread - half;

    // Write new point
    const i3 = this._head * 3;
    this._positions[i3] = x;
    this._positions[i3 + 1] = y;
    this._positions[i3 + 2] = z;
    this._ages[this._head] = 1.0;
    this._colors[i3] = this._hr;
    this._colors[i3 + 1] = this._hg;
    this._colors[i3 + 2] = this._hb;

    this._head = (this._head + 1) % this.MAX_POINTS;
    if (this._count < this.MAX_POINTS) this._count++;

    // Decay — fade color to black (additive: black = invisible)
    const decay = this._persistence;
    const hr = this._hr, hg = this._hg, hb = this._hb;
    const tr = this._tr, tg = this._tg, tb = this._tb;
    const ages = this._ages;
    const colors = this._colors;
    const count = this._count;

    for (let i = 0; i < count; i++) {
      const age = ages[i];
      if (age < 0.005) {
        if (age > 0) {
          ages[i] = 0;
          const c = i * 3;
          colors[c] = 0;
          colors[c + 1] = 0;
          colors[c + 2] = 0;
        }
        continue;
      }
      const a = age * decay;
      ages[i] = a;
      const t = 1.0 - a;
      const c = i * 3;
      colors[c] = (hr + (tr - hr) * t) * a;
      colors[c + 1] = (hg + (tg - hg) * t) * a;
      colors[c + 2] = (hb + (tb - hb) * t) * a;
    }

    const geo = this._points.geometry;
    geo.setDrawRange(0, count);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;

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
