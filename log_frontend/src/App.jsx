// src/App.jsx
// Root application component with:
//   - Loading screen → main layout transition
//   - Custom cursor
//   - Sidebar navigation
//   - Page routing (no react-router needed - simple state-based)
//   - Animated background with scan lines and grid

import { useState, Suspense, lazy } from 'react'
import LoadingScreen from './components/LoadingScreen'
import CustomCursor  from './components/CustomCursor'
import Sidebar       from './components/Sidebar'
import Dashboard     from './pages/Dashboard'
import Analytics     from './pages/Analytics'
import AnomaliesPage from './pages/Anomalies'
import LogsPage      from './pages/Logs'
import { useAnalyticsData } from './hooks/useAnalyticsData'

// ── Animated background ────────────────────────────────────────
function AnimatedBackground() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
    }}>
      {/* Deep grid */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0,245,255,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,245,255,0.025) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
      }} />

      {/* Radial vignette */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 20% 50%, rgba(0,245,255,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(155,77,255,0.04) 0%, transparent 50%)',
      }} />

      {/* Slow scan line */}
      <div style={{
        position: 'absolute',
        left: 0, right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(0,245,255,0.15), transparent)',
        animation: 'scanDown 8s linear infinite',
        top: 0,
      }} />

      {/* Bottom glow bar */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(0,245,255,0.1), transparent)',
      }} />

      <style>{`
        @keyframes scanDown {
          from { top: -2px; opacity: 0.8; }
          to   { top: 100vh; opacity: 0.2; }
        }
      `}</style>
    </div>
  )
}

// ── Page router ────────────────────────────────────────────────
function PageContent({ page, data, liveLog }) {
  switch (page) {
    case 'dashboard': return <Dashboard data={data} liveLog={liveLog} />
    case 'analytics': return <Analytics data={data} />
    case 'anomalies': return <AnomaliesPage data={data} />
    case 'logs':      return <LogsPage liveLog={liveLog} />
    case 'settings':  return <SettingsPlaceholder />
    default:          return <Dashboard data={data} liveLog={liveLog} />
  }
}

function SettingsPlaceholder() {
  return (
    <div style={{
      padding: '28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚙</div>
        <div style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: '24px',
          fontWeight: '700',
          color: '#e8f4f8',
          marginBottom: '8px',
        }}>Settings</div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '12px',
          color: 'rgba(126,179,200,0.4)',
        }}>
          Configure thresholds in config/settings.py
        </div>

        {/* Show current config */}
        <div style={{
          marginTop: '32px',
          background: 'rgba(6,13,20,0.9)',
          border: '1px solid rgba(0,245,255,0.1)',
          borderRadius: '12px',
          padding: '20px 28px',
          textAlign: 'left',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '11px',
          color: '#00f5ff',
          lineHeight: 2,
          maxWidth: '400px',
        }}>
          <div style={{ color: 'rgba(126,179,200,0.4)', marginBottom: '8px' }}># config/settings.py</div>
          <div><span style={{ color: 'rgba(126,179,200,0.5)' }}>HIGH_REQUEST_THRESHOLD =</span> 20</div>
          <div><span style={{ color: 'rgba(126,179,200,0.5)' }}>ERROR_SPIKE_THRESHOLD  =</span> 10.0%</div>
          <div><span style={{ color: 'rgba(126,179,200,0.5)' }}>ERROR_SPIKE_MIN_COUNT  =</span> 5</div>
          <div><span style={{ color: 'rgba(126,179,200,0.5)' }}>SUSPICIOUS_THRESHOLD   =</span> 3</div>
          <div><span style={{ color: 'rgba(126,179,200,0.5)' }}>BATCH_INSERT_SIZE      =</span> 500</div>
          <div><span style={{ color: 'rgba(126,179,200,0.5)' }}>TOP_N_ENDPOINTS        =</span> 10</div>
        </div>
      </div>
    </div>
  )
}

// ── Root App ───────────────────────────────────────────────────
export default function App() {
  const [page, setPage]         = useState('dashboard')
  const { data, liveLog, loading } = useAnalyticsData()

  const anomalyCount = data.anomalies?.length || 0

  return (
    <>
      {/* Custom cursor */}
      <CustomCursor />

      {/* Animated background (fixed) */}
      <AnimatedBackground />

      {/* Loading screen */}
      {loading && <LoadingScreen />}

      {/* Main layout */}
      <div style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1,
        opacity: loading ? 0 : 1,
        transition: 'opacity 0.8s ease',
      }}>
        {/* Sidebar */}
        <Sidebar
          activePage={page}
          onNavigate={setPage}
          anomalyCount={anomalyCount}
        />

        {/* Main content area */}
        <main style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Top bar */}
          <div style={{
            height: '56px',
            borderBottom: '1px solid rgba(0,245,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            paddingInline: '28px',
            gap: '20px',
            flexShrink: 0,
            background: 'rgba(6,13,20,0.6)',
            backdropFilter: 'blur(20px)',
          }}>
            {/* Breadcrumb */}
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '11px',
              color: 'rgba(126,179,200,0.4)',
              letterSpacing: '0.08em',
            }}>
              log-analytics-engine /
              <span style={{ color: '#00f5ff', marginLeft: '6px' }}>
                {page}
              </span>
            </div>

            <div style={{ flex: 1 }} />

            {/* Right: log file info */}
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '10px',
              color: 'rgba(126,179,200,0.3)',
            }}>
              {data.ingestion?.source_file} · {data.overview?.total_requests?.toLocaleString()} requests
            </div>

            {/* Clock */}
            <LiveClock />
          </div>

          {/* Page content */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Suspense fallback={null}>
              <PageContent page={page} data={data} liveLog={liveLog} />
            </Suspense>
          </div>
        </main>
      </div>
    </>
  )
}

// ── Live clock ─────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState(new Date())

  useState(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  })

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '11px',
      color: 'rgba(0,245,255,0.5)',
      letterSpacing: '0.08em',
    }}>
      {time.toLocaleTimeString('en-US', { hour12: false })}
    </div>
  )
}

// Fix: import useEffect in LiveClock
import { useEffect } from 'react'