// src/components/AnomalyPanel.jsx
// Animated alert panel showing detected anomalies with severity indicators,
// pulsing animations, and expandable detail cards.

import { useState, useEffect } from 'react'

const SEVERITY = {
  CRITICAL: { color: '#ff3366', bg: 'rgba(255,51,102,0.1)',  border: 'rgba(255,51,102,0.3)', label: 'CRITICAL', pulse: true  },
  HIGH:     { color: '#ff6b35', bg: 'rgba(255,107,53,0.1)', border: 'rgba(255,107,53,0.3)', label: 'HIGH',     pulse: true  },
  MEDIUM:   { color: '#ffd700', bg: 'rgba(255,215,0,0.08)', border: 'rgba(255,215,0,0.25)', label: 'MEDIUM',   pulse: false },
  LOW:      { color: '#00ff88', bg: 'rgba(0,255,136,0.06)', border: 'rgba(0,255,136,0.2)', label: 'LOW',      pulse: false },
}

const TYPE_ICON = {
  HIGH_VOLUME_IP:       '🌊',
  ERROR_SPIKE_500:      '💥',
  SUSPICIOUS_ENDPOINT:  '🔍',
}

// ── Pulsing dot indicator ──────────────────────────────────────
function PulseDot({ color, animate }) {
  return (
    <div style={{ position: 'relative', width: 10, height: 10, flexShrink: 0 }}>
      <div style={{
        width: 10, height: 10,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 8px ${color}`,
        position: 'absolute',
      }} />
      {animate && (
        <div style={{
          width: 10, height: 10,
          borderRadius: '50%',
          background: color,
          opacity: 0.3,
          position: 'absolute',
          animation: 'pulse-ring 1.5s ease-out infinite',
        }} />
      )}
      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.5; }
          100% { transform: scale(3);   opacity: 0; }
        }
      `}</style>
    </div>
  )
}

// ── Individual anomaly card ────────────────────────────────────
function AnomalyCard({ anomaly, index }) {
  const [expanded, setExpanded] = useState(false)
  const [visible, setVisible] = useState(false)
  const cfg = SEVERITY[anomaly.severity] || SEVERITY.LOW

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 120 + 300)
    return () => clearTimeout(t)
  }, [index])

  const ts = new Date(anomaly.timestamp)
  const timeAgo = (() => {
    const diff = (Date.now() - ts) / 1000
    if (diff < 60)   return `${Math.floor(diff)}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return `${Math.floor(diff / 3600)}h ago`
  })()

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        background: expanded ? cfg.bg : 'rgba(10,22,40,0.8)',
        border: `1px solid ${expanded ? cfg.border : 'rgba(255,255,255,0.06)'}`,
        borderRadius: '12px',
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        transform: visible ? 'translateX(0)' : 'translateX(-30px)',
        opacity: visible ? 1 : 0,
        marginBottom: '8px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Left severity bar */}
      <div style={{
        position: 'absolute',
        left: 0, top: 0, bottom: 0,
        width: '3px',
        background: cfg.color,
        boxShadow: `0 0 10px ${cfg.color}`,
        borderRadius: '12px 0 0 12px',
      }} />

      {/* Header row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        paddingLeft: '6px',
      }}>
        <PulseDot color={cfg.color} animate={cfg.pulse} />

        <span style={{ fontSize: '18px', flexShrink: 0 }}>
          {TYPE_ICON[anomaly.type] || '⚡'}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: '13px',
            fontWeight: '500',
            color: '#e8f4f8',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {anomaly.description}
          </div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '10px',
            color: 'rgba(126,179,200,0.5)',
            marginTop: '2px',
          }}>
            {anomaly.type} · {timeAgo}
          </div>
        </div>

        {/* Severity badge */}
        <div style={{
          background: `${cfg.color}18`,
          border: `1px solid ${cfg.color}44`,
          borderRadius: '6px',
          padding: '2px 8px',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '9px',
          fontWeight: '600',
          color: cfg.color,
          letterSpacing: '0.08em',
          flexShrink: 0,
        }}>
          {cfg.label}
        </div>

        {/* Expand chevron */}
        <div style={{
          color: 'rgba(126,179,200,0.4)',
          transition: 'transform 0.2s',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
          fontSize: '12px',
          flexShrink: 0,
        }}>
          ▾
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          marginTop: '14px',
          paddingTop: '14px',
          borderTop: `1px solid ${cfg.border}`,
          paddingLeft: '6px',
        }}>
          {/* Evidence */}
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '11px',
            color: '#00f5ff',
            marginBottom: '10px',
            lineHeight: 1.8,
          }}>
            {Object.entries(anomaly.evidence).map(([k, v]) => (
              <div key={k}>
                <span style={{ color: 'rgba(126,179,200,0.6)' }}>{k}: </span>
                <span>{String(v)}</span>
              </div>
            ))}
          </div>

          {/* Recommendation */}
          <div style={{
            display: 'flex',
            gap: '8px',
            background: `${cfg.color}0c`,
            borderRadius: '8px',
            padding: '10px 12px',
          }}>
            <span style={{ color: cfg.color, flexShrink: 0 }}>→</span>
            <span style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: '12px',
              color: 'rgba(232,244,248,0.7)',
              lineHeight: 1.5,
            }}>
              {anomaly.recommendation}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Anomaly Panel ─────────────────────────────────────────
export default function AnomalyPanel({ anomalies = [] }) {
  const criticals = anomalies.filter(a => a.severity === 'CRITICAL').length
  const highs     = anomalies.filter(a => a.severity === 'HIGH').length

  return (
    <div style={{
      background: 'rgba(10,22,40,0.7)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '20px',
      padding: '24px',
      height: '100%',
    }}>
      {/* Panel header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <div style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: '16px',
            fontWeight: '700',
            color: '#e8f4f8',
            marginBottom: '4px',
          }}>
            Anomaly Detection
          </div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '10px',
            color: 'rgba(126,179,200,0.5)',
            letterSpacing: '0.1em',
          }}>
            {anomalies.length} EVENTS DETECTED
          </div>
        </div>

        {/* Threat level indicator */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {criticals > 0 && (
            <div style={{
              background: 'rgba(255,51,102,0.15)',
              border: '1px solid rgba(255,51,102,0.4)',
              borderRadius: '8px',
              padding: '4px 10px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '11px',
              color: '#ff3366',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <PulseDot color="#ff3366" animate />
              {criticals} CRITICAL
            </div>
          )}
          {highs > 0 && (
            <div style={{
              background: 'rgba(255,107,53,0.12)',
              border: '1px solid rgba(255,107,53,0.3)',
              borderRadius: '8px',
              padding: '4px 10px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '11px',
              color: '#ff6b35',
            }}>
              {highs} HIGH
            </div>
          )}
        </div>
      </div>

      {/* Anomaly list */}
      <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
        {anomalies.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '12px',
            color: 'rgba(0,255,136,0.5)',
          }}>
            ✓ No anomalies detected
          </div>
        ) : (
          anomalies.map((a, i) => (
            <AnomalyCard key={a.id} anomaly={a} index={i} />
          ))
        )}
      </div>
    </div>
  )
}