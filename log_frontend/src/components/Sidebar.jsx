// src/components/Sidebar.jsx
// Animated sidebar navigation with glowing active states and hover effects.

import { useState } from 'react'

const NAV_ITEMS = [
  { id: 'dashboard', icon: '◈', label: 'Dashboard',   shortcut: 'D' },
  { id: 'analytics', icon: '◉', label: 'Analytics',   shortcut: 'A' },
  { id: 'anomalies', icon: '⚡', label: 'Anomalies',   shortcut: 'N' },
  { id: 'logs',      icon: '≡', label: 'Live Logs',   shortcut: 'L' },
  { id: 'settings',  icon: '⚙', label: 'Settings',    shortcut: 'S' },
]

export default function Sidebar({ activePage, onNavigate, anomalyCount = 0 }) {
  const [collapsed, setCollapsed] = useState(false)
  const [hoveredItem, setHoveredItem] = useState(null)

  return (
    <nav style={{
      width: collapsed ? '60px' : '220px',
      height: '100vh',
      background: 'rgba(6,13,20,0.9)',
      backdropFilter: 'blur(30px)',
      borderRight: '1px solid rgba(0,245,255,0.08)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      flexShrink: 0,
      position: 'relative',
      zIndex: 100,
    }}>

      {/* Logo / Brand */}
      <div style={{
        padding: collapsed ? '24px 0' : '28px 20px',
        borderBottom: '1px solid rgba(0,245,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        overflow: 'hidden',
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        {/* Animated logo mark */}
        <div style={{
          width: 36, height: 36,
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #00f5ff22, #9b4dff22)',
          border: '1px solid rgba(0,245,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px',
          flexShrink: 0,
          boxShadow: '0 0 20px rgba(0,245,255,0.15)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <span style={{ zIndex: 1, position: 'relative' }}>◉</span>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(0,245,255,0.1), transparent)',
            animation: 'shimmer 3s linear infinite',
          }} />
        </div>

        {!collapsed && (
          <div>
            <div style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: '13px',
              fontWeight: '800',
              color: '#e8f4f8',
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
            }}>
              LogAnalytics
            </div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '9px',
              color: 'rgba(0,245,255,0.5)',
              letterSpacing: '0.1em',
            }}>
              ENGINE v1.0
            </div>
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <div style={{ flex: 1, padding: '16px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {NAV_ITEMS.map(item => {
          const isActive = activePage === item.id
          const isHovered = hoveredItem === item.id

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: collapsed ? '12px 0' : '12px 14px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: isActive
                  ? 'rgba(0,245,255,0.1)'
                  : isHovered
                  ? 'rgba(0,245,255,0.05)'
                  : 'transparent',
                boxShadow: isActive ? 'inset 0 0 20px rgba(0,245,255,0.05)' : 'none',
                position: 'relative',
                overflow: 'hidden',
                width: '100%',
                outline: 'none',
              }}
            >
              {/* Active left bar */}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  left: 0, top: '20%', bottom: '20%',
                  width: 3,
                  background: '#00f5ff',
                  borderRadius: '0 3px 3px 0',
                  boxShadow: '0 0 10px #00f5ff',
                }} />
              )}

              {/* Icon */}
              <span style={{
                fontSize: '18px',
                color: isActive ? '#00f5ff' : isHovered ? 'rgba(0,245,255,0.7)' : 'rgba(126,179,200,0.5)',
                transition: 'all 0.2s',
                textShadow: isActive ? '0 0 12px #00f5ff' : 'none',
                flexShrink: 0,
              }}>
                {item.icon}
              </span>

              {!collapsed && (
                <>
                  <span style={{
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: '13px',
                    fontWeight: isActive ? '600' : '400',
                    color: isActive ? '#e8f4f8' : isHovered ? 'rgba(232,244,248,0.7)' : 'rgba(126,179,200,0.6)',
                    transition: 'all 0.2s',
                    flex: 1,
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.01em',
                  }}>
                    {item.label}
                  </span>

                  {/* Anomaly badge */}
                  {item.id === 'anomalies' && anomalyCount > 0 && (
                    <div style={{
                      background: '#ff3366',
                      borderRadius: '10px',
                      padding: '1px 7px',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '10px',
                      fontWeight: '700',
                      color: '#fff',
                      boxShadow: '0 0 10px rgba(255,51,102,0.5)',
                    }}>
                      {anomalyCount}
                    </div>
                  )}
                </>
              )}

              {/* Hover shimmer effect */}
              {isHovered && !isActive && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(90deg, transparent, rgba(0,245,255,0.03), transparent)',
                  pointerEvents: 'none',
                }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Bottom collapse toggle + system status */}
      <div style={{
        padding: '12px 8px',
        borderTop: '1px solid rgba(0,245,255,0.06)',
      }}>
        {/* System status indicator */}
        {!collapsed && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            marginBottom: '8px',
            background: 'rgba(0,255,136,0.05)',
            borderRadius: '10px',
            border: '1px solid rgba(0,255,136,0.12)',
          }}>
            <div style={{
              width: 8, height: 8,
              borderRadius: '50%',
              background: '#00ff88',
              boxShadow: '0 0 8px #00ff88',
              flexShrink: 0,
            }} />
            <div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: '#00ff88', letterSpacing: '0.1em' }}>
                SYSTEM ONLINE
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', color: 'rgba(0,255,136,0.4)' }}>
                SQLite · Python 3
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '10px',
            border: '1px solid rgba(0,245,255,0.1)',
            background: 'rgba(0,245,255,0.04)',
            color: 'rgba(0,245,255,0.5)',
            cursor: 'pointer',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            outline: 'none',
          }}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>
    </nav>
  )
}