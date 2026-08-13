const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');

function getDateRange(period) {
  const now = new Date();
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case 'today':
      break;
    case 'week':
      start.setDate(now.getDate() - 6);
      break;
    case 'month':
      start.setDate(1);
      break;
    case 'year':
      start.setMonth(0, 1);
      break;
    case 'all':
      return {};
    default:
      break;
  }

  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { $gte: start, $lte: end };
}

// GET /api/analytics/summary?period=today|week|month|year|all
router.get('/summary', async (req, res) => {
  try {
    const { period = 'today' } = req.query;
    const dateFilter = getDateRange(period);
    const filter = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

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
    ]);

    const income = incomeAgg[0] || { total: 0, count: 0 };
    const expense = expenseAgg[0] || { total: 0, count: 0 };
    const payments = {};
    paymentAgg.forEach(p => { payments[p._id] = p.total; });
    const genSurchargeTotal = genAgg[0]?.genTotal || 0;

    res.json({
      income: income.total,
      incomeCount: income.count,
      expense: expense.total,
      expenseCount: expense.count,
      net: income.total - expense.total,
      cash: payments['Cash'] || 0,
      transfer: payments['Transfer'] || 0,
      genSurchargeTotal
    });
  } catch (err) {
    console.error('Summary error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/analytics/by-service?period=today|week|month|year|all
router.get('/by-service', async (req, res) => {
  try {
    const { period = 'today' } = req.query;
    const dateFilter = getDateRange(period);
    const filter = Object.keys(dateFilter).length
      ? { createdAt: dateFilter, type: 'income' }
      : { type: 'income' };

    const breakdown = await Transaction.aggregate([
      { $match: filter },
      { $group: { _id: '$service', total: { $sum: '$total' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);

    res.json(breakdown.map(b => ({ service: b._id, total: b.total, count: b.count })));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/analytics/daily?days=30 — revenue per day for chart
router.get('/daily', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

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
    ]);

    res.json(data.map(d => ({ date: d._id, total: d.total, count: d.count })));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
