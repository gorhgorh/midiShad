/**
 * Minimal ModuleBase shim matching the nw_wrld module contract.
 * Modules extend this class and get a DOM container element.
 */
export class ModuleBase {
  static methods: unknown[] = []
  elem: HTMLElement | null
  externalElements: HTMLElement[]
  destroyed: boolean

  // Transform state — tracked separately so they compose correctly
  _tx = 0
  _ty = 0
  _scale = 1
  _rot = 0

  constructor(container: HTMLElement) {
    this.elem = document.createElement('div')
    const w = window.innerWidth
    const h = window.innerHeight
    this.elem.style.cssText =
      `position:absolute;top:0;left:0;width:${w}px;height:${h}px;overflow:hidden;`
    container.appendChild(this.elem)
    this.externalElements = []
    this.destroyed = false
    this.show()
    console.log('[ModuleBase] elem dimensions:', this.elem.clientWidth, 'x', this.elem.clientHeight)
  }

  _applyTransform() {
    if (!this.elem) return
    const parts: string[] = []
    if (this._tx !== 0 || this._ty !== 0) parts.push(`translate(${this._tx}px, ${this._ty}px)`)
    if (this._scale !== 1) parts.push(`scale(${this._scale})`)
    if (this._rot !== 0) parts.push(`rotate(${this._rot}deg)`)
    this.elem.style.transform = parts.join(' ')
  }

  show() {
    if (this.elem) this.elem.style.visibility = 'visible'
  }

  hide() {
    if (this.elem) this.elem.style.visibility = 'hidden'
  }

  offset({ x = 0, y = 0 } = {}) {
    this._tx = x
    this._ty = y
    this._applyTransform()
  }

  scale({ scale = 1 } = {}) {
    this._scale = scale
    this._applyTransform()
  }

  opacity({ opacity = 1 } = {}) {
    if (this.elem) {
      this.elem.style.opacity = String(opacity)
    }
  }

  rotate({ degrees = 0 } = {}) {
    this._rot = degrees
    this._applyTransform()
  }

  destroy() {
    this.destroyed = true

    // Clean up external elements
    for (const el of this.externalElements) {
      if (el.parentNode) el.parentNode.removeChild(el)
    }
    this.externalElements = []

    // Remove own element
    if (this.elem && this.elem.parentNode) {
      this.elem.parentNode.removeChild(this.elem)
    }
    this.elem = null
  }
}
