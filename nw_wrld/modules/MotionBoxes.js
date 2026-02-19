/*
@nwWrld name: MotionBoxes
@nwWrld category: 2D
@nwWrld imports: ModuleBase, motion
*/

class MotionBoxes extends ModuleBase {
  static methods = [
    {
      name: "scatter",
      executeOnLoad: true,
      options: [
        { name: "count", defaultVal: 12, type: "number" },
        { name: "size", defaultVal: 40, type: "number" },
      ],
    },
    {
      name: "color",
      executeOnLoad: true,
      options: [{ name: "color", defaultVal: "#ffffff", type: "color" }],
    },
    {
      name: "pulse",
      options: [
        { name: "scale", defaultVal: 1.5, type: "number" },
        { name: "duration", defaultVal: 0.6, type: "number" },
      ],
    },
    {
      name: "wave",
      options: [
        { name: "distance", defaultVal: 100, type: "number" },
        { name: "duration", defaultVal: 0.8, type: "number" },
      ],
    },
    {
      name: "spin",
      options: [
        { name: "turns", defaultVal: 1, type: "number" },
        { name: "duration", defaultVal: 1, type: "number" },
      ],
    },
    {
      name: "reset",
    },
  ];

  constructor(container) {
    super(container);
    this.name = MotionBoxes.name;
    this.boxes = [];
    this.boxColor = "#ffffff";
    this.boxSize = 40;
    this.init();
  }

  init() {
    if (!this.elem) return;
    this.elem.style.position = "relative";
    this.elem.style.overflow = "hidden";
  }

  scatter(opts) {
    const count = opts?.count ?? 12;
    const size = opts?.size ?? 40;
    this.boxSize = size;

    // clear previous
    this.boxes.forEach((b) => b.remove());
    this.boxes = [];

    const w = this.elem.clientWidth;
    const h = this.elem.clientHeight;

    for (let i = 0; i < count; i++) {
      const box = document.createElement("div");
      box.style.position = "absolute";
      box.style.width = `${size}px`;
      box.style.height = `${size}px`;
      box.style.backgroundColor = this.boxColor;
      box.style.borderRadius = "4px";
      box.style.left = `${Math.random() * (w - size)}px`;
      box.style.top = `${Math.random() * (h - size)}px`;
      box.style.opacity = "0";
      this.elem.appendChild(box);
      this.boxes.push(box);
    }

    // entrance animation using motion.animate + stagger
    const { animate, stagger } = motion;
    animate(
      this.boxes,
      { opacity: [0, 1], scale: [0, 1] },
      { duration: 0.4, delay: stagger(0.05) }
    );
  }

  color(opts) {
    this.boxColor = opts?.color ?? "#ffffff";
    if (this.boxes.length === 0) return;

    const { animate, stagger } = motion;
    animate(
      this.boxes,
      { backgroundColor: this.boxColor },
      { duration: 0.3, delay: stagger(0.02) }
    );
  }

  pulse(opts) {
    if (this.boxes.length === 0) return;
    const scale = opts?.scale ?? 1.5;
    const duration = opts?.duration ?? 0.6;

    const { animate, stagger } = motion;
    animate(
      this.boxes,
      { scale: [1, scale, 1] },
      { duration, delay: stagger(0.03) }
    );
  }

  wave(opts) {
    if (this.boxes.length === 0) return;
    const distance = opts?.distance ?? 100;
    const duration = opts?.duration ?? 0.8;

    const { animate, stagger } = motion;
    animate(
      this.boxes,
      { y: [0, -distance, 0] },
      { duration, delay: stagger(0.05) }
    );
  }

  spin(opts) {
    if (this.boxes.length === 0) return;
    const turns = opts?.turns ?? 1;
    const duration = opts?.duration ?? 1;

    const { animate, stagger } = motion;
    animate(
      this.boxes,
      { rotate: [0, turns * 360] },
      { duration, delay: stagger(0.04) }
    );
  }

  reset() {
    if (this.boxes.length === 0) return;
    const { animate } = motion;
    animate(
      this.boxes,
      { scale: 1, rotate: 0, y: 0, x: 0 },
      { duration: 0.3 }
    );
  }

  destroy() {
    this.boxes.forEach((b) => b.remove());
    this.boxes = [];
    super.destroy();
  }
}

export default MotionBoxes;
