// src/components/LoadingScreen.jsx
// Full-screen animated loading screen with 3D particle orb
// and boot sequence text animation.

import { useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useRef } from 'react'

function BootOrb() {
  const ref = useRef()
  const ring1 = useRef()
  const ring2 = useRef()

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (ref.current) ref.current.rotation.y = t * 0.8
    if (ring1.current) ring1.current.rotation.z = t * 1.2
    if (ring2.current) ring2.current.rotation.x = t * 0.7
  })

  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[3, 3, 3]} intensity={0.5} color="#00f5ff" />

      <group ref={ref}>
        {/* Core sphere */}
        <mesh>
          <sphereGeometry args={[0.6, 32, 32]} />
          <meshStandardMaterial
            color="#00f5ff"
            emissive="#00f5ff"
            emissiveIntensity={0.4}
            wireframe
          />
        </mesh>

        {/* Orbit ring 1 */}
        <mesh ref={ring1}>
          <torusGeometry args={[1.0, 0.012, 8, 80]} />
          <meshStandardMaterial color="#00f5ff" emissive="#00f5ff" emissiveIntensity={3} toneMapped={false} />
        </mesh>

        {/* Orbit ring 2 */}
        <mesh ref={ring2} rotation={[Math.PI / 3, 0, 0]}>
          <torusGeometry args={[1.2, 0.008, 8, 80]} />
          <meshStandardMaterial color="#9b4dff" emissive="#9b4dff" emissiveIntensity={3} toneMapped={false} />
        </mesh>

        {/* Orbit ring 3 */}
        <mesh rotation={[-Math.PI / 4, Math.PI / 5, 0]}>
          <torusGeometry args={[0.8, 0.006, 8, 80]} />
          <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={3} toneMapped={false} />
        </mesh>
      </group>
    </>
  )
}

const BOOT_LINES = [
  'Initializing Log Analytics Engine v1.0...',
  'Loading SQLite database driver...',
  'Connecting to data/log_analytics.db...',
  'Running analytics queries...',
  'Loading anomaly detection models...',
  'Rendering dashboard...',
  '✓ System ready',
]

export default function LoadingScreen() {
  const [lines, setLines] = useState([])
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      if (i < BOOT_LINES.length) {
        setLines(prev => [...prev, BOOT_LINES[i]])
        setProgress(Math.round(((i + 1) / BOOT_LINES.length) * 100))
        i++
      } else {
        clearInterval(interval)
        setTimeout(() => setDone(true), 400)
      }
    }, 220)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#020408',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      opacity: done ? 0 : 1,
      transition: 'opacity 0.6s ease',
      pointerEvents: done ? 'none' : 'auto',
    }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0,245,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,245,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      {/* 3D Orb */}
      <div style={{ width: 220, height: 220, marginBottom: '32px' }}>
        <Canvas camera={{ position: [0, 0, 3], fov: 50 }} gl={{ antialias: true, alpha: true }}>
          <BootOrb />
        </Canvas>
      </div>

      {/* Title */}
      <div style={{
        fontFamily: 'Syne, sans-serif',
        fontSize: '28px',
        fontWeight: '800',
        background: 'linear-gradient(135deg, #e8f4f8, #00f5ff)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        marginBottom: '32px',
        textAlign: 'center',
      }}>
        Log Analytics Engine
      </div>

      {/* Boot terminal */}
      <div style={{
        width: '480px',
        background: 'rgba(6,13,20,0.9)',
        border: '1px solid rgba(0,245,255,0.12)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        minHeight: '180px',
      }}>
        {lines.map((line, i) => (
          <div key={i} style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '11px',
            color: line.startsWith('✓') ? '#00ff88' : 'rgba(0,245,255,0.7)',
            padding: '2px 0',
            animation: 'fadeIn 0.3s ease',
          }}>
            <span style={{ color: 'rgba(126,179,200,0.3)', marginRight: '8px' }}>$</span>
            {line}
            {i === lines.length - 1 && !line.startsWith('✓') && (
              <span style={{ animation: 'blink 1s step-end infinite', marginLeft: '2px' }}>█</span>
            )}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ width: '480px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(126,179,200,0.4)', letterSpacing: '0.08em' }}>
            LOADING SYSTEM
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#00f5ff' }}>
            {progress}%
          </span>
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #00f5ff, #9b4dff)',
            borderRadius: 2,
            transition: 'width 0.2s ease',
            boxShadow: '0 0 12px rgba(0,245,255,0.6)',
          }} />
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </div>
  )
}