/*
@nwWrld name: HelloWorld
@nwWrld category: Text
@nwWrld imports: ModuleBase
*/

class HelloWorld extends ModuleBase {
  static methods = [
    {
      name: "text",
      executeOnLoad: true,
      options: [{ name: "text", defaultVal: "Hello world", type: "text" }],
    },
    {
      name: "style",
      executeOnLoad: true,
      options: [
        { name: "fontSize", defaultVal: 48, type: "number", min: 8, max: 300 },
      ],
    },
    {
      name: "color",
      executeOnLoad: true,
      options: [{ name: "color", defaultVal: "#ffffff", type: "color" }],
    },
  ];

  constructor(container) {
    super(container);
    this.textEl = document.createElement("div");
    this.textEl.style.cssText = [
      "width: 100%;",
      "height: 100%;",
      "display: flex;",
      "align-items: center;",
      "justify-content: center;",
      "font-family: monospace;",
      "font-size: 48px;",
      "color: white;",
    ].join(" ");
    if (this.elem) {
      this.elem.appendChild(this.textEl);
    }
  }

  text({ text = "Hello world" } = {}) {
    if (this.textEl) {
      this.textEl.textContent = String(text);
    }
    this.show();
  }

  setText(options = {}) {
    return this.text(options);
  }

  style({ fontSize = 48 } = {}) {
    if (this.textEl) {
      this.textEl.style.fontSize = fontSize + "px";
    }
  }

  color({ color = "#ffffff" } = {}) {
    if (this.textEl) {
      this.textEl.style.color = color;
    }
  }

  destroy() {
    if (this.textEl && this.textEl.parentNode) {
      this.textEl.parentNode.removeChild(this.textEl);
    }
    this.textEl = null;
    super.destroy();
  }
}

export default HelloWorld;
