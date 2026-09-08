import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import { getSummary, getByService, getDailyTrend } from '../utils/api'
import { fmt } from '../utils/services'
import './Analytics.css'

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week',  label: 'Last 7 days' },
  { key: 'month', label: 'This cycle' },   // billing cycle 28th→27th
  { key: 'year',  label: 'This year' },
  { key: 'all',   label: 'All time' },
]

function formatCycleDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function MetricCard({ label, value, sub, color }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={color ? { color } : {}}>{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{label}</div>
      <div className="tooltip-value">{fmt(payload[0].value)}</div>
    </div>
  )
}

export default function Analytics() {
  const [period, setPeriod] = useState('month') // default to current billing cycle
  const [summary, setSummary] = useState(null)
  const [byService, setByService] = useState([])
  const [daily, setDaily] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getSummary(period),
      getByService(period),
      getDailyTrend(30)
    ]).then(([s, b, d]) => {
      setSummary(s.data)
      setByService(b.data)
      setDaily(d.data.map(r => ({
        date: r.date.slice(5), // MM-DD
        total: r.total,
        count: r.count
      })))
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [period])

  if (loading) return <div className="analytics-loading">Loading analytics…</div>

  const net = summary?.net ?? 0
  const cycleDates = summary?.cycleDates

  return (
    <div className="analytics">
      <div className="period-row">
        {PERIODS.map(p => (
          <button
            key={p.key}
            className={`period-btn ${period === p.key ? 'active' : ''}`}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Billing cycle label — only shown when "This cycle" is selected */}
      {period === 'month' && cycleDates && (
        <div className="cycle-banner">
          <span className="cycle-icon">📅</span>
          <span>
            Current billing cycle: &nbsp;
            <strong>{formatCycleDate(cycleDates.start)}</strong>
            &nbsp;→&nbsp;
            <strong>{formatCycleDate(cycleDates.end)}</strong>
          </span>
          <span className="cycle-note">Remittance due 27th</span>
        </div>
      )}

      <div className="metrics-grid">
        <MetricCard
          label="Total income"
          value={fmt(summary?.income ?? 0)}
          sub={`${summary?.incomeCount ?? 0} transactions`}
          color="var(--green)"
        />
        <MetricCard
          label="Total expenses"
          value={fmt(summary?.expense ?? 0)}
          sub={`${summary?.expenseCount ?? 0} items`}
          color="var(--red)"
        />
        <MetricCard
          label="Net profit"
          value={fmt(Math.abs(net))}
          sub={net < 0 ? 'Net loss' : 'Net profit'}
          color={net >= 0 ? 'var(--green)' : 'var(--red)'}
        />
        <MetricCard
          label="Gen surcharge"
          value={fmt(summary?.genSurchargeTotal ?? 0)}
          sub="collected"
        />
        <MetricCard
          label="Cash"
          value={fmt(summary?.cash ?? 0)}
        />
        <MetricCard
          label="Transfer"
          value={fmt(summary?.transfer ?? 0)}
        />
      </div>

      {daily.length > 0 && (
        <div className="card chart-card">
          <div className="section-label">Daily revenue — last 30 days</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={daily} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-faint)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-faint)' }} tickLine={false} axisLine={false} tickFormatter={v => '₦' + v.toLocaleString()} width={70} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="total" stroke="var(--accent)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {byService.length > 0 && (
        <div className="card chart-card">
          <div className="section-label">Revenue by service</div>
          <ResponsiveContainer width="100%" height={Math.max(200, byService.length * 36)}>
            <BarChart data={byService} layout="vertical" margin={{ top: 0, right: 60, left: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-faint)' }} tickLine={false} axisLine={false} tickFormatter={v => '₦' + v.toLocaleString()} />
              <YAxis type="category" dataKey="service" tick={{ fontSize: 12, fill: 'var(--text)' }} tickLine={false} axisLine={false} width={130} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total" fill="var(--accent)" radius={[0, 4, 4, 0]} label={{ position: 'right', formatter: v => fmt(v), fontSize: 11, fill: 'var(--text-muted)' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {byService.length === 0 && daily.length === 0 && (
        <div className="analytics-empty">No income data for this period.</div>
      )}
    </div>
  )
}
