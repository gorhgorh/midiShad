export interface ParamDescriptor {
  name: string
  label: string
  min: number
  max: number
  default: number
  invert?: boolean
}

export interface ShaderDefinition {
  id: string
  name: string
  note?: string
  credit?: string
  vertexShader: string
  fragmentShader: string
  params: ParamDescriptor[]
}
