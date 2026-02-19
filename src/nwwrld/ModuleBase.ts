/**
 * Minimal ModuleBase shim matching the nw_wrld module contract.
 * Modules extend this class and get a DOM container element.
 */
export class ModuleBase {
  static methods: unknown[] = []
  elem: HTMLElement | null
  externalElements: HTMLElement[]
  destroyed: boolean

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

  show() {
    if (this.elem) this.elem.style.visibility = 'visible'
  }

  hide() {
    if (this.elem) this.elem.style.visibility = 'hidden'
  }

  offset({ x = 0, y = 0 } = {}) {
    if (this.elem) {
      this.elem.style.transform = `translate(${x}px, ${y}px)`
    }
  }

  scale({ scale = 1 } = {}) {
    if (this.elem) {
      this.elem.style.transform = `scale(${scale})`
    }
  }

  opacity({ opacity = 1 } = {}) {
    if (this.elem) {
      this.elem.style.opacity = String(opacity)
    }
  }

  rotate({ degrees = 0 } = {}) {
    if (this.elem) {
      this.elem.style.transform = `rotate(${degrees}deg)`
    }
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
