// src/components/NetworkGlobe3D.jsx
// Animated 3D particle globe representing live network traffic
// Built with React Three Fiber + Three.js

import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Sphere, Trail } from '@react-three/drei'
import * as THREE from 'three'

// ── Particle System (Connection Nodes) ──────────────────────────
function NetworkParticles({ count = 200 }) {
  const mesh = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])

  // Generate spherically distributed particle positions
  const { positions, speeds, phases } = useMemo(() => {
    const positions = []
    const speeds = []
    const phases = []
    for (let i = 0; i < count; i++) {
      const phi   = Math.acos(-1 + (2 * i) / count)
      const theta = Math.sqrt(count * Math.PI) * phi
      const r = 1.8 + Math.random() * 0.4
      positions.push([
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      ])
      speeds.push(0.3 + Math.random() * 0.7)
      phases.push(Math.random() * Math.PI * 2)
    }
    return { positions, speeds, phases }
  }, [count])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    for (let i = 0; i < count; i++) {
      const [x, y, z] = positions[i]
      const pulse = Math.sin(t * speeds[i] + phases[i]) * 0.06
      dummy.position.set(x * (1 + pulse), y * (1 + pulse), z * (1 + pulse))
      dummy.scale.setScalar(0.012 + Math.abs(pulse) * 0.02)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
    }
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[null, null, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshStandardMaterial
        color="#00f5ff"
        emissive="#00f5ff"
        emissiveIntensity={2}
        toneMapped={false}
      />
    </instancedMesh>
  )
}

// ── Orbiting Attack Nodes ────────────────────────────────────────
function OrbitingNode({ radius, speed, color, size = 0.06, yOffset = 0 }) {
  const ref = useRef()
  const trailRef = useRef()

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed
    ref.current.position.set(
      Math.cos(t) * radius,
      yOffset + Math.sin(t * 0.5) * 0.3,
      Math.sin(t) * radius
    )
  })

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[size, 12, 12]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={3}
        toneMapped={false}
      />
      <pointLight color={color} intensity={0.8} distance={1.5} />
    </mesh>
  )
}

// ── Globe Wireframe Shell ────────────────────────────────────────
function GlobeShell() {
  const ref = useRef()

  useFrame(({ clock }) => {
    ref.current.rotation.y = clock.getElapsedTime() * 0.08
    ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.05) * 0.1
  })

  return (
    <group ref={ref}>
      {/* Outer wireframe */}
      <mesh>
        <sphereGeometry args={[1.85, 24, 24]} />
        <meshBasicMaterial
          color="#00f5ff"
          wireframe
          opacity={0.04}
          transparent
        />
      </mesh>
      {/* Inner core glow */}
      <mesh>
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshStandardMaterial
          color="#00f5ff"
          emissive="#00f5ff"
          emissiveIntensity={0.5}
          opacity={0.15}
          transparent
        />
      </mesh>
      {/* Mid ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.5, 0.008, 8, 80]} />
        <meshStandardMaterial
          color="#00ff88"
          emissive="#00ff88"
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>
      {/* Equator ring */}
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <torusGeometry args={[1.5, 0.005, 8, 80]} />
        <meshStandardMaterial
          color="#9b4dff"
          emissive="#9b4dff"
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

// ── Floating Data Packets ────────────────────────────────────────
function DataPackets({ count = 15 }) {
  const refs = useRef([])

  const packets = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      startAngle: (i / count) * Math.PI * 2,
      radius: 0.5 + Math.random() * 1.5,
      speed: (0.4 + Math.random() * 0.8) * (Math.random() > 0.5 ? 1 : -1),
      ySpeed: 0.2 + Math.random() * 0.4,
      color: ['#00f5ff', '#00ff88', '#ff6b35', '#9b4dff'][Math.floor(Math.random() * 4)]
    })),
  [count])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    refs.current.forEach((ref, i) => {
      if (!ref) return
      const p = packets[i]
      const angle = p.startAngle + t * p.speed
      ref.position.set(
        Math.cos(angle) * p.radius,
        Math.sin(t * p.ySpeed + p.startAngle) * 0.8,
        Math.sin(angle) * p.radius
      )
      ref.rotation.x = t * 2
      ref.rotation.y = t * 1.5
    })
  })

  return packets.map((p, i) => (
    <mesh
      key={i}
      ref={el => refs.current[i] = el}
    >
      <boxGeometry args={[0.04, 0.04, 0.04]} />
      <meshStandardMaterial
        color={p.color}
        emissive={p.color}
        emissiveIntensity={3}
        toneMapped={false}
      />
    </mesh>
  ))
}

// ── Main Scene ───────────────────────────────────────────────────
function Scene({ anomalyCount = 0 }) {
  return (
    <>
      {/* Ambient + Directional lighting */}
      <ambientLight intensity={0.1} />
      <directionalLight position={[5, 5, 5]} intensity={0.3} color="#00f5ff" />
      <pointLight position={[0, 0, 0]} intensity={0.5} color="#00f5ff" distance={5} />

      {/* Core Globe */}
      <GlobeShell />
      <NetworkParticles count={220} />
      <DataPackets count={12} />

      {/* Threat/anomaly orbiting nodes */}
      <OrbitingNode radius={2.4} speed={0.6}  color="#ff3366"  size={0.05} yOffset={0.2}  />
      <OrbitingNode radius={2.1} speed={-0.4} color="#ff6b35"  size={0.04} yOffset={-0.3} />
      <OrbitingNode radius={2.6} speed={0.3}  color="#ffd700"  size={0.03} yOffset={0.5}  />
      {anomalyCount > 1 && (
        <OrbitingNode radius={2.0} speed={1.2} color="#ff3366" size={0.07} yOffset={0} />
      )}

      {/* Camera controls */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.4}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={(Math.PI * 3) / 4}
      />
    </>
  )
}

// ── Exported Component ───────────────────────────────────────────
export default function NetworkGlobe3D({ anomalyCount = 0 }) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 55 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance'
        }}
        style={{ background: 'transparent' }}
      >
        <Scene anomalyCount={anomalyCount} />
      </Canvas>

      {/* Overlay label */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '10px',
        color: 'rgba(0,245,255,0.5)',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        pointerEvents: 'none'
      }}>
        Live Network Traffic Globe
      </div>
    </div>
  )
}