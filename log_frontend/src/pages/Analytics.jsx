// src/pages/Analytics.jsx
// Detailed analytics page with all charts, tables, and metrics.

import { useState } from 'react'
import StatCard from '../components/StatCard'
import {
  IPBarChart,
  EndpointChart,
  MethodRadialChart,
  StatusDonutChart,
  HourlyTrafficChart
} from '../components/AnalyticsCharts'

// ── Data table component ───────────────────────────────────────
function DataTable({ headers, rows, keyFn, colorFn }) {
  const [sortCol, setSortCol] = useState(0)
  const [sortDir, setSortDir] = useState(-1)

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortCol], bv = b[sortCol]
    if (typeof av === 'number') return (av - bv) * sortDir
    return String(av).localeCompare(String(bv)) * sortDir
  })

  return (
    <div style={{
      background: 'rgba(6,13,20,0.9)',
      border: '1px solid rgba(0,245,255,0.08)',
      borderRadius: '16px',
      overflow: 'hidden',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'rgba(0,0,0,0.4)' }}>
            {headers.map((h, i) => (
              <th
                key={i}
                onClick={() => {
                  if (sortCol === i) setSortDir(d => -d)
                  else { setSortCol(i); setSortDir(-1) }
                }}
                style={{
                  padding: '10px 16px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '9px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: sortCol === i ? '#00f5ff' : 'rgba(126,179,200,0.5)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                  borderBottom: '1px solid rgba(0,245,255,0.06)',
                }}
              >
                {h} {sortCol === i ? (sortDir > 0 ? '↑' : '↓') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, ri) => {
            const rowColor = colorFn ? colorFn(row) : 'transparent'
            return (
              <tr
                key={keyFn ? keyFn(row) : ri}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  transition: 'background 0.15s',
                  background: ri % 2 === 0 ? 'rgba(0,245,255,0.01)' : 'transparent',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,245,255,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = ri % 2 === 0 ? 'rgba(0,245,255,0.01)' : 'transparent'}
              >
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    style={{
                      padding: '10px 16px',
                      fontFamily: ci === 0 ? 'JetBrains Mono, monospace' : 'Outfit, sans-serif',
                      fontSize: '12px',
                      color: ci === 0 ? '#00f5ff' : 'rgba(232,244,248,0.8)',
                      whiteSpace: ci === 0 ? 'nowrap' : undefined,
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Section wrapper ────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px',
      }}>
        <div style={{
          width: 3, height: 20,
          background: 'linear-gradient(180deg, #00f5ff, #9b4dff)',
          borderRadius: 2,
          boxShadow: '0 0 10px #00f5ff',
        }} />
        <h2 style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: '18px',
          fontWeight: '700',
          color: '#e8f4f8',
        }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  )
}

// ── Main Analytics Page ────────────────────────────────────────
export default function Analytics({ data }) {
  const { overview, requests_per_ip, status_distribution, top_endpoints,
          method_distribution, hourly_traffic, bandwidth_by_ip } = data

  return (
    <div style={{ padding: '28px', overflowY: 'auto', height: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '10px',
          color: 'rgba(0,245,255,0.5)',
          letterSpacing: '0.2em',
          marginBottom: '6px',
        }}>
          ◉ Deep Analysis
        </div>
        <h1 style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: 'clamp(22px, 3vw, 32px)',
          fontWeight: '800',
          color: '#e8f4f8',
        }}>
          Traffic Analytics
        </h1>
      </div>

      {/* Overview stat row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '40px',
      }}>
        <StatCard label="Total Requests"  value={overview.total_requests}   icon="▲" variant="info"    delay={0} />
        <StatCard label="Error Rate"      value={overview.error_rate_pct}   suffix="%" decimals={2} icon="⚠" variant="danger"  delay={100} />
        <StatCard label="Total Errors"    value={overview.total_errors}     icon="💥" variant="danger"  delay={200} />
        <StatCard label="Bandwidth"       value={overview.total_bandwidth_kb} suffix=" KB" decimals={1} icon="⇅" variant="success" delay={300} />
      </div>

      {/* Charts row 1 */}
      <Section title="Traffic Patterns">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
          <HourlyTrafficChart data={hourly_traffic} />
          <StatusDonutChart   data={status_distribution} />
        </div>
      </Section>

      {/* Charts row 2 */}
      <Section title="Request Sources & Methods">
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '32px' }}>
          <IPBarChart        data={requests_per_ip} />
          <MethodRadialChart data={method_distribution} />
        </div>
      </Section>

      {/* Endpoint chart */}
      <Section title="Endpoint Analysis">
        <div style={{ marginBottom: '32px' }}>
          <EndpointChart data={top_endpoints} />
        </div>
      </Section>

      {/* Raw data tables */}
      <Section title="Raw Data Tables">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

          {/* Top IPs table */}
          <div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '10px',
              color: 'rgba(126,179,200,0.5)',
              letterSpacing: '0.1em',
              marginBottom: '10px',
            }}>
              TOP IPs BY REQUESTS
            </div>
            <DataTable
              headers={['Rank', 'IP Address', 'Requests', '% Share']}
              rows={requests_per_ip.map(d => [d.rank, d.ip, d.request_count, `${d.percentage}%`])}
              keyFn={r => r[1]}
            />
          </div>

          {/* Top endpoints table */}
          <div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '10px',
              color: 'rgba(126,179,200,0.5)',
              letterSpacing: '0.1em',
              marginBottom: '10px',
            }}>
              TOP ENDPOINTS
            </div>
            <DataTable
              headers={['Rank', 'Endpoint', 'Hits', '% Share']}
              rows={top_endpoints.map(d => [d.rank, d.endpoint, d.hit_count, `${d.percentage}%`])}
              keyFn={r => r[1]}
            />
          </div>

          {/* Bandwidth table */}
          <div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '10px',
              color: 'rgba(126,179,200,0.5)',
              letterSpacing: '0.1em',
              marginBottom: '10px',
            }}>
              BANDWIDTH BY IP
            </div>
            <DataTable
              headers={['IP Address', 'Total Bytes', 'KB']}
              rows={bandwidth_by_ip.map(d => [
                d.ip,
                d.total_bytes.toLocaleString(),
                (d.total_bytes / 1024).toFixed(2)
              ])}
              keyFn={r => r[0]}
            />
          </div>

          {/* Status distribution table */}
          <div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '10px',
              color: 'rgba(126,179,200,0.5)',
              letterSpacing: '0.1em',
              marginBottom: '10px',
            }}>
              STATUS CODE BREAKDOWN
            </div>
            <DataTable
              headers={['Status', 'Category', 'Count', '%']}
              rows={status_distribution.map(d => [d.status, d.category, d.count, `${d.percentage}%`])}
              keyFn={r => r[0]}
            />
          </div>
        </div>
      </Section>
    </div>
  )
}