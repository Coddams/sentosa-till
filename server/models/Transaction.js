const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true
  },
  service: {
    type: String,
    required: true,
    trim: true
  },
  qty: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  genSurcharge: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  payment: {
    type: String,
    enum: ['Cash', 'Transfer', 'Expense'],
    required: true
  },
  note: {
    type: String,
    trim: true,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now  // defaults to now, but can be overridden for backdating
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false // we manage createdAt manually
});

// Index for fast date-range queries
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
