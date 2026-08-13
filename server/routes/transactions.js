const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');

// POST /api/transactions — create new transaction
router.post('/', async (req, res) => {
  try {
    const { type, service, qty, unitPrice, genSurcharge, total, payment, note, customDate } = req.body;

    if (!type || !service || qty === undefined || unitPrice === undefined || !total || !payment) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Use customDate if provided (backdating), otherwise default to now
    const createdAt = customDate ? new Date(customDate) : new Date();

    // Validate the date is not in the future
    if (createdAt > new Date()) {
      return res.status(400).json({ error: 'Date cannot be in the future' });
    }

    const tx = new Transaction({
      type, service, qty,
      unitPrice, genSurcharge: genSurcharge || 0,
      total, payment, note: note || '',
      createdAt, updatedAt: new Date()
    });

    await tx.save();
    res.status(201).json(tx);
  } catch (err) {
    console.error('Create transaction error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/transactions — fetch with optional filters
router.get('/', async (req, res) => {
  try {
    const { type, payment, startDate, endDate, limit = 100, page = 1 } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (payment) filter.payment = payment;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [transactions, total] = await Promise.all([
      Transaction.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit)).skip(skip),
      Transaction.countDocuments(filter)
    ]);

    res.json({ transactions, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error('Fetch transactions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/transactions/today — today's log
router.get('/today', async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const transactions = await Transaction.find({
      createdAt: { $gte: start, $lte: end }
    }).sort({ createdAt: -1 });

    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', async (req, res) => {
  try {
    const tx = await Transaction.findByIdAndDelete(req.params.id);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });
    res.json({ message: 'Deleted', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
