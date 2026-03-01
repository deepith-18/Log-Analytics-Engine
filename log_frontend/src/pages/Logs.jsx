// src/pages/Logs.jsx
// Full-screen live log viewer with filters and search.

import { useState, useMemo } from 'react'
import LiveLogStream from '../components/LiveLogStream'

export default function LogsPage({ liveLog }) {
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  const filters = [
    { label: 'ALL',  value: 'ALL',  color: '#00f5ff' },
    { label: '2xx',  value: '2xx',  color: '#00ff88' },
    { label: '4xx',  value: '4xx',  color: '#ffd700' },
    { label: '5xx',  value: '5xx',  color: '#ff3366' },
    { label: 'GET',  value: 'GET',  color: '#00f5ff' },
    { label: 'POST', value: 'POST', color: '#9b4dff' },
  ]

  const filtered = useMemo(() => {
    return liveLog.filter(entry => {
      const matchSearch = !search ||
        entry.ip.includes(search) ||
        entry.endpoint.toLowerCase().includes(search.toLowerCase())

      const matchFilter = filter === 'ALL' ||
        (filter === '2xx' && entry.status >= 200 && entry.status < 300) ||
        (filter === '4xx' && entry.status >= 400 && entry.status < 500) ||
        (filter === '5xx' && entry.status >= 500) ||
        (filter === entry.method)

      return matchSearch && matchFilter
    })
  }, [liveLog, filter, search])

  return (
    <div style={{ padding: '28px', height: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '10px',
            color: 'rgba(0,245,255,0.5)',
            letterSpacing: '0.2em',
            marginBottom: '6px',
          }}>
            ≡ Real-Time Stream
          </div>
          <h1 style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: 'clamp(22px, 3vw, 32px)',
            fontWeight: '800',
            color: '#e8f4f8',
          }}>
            Live Log Stream
          </h1>
        </div>

        {/* Entry count */}
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '11px',
          color: 'rgba(126,179,200,0.5)',
        }}>
          {filtered.length} / {liveLog.length} entries
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '360px' }}>
          <span style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'rgba(0,245,255,0.4)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '14px',
            pointerEvents: 'none',
          }}>
            ⌕
          </span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search IP or endpoint..."
            style={{
              width: '100%',
              background: 'rgba(6,13,20,0.9)',
              border: '1px solid rgba(0,245,255,0.12)',
              borderRadius: '10px',
              padding: '10px 14px 10px 38px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '12px',
              color: '#e8f4f8',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(0,245,255,0.4)'}
            onBlur={e => e.target.style.borderColor = 'rgba(0,245,255,0.12)'}
          />
        </div>

        {/* Filter buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: `1px solid ${filter === f.value ? f.color + '66' : 'rgba(255,255,255,0.08)'}`,
                background: filter === f.value ? `${f.color}18` : 'rgba(6,13,20,0.9)',
                color: filter === f.value ? f.color : 'rgba(126,179,200,0.5)',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                letterSpacing: '0.06em',
                boxShadow: filter === f.value ? `0 0 12px ${f.color}30` : 'none',
                outline: 'none',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Log stream (takes remaining height) */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <LiveLogStream logs={filtered} />
      </div>

      <style>{`
        input::placeholder { color: rgba(126,179,200,0.3); }
      `}</style>
    </div>
  )
}