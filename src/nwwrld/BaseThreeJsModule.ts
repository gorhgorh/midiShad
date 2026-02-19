import * as THREE from 'three'
import { ModuleBase } from './ModuleBase'

/**
 * Base class for Three.js modules. Extends ModuleBase with a
 * THREE scene, camera, renderer, and rAF loop.
 */
export class BaseThreeJsModule extends ModuleBase {
  static override methods: unknown[] = []
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  cameraSettings: { cameraSpeed: number }
  private _animId: number | null = null
  private _customAnimate: (() => void) | null = null
  private _boundResize: () => void

  constructor(container: HTMLElement) {
    super(container)

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / (container.clientHeight || 1),
      0.1,
      1000,
    )
    this.camera.position.z = 5
    this.cameraSettings = { cameraSpeed: 1 }

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(container.clientWidth, container.clientHeight)

    if (this.elem) {
      this.elem.appendChild(this.renderer.domElement)
    }

    this._boundResize = this._resize.bind(this)
    window.addEventListener('resize', this._boundResize)

    this._loop()
    this.show()
  }

  setModel(obj: THREE.Object3D) {
    this.scene.add(obj)
  }

  setCustomAnimate(fn: () => void) {
    this._customAnimate = fn
  }

  /** Manual render call (used by some modules outside the loop) */
  render() {
    this.renderer.render(this.scene, this.camera)
  }

  /** Override in subclass for custom animation */
  animate() {
    // subclass override
  }

  private _resize() {
    if (!this.elem) return
    const w = this.elem.clientWidth
    const h = this.elem.clientHeight
    if (w <= 0 || h <= 0) return
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  private _loop() {
    if (!this.elem) return
    this._animId = requestAnimationFrame(() => this._loop())
    if (this._customAnimate) this._customAnimate()
    this.animate()
    this.renderer.render(this.scene, this.camera)
  }

  destroy() {
    if (this._animId != null) {
      cancelAnimationFrame(this._animId)
      this._animId = null
    }
    window.removeEventListener('resize', this._boundResize)
    this.renderer.dispose()
    super.destroy()
  }
}
