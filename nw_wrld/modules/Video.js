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
    this.ctx = null;
    this.originalMedia = null;
    this.init();
  }

  init() {
    // Video
    this.video = document.createElement("video");
    this.video.style.cssText =
      "width:100%;height:100%;object-fit:cover;display:block;background:#000;";
    // Canvas (small, transparent, behind video)
    this.canvas = document.createElement("canvas");
    this.canvas.style.cssText =
      "width:100%;height:100%;object-fit:cover;display:block;background:#000;";
    this.canvas.style.position = "absolute";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.zIndex = "1"; // above video
    this.canvas.style.pointerEvents = "none"; // doesn't interfere with clicks
    this.canvas.style.border = "transparent";

    // Initially small; will resize with video
    this.canvas.width = 50;
    this.canvas.height = 50;

    if (this.elem) {
      // Insert canvas before video to keep video visible
      this.elem.appendChild(this.video);
      this.elem.appendChild(this.canvas);
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

    // Apply default blur (CSS)
    this.canvas.style.filter = "blur(0px)";
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
    const vid = this.video;
    this._updateCanvas(vid);
  };

  _updateCanvas(vid) {
    if (!vid || !this.canvas) return;

    this.canvas.width = vid.videoWidth;
    this.canvas.height = vid.videoHeight;

    this.ctx = this.canvas.getContext("2d");

    this.ctx.drawImage(vid, 0, 0, vid.videoWidth, vid.videoHeight);

    vid.requestVideoFrameCallback(this.updateCanvas);
  }

  _isVideoLoaded() {
    return (
      this.video && this.video.readyState >= VideoPlayerAdvanced.MIN_VIDEO_READY
    );
  }

  canvasOpacity({ opacity = 1.0 } = {}) {
    this.canvas.style.opacity = String(opacity);
  }

  canvasBlur({ blur = 0.0 } = {}) {
    this.canvas.style.filter = `blur(${blur}px)`;
  }

  canvasBlendMode(blend) {
    this.canvas.style.mixBlendMode = blend.blendMode;
  }

  static get MIN_VIDEO_READY() {
    return 4; // can play, seek, etc.
  }
}

export default VideoPlayerAdvanced;
