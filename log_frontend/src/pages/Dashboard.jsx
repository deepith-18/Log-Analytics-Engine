// src/pages/Dashboard.jsx
// Main overview dashboard combining 3D globe, stats, charts, and live logs.

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import NetworkGlobe3D from '../components/NetworkGlobe3D'
import StatCard from '../components/StatCard'
import LiveLogStream from '../components/LiveLogStream'
import AnomalyPanel from '../components/AnomalyPanel'
import { StatusDonutChart, HourlyTrafficChart } from '../components/AnalyticsCharts'

export default function Dashboard({ data, liveLog }) {
  const { overview, anomalies, status_distribution, hourly_traffic } = data
  const criticalCount = anomalies.filter(a => a.severity === 'CRITICAL').length

  const downloadReport = () => {
    window.open("http://localhost:8000/api/download-report", "_blank")
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateRows: 'auto 1fr',
      gap: '24px',
      padding: '28px',
      height: '100%',
      overflow: 'auto',
    }}>

      {/* ── Page Header ──────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '10px',
            color: 'rgba(0,245,255,0.5)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom: '6px',
          }}>
            ◈ Main Control Center
          </div>
          <h1 style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: 'clamp(22px, 3vw, 36px)',
            fontWeight: '800',
            color: 'transparent',
            background: 'linear-gradient(135deg, #e8f4f8, #00f5ff, #9b4dff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: 1.1,
          }}>
            Log Analytics<br />Dashboard
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Download Report button */}
          <button onClick={downloadReport} style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '11px',
            letterSpacing: '0.1em',
            color: '#00f5ff',
            background: 'rgba(0,245,255,0.08)',
            border: '1px solid rgba(0,245,255,0.3)',
            borderRadius: '100px',
            padding: '8px 18px',
            cursor: 'pointer',
            transition: 'background 0.2s, box-shadow 0.2s',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(0,245,255,0.18)'
              e.currentTarget.style.boxShadow = '0 0 12px rgba(0,245,255,0.3)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(0,245,255,0.08)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            ↓ Download Report
          </button>

          {/* Live status pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(0,255,136,0.08)',
            border: '1px solid rgba(0,255,136,0.25)',
            borderRadius: '100px',
            padding: '8px 18px',
          }}>
            <div style={{
              width: 8, height: 8,
              borderRadius: '50%',
              background: '#00ff88',
              boxShadow: '0 0 10px #00ff88',
              animation: 'pulse-glow 2s ease-in-out infinite',
            }} />
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '11px',
              color: '#00ff88',
              letterSpacing: '0.1em',
            }}>
              LIVE MONITORING
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Content Grid ────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gridTemplateRows: 'auto auto auto',
        gap: '20px',
      }}>

        {/* ── Row 1: Stat Cards + 3D Globe ─────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <StatCard
            label="Total Requests"
            value={overview.total_requests}
            icon="▲"
            variant="info"
            delay={100}
          />
          <StatCard
            label="Unique IPs"
            value={overview.unique_ips}
            icon="◎"
            variant="neutral"
            delay={200}
          />
          <StatCard
            label="Error Rate"
            value={overview.error_rate_pct}
            suffix="%"
            decimals={2}
            icon="⚠"
            variant={overview.error_rate_pct > 5 ? 'danger' : overview.error_rate_pct > 1 ? 'warning' : 'success'}
            delay={300}
          />
        </div>

        {/* ── 3D Globe (center, spans 1 col, 2 rows) ─── */}
        <div style={{
          background: 'rgba(6,13,20,0.7)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0,245,255,0.08)',
          borderRadius: '20px',
          overflow: 'hidden',
          height: '320px',
          position: 'relative',
        }}>
          {/* Radial glow behind globe */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at center, rgba(0,245,255,0.05) 0%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 1,
          }} />
          <div style={{ position: 'relative', zIndex: 2, height: '100%' }}>
            <Suspense fallback={<GlobeFallback />}>
              <NetworkGlobe3D anomalyCount={anomalies.length} />
            </Suspense>
          </div>
        </div>

        {/* ── Right col: more stat cards ──────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <StatCard
            label="Total 5xx Errors"
            value={overview.total_errors}
            icon="💥"
            variant="danger"
            delay={150}
          />
          <StatCard
            label="Bandwidth"
            value={overview.total_bandwidth_kb}
            suffix=" KB"
            decimals={1}
            icon="⇅"
            variant="success"
            delay={250}
          />
          <StatCard
            label="Active Anomalies"
            value={anomalies.length}
            icon="🔍"
            variant={criticalCount > 0 ? 'danger' : anomalies.length > 2 ? 'warning' : 'success'}
            delay={350}
          />
        </div>

        {/* ── Row 2: Status donut + Hourly chart ──────── */}
        <div>
          <StatusDonutChart data={status_distribution} />
        </div>
        <div>
          <HourlyTrafficChart data={hourly_traffic} />
        </div>

        {/* ── Row 2 last col: Anomaly panel ───────────── */}
        <div>
          <AnomalyPanel anomalies={anomalies.slice(0, 3)} />
        </div>

        {/* ── Row 3: Live Log Stream (full width) ─────── */}
        <div style={{ gridColumn: '1 / -1', height: '280px' }}>
          <LiveLogStream logs={liveLog} />
        </div>
      </div>

      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 10px #00ff88; }
          50%       { box-shadow: 0 0 20px #00ff88, 0 0 40px rgba(0,255,136,0.3); }
        }
      `}</style>
    </div>
  )
}

function GlobeFallback() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '11px',
      color: 'rgba(0,245,255,0.4)',
    }}>
      Loading 3D Scene...
    </div>
  )
}