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
          assetExtensions: [
            ".mp4",
            ".webm",
            ".mkv",
            ".mov",
            ".avi",
            ".flv",
            ".wmv",
          ],
          allowCustom: true,
        },
        {
          name: "autoplay",
          defaultVal: false,
          type: "boolean",
        },
        {
          name: "loop",
          defaultVal: false,
          type: "boolean",
        },
        {
          name: "muted",
          defaultVal: true,
          type: "boolean",
        },
      ],
    },
    {
      name: "speed",
      options: [
        {
          name: "rate",
          label: "Speed (x)",
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
          label: "% to jump",
          type: "number",
          min: 0,
          max: 100,
          step: 1,
          value: 50,
        },
      ],
    },
  ];

  constructor(container) {
    super(container);
    this.name = VideoPlayerAdvanced.name;
    this.video = null;
    // Optional: store reference to original media element if you want to reset
    this.originalMedia = null;
    this.init();
  }

  init() {
    this.video = document.createElement("video");
    this.video.style.cssText =
      "width:100%;height:100%;object-fit:cover;display:block;background:#000;";
    if (this.elem) {
      this.elem.appendChild(this.video);
      this.video.focus();
    }
  }

  video({
    path = "videos/blueprint.mp4",
    autoplay = false,
    loop = false,
    muted = true,
  } = {}) {
    let url;
    if (typeof assetUrl === "function") {
      url = assetUrl(path);
    }

    if (!url) {
      url = path; // fallback
    }

    if (this.video && url) {
      try {
        this.originalMedia = this._createMedia(url); // might be needed for some browsers
        this.video.srcObject = this.originalMedia;
      } catch (e) {
        this.video.src = url;
      }

      this.video.autoplay = autoplay;
      this.video.loop = loop;
      this.video.muted = muted;

      // Optionally set initial playback position if desired
      // this.video.currentTime = 0;

      // Handle loaded metadata to start playing if needed
      if (autoplay && !loop) {
        this.video.play().catch((e) => {});
      }

      // Attach event to update speed control UI if you want them visible
      this.video.onloadedmetadata = () => {
        // this._updateMaxPercent(Math.floor(100 * this.video.duration));
      };
    } else {
      this.show(); // keep placeholder if no video is loaded
    }
  }

  // Helper to create MediaSource-based media (HLS, WEBM, etc.)
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
      // Apply playback rate
      this.video.playbackRate = Math.max(0.1, Math.min(3.0, rate));
      // Optionally update a UI slider showing the rate
      // e.g., display a small element with "Speed: x" or show the slider value
    }
  }

  jumpTo({ percent = 50 } = {}) {
    if (!this.video || this._isVideoLoaded() === false) {
      return; // nothing to jump to
    }

    const video = this.video;
    const targetPercent = percent / 100; // convert to fraction
    // Seek to the percentage position smoothly or abruptly
    if (targetPercent >= 0 && targetPercent <= 1) {
      video.currentTime = video.duration * targetPercent;
    }
  }

  _isVideoLoaded() {
    return (
      this.video && this.video.readyState >= VideoPlayerAdvanced.MIN_VIDEO_READY
    );
  }

  // Minimum readiness value for basic playback controls
  static get MIN_VIDEO_READY() {
    return 4; // readyState >= 4 means can seek and play
  }
}

export default VideoPlayerAdvanced;
