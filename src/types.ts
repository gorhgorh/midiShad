export interface ParamDescriptor {
  name: string
  label: string
  min: number
  max: number
  default: number
  /** Method name on the module instance to call when this param changes */
  methodName: string
  group?: 'module' | 'base'
}

export interface OptionDescriptor {
  name: string
  label: string
  type: string // 'text' | 'color' | 'boolean' | 'select' | 'assetFile' | etc.
  defaultVal: unknown
  values?: string[]
  min?: number
  max?: number
  /** Method name on the module instance to call when this option changes */
  methodName: string
  group?: 'module' | 'base'
}

export interface ActionDescriptor {
  name: string
  label: string
  /** Method name on the module instance to call */
  methodName: string
  group?: 'module' | 'base'
}

export interface ModuleDefinition {
  id: string
  name: string
  category: string
  moduleClass: new (container: HTMLElement) => ModuleInstance
  params: ParamDescriptor[]
  options: OptionDescriptor[]
  actions: ActionDescriptor[]
  /** Methods with executeOnLoad: true */
  executeOnLoadMethods: { name: string; defaults: Record<string, unknown> }[]
}

export interface ModuleInstance {
  elem: HTMLElement | null
  show(): void
  hide(): void
  destroy(): void
  [key: string]: unknown
}
