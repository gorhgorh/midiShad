/*
@nwWrld name: MultiModelLoader
@nwWrld category: 3D
@nwWrld imports: BaseThreeJsModule, THREE, assetUrl, OBJLoader, PLYLoader, PCDLoader, GLTFLoader, STLLoader
*/

class MultiModelLoader extends BaseThreeJsModule {
  static methods = [
    {
      name: "loadModels",
      executeOnLoad: true,
      options: [
        {
          name: "models",
          defaultVal: '["models/cube.obj","models/sphere.obj"]',
          type: "text",
        },
        { name: "scale", defaultVal: 1.0, type: "number" },
        { name: "color", defaultVal: "#ffffff", type: "color" },
      ],
    },
    {
      name: "toggleModel",
      executeOnLoad: false,
      options: [
        {
          name: "indexesJson",
          defaultVal: "[0,2]",
          type: "text",
        },
      ],
    },
    {
      name: "offsetModel",
      executeOnLoad: false,
      options: [
        {
          name: "offsetsJson",
          defaultVal: "[[0,0,0],[1,0,0],[0,1,0]]",
          type: "text",
        },
      ],
    },
  ];

  constructor(container) {
    super(container);
    if (!THREE) return;
    this.name = MultiModelLoader.name;
    this.loadedModels = [];
    this.lights = [];
    this.init();
  }

  init() {
    // Keep the same lights as ModelLoader
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    const key = new THREE.DirectionalLight(0xffffff, 1.25);
    key.position.set(2, 2, 4);
    const fill = new THREE.DirectionalLight(0xffffff, 0.5);
    fill.position.set(-3, -1, 2);

    this.scene.add(ambient);
    this.scene.add(key);
    this.scene.add(fill);
    this.lights.push(ambient, key, fill);
  }

  // Helper to parse a JSON string into an array
  parseJsonArray(str) {
    try {
      return Array.isArray(JSON.parse(str)) ? JSON.parse(str) : [];
    } catch {
      return [];
    }
  }

  // Reuse existing helpers from ModelLoader
  getExtension(modelPath) {
    const p = String(modelPath || "").trim();
    const idx = p.lastIndexOf(".");
    if (idx < 0) return null;
    return p.slice(idx + 1).toLowerCase();
  }

  getLoader(ext) {
    switch (ext) {
      case "obj":
        return new OBJLoader();
      case "ply":
        return new PLYLoader();
      case "pcd":
        return new PCDLoader();
      case "gltf":
      case "glb":
        return new GLTFLoader();
      case "stl":
        return new STLLoader();
      default:
        return null;
    }
  }

  clearLoadedModel() {
    // Only clear the currently active model for single-model logic
  }

  disposeObject3D(object) {
    // Only used if we ever support removing a single model
  }

  onModelLoaded(object3d, scale) {
    // Only used if we ever focus a single model
  }

  /**
   * Load one model (same logic as ModelLoader's loadModel, but returns
   * the added object so we can track it).
   */
  loadSingleModel(modelPath, scale) {
    // [Existing loading logic unchanged]
    const safePath = String(modelPath || "").trim();
    if (!safePath) return null;
    const url = typeof assetUrl === "function" ? assetUrl(safePath) : null;
    if (!url) {
      console.error(`[MultiModelLoader] Invalid model path: ${safePath}`);
      return null;
    }

    const ext = this.getExtension(safePath);
    const loader = this.getLoader(ext);
    if (!ext || !loader) {
      console.error(`[MultiModelLoader] Unsupported format: ${safePath}`);
      return null;
    }

    // Clean up existing models (optional)
    this.clearLoadedModel();

    const onError = (error) => {
      console.error("[MultiModelLoader] Failed to load model:", error);
    };

    if (ext === "gltf" || ext === "glb") {
      loader.load(
        url,
        (gltf) => {
          this.loadedModels.push(gltf.scene || gltf);
          this.setModel(this.loadedModels[this.loadedModels.length - 1]);
          console.log(`Loaded model: ${safePath}`);
        },
        undefined,
        onError,
      );
      return this.loadedModels[this.loadedModels.length - 1] || null;
    }

    if (ext === "stl") {
      loader.load(
        url,
        (geometry) => {
          if (geometry?.computeVertexNormals) geometry.computeVertexNormals();
          const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
          const mesh = new THREE.Mesh(geometry, material);
          this.loadedModels.push(mesh);
          this.setModel(this.loadedModels[this.loadedModels.length - 1]);
          console.log(`Loaded model: ${safePath}`);
        },
        undefined,
        onError,
      );
      return this.loadedModels[this.loadedModels.length - 1] || null;
    }

    loader.load(
      url,
      (obj) => {
        this.loadedModels.push(obj);
        this.setModel(this.loadedModels[this.loadedModels.length - 1]);
        console.log(`Loaded model: ${safePath}`);
      },
      undefined,
      onError,
    );
    return this.loadedModels[this.loadedModels.length - 1] || null;
  }

