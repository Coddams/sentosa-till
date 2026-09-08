const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');

/**
 * Sentosa billing cycle: 28th of previous month → 27th of current month.
 * "This month" means the current cycle, not the calendar month.
 */
function getBillingCycle(date = new Date()) {
  const d = new Date(date)
  let cycleStart, cycleEnd

  if (d.getDate() >= 28) {
    // We're in the 28th–end of month portion — cycle started this month's 28th
    cycleStart = new Date(d.getFullYear(), d.getMonth(), 28, 0, 0, 0, 0)
    // Cycle ends on the 27th of next month
    cycleEnd = new Date(d.getFullYear(), d.getMonth() + 1, 27, 23, 59, 59, 999)
  } else {
    // We're in the 1st–27th portion — cycle started on the 28th of last month
    cycleStart = new Date(d.getFullYear(), d.getMonth() - 1, 28, 0, 0, 0, 0)
    cycleEnd = new Date(d.getFullYear(), d.getMonth(), 27, 23, 59, 59, 999)
  }

  return { cycleStart, cycleEnd }
}

function getDateRange(period) {
  const now = new Date()

  switch (period) {
    case 'today': {
      const start = new Date(now)
      start.setHours(0, 0, 0, 0)
      const end = new Date(now)
      end.setHours(23, 59, 59, 999)
      return { $gte: start, $lte: end }
    }

    case 'week': {
      const start = new Date(now)
      start.setDate(now.getDate() - 6)
      start.setHours(0, 0, 0, 0)
      const end = new Date(now)
      end.setHours(23, 59, 59, 999)
      return { $gte: start, $lte: end }
    }

    case 'month': {
      // Sentosa billing cycle: 28th → 27th
      const { cycleStart, cycleEnd } = getBillingCycle(now)
      return { $gte: cycleStart, $lte: cycleEnd }
    }

    case 'year': {
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
      const end = new Date(now)
      end.setHours(23, 59, 59, 999)
      return { $gte: start, $lte: end }
    }

    case 'all':
    default:
      return {}
  }
}

// GET /api/analytics/summary?period=today|week|month|year|all
router.get('/summary', async (req, res) => {
  try {
    const { period = 'today' } = req.query
    const dateFilter = getDateRange(period)
    const filter = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}

    const [incomeAgg, expenseAgg, paymentAgg, genAgg] = await Promise.all([
      Transaction.aggregate([
        { $match: { ...filter, type: 'income' } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
      ]),
      Transaction.aggregate([
        { $match: { ...filter, type: 'expense' } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
      ]),
      Transaction.aggregate([
        { $match: { ...filter, type: 'income' } },
        { $group: { _id: '$payment', total: { $sum: '$total' } } }
      ]),
      Transaction.aggregate([
        { $match: { ...filter, type: 'income' } },
        { $group: { _id: null, genTotal: { $sum: '$genSurcharge' } } }
      ])
    ])

    const income = incomeAgg[0] || { total: 0, count: 0 }
    const expense = expenseAgg[0] || { total: 0, count: 0 }
    const payments = {}
    paymentAgg.forEach(p => { payments[p._id] = p.total })
    const genSurchargeTotal = genAgg[0]?.genTotal || 0

    // Include cycle dates in response so frontend can display them
    const cycleDates = period === 'month' ? getBillingCycle() : null

    res.json({
      income: income.total,
      incomeCount: income.count,
      expense: expense.total,
      expenseCount: expense.count,
      net: income.total - expense.total,
      cash: payments['Cash'] || 0,
      transfer: payments['Transfer'] || 0,
      genSurchargeTotal,
      cycleDates: cycleDates ? {
        start: cycleDates.cycleStart,
        end: cycleDates.cycleEnd
      } : null
    })
  } catch (err) {
    console.error('Summary error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/analytics/by-service?period=today|week|month|year|all
router.get('/by-service', async (req, res) => {
  try {
    const { period = 'today' } = req.query
    const dateFilter = getDateRange(period)
    const filter = Object.keys(dateFilter).length
      ? { createdAt: dateFilter, type: 'income' }
      : { type: 'income' }

    const breakdown = await Transaction.aggregate([
      { $match: filter },
      { $group: { _id: '$service', total: { $sum: '$total' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ])

    res.json(breakdown.map(b => ({ service: b._id, total: b.total, count: b.count })))
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/analytics/daily?days=30 — revenue per day for trend chart
router.get('/daily', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30
    const start = new Date()
    start.setDate(start.getDate() - (days - 1))
    start.setHours(0, 0, 0, 0)

    const data = await Transaction.aggregate([
      { $match: { createdAt: { $gte: start }, type: 'income' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: '$total' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])

    res.json(data.map(d => ({ date: d._id, total: d.total, count: d.count })))
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
