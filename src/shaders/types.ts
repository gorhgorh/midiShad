export interface ParamDescriptor {
  name: string
  label: string
  min: number
  max: number
  default: number
}

export interface ShaderDefinition {
  id: string
  name: string
  vertexShader: string
  fragmentShader: string
  params: ParamDescriptor[]
}
