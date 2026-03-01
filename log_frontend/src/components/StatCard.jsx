// src/components/StatCard.jsx
// Animated metric cards with counter animations, glowing borders,
// and hover interactions using CSS + inline style animations.

import { useEffect, useRef, useState } from 'react'

// ── Animated Number Counter ──────────────────────────────────────
function AnimatedCounter({ value, duration = 1500, decimals = 0, prefix = '', suffix = '' }) {
  const [display, setDisplay] = useState(0)
  const startRef = useRef(null)
  const rafRef   = useRef(null)

  useEffect(() => {
    const target = parseFloat(value)
    const start = performance.now()
    startRef.current = start

    const animate = (now) => {
      const elapsed  = now - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(eased * target)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration])

  const formatted = decimals > 0
    ? display.toFixed(decimals)
    : Math.round(display).toLocaleString()

  return <>{prefix}{formatted}{suffix}</>
}

// ── Severity color mapping ───────────────────────────────────────
const SEVERITY_CONFIG = {
  success:  { color: '#00ff88', glow: 'rgba(0,255,136,0.25)', icon: '▲' },
  warning:  { color: '#ffd700', glow: 'rgba(255,215,0,0.25)',  icon: '◆' },
  danger:   { color: '#ff3366', glow: 'rgba(255,51,102,0.25)', icon: '⚠' },
  info:     { color: '#00f5ff', glow: 'rgba(0,245,255,0.25)',  icon: '●' },
  neutral:  { color: '#9b4dff', glow: 'rgba(155,77,255,0.25)', icon: '■' },
}

// ── Main StatCard Component ──────────────────────────────────────
export default function StatCard({
  label,
  value,
  suffix = '',
  prefix = '',
  decimals = 0,
  trend,
  trendLabel,
  icon,
  variant = 'info',
  delay = 0,
  large = false,
}) {
  const [visible, setVisible] = useState(false)
  const [hovered, setHovered] = useState(false)
  const cfg = SEVERITY_CONFIG[variant] || SEVERITY_CONFIG.info

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  const cardStyle = {
    background: 'rgba(13, 26, 45, 0.85)',
    backdropFilter: 'blur(20px)',
    border: `1px solid ${hovered ? cfg.color + '55' : 'rgba(255,255,255,0.06)'}`,
    borderRadius: '16px',
    padding: large ? '28px 32px' : '20px 24px',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'default',
    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    transform: visible
      ? hovered ? 'translateY(-6px) scale(1.02)' : 'translateY(0) scale(1)'
      : 'translateY(30px) scale(0.95)',
    opacity: visible ? 1 : 0,
    boxShadow: hovered
      ? `0 20px 60px ${cfg.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`
      : '0 4px 20px rgba(0,0,0,0.4)',
  }

  const glowLineStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '2px',
    background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)`,
    opacity: hovered ? 1 : 0.5,
    transition: 'opacity 0.3s ease',
  }

  const cornerGlowStyle = {
    position: 'absolute',
    top: '-40px',
    right: '-40px',
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    background: `radial-gradient(circle, ${cfg.color}18 0%, transparent 70%)`,
    pointerEvents: 'none',
  }

  const scanLineStyle = {
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '60%',
    height: '100%',
    background: `linear-gradient(90deg, transparent, ${cfg.color}08, transparent)`,
    animation: hovered ? 'none' : undefined,
    transition: 'none',
    pointerEvents: 'none',
  }

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top accent line */}
      <div style={glowLineStyle} />

      {/* Corner glow blob */}
      <div style={cornerGlowStyle} />

      {/* Icon + Label row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        {icon && (
          <span style={{
            width: '32px', height: '32px',
            borderRadius: '8px',
            background: `${cfg.color}18`,
            border: `1px solid ${cfg.color}33`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px',
            color: cfg.color,
            flexShrink: 0
          }}>
            {icon}
          </span>
        )}
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '10px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'rgba(126,179,200,0.8)',
        }}>
          {label}
        </span>
      </div>

      {/* Main value */}
      <div style={{
        fontFamily: 'Syne, sans-serif',
        fontSize: large ? '3rem' : '2.2rem',
        fontWeight: '800',
        color: cfg.color,
        lineHeight: 1,
        textShadow: `0 0 30px ${cfg.color}66`,
        marginBottom: '10px',
        transition: 'text-shadow 0.3s',
      }}>
        {visible ? (
          <AnimatedCounter
            value={value}
            duration={1600}
            decimals={decimals}
            prefix={prefix}
            suffix={suffix}
          />
        ) : '—'}
      </div>

      {/* Trend indicator */}
      {trend !== undefined && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '11px',
          color: trend >= 0 ? '#00ff88' : '#ff3366',
        }}>
          <span>{trend >= 0 ? '↑' : '↓'}</span>
          <span>{Math.abs(trend)}%</span>
          {trendLabel && (
            <span style={{ color: 'rgba(126,179,200,0.5)', fontSize: '10px' }}>
              {trendLabel}
            </span>
          )}
        </div>
      )}

      {/* Hover scan-line effect via CSS */}
      {hovered && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(180deg, transparent 0%, ${cfg.color}04 50%, transparent 100%)`,
          pointerEvents: 'none',
          borderRadius: '16px',
        }} />
      )}
    </div>
  )
}