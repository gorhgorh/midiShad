/*
@nwWrld name: BasicGeometry
@nwWrld category: 3D
@nwWrld imports: BaseThreeJsModule, THREE
*/

class BasicGeometry extends BaseThreeJsModule {
  static category = "3D";
  static methods = [
    ...BaseThreeJsModule.methods,
    {
      name: "shape",
      executeOnLoad: false,
      options: [
        {
          name: "shape",
          defaultVal: "cylinder",
          type: "select",
          values: [
            "cylinder",
            "cone",
            "icosahedron",
            "octahedron",
            "tetrahedron",
            "lathe",
          ],
        },
      ],
    },
    {
      name: "speed",
      executeOnLoad: false,
      options: [
        { name: "rotationSpeed", defaultVal: 0.25, type: "number", min: 0, max: 2 },
      ],
    },
    {
      name: "colors",
      executeOnLoad: false,
      options: [
        { name: "wireColor", defaultVal: "#ffffff", type: "color" },
        { name: "segmentColor", defaultVal: "#E24519", type: "color" },
      ],
    },
  ];

  constructor(container) {
    super(container);
    if (!THREE) return;

    this.rotSpeed = 0.25;
    this.customGroup = new THREE.Group();
    this.line = null;
    this.lineSegments = null;

    this.animateLoop = this.animateLoop.bind(this);
    this.setCustomAnimate(this.animateLoop);

    this.init();
  }

  init() {
    if (this.destroyed) return;
    this.createCustomObjects();
    this.setModel(this.customGroup);
  }

  createCustomObjects() {
    if (this.destroyed) return;

    const mainLineGeometry = this.shapeGeometry("cylinder");
    const mainLineMaterial = new THREE.LineDashedMaterial({
      color: 0xffffff,
      dashSize: 3,
      gapSize: 0.5,
    });
    this.line = new THREE.Line(mainLineGeometry, mainLineMaterial);
    this.line.computeLineDistances();
    this.customGroup.add(this.line);

    const lineSegmentsGeometry = this.shapeGeometry("cylinder");
    const lineSegmentsMaterial = new THREE.LineDashedMaterial({
      color: "#E24519",
      dashSize: 5,
      gapSize: 1,
    });
    this.lineSegments = new THREE.LineSegments(
      lineSegmentsGeometry,
      lineSegmentsMaterial
    );
    this.lineSegments.computeLineDistances();
    this.customGroup.add(this.lineSegments);
  }

  animateLoop() {
    if (this.destroyed) return;
    const t = performance.now() * 0.001;
    if (this.customGroup) {
      this.customGroup.rotation.x = this.rotSpeed * t;
      this.customGroup.rotation.y = this.rotSpeed * t;
    }
  }

  speed({ rotationSpeed = 0.25 } = {}) {
    this.rotSpeed = Number(rotationSpeed) || 0.25;
  }

  colors({ wireColor = "#ffffff", segmentColor = "#E24519" } = {}) {
    if (this.line) this.line.material.color.set(wireColor);
    if (this.lineSegments) this.lineSegments.material.color.set(segmentColor);
  }

  shape({ shape = "cylinder" } = {}) {
    if (this.destroyed) return;

    if (this.line) {
      const newLineGeometry = this.shapeGeometry(shape);
      if (this.line.geometry) this.line.geometry.dispose();
      this.line.geometry = newLineGeometry;
      this.line.computeLineDistances();
    }

    if (this.lineSegments) {
      const newLineSegmentsGeometry = this.shapeGeometry(shape);
      if (this.lineSegments.geometry) this.lineSegments.geometry.dispose();
      this.lineSegments.geometry = newLineSegmentsGeometry;
      this.lineSegments.computeLineDistances();
    }
  }

  shapeGeometry(shapeType) {
    const t = String(shapeType || "").trim();

    if (t === "cylinder") {
      return this.cylinder(
        THREE.MathUtils.randFloat(12.5, 25),
        THREE.MathUtils.randFloat(12.5, 25),
        THREE.MathUtils.randFloat(25, 50),
        THREE.MathUtils.randInt(8, 16)
      );
    }
    if (t === "cone") {
      return this.cone(
        THREE.MathUtils.randFloat(12.5, 25),
        THREE.MathUtils.randFloat(25, 50),
        THREE.MathUtils.randInt(8, 16)
      );
    }
    if (t === "icosahedron") {
      return this.icosahedron(THREE.MathUtils.randFloat(12.5, 25), 0);
    }
    if (t === "octahedron") {
      return this.octahedron(THREE.MathUtils.randFloat(12.5, 25), 0);
    }
    if (t === "tetrahedron") {
      return this.tetrahedron(THREE.MathUtils.randFloat(12.5, 25), 0);
    }
    if (t === "lathe") {
      return this.latheGeometry(
        THREE.MathUtils.randInt(6, 12),
        THREE.MathUtils.randInt(10, 20),
        0,
        2 * Math.PI
      );
    }

    return this.cylinder(
      THREE.MathUtils.randFloat(12.5, 25),
      THREE.MathUtils.randFloat(12.5, 25),
      THREE.MathUtils.randFloat(25, 50),
      THREE.MathUtils.randInt(8, 16)
    );
  }

  cylinder(radiusTop, radiusBottom, height, radialSegments) {
    const base = new THREE.CylinderGeometry(
      radiusTop,
      radiusBottom,
      height,
      radialSegments
    );
    const edges = new THREE.EdgesGeometry(base);
    base.dispose();
    return edges;
  }

  cone(radius, height, radialSegments) {
    const base = new THREE.ConeGeometry(radius, height, radialSegments);
    const edges = new THREE.EdgesGeometry(base);
    base.dispose();
    return edges;
  }

  icosahedron(radius, detail) {
    const base = new THREE.IcosahedronGeometry(radius, detail);
    const edges = new THREE.EdgesGeometry(base);
    base.dispose();
    return edges;
  }

  octahedron(radius, detail) {
    const base = new THREE.OctahedronGeometry(radius, detail);
    const edges = new THREE.EdgesGeometry(base);
    base.dispose();
    return edges;
  }

  tetrahedron(radius, detail) {
    const base = new THREE.TetrahedronGeometry(radius, detail);
    const edges = new THREE.EdgesGeometry(base);
    base.dispose();
    return edges;
  }

  latheGeometry(pointsCount, segments, phiStart, phiLength) {
    const points = [];
    for (let i = 0; i < pointsCount; ++i) {
      points.push(new THREE.Vector2(Math.sin(i * 0.2) * 10 + 5, (i - 5) * 2));
    }
    const base = new THREE.LatheGeometry(points, segments, phiStart, phiLength);
    const edges = new THREE.EdgesGeometry(base);
    base.dispose();
    return edges;
  }

  destroy() {
    this.customGroup = null;
    this.line = null;
    this.lineSegments = null;
    super.destroy();
  }
}

export default BasicGeometry;

