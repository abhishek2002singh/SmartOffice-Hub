const mongoose = require('mongoose');

const PERIODS = [7, 15, 30, 60, 90];

const dmAuditReportSchema = new mongoose.Schema({
  client:       { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
  platform:     { type: mongoose.Schema.Types.ObjectId, ref: 'DMPlatform', required: true, index: true },
  periodDays:   { type: Number, enum: PERIODS, required: true },
  startDate:    { type: Date, required: true },
  endDate:      { type: Date, required: true },
  status:       { type: String, enum: ['draft', 'published'], default: 'draft' },
  // Free-form narrative fields
  achievements:     { type: String, default: '' },
  challenges:       { type: String, default: '' },
  recommendations:  { type: String, default: '' },
  nextGoals:        { type: String, default: '' },
  generatedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  publishedAt:  { type: Date, default: null },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt:    { type: Date, default: null },
}, { timestamps: true });

dmAuditReportSchema.index({ client: 1, platform: 1, periodDays: 1, startDate: -1 });
dmAuditReportSchema.index({ status: 1, deletedAt: 1 });

module.exports = mongoose.model('DMAuditReport', dmAuditReportSchema);
