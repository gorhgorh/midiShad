/*
@nwWrld name: VideoPlayerAdvanced
@nwWrld category: 2D
@nwWrld imports: ModuleBase, assetUrl
*/

class VideoPlayerAdvanced extends ModuleBase {
  static methods = [
    {
      name: "video",
      executeOnLoad: true,
      options: [
        {
          name: "path",
          defaultVal: "videos/vid.mp4",
          type: "assetFile",
          assetBaseDir: "videos",
          assetExtensions: [".mp4", ".webm", ".mkv", ".mov", ".avi", ".flv"],
        },
        { name: "autoplay", defaultVal: false, type: "boolean" },
        { name: "loop", defaultVal: false, type: "boolean" },
        { name: "muted", defaultVal: true, type: "boolean" },
      ],
    },
    {
      name: "speed",
      options: [
        {
          name: "rate",
          type: "number",
          min: 0.1,
          max: 3.0,
          step: 0.1,
          value: 1.0,
        },
      ],
    },
    {
      name: "jumpTo",
      options: [
        {
          name: "percent",
          type: "number",
          min: 0,
          max: 100,
          step: 1,
          value: 50,
        },
      ],
    },
    // Effect controls
    {
      name: "canvasOpacity",
      options: [
        {
          name: "opacity",
          type: "number",
          min: 0,
          max: 1,
          step: 0.01,
          value: 1,
        },
      ],
    },
    {
      name: "canvasBlur",
      options: [
        {
          name: "blur",
          type: "number",
          min: 0,
          max: 50,
          step: 1,
          value: 0,
        },
      ],
    },
    {
      name: "canvasBlendMode",
      options: [
        {
          name: "blendMode",
          type: "select",
          values: [
            "normal",
            "multiply",
            "screen",
            "overlay",
            "darken",
            "lighten",
            "color-dodge",
            "color-burn",
            "hard-light",
            "soft-light",
            "difference",
            "exclusion",
            "hue",
            "saturation",
            "color",
            "luminosity",
            "plus-darker",
            "plus-lighter",
          ],
        },
      ],
    },
  ];

  constructor(container) {
    super(container);
    this.name = VideoPlayerAdvanced.name;
    this.video = null;
    this.canvas = null;
    this.originalMedia = null;
    this.init();
  }

  init() {
    if (this.elem) {
      // Video
      this.video = document.createElement("video");
      this.video.style.cssText =
        "width:100%;height:100%;object-fit:cover;display:block;background:#000;";
      this.elem.appendChild(this.video);

      this.canvases = [];
      for (let index = 0; index < 4; index++) {
        const canvas = this.buildCanvas();
        this.canvases.push(canvas);
        this.elem.appendChild(canvas);
      }
      // Insert canvas before video to keep video visible
      this.video.focus();
    }

    // Optional: resize canvas to match video aspect ratio
    window.addEventListener("resize", () => {
      if (!this.canvas || !this.video) return;
      const ratio = Math.min(
        this.video.offsetWidth / this.video.offsetHeight,
        this.video.offsetHeight / this.video.offsetWidth,
      );
    });

    // Update canvas when video data changes
    this.video.addEventListener("loadeddata", () => {
      this._connectVideo();
    });
  }

  buildCanvas() {
    const canvas = document.createElement("canvas");
    canvas.style.cssText =
      "width:100%;height:100%;object-fit:cover;display:none;background:#000;";
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.border = "transparent";
    return canvas;
  }

  _connectVideo() {
    this.video.requestVideoFrameCallback(this.updateCanvas);
  }

  video({ path, autoplay, loop, muted } = {}) {
    let url;
    if (typeof assetUrl === "function") url = assetUrl(path);
    if (!url) url = path;

    if (this.video && url) {
      try {
        this.originalMedia = this._createMedia(url);
        this.video.srcObject = this.originalMedia;
      } catch (e) {
        this.video.src = url;
      }
      this.video.autoplay = autoplay;
      this.video.loop = loop;
      this.video.muted = muted;

      // Start playing if desired
      if (autoplay && !loop) {
        this.video.play().catch(() => {});
      }
    } else {
      this.show(); // keep placeholder
    }
  }

  _createMedia(url) {
    return new MediaSource().appendBuffer(
      fetch(url).then((r) => r.arrayBuffer()),
    );
  }

  speed({ rate = 1.0 } = {}) {
    if (
      this.video &&
      this.video.readyState >= VideoPlayerAdvanced.MIN_VIDEO_READY
    ) {
      this.video.playbackRate = Math.max(0.1, Math.min(3.0, rate));
    }
  }

  jumpTo({ percent = 50 } = {}) {
    if (!this.video || !this._isVideoLoaded()) return;
    const targetPercent = percent / 100;
    if (targetPercent >= 0 && targetPercent <= 1) {
      this.video.currentTime = this.video.duration * targetPercent;
    }
  }

  updateCanvas = (now, metadata) => {
    this._updateCanvas(
      this.video,
      this.video.videoWidth,
      this.video.videoHeight,
    );
    // const doc = document;
    // this._updateCanvas(
    //   document.body,
    //   document.body.width,
    //   document.body.height,
    // );
  };

  _updateCanvas(vid, w, h) {
    if (!vid) return;

    const canvas = this.canvases.shift();

    canvas.width = w;
    canvas.height = h;
    canvas.style.display = "block";

    const ctx = canvas.getContext("2d");
    ctx.drawImage(vid, 0, 0, w, h);

    this.canvases.push(canvas);

    for (let index = 0; index < this.canvases.length; index++) {
      const canvas = this.canvases[index];
      canvas.style.zIndex = String(index + 1);
    }

    vid.requestVideoFrameCallback(this.updateCanvas);
  }

  _isVideoLoaded() {
    return (
      this.video && this.video.readyState >= VideoPlayerAdvanced.MIN_VIDEO_READY
    );
  }

  canvasOpacity({ opacity = 1.0 } = {}) {
    for (let index = 0; index < this.canvases.length; index++) {
      const canvas = this.canvases[index];
      canvas.style.opacity = String(opacity);
    }
  }

  canvasBlur({ blur = 0.0 } = {}) {
    for (let index = 0; index < this.canvases.length; index++) {
      const canvas = this.canvases[index];
      canvas.style.filter = `blur(${blur * (index + 1)}px)`;
    }
  }

  canvasBlendMode(blend) {
    for (let index = 0; index < this.canvases.length; index++) {
      const canvas = this.canvases[index];
      canvas.style.mixBlendMode = blend.blendMode;
    }
  }

  static get MIN_VIDEO_READY() {
    return 4; // can play, seek, etc.
  }
}

export default VideoPlayerAdvanced;
