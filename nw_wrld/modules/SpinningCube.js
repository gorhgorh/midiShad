/*
@nwWrld name: SpinningCube
@nwWrld category: 3D
@nwWrld imports: BaseThreeJsModule, THREE
*/

class SpinningCube extends BaseThreeJsModule {
  static methods = [
    ...BaseThreeJsModule.methods,
    {
      name: "speed",
      executeOnLoad: false,
      options: [
        { name: "speedX", defaultVal: 0.01, type: "number", min: 0, max: 0.1 },
        { name: "speedY", defaultVal: 0.015, type: "number", min: 0, max: 0.1 },
      ],
    },
    {
      name: "appearance",
      executeOnLoad: false,
      options: [
        { name: "color", defaultVal: "#00ff99", type: "color" },
        { name: "cubeSize", defaultVal: 1, type: "number", min: 0.1, max: 5 },
      ],
    },
  ];

  constructor(container) {
    super(container);
    if (!THREE) return;
    this.speedX = 0.01;
    this.speedY = 0.015;
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff99 });
    this.cube = new THREE.Mesh(geometry, material);
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(2, 2, 4);
    this.scene.add(light);
    this.setModel(this.cube);
    this.setCustomAnimate(() => {
      if (!this.cube) return;
      this.cube.rotation.x += this.speedX;
      this.cube.rotation.y += this.speedY;
    });
  }

  speed({ speedX = 0.01, speedY = 0.015 } = {}) {
    this.speedX = Number(speedX) || 0.01;
    this.speedY = Number(speedY) || 0.015;
  }

  appearance({ color = "#00ff99", cubeSize = 1 } = {}) {
    if (this.cube) {
      this.cube.material.color.set(color);
      this.cube.scale.setScalar(Number(cubeSize) || 1);
    }
  }

  destroy() {
    this.cube = null;
    super.destroy();
  }
}

export default SpinningCube;
