import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useVideoStore } from '../store/videoStore'

// "object-fit: cover" in a shader — compares video vs screen aspect ratio
const coverVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`
const coverFrag = /* glsl */ `
uniform sampler2D map;
uniform vec2 screenRes;
uniform vec2 videoRes;
varying vec2 vUv;
void main() {
  float screenAspect = screenRes.x / screenRes.y;
  float videoAspect  = videoRes.x  / videoRes.y;
  vec2 uv = vUv;
  if (videoAspect > screenAspect) {
    // video wider — crop sides
    float scale = screenAspect / videoAspect;
    uv.x = uv.x * scale + (1.0 - scale) * 0.5;
  } else {
    // video taller — crop top/bottom
    float scale = videoAspect / screenAspect;
    uv.y = uv.y * scale + (1.0 - scale) * 0.5;
  }
  gl_FragColor = texture2D(map, uv);
}
`

export function VideoPlane() {
  const sourceType = useVideoStore((s) => s.sourceType)
  const url = useVideoStore((s) => s.url)
  const fileUrl = useVideoStore((s) => s.fileUrl)

  const { size, viewport } = useThree()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const [texture, setTexture] = useState<THREE.VideoTexture | null>(null)

  useEffect(() => {
    if (sourceType === 'none') {
      cleanup()
      setTexture(null)
      return
    }

    const video = document.createElement('video')
    video.playsInline = true
    video.muted = true
    video.loop = true
    video.crossOrigin = 'anonymous'
    videoRef.current = video

    if (sourceType === 'webcam') {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          streamRef.current = stream
          video.srcObject = stream
          video.play()
          setTexture(new THREE.VideoTexture(video))
        })
        .catch((err) => console.warn('Webcam access failed:', err))
    } else if (sourceType === 'url' && url) {
      video.src = url
      video.play().catch(() => {})
      setTexture(new THREE.VideoTexture(video))
    } else if (sourceType === 'file' && fileUrl) {
      video.src = fileUrl
      video.play().catch(() => {})
      setTexture(new THREE.VideoTexture(video))
    } else {
      setTexture(null)
    }

    return cleanup
  }, [sourceType, url, fileUrl])

  // Update screen resolution + video resolution each frame
  useFrame(() => {
    const mat = matRef.current
    const video = videoRef.current
    if (!mat || !video) return
    mat.uniforms.screenRes.value.set(size.width * viewport.dpr, size.height * viewport.dpr)
    mat.uniforms.videoRes.value.set(video.videoWidth || 1, video.videoHeight || 1)
  })

  function cleanup() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.srcObject = null
      videoRef.current.removeAttribute('src')
      videoRef.current = null
    }
    if (texture) {
      texture.dispose()
    }
  }

  if (!texture) return null

  return (
    <mesh renderOrder={-1}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={coverVert}
        fragmentShader={coverFrag}
        uniforms={{
          map: { value: texture },
          screenRes: { value: new THREE.Vector2(size.width * viewport.dpr, size.height * viewport.dpr) },
          videoRes: { value: new THREE.Vector2(1, 1) },
        }}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  )
}
