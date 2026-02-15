import { Canvas } from '@react-three/fiber'
import { ShaderPlane } from './ShaderPlane'

export function ShaderCanvas() {
  return (
    <Canvas
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0 }}
      camera={{ position: [0, 0, 1] }}
      gl={{ antialias: false }}
    >
      <ShaderPlane />
    </Canvas>
  )
}