  loadModels({
    models = '["models/cube.obj","models/sphere.obj"]',
    scale = 1.0,
    color = "#ffffff",
  } = {}) {
    if (!models || models === "") {
      console.warn("[MultiModelLoader] No models specified.");
      return;
    }

    const modelPaths = Array.isArray(models)
      ? models
      : JSON.parse(models) || [];
    this.loadedModels = [];

    for (const path of modelPaths) {
      this.loadSingleModel(path, scale);
    }

    // Apply global color if set
    if (this.loadedModels.length > 0 && this.loadedModels[0]) {
      this.applyColor(color);
    }
  }

  applyColor(colorHex) {
    if (!this.loadedModels || this.loadedModels.length === 0) return;
    const c = new THREE.Color(colorHex);

    for (const model of this.loadedModels) {
      if (!model) continue;
      model.traverse((child) => {
        if (!child || (!child.isMesh && !child.isPoints)) return;
        const m = child.material;
        if (!m) return;
        if (m.color) m.color.set(c);
        // Disable vertex colors if not using them
        if (typeof m.vertexColors !== "undefined") {
          m.vertexColors = false;
        }
        m.needsUpdate = true;
      });
    }
  }

  /**
   * Toggle visibility of models by indexes.
   * Parse the JSON string into an array of indices to show.
   */
  toggleModel({ indexesJson = "[0,2]" } = {}) {
    // Ensure a valid JSON array
    const parsedIndexes = JSON.parse(indexesJson);

    // Convert to Set for fast lookup
    const indexesSet = new Set(parsedIndexes);

    if (!this.loadedModels || this.loadedModels.length === 0) return;

    for (const [idx, model] of Object.entries(this.loadedModels)) {
      // idx is a string; use Number(idx) below if you prefer that.
      const isVisible = indexesSet.has(idx);

      if (isVisible) {
        // Add to scene if not already present
        if (!model.scene || !this.scene.containsObject(model)) {
          this.scene.add(model);
        }
        model.userData = { visible: true };
      } else {
        // Remove from scene if not already missing
        if (this.scene.containsObject(model)) {
          this.scene.remove(model);
        }
        // Optionally mark as invisible
        model.userData = { visible: false };
      }
    }
  }

  /**
   * Offset each model by a Vector3 derived from a JSON array of offsets.
   * Example offsetsJson: "[[1,0,0],[0,2,0],[-1,0,0]]" -> one offset per model.
   */
  offsetModel({ offsetsJson = "[[0,0,0],[1,0,0],[0,1,0]]" } = {}) {
    // Parse offsets into an array of Vector3s
    const offsets = this.parseJsonArray(offsetsJson) || []; // e.g. [[x1,y1,z1], [x2,y2,z2], ...]

    if (!this.loadedModels || this.loadedModels.length === 0) return;

    for (let i = 0; i < this.loadedModels.length; i++) {
      const model = this.loadedModels[i];
      if (!model) continue;

      // Use the offset at index `i` (or fallback to target)
      const vec = new THREE.Vector3(
        offsets[i][0],
        offsets[i][1],
        offsets[i][2],
      );

      model.position.add(vec);
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.loadedModels = [];
    this.lights = [];
    super.destroy();
  }
}

export default MultiModelLoader;
