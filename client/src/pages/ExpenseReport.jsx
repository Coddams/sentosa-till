import { useState, useEffect, useCallback } from 'react'
import { getTransactions } from '../utils/api'
import { fmt } from '../utils/services'
import { getBillingCycle, getPreviousCycle, formatCycleDate } from '../utils/cycle'
import { useToast } from '../hooks/useToast'
import './ExpenseReport.css'

function getPresets() {
  const current = getBillingCycle()
  const previous = getPreviousCycle()
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString().slice(0, 10)

  return [
    {
      key: 'cycle',
      label: `This cycle (${formatCycleDate(current.start)}–${formatCycleDate(current.end)})`,
      start: current.start,
      end: current.end,
    },
    {
      key: 'prev-cycle',
      label: `Prev cycle (${formatCycleDate(previous.start)}–${formatCycleDate(previous.end)})`,
      start: previous.start,
      end: previous.end,
    },
    {
      key: 'today',
      label: 'Today',
      start: todayStr,
      end: todayStr,
    },
    {
      key: 'month',
      label: 'Calendar month',
      start: monthStart,
      end: todayStr,
    },
  ]
}

export default function ExpenseReport() {
  const [expenses, setExpenses] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [activePreset, setActivePreset] = useState(null)
  const { addToast, ToastContainer } = useToast()

  const presets = getPresets()

  const buildParams = useCallback((overrides = {}) => {
    const params = { type: 'expense', ...overrides }
    if (startDate) params.startDate = startDate
    if (endDate) params.endDate = endDate
    return params
  }, [startDate, endDate])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getTransactions(buildParams({ page, limit: 100 }))
      setExpenses(data.transactions)
      setTotal(data.total)
      setPages(data.pages)
    } catch {
      addToast('Failed to load expenses', 'error')
    } finally {
      setLoading(false)
    }
  }, [page, buildParams])

  useEffect(() => { load() }, [load])

  const applyPreset = (preset) => {
    setStartDate(preset.start)
    setEndDate(preset.end)
    setActivePreset(preset.key)
    setPage(1)
  }

  const clearAll = () => {
    setStartDate('')
    setEndDate('')
    setActivePreset(null)
    setPage(1)
  }

  const handleDateChange = (setter) => (e) => {
    setter(e.target.value)
    setActivePreset(null)
    setPage(1)
  }

  const grandTotal = expenses.reduce((s, e) => s + e.total, 0)

  const buildFilename = () => {
    const parts = ['sentosa_expenses']
    if (activePreset === 'cycle') parts.push('current-cycle')
    else if (activePreset === 'prev-cycle') parts.push('previous-cycle')
    else if (startDate && endDate) parts.push(`${startDate}_to_${endDate}`)
    else if (startDate) parts.push(`from_${startDate}`)
    else if (endDate) parts.push(`to_${endDate}`)
    else parts.push(new Date().toISOString().slice(0, 10))
    return parts.join('_') + '.csv'
  }

  const exportCSV = async () => {
    setExporting(true)
    addToast(`Fetching all ${total} expense records…`)
    try {
      const { data } = await getTransactions(buildParams({ page: 1, limit: 99999 }))
      const all = data.transactions

      const header = 'Date,Item,Quantity,Unit Price (₦),Total (₦),Notes,Total Expenses'
      let runningTotal = 0
      const rows = all.map((e, i) => {
        runningTotal += e.total
        const d = new Date(e.createdAt)
        const isLast = i === all.length - 1
        return [
          d.toLocaleDateString('en-GB'),
          e.service,
          e.qty || '',
          e.unitPrice || '',
          e.total,
          e.note || '',
          isLast ? runningTotal : ''
        ].map(v => `"${v}"`).join(',')
      })

      const csv = [header, ...rows].join('\n')
      const a = document.createElement('a')
      a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
      a.download = buildFilename()
      a.click()
      addToast(`✓ Exported ${all.length} expense records`)
    } catch {
      addToast('Export failed. Try again.', 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="expense-report">

      {/* Cycle quick-filter buttons */}
      <div className="preset-row">
        {presets.map(p => (
          <button
            key={p.key}
            className={`preset-btn ${activePreset === p.key ? 'active' : ''}`}
            onClick={() => applyPreset(p)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="er-toolbar">
        <div className="filter-row">
          <label className="filter-label">From</label>
          <input type="date" value={startDate} onChange={handleDateChange(setStartDate)} />
          <label className="filter-label">To</label>
          <input type="date" value={endDate} onChange={handleDateChange(setEndDate)} />
          <button className="btn" onClick={clearAll}>Clear</button>
        </div>
        <div className="toolbar-right">
          <span className="log-count">{total} records</span>
          <button className="btn" onClick={exportCSV} disabled={exporting || total === 0}>
            {exporting ? 'Exporting…' : `↓ Export all${total > 0 ? ` (${total})` : ''}`}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="log-state">Loading…</div>
        ) : expenses.length === 0 ? (
          <div className="log-state">No expense records found.</div>
        ) : (
          <table className="er-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th>Quantity</th>
                <th>Unit Price (₦)</th>
                <th>Total (₦)</th>
                <th>Notes</th>
                <th className="th-grand">Total Expenses</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((ex, i) => {
                const d = new Date(ex.createdAt)
                const isLast = i === expenses.length - 1
                return (
                  <tr key={ex._id}>
                    <td className="mono td-date">{d.toLocaleDateString('en-GB')}</td>
                    <td className="td-item">{ex.service}</td>
                    <td className="td-qty">{ex.qty || '—'}</td>
                    <td className="mono td-num">{ex.unitPrice ? fmt(ex.unitPrice) : '—'}</td>
                    <td className="mono td-num td-total">{fmt(ex.total)}</td>
                    <td className="td-note">{ex.note || ''}</td>
                    <td className="td-grand">
                      {isLast ? (
                        <span className="grand-total-val">{fmt(grandTotal)}</span>
                      ) : ''}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div className="pagination">
          <button className="btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span className="page-info">Page {page} of {pages} &nbsp;·&nbsp; {total} total records</span>
          <button className="btn" disabled={page === pages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

      <ToastContainer />
    </div>
  )
}
