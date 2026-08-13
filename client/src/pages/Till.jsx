import { useState, useEffect, useCallback, useRef } from 'react'
import { SERVICES, GEN_SURCHARGE, KEY_MAP, fmt } from '../utils/services'
import { createTransaction, getTodayTransactions, deleteTransaction } from '../utils/api'
import { useToast } from '../hooks/useToast'
import './Till.css'

const INCOME_TAB = 'income'
const EXPENSE_TAB = 'expense'

function toDateInputValue(date) {
  // Returns YYYY-MM-DD in local time for the date input
  const d = new Date(date)
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
}

function isToday(dateStr) {
  return dateStr === toDateInputValue(new Date())
}

export default function Till() {
  const [tab, setTab] = useState(INCOME_TAB)
  const [selectedSvc, setSelectedSvc] = useState(null)
  const [qty, setQty] = useState(1)
  const [unitPrice, setUnitPrice] = useState(0)
  const [note, setNote] = useState('')
  const [genOn, setGenOn] = useState(false)
  const [payment, setPayment] = useState('Cash')
  const [submitting, setSubmitting] = useState(false)
  const [txDate, setTxDate] = useState(toDateInputValue(new Date())) // date picker — defaults to today

  // Expense fields
  const [expItem, setExpItem] = useState('')
  const [expQtyStr, setExpQtyStr] = useState('')
  const [expQnum, setExpQnum] = useState(1)
  const [expUnitPrice, setExpUnitPrice] = useState(0)
  const [expNote, setExpNote] = useState('')

  const [todayTxns, setTodayTxns] = useState([])
  const [loadingLog, setLoadingLog] = useState(true)

  const qtyRef = useRef(null)
  const { addToast, ToastContainer } = useToast()

  const loadToday = useCallback(async () => {
    try {
      const { data } = await getTodayTransactions()
      setTodayTxns(data)
    } catch {
      // silent
    } finally {
      setLoadingLog(false)
    }
  }, [])

  useEffect(() => { loadToday() }, [loadToday])

  const selectSvc = useCallback((svc) => {
    setSelectedSvc(svc)
    setUnitPrice(svc.price)
    setGenOn(false)
    setTimeout(() => { qtyRef.current?.focus(); qtyRef.current?.select() }, 50)
  }, [])

  const genSurcharge = selectedSvc?.gen && genOn ? Number(qty) * GEN_SURCHARGE : 0
  const total = Number(qty) * Number(unitPrice) + genSurcharge
  const expTotal = Number(expQnum) * Number(expUnitPrice)
  const backdating = !isToday(txDate)

  const resetIncome = () => {
    setSelectedSvc(null)
    setQty(1)
    setUnitPrice(0)
    setNote('')
    setGenOn(false)
    qtyRef.current?.blur()
  }

  // Build a Date object at noon on the selected date (avoids timezone edge cases)
  const buildCustomDate = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d, 12, 0, 0).toISOString()
  }

  const submitIncome = async () => {
    if (!selectedSvc || submitting) return
    setSubmitting(true)
    try {
      const payload = {
        type: 'income',
        service: selectedSvc.name,
        qty: Number(qty),
        unitPrice: Number(unitPrice),
        genSurcharge,
        total,
        payment,
        note,
        customDate: backdating ? buildCustomDate(txDate) : undefined
      }
      const { data } = await createTransaction(payload)
      // Only prepend to today's log if the transaction is actually for today
      if (isToday(txDate)) {
        setTodayTxns(prev => [data, ...prev])
      }
      const dateLabel = backdating ? ` (${txDate})` : ''
      addToast(`✓ ${selectedSvc.name} — ${fmt(total)}${dateLabel}`)
      qtyRef.current?.blur()
      resetIncome()
    } catch {
      addToast('Failed to save. Check connection.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const submitExpense = async () => {
    if (!expItem.trim() || submitting) return
    setSubmitting(true)
    try {
      const payload = {
        type: 'expense',
        service: expItem.trim(),
        qty: expQtyStr || String(expQnum),
        unitPrice: Number(expUnitPrice),
        genSurcharge: 0,
        total: expTotal,
        payment: 'Expense',
        note: expNote,
        customDate: backdating ? buildCustomDate(txDate) : undefined
      }
      const { data } = await createTransaction(payload)
      if (isToday(txDate)) {
        setTodayTxns(prev => [data, ...prev])
      }
      const dateLabel = backdating ? ` (${txDate})` : ''
      addToast(`Expense: ${expItem} — ${fmt(expTotal)}${dateLabel}`)
      setExpItem(''); setExpQtyStr(''); setExpQnum(1); setExpUnitPrice(0); setExpNote('')
    } catch {
      addToast('Failed to save.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return
    try {
      await deleteTransaction(id)
      setTodayTxns(prev => prev.filter(t => t._id !== id))
      addToast('Transaction deleted')
    } catch {
      addToast('Failed to delete', 'error')
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (tab !== INCOME_TAB) return

      // Alt+C / Alt+T — payment toggle, works even while qty field is focused
      if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault()
        setPayment('Cash')
        return
      }
      if (e.altKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault()
        setPayment('Transfer')
        return
      }

      // Everything below only fires when no input is active
      const tag = document.activeElement.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      const svc = KEY_MAP[e.key]
      if (svc) { selectSvc(svc); return }
      if (e.key === 'c' || e.key === 'C') setPayment('Cash')
      if (e.key === 't' || e.key === 'T') setPayment('Transfer')
      if ((e.key === 'g' || e.key === 'G') && selectedSvc?.gen) setGenOn(v => !v)
      if (e.key === 'Enter' && selectedSvc) submitIncome()
      if (e.key === 'Escape') resetIncome()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [tab, selectedSvc, qty, unitPrice, note, genOn, payment, submitting, txDate])

  const todayIncome = todayTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.total, 0)
  const todayExpense = todayTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.total, 0)

  return (
    <div className="till">
      <div className="till-left">

        {/* Date picker — subtle when today, prominent when backdating */}
        <div className={`date-bar ${backdating ? 'date-bar-backdating' : ''}`}>
          <span className="date-bar-label">
            {backdating ? '⚠ Backdating to' : 'Recording for'}
          </span>
          <input
            type="date"
            value={txDate}
            max={toDateInputValue(new Date())}
            onChange={e => setTxDate(e.target.value)}
            className="date-input"
          />
          {backdating && (
            <button className="date-reset" onClick={() => setTxDate(toDateInputValue(new Date()))}>
              Back to today
            </button>
          )}
        </div>

        {/* Tab switch */}
        <div className="tab-row">
          <button className={`tab-btn ${tab === INCOME_TAB ? 'active' : ''}`} onClick={() => setTab(INCOME_TAB)}>
            ↑ Income
          </button>
          <button className={`tab-btn ${tab === EXPENSE_TAB ? 'active' : ''}`} onClick={() => setTab(EXPENSE_TAB)}>
            ↓ Expense
          </button>
        </div>

        {tab === INCOME_TAB && (
          <>
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="section-label">
                Service &nbsp;
                <span className="kbd">1–0</span> &nbsp;
                <span className="kbd">q w e r t y</span>
              </div>
              <div className="svc-grid">
                {SERVICES.map((svc) => (
                  <button
                    key={svc.id}
                    className={`svc-btn ${selectedSvc?.id === svc.id ? 'selected' : ''}`}
                    onClick={() => selectSvc(svc)}
                  >
                    <span className="svc-key">{svc.id}</span>
                    <span className="svc-name">{svc.name}</span>
                    <span className="svc-price">{svc.price ? fmt(svc.price) : '—'}/{svc.unit || 'job'}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              {selectedSvc?.gen && (
                <label className="gen-row">
                  <input type="checkbox" checked={genOn} onChange={e => setGenOn(e.target.checked)} />
                  <span>⚡ Generator in use</span>
                  <span className="gen-extra">+{fmt(GEN_SURCHARGE)}/page</span>
                </label>
              )}

              <div className="grid-3" style={{ marginBottom: 12 }}>
                <div className="field">
                  <label>Qty / Pages</label>
                  <input
                    ref={qtyRef}
                    type="number" min="1"
                    value={qty}
                    onChange={e => setQty(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') submitIncome()
                      if (e.key === 'Escape') resetIncome()
                    }}
                  />
                </div>
                <div className="field">
                  <label>Unit Price (₦)</label>
                  <input
                    type="number" min="0"
                    value={unitPrice}
                    onChange={e => setUnitPrice(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Note</label>
                  <input
                    type="text"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="optional"
                  />
                </div>
              </div>

              <div className="total-row">
                <div>
                  <span className="total-label">Total</span>
                  {genSurcharge > 0 && <span className="gen-tag">incl. {fmt(genSurcharge)} gen</span>}
                </div>
                <span className="total-amount mono">{fmt(total)}</span>
              </div>

              <div className="pay-row">
                <button
                  className={`pay-btn ${payment === 'Cash' ? 'selected' : ''}`}
                  onClick={() => setPayment('Cash')}
                >
                  Cash <span className="kbd">Alt+C</span>
                </button>
                <button
                  className={`pay-btn ${payment === 'Transfer' ? 'selected' : ''}`}
                  onClick={() => setPayment('Transfer')}
                >
                  Transfer <span className="kbd">Alt+T</span>
                </button>
              </div>

              <button
                className={`btn btn-full ${backdating ? 'btn-backdating' : 'btn-primary'}`}
                onClick={submitIncome}
                disabled={!selectedSvc || submitting}
              >
                {submitting ? 'Saving…' : backdating ? `Record for ${txDate}` : 'Record transaction'}
                {!backdating && <span className="kbd" style={{ opacity: 0.6 }}>Enter</span>}
              </button>
            </div>
          </>
        )}

        {tab === EXPENSE_TAB && (
          <div className="card">
            <div className="section-label">Expense details</div>
            <div className="grid-2" style={{ marginBottom: 12 }}>
              <div className="field">
                <label>Item / Description</label>
                <input
                  type="text"
                  value={expItem}
                  onChange={e => setExpItem(e.target.value)}
                  placeholder="e.g. A4 paper, fuel, ink"
                  autoFocus
                />
              </div>
              <div className="field">
                <label>Qty (with unit)</label>
                <input
                  type="text"
                  value={expQtyStr}
                  onChange={e => setExpQtyStr(e.target.value)}
                  placeholder="e.g. 2 reams, 10 litres"
                />
              </div>
            </div>
            <div className="grid-2" style={{ marginBottom: 12 }}>
              <div className="field">
                <label>Unit Price (₦)</label>
                <input type="number" value={expUnitPrice} onChange={e => setExpUnitPrice(e.target.value)} />
              </div>
              <div className="field">
                <label>Qty (number for total)</label>
                <input type="number" value={expQnum} onChange={e => setExpQnum(e.target.value)} />
              </div>
            </div>
            <div className="total-row" style={{ marginBottom: 12 }}>
              <span className="total-label">Total</span>
              <span className="total-amount mono">{fmt(expTotal)}</span>
            </div>
            <div className="field" style={{ marginBottom: 14 }}>
              <label>Note</label>
              <input type="text" value={expNote} onChange={e => setExpNote(e.target.value)} placeholder="e.g. plus transport" />
            </div>
            <button
              className={`btn btn-full ${backdating ? 'btn-backdating' : 'btn-danger'}`}
              onClick={submitExpense}
              disabled={!expItem.trim() || submitting}
            >
              {submitting ? 'Saving…' : backdating ? `Record expense for ${txDate}` : 'Record expense'}
            </button>
          </div>
        )}
      </div>

      {/* Right — today's log */}
      <div className="till-right">
        <div className="log-header">
          <div className="section-label" style={{ marginBottom: 0 }}>Today's log</div>
          <div className="day-summary">
            <span className="day-income">{fmt(todayIncome)}</span>
            <span className="day-sep">·</span>
            <span className="day-expense">−{fmt(todayExpense)}</span>
          </div>
        </div>

        <div className="log-list">
          {loadingLog ? (
            <div className="log-empty">Loading…</div>
          ) : todayTxns.length === 0 ? (
            <div className="log-empty">No transactions yet today.</div>
          ) : todayTxns.map(tx => (
            <div key={tx._id} className="log-row">
              <div className="log-time mono">
                {new Date(tx.createdAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="log-service">
                {tx.service}
                {tx.genSurcharge > 0 && <span className="gen-dot" title="Generator used">⚡</span>}
              </div>
              <div className="log-qty mono">{tx.qty}</div>
              <div className="log-amount mono">{fmt(tx.total)}</div>
              <div className="log-badge">
                <span className={`badge badge-${tx.payment.toLowerCase()}`}>{tx.payment}</span>
              </div>
              <button className="log-delete" onClick={() => handleDelete(tx._id)} title="Delete">×</button>
            </div>
          ))}
        </div>
      </div>

      <ToastContainer />
    </div>
  )
}
