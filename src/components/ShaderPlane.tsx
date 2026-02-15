import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useShaderStore } from '../store/shaderStore'

export function ShaderPlane() {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const { size } = useThree()
  const shader = useShaderStore((s) => s.activeShader)

  const uniforms = useMemo(() => {
    const u: Record<string, THREE.IUniform> = {
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector2(size.width, size.height) },
    }
    for (const p of shader.params) {
      u[p.name] = { value: p.default }
    }
    return u
  }, [shader])

  // When shader changes, update the material
  useEffect(() => {
    const mat = materialRef.current
    if (!mat) return
    mat.vertexShader = shader.vertexShader
    mat.fragmentShader = shader.fragmentShader
    mat.needsUpdate = true
  }, [shader])

  useFrame(({ clock }) => {
    const mat = materialRef.current
    if (!mat) return
    mat.uniforms.u_time.value = clock.getElapsedTime()
    mat.uniforms.u_resolution.value.set(size.width, size.height)

    // Read param values directly from store (no React re-render)
    const { paramValues } = useShaderStore.getState()
    for (const key of Object.keys(paramValues)) {
      if (mat.uniforms[key]) {
        mat.uniforms[key].value = paramValues[key]
      }
    }
  })

  return (
    <mesh key={shader.id}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={shader.vertexShader}
        fragmentShader={shader.fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  )
}
