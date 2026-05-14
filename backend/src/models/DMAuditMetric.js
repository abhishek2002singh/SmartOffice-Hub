const mongoose = require('mongoose');

const dmAuditMetricSchema = new mongoose.Schema({
  platform:    { type: mongoose.Schema.Types.ObjectId, ref: 'DMPlatform', required: true, index: true },
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  valueType:   { type: String, enum: ['text', 'number', 'percentage', 'currency'], default: 'text' },
  unit:        { type: String, default: '' }, // e.g. "hours", "%", "₹"
  isActive:    { type: Boolean, default: true },
  sortOrder:   { type: Number, default: 0 },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt:   { type: Date, default: null },
}, { timestamps: true });

dmAuditMetricSchema.index({ platform: 1, deletedAt: 1, sortOrder: 1 });

module.exports = mongoose.model('DMAuditMetric', dmAuditMetricSchema);
