import { Canvas } from '@react-three/fiber'
import { ShaderPlane } from './ShaderPlane'
import { VideoPlane } from './VideoPlane'

export function ShaderCanvas() {
  return (
    <Canvas
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0 }}
      camera={{ position: [0, 0, 1] }}
      gl={{ antialias: false }}
    >
      <VideoPlane />
      <ShaderPlane />
    </Canvas>
  )
}
