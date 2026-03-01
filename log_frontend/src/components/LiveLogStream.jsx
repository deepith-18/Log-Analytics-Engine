// src/components/LiveLogStream.jsx
// Real-time scrolling log stream with syntax highlighting,
// color-coded status codes, and smooth entry animations.

import { useEffect, useRef } from 'react'

const STATUS_COLOR = {
  200: '#00ff88', 201: '#00ff88', 204: '#4dc9f6',
  301: '#00f5ff', 302: '#00f5ff',
  400: '#ff8c42', 401: '#ffd700', 403: '#ff6b35', 404: '#ff8c42',
  500: '#ff3366', 503: '#ff3366',
}

const METHOD_COLOR = {
  GET:    '#00f5ff',
  POST:   '#00ff88',
  PUT:    '#ffd700',
  DELETE: '#ff3366',
  PATCH:  '#9b4dff',
}

function LogLine({ entry, index }) {
  const ts = new Date(entry.timestamp)
  const timeStr = ts.toLocaleTimeString('en-US', { hour12: false })
  const statusColor = STATUS_COLOR[entry.status] || '#7fb3c8'
  const methodColor = METHOD_COLOR[entry.method] || '#7fb3c8'
  const isError = entry.status >= 500
  const isWarning = entry.status >= 400 && entry.status < 500

  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      padding: '6px 12px',
      borderRadius: '6px',
      background: isError
        ? 'rgba(255,51,102,0.06)'
        : isWarning
        ? 'rgba(255,215,0,0.04)'
        : 'transparent',
      borderLeft: isError
        ? '2px solid rgba(255,51,102,0.4)'
        : isWarning
        ? '2px solid rgba(255,215,0,0.3)'
        : '2px solid transparent',
      animation: 'slideInLog 0.3s ease-out forwards',
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '11px',
      lineHeight: '1.6',
      alignItems: 'flex-start',
    }}>
      {/* Timestamp */}
      <span style={{ color: 'rgba(126,179,200,0.4)', flexShrink: 0, minWidth: '75px' }}>
        {timeStr}
      </span>

      {/* IP */}
      <span style={{ color: '#7fb3c8', flexShrink: 0, minWidth: '110px' }}>
        {entry.ip}
      </span>

      {/* Method badge */}
      <span style={{
        color: methodColor,
        background: `${methodColor}15`,
        border: `1px solid ${methodColor}30`,
        borderRadius: '4px',
        padding: '0 6px',
        flexShrink: 0,
        minWidth: '52px',
        textAlign: 'center',
        fontSize: '10px',
        fontWeight: '600',
      }}>
        {entry.method}
      </span>

      {/* Endpoint */}
      <span style={{
        color: '#c8e6f5',
        flex: 1,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {entry.endpoint}
      </span>

      {/* Status */}
      <span style={{
        color: statusColor,
        fontWeight: '600',
        flexShrink: 0,
        textShadow: `0 0 8px ${statusColor}66`,
      }}>
        {entry.status}
      </span>

      {/* Size */}
      <span style={{ color: 'rgba(126,179,200,0.3)', flexShrink: 0, minWidth: '55px', textAlign: 'right' }}>
        {entry.size}B
      </span>
    </div>
  )
}

export default function LiveLogStream({ logs = [] }) {
  const scrollRef = useRef()

  // Auto-scroll to top on new entries
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [logs.length])

  return (
    <div style={{
      background: 'rgba(6,13,20,0.95)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(0,245,255,0.08)',
      borderRadius: '20px',
      overflow: 'hidden',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Terminal header bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 20px',
        borderBottom: '1px solid rgba(0,245,255,0.08)',
        background: 'rgba(0,0,0,0.4)',
        flexShrink: 0,
      }}>
        {/* Traffic lights */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => (
            <div key={i} style={{
              width: 12, height: 12, borderRadius: '50%', background: c
            }} />
          ))}
        </div>

        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '11px',
          color: 'rgba(0,245,255,0.6)',
          letterSpacing: '0.1em',
        }}>
          LIVE · access.log
        </div>

        {/* Blinking cursor */}
        <div style={{
          width: 7, height: 14,
          background: '#00f5ff',
          animation: 'blink 1s step-end infinite',
          boxShadow: '0 0 8px #00f5ff',
        }} />

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{
            width: 8, height: 8,
            borderRadius: '50%',
            background: '#00ff88',
            boxShadow: '0 0 8px #00ff88',
            animation: 'pulse-ring 2s ease-out infinite',
          }} />
          <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '10px',
            color: '#00ff88',
          }}>
            STREAMING
          </span>
        </div>
      </div>

      {/* Column headers */}
      <div style={{
        display: 'flex',
        gap: '12px',
        padding: '6px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '9px',
        color: 'rgba(126,179,200,0.35)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        flexShrink: 0,
      }}>
        <span style={{ minWidth: '75px' }}>TIME</span>
        <span style={{ minWidth: '110px' }}>IP ADDRESS</span>
        <span style={{ minWidth: '52px' }}>METHOD</span>
        <span style={{ flex: 1 }}>ENDPOINT</span>
        <span>STATUS</span>
        <span style={{ minWidth: '55px', textAlign: 'right' }}>SIZE</span>
      </div>

      {/* Scrollable log area */}
      <div
        ref={scrollRef}
        style={{
          overflowY: 'auto',
          flex: 1,
          padding: '8px 0',
        }}
      >
        <style>{`
          @keyframes slideInLog {
            from { opacity: 0; transform: translateX(-10px); }
            to   { opacity: 1; transform: translateX(0); }
          }
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0; }
          }
          @keyframes pulse-ring {
            0%   { box-shadow: 0 0 0 0 rgba(0,255,136,0.6); }
            70%  { box-shadow: 0 0 0 8px rgba(0,255,136,0); }
            100% { box-shadow: 0 0 0 0 rgba(0,255,136,0); }
          }
        `}</style>

        {logs.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '12px',
            color: 'rgba(0,245,255,0.3)',
          }}>
            Waiting for log entries...
          </div>
        ) : (
          logs.map((entry, i) => (
            <LogLine key={entry.id} entry={entry} index={i} />
          ))
        )}
      </div>
    </div>
  )
}