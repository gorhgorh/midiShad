import * as THREE from 'three'
import * as d3 from 'd3'
import p5 from 'p5'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js'
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { Noise } from 'noisejs'
import * as motion from 'motion'
import { ModuleBase } from './ModuleBase'
import { BaseThreeJsModule } from './BaseThreeJsModule'

// Set globals directly on globalThis so nw_wrld module .js files
// can reference them by bare name (e.g. `class Foo extends ModuleBase`)
// Browser global scope = window, accessible from ES modules.
Object.assign(globalThis, {
  ModuleBase,
  BaseThreeJsModule,
  THREE,
  p5,
  d3,
  Noise,
  motion,
  // Asset helpers — resolve paths relative to public/ (served at / by Vite).
  // Full URLs (http/data) are passed through as-is.
  assetUrl: (path: string) => {
    if (!path) return null
    if (/^(https?:|data:|blob:)/.test(path)) return path
    // Strip leading "assets/" prefix used by nw_wrld platform
    const clean = path.replace(/^assets\//, '')
    return `/${clean}`
  },
  readText: async (path: string) => {
    try {
      const url = /^https?:/.test(path) ? path : `/${path.replace(/^assets\//, '')}`
      const res = await fetch(url)
      return res.ok ? res.text() : null
    } catch { return null }
  },
  loadJson: async (path: string) => {
    try {
      const url = /^https?:/.test(path) ? path : `/${path.replace(/^assets\//, '')}`
      const res = await fetch(url)
      return res.ok ? res.json() : null
    } catch { return null }
  },
  // THREE loaders from examples/jsm
  OBJLoader,
  PLYLoader,
  PCDLoader,
  GLTFLoader,
  STLLoader,
})

export { ModuleBase, BaseThreeJsModule }
