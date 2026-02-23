import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { ModuleBase } from './ModuleBase'

/**
 * Base class for Three.js modules. Extends ModuleBase with a
 * THREE scene, camera, renderer, OrbitControls, and rAF loop.
 */
export class BaseThreeJsModule extends ModuleBase {
  static override methods: unknown[] = [
    {
      name: 'cameraPosition',
      executeOnLoad: false,
      options: [
        { name: 'camX', defaultVal: 0, type: 'number', min: -20, max: 20 },
        { name: 'camY', defaultVal: 0, type: 'number', min: -20, max: 20 },
        { name: 'camZ', defaultVal: 5, type: 'number', min: 0.5, max: 40 },
      ],
    },
    {
      name: 'cameraZoom',
      executeOnLoad: false,
      options: [
        { name: 'zoom', defaultVal: 50, type: 'number', min: 0, max: 100 },
      ],
    },
    {
      name: 'mouseControl',
      executeOnLoad: true,
      options: [
        { name: 'mouseOrbit', defaultVal: true, type: 'boolean' },
      ],
    },
  ]

  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls: OrbitControls
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

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.enablePan = true
    this.controls.enableRotate = true
    this.controls.enableZoom = true

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

  /** Set camera position directly */
  cameraPosition({ camX, camY, camZ }: { camX?: number; camY?: number; camZ?: number } = {}) {
    if (camX !== undefined) this.camera.position.x = camX
    if (camY !== undefined) this.camera.position.y = camY
    if (camZ !== undefined) this.camera.position.z = camZ
    this.camera.lookAt(this.controls.target)
  }

  /** Enable or disable mouse-based camera control */
  mouseControl({ mouseOrbit }: { mouseOrbit?: boolean } = {}) {
    if (mouseOrbit !== undefined) {
      this.controls.enabled = mouseOrbit
    }
  }

  /** Set zoom as 0-100% (distance from target) */
  cameraZoom({ zoom = 50 }: { zoom?: number } = {}) {
    const dir = new THREE.Vector3()
    dir.subVectors(this.camera.position, this.controls.target).normalize()
    const minDist = 0.5
    const maxDist = 40
    const dist = THREE.MathUtils.lerp(minDist, maxDist, zoom / 100)
    this.camera.position.copy(this.controls.target).addScaledVector(dir, dist)
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
    this.controls.update()
    if (this._customAnimate) this._customAnimate()
    this.animate()
    this.renderer.render(this.scene, this.camera)
  }

  destroy() {
    if (this._animId != null) {
      cancelAnimationFrame(this._animId)
      this._animId = null
    }
    this.controls.dispose()
    window.removeEventListener('resize', this._boundResize)
    this.renderer.dispose()
    super.destroy()
  }
}
