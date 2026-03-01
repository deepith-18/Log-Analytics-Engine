// src/components/AnalyticsCharts.jsx
// Beautiful data visualizations using Recharts with custom styling
// to match the cyberpunk-noir aesthetic.

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, RadialBarChart, RadialBar,
} from 'recharts'
import { useState } from 'react'

// ── Shared chart theme ─────────────────────────────────────────
const CHART_THEME = {
  background:  'transparent',
  gridColor:   'rgba(0,245,255,0.05)',
  textColor:   'rgba(126,179,200,0.6)',
  fontFamily:  'JetBrains Mono, monospace',
  fontSize:    11,
}

// ── Custom Tooltip ─────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, color = '#00f5ff' }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(6,13,20,0.95)',
      border: `1px solid ${color}44`,
      borderRadius: '10px',
      padding: '10px 14px',
      backdropFilter: 'blur(20px)',
      boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${color}20`,
    }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '10px',
        color: 'rgba(126,179,200,0.6)',
        marginBottom: '6px',
        letterSpacing: '0.08em',
      }}>
        {label}
      </div>
      {payload.map((p, i) => (
        <div key={i} style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: '16px',
          fontWeight: '700',
          color: p.color || color,
          textShadow: `0 0 15px ${p.color || color}`,
        }}>
          {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
          {p.name !== 'value' && (
            <span style={{ fontSize: '11px', fontWeight: '400', marginLeft: '6px', color: 'rgba(126,179,200,0.5)' }}>
              {p.name}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

const chartContainer = (title, subtitle, children) => (
  <div style={{
    background: 'rgba(10,22,40,0.7)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '20px',
    padding: '24px',
    height: '100%',
  }}>
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        fontFamily: 'Syne, sans-serif',
        fontSize: '15px',
        fontWeight: '700',
        color: '#e8f4f8',
        marginBottom: '4px',
      }}>{title}</div>
      {subtitle && (
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '10px',
          color: 'rgba(126,179,200,0.4)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>{subtitle}</div>
      )}
    </div>
    {children}
  </div>
)

// ── Status Code Donut Chart ────────────────────────────────────
export function StatusDonutChart({ data }) {
  const [active, setActive] = useState(null)

  return chartContainer('Status Distribution', 'HTTP response codes', (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
      <div style={{ width: 200, height: 200, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="count"
              onMouseEnter={(_, i) => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.color}
                  opacity={active === null || active === i ? 1 : 0.4}
                  stroke={active === i ? entry.color : 'transparent'}
                  strokeWidth={2}
                  filter={active === i ? `drop-shadow(0 0 8px ${entry.color})` : undefined}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div style={{ flex: 1 }}>
        {data.map((d, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '5px 0',
            opacity: active === null || active === i ? 1 : 0.4,
            transition: 'opacity 0.2s',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, boxShadow: `0 0 6px ${d.color}`, flexShrink: 0 }} />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: d.color, minWidth: 36 }}>{d.status}</span>
            <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${d.percentage}%`, height: '100%', background: d.color, borderRadius: 2, boxShadow: `0 0 8px ${d.color}50` }} />
            </div>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'rgba(126,179,200,0.5)', minWidth: 42, textAlign: 'right' }}>
              {d.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  ))
}

// ── Top IPs Bar Chart ──────────────────────────────────────────
export function IPBarChart({ data }) {
  const top5 = data.slice(0, 6)

  return chartContainer('Top IPs by Requests', 'Highest traffic sources', (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={top5} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.gridColor} horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: CHART_THEME.textColor, fontFamily: CHART_THEME.fontFamily, fontSize: CHART_THEME.fontSize }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="ip"
          width={110}
          tick={{ fill: '#7fb3c8', fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip color="#00f5ff" />} />
        <Bar dataKey="request_count" radius={[0, 6, 6, 0]} barSize={18}>
          {top5.map((_, i) => (
            <Cell
              key={i}
              fill={`hsl(${185 + i * 20}, 100%, ${60 - i * 5}%)`}
              style={{ filter: 'drop-shadow(0 0 6px rgba(0,245,255,0.4))' }}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  ))
}

// ── Hourly Traffic Area Chart ──────────────────────────────────
export function HourlyTrafficChart({ data }) {
  return chartContainer('Hourly Traffic', 'Requests over time', (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#00f5ff" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#00f5ff" stopOpacity={0}   />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.gridColor} />
        <XAxis
          dataKey="hour"
          tickFormatter={(h) => `${h}:00`}
          tick={{ fill: CHART_THEME.textColor, fontFamily: CHART_THEME.fontFamily, fontSize: CHART_THEME.fontSize }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: CHART_THEME.textColor, fontFamily: CHART_THEME.fontFamily, fontSize: CHART_THEME.fontSize }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip color="#00f5ff" />} />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#00f5ff"
          strokeWidth={2.5}
          fill="url(#trafficGrad)"
          dot={{ fill: '#00f5ff', strokeWidth: 0, r: 5, filter: 'drop-shadow(0 0 6px #00f5ff)' }}
          activeDot={{ r: 7, fill: '#00f5ff', filter: 'drop-shadow(0 0 12px #00f5ff)' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  ))
}

// ── Method Distribution Radial Chart ──────────────────────────
export function MethodRadialChart({ data }) {
  const colors = { GET: '#00f5ff', POST: '#00ff88', PUT: '#ffd700', DELETE: '#ff3366' }

  return chartContainer('HTTP Methods', 'Request type breakdown', (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {data.map((d) => {
        const color = colors[d.method] || '#9b4dff'
        return (
          <div key={d.method}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color, fontWeight: '600' }}>
                {d.method}
              </span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'rgba(126,179,200,0.5)' }}>
                {d.count} · {d.percentage}%
              </span>
            </div>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                width: `${d.percentage}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${color}, ${color}88)`,
                borderRadius: 4,
                boxShadow: `0 0 12px ${color}66`,
                transition: 'width 1.5s cubic-bezier(0.34,1.56,0.64,1)',
              }} />
            </div>
          </div>
        )
      })}
    </div>
  ))
}

// ── Endpoint Hit Count Chart ───────────────────────────────────
export function EndpointChart({ data }) {
  const top8 = data.slice(0, 8)

  return chartContainer('Top Endpoints', 'Most requested paths', (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={top8} margin={{ top: 0, right: 10, left: -10, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.gridColor} vertical={false} />
        <XAxis
          dataKey="endpoint"
          tick={{
            fill: CHART_THEME.textColor,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 9,
            angle: -35,
            textAnchor: 'end',
          }}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <YAxis
          tick={{ fill: CHART_THEME.textColor, fontFamily: CHART_THEME.fontFamily, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip color="#9b4dff" />} />
        <Bar dataKey="hit_count" radius={[6, 6, 0, 0]} barSize={24}>
          {top8.map((entry, i) => {
            const isSuspicious = ['/.env', '/admin', '/wp-admin'].includes(entry.endpoint)
            return (
              <Cell
                key={i}
                fill={isSuspicious ? '#ff3366' : `hsl(${270 + i * 15}, 80%, 60%)`}
                style={{ filter: `drop-shadow(0 0 6px ${isSuspicious ? 'rgba(255,51,102,0.6)' : 'rgba(155,77,255,0.4)'})` }}
              />
            )
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  ))
}