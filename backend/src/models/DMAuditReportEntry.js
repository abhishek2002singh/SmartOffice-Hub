const mongoose = require('mongoose');

const dmAuditReportEntrySchema = new mongoose.Schema({
  report:   { type: mongoose.Schema.Types.ObjectId, ref: 'DMAuditReport', required: true, index: true },
  metric:   { type: mongoose.Schema.Types.ObjectId, ref: 'DMAuditMetric', required: true },
  value:    { type: mongoose.Schema.Types.Mixed, default: null }, // string or number
  notes:    { type: String, default: '' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

dmAuditReportEntrySchema.index({ report: 1, metric: 1 }, { unique: true });

module.exports = mongoose.model('DMAuditReportEntry', dmAuditReportEntrySchema);
