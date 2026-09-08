import { useState, useEffect, useCallback } from 'react'
import { getTransactions, deleteTransaction } from '../utils/api'
import { fmt } from '../utils/services'
import { getBillingCycle, getPreviousCycle, formatCycleDate } from '../utils/cycle'
import { useToast } from '../hooks/useToast'
import './Log.css'

// Quick-filter presets
function getPresets() {
  const current = getBillingCycle()
  const previous = getPreviousCycle()
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)

  // Start of calendar month
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

export default function Log() {
  const [txns, setTxns] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [payFilter, setPayFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [activePreset, setActivePreset] = useState(null)
  const { addToast, ToastContainer } = useToast()

  const presets = getPresets()

  const buildParams = useCallback((overrides = {}) => {
    const params = { ...overrides }
    if (typeFilter) params.type = typeFilter
    if (payFilter) params.payment = payFilter
    if (startDate) params.startDate = startDate
    if (endDate) params.endDate = endDate
    return params
  }, [typeFilter, payFilter, startDate, endDate])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getTransactions(buildParams({ page, limit: 50 }))
      setTxns(data.transactions)
      setTotal(data.total)
      setPages(data.pages)
    } catch {
      addToast('Failed to load transactions', 'error')
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
    setTypeFilter('')
    setPayFilter('')
    setStartDate('')
    setEndDate('')
    setActivePreset(null)
    setPage(1)
  }

  // Deactivate preset badge if dates are manually changed
  const handleDateChange = (setter) => (e) => {
    setter(e.target.value)
    setActivePreset(null)
    setPage(1)
  }

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value)
    setPage(1)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return
    try {
      await deleteTransaction(id)
      setTxns(prev => prev.filter(t => t._id !== id))
      setTotal(prev => prev - 1)
      addToast('Deleted')
    } catch {
      addToast('Failed to delete', 'error')
    }
  }

  const buildFilename = () => {
    const parts = ['sentosa']
    if (activePreset === 'cycle') parts.push('current-cycle')
    else if (activePreset === 'prev-cycle') parts.push('previous-cycle')
    else if (startDate && endDate) parts.push(`${startDate}_to_${endDate}`)
    else if (startDate) parts.push(`from_${startDate}`)
    else if (endDate) parts.push(`to_${endDate}`)
    else parts.push(new Date().toISOString().slice(0, 10))
    if (typeFilter) parts.push(typeFilter)
    if (payFilter) parts.push(payFilter.toLowerCase())
    return parts.join('_') + '.csv'
  }

  const exportCSV = async () => {
    setExporting(true)
    addToast(`Fetching all ${total} records…`)
    try {
      const { data } = await getTransactions(buildParams({ page: 1, limit: 99999 }))
      const all = data.transactions

      const header = 'Date,Time,Type,Service,Qty,Unit Price,Gen Surcharge,Total,Payment,Note'
      const rows = all.map(t => {
        const d = new Date(t.createdAt)
        return [
          d.toLocaleDateString('en-GB'),
          d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }),
          t.type, t.service, t.qty, t.unitPrice, t.genSurcharge || 0,
          t.total, t.payment, t.note || ''
        ].map(v => `"${v}"`).join(',')
      })

      const csv = [header, ...rows].join('\n')
      const a = document.createElement('a')
      a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
      a.download = buildFilename()
      a.click()
      addToast(`✓ Exported ${all.length} records`)
    } catch {
      addToast('Export failed. Try again.', 'error')
    } finally {
      setExporting(false)
    }
  }

  const totalIncome = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.total, 0)

  return (
    <div className="log-page">

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

      <div className="log-toolbar">
        <div className="filter-row">
          <select value={typeFilter} onChange={handleFilterChange(setTypeFilter)}>
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select value={payFilter} onChange={handleFilterChange(setPayFilter)}>
            <option value="">All payments</option>
            <option value="Cash">Cash</option>
            <option value="Transfer">Transfer</option>
            <option value="Expense">Expense</option>
          </select>
          <input
            type="date"
            value={startDate}
            onChange={handleDateChange(setStartDate)}
          />
          <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>→</span>
          <input
            type="date"
            value={endDate}
            onChange={handleDateChange(setEndDate)}
          />
          <button className="btn" onClick={clearAll}>Clear</button>
        </div>
        <div className="toolbar-right">
          <span className="log-count">{total} records</span>
          <button className="btn" onClick={exportCSV} disabled={exporting || total === 0}>
            {exporting ? 'Exporting…' : `↓ Export all${total > 0 ? ` (${total})` : ''}`}
          </button>
        </div>
      </div>

      {txns.length > 0 && (
        <div className="log-summary-bar">
          Income shown: <strong>{fmt(totalIncome)}</strong>
          {total > txns.length && (
            <span style={{ marginLeft: 12, opacity: 0.8 }}>
              — showing {txns.length} of {total} records
            </span>
          )}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="log-state">Loading…</div>
        ) : txns.length === 0 ? (
          <div className="log-state">No transactions found.</div>
        ) : (
          <table className="log-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Service / Item</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Gen</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Note</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {txns.map(tx => {
                const d = new Date(tx.createdAt)
                return (
                  <tr key={tx._id} className={tx.type === 'expense' ? 'row-expense' : ''}>
                    <td className="mono">{d.toLocaleDateString('en-GB')}</td>
                    <td className="mono faint">{d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="td-service">{tx.service}</td>
                    <td className="mono center">{tx.qty}</td>
                    <td className="mono faint">{fmt(tx.unitPrice)}</td>
                    <td className="center">{tx.genSurcharge > 0 ? '⚡' : '—'}</td>
                    <td className="mono bold">{fmt(tx.total)}</td>
                    <td><span className={`badge badge-${tx.payment.toLowerCase()}`}>{tx.payment}</span></td>
                    <td className="faint">{tx.note || '—'}</td>
                    <td>
                      <button className="del-btn" onClick={() => handleDelete(tx._id)}>×</button>
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
          <span className="page-info">Page {page} of {pages}</span>
          <button className="btn" disabled={page === pages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

      <ToastContainer />
    </div>
  )
}
