// src/pages/Anomalies.jsx
// Dedicated anomaly investigation page with 3D threat visualization,
// full anomaly details, and timeline.

import { Suspense, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import AnomalyPanel from '../components/AnomalyPanel'

// ── 3D Threat Radar ────────────────────────────────────────────
function RadarRing({ radius, speed, opacity }) {
  const ref = useRef()
  const useRef = (val) => { const r = { current: val }; return r }
  return null // simplified - full impl below
}

import { useRef, useMemo } from 'react'

function ThreatOrb({ color, position, size = 0.15, pulseSpeed = 1 }) {
  const ref = useRef()
  const glowRef = useRef()

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const scale = 1 + Math.sin(t * pulseSpeed * 2) * 0.15
    if (ref.current) ref.current.scale.setScalar(scale)
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(t * pulseSpeed * 2 + 0.5) * 0.4)
      glowRef.current.material.opacity = 0.15 + Math.sin(t * pulseSpeed) * 0.1
    }
  })

  return (
    <group position={position}>
      <mesh ref={ref}>
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[size * 2.5, 16, 16]} />
        <meshStandardMaterial color={color} transparent opacity={0.1} toneMapped={false} />
      </mesh>
      <pointLight color={color} intensity={1.5} distance={2} />
    </group>
  )
}

function RadarPlane() {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = clock.getElapsedTime() * 0.5
  })

  return (
    <group ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
      {[1, 1.5, 2, 2.5].map((r, i) => (
        <mesh key={i}>
          <ringGeometry args={[r - 0.015, r, 64]} />
          <meshBasicMaterial color="#00f5ff" opacity={0.1 - i * 0.015} transparent />
        </mesh>
      ))}
      {/* Sweep line */}
      <mesh>
        <planeGeometry args={[0.02, 2.5]} />
        <meshBasicMaterial
          color="#00f5ff"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Sweep gradient */}
      <mesh rotation={[0, 0, -Math.PI / 4]}>
        <circleGeometry args={[2.5, 32, 0, Math.PI / 3]} />
        <meshBasicMaterial color="#00f5ff" transparent opacity={0.04} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function ThreatScene({ anomalies }) {
  const threatPositions = [
    [1.8, 0.4, 0.8],
    [-1.5, 0.2, 1.2],
    [0.8, 0.5, -1.9],
    [-0.5, 0.3, -1.4],
    [2.1, 0.1, -0.6],
  ]

  const severityColors = {
    CRITICAL: '#ff3366',
    HIGH:     '#ff6b35',
    MEDIUM:   '#ffd700',
    LOW:      '#00ff88',
  }

  return (
    <>
      <ambientLight intensity={0.05} />
      <RadarPlane />
      {anomalies.slice(0, 5).map((a, i) => (
        <ThreatOrb
          key={a.id}
          color={severityColors[a.severity] || '#7fb3c8'}
          position={threatPositions[i] || [0, 0, 0]}
          size={a.severity === 'CRITICAL' ? 0.18 : 0.12}
          pulseSpeed={a.severity === 'CRITICAL' ? 2 : 1}
        />
      ))}
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.8} />
    </>
  )
}

// ── Severity Summary Card ──────────────────────────────────────
function SeveritySummary({ anomalies }) {
  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
  anomalies.forEach(a => counts[a.severity] = (counts[a.severity] || 0) + 1)

  const cfg = {
    CRITICAL: { color: '#ff3366', bg: 'rgba(255,51,102,0.1)' },
    HIGH:     { color: '#ff6b35', bg: 'rgba(255,107,53,0.1)' },
    MEDIUM:   { color: '#ffd700', bg: 'rgba(255,215,0,0.08)' },
    LOW:      { color: '#00ff88', bg: 'rgba(0,255,136,0.06)' },
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
      {Object.entries(counts).map(([sev, cnt]) => (
        <div key={sev} style={{
          background: cfg[sev].bg,
          border: `1px solid ${cfg[sev].color}30`,
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
        }}>
          <div style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: '2.5rem',
            fontWeight: '800',
            color: cfg[sev].color,
            textShadow: `0 0 20px ${cfg[sev].color}66`,
            lineHeight: 1,
          }}>
            {cnt}
          </div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '9px',
            color: cfg[sev].color,
            letterSpacing: '0.1em',
            marginTop: '6px',
          }}>
            {sev}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────
export default function AnomaliesPage({ data }) {
  const { anomalies } = data

  return (
    <div style={{ padding: '28px', overflowY: 'auto', height: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '10px',
          color: 'rgba(255,51,102,0.6)',
          letterSpacing: '0.2em',
          marginBottom: '6px',
        }}>
          ⚡ Threat Detection
        </div>
        <h1 style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: 'clamp(22px, 3vw, 32px)',
          fontWeight: '800',
          color: '#e8f4f8',
        }}>
          Anomaly Center
        </h1>
      </div>

      {/* Severity summary */}
      <div style={{ marginBottom: '24px' }}>
        <SeveritySummary anomalies={anomalies} />
      </div>

      {/* 3D Radar + Anomaly List */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '20px' }}>

        {/* 3D Threat Radar */}
        <div style={{
          background: 'rgba(6,13,20,0.8)',
          border: '1px solid rgba(0,245,255,0.08)',
          borderRadius: '20px',
          overflow: 'hidden',
          height: '420px',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            top: '16px', left: '16px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '10px',
            color: 'rgba(0,245,255,0.5)',
            letterSpacing: '0.1em',
            zIndex: 10,
          }}>
            ◈ THREAT RADAR
          </div>
          <Canvas
            camera={{ position: [0, 3.5, 3.5], fov: 50 }}
            gl={{ antialias: true, alpha: true }}
            style={{ background: 'transparent' }}
          >
            <Suspense fallback={null}>
              <ThreatScene anomalies={anomalies} />
            </Suspense>
          </Canvas>
        </div>

        {/* Full anomaly list */}
        <AnomalyPanel anomalies={anomalies} />
      </div>
    </div>
  )
}