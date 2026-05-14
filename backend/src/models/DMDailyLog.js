const mongoose = require('mongoose');

const dmDailyLogSchema = new mongoose.Schema({
  client:        { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  platform:      { type: mongoose.Schema.Types.ObjectId, ref: 'DMPlatform', required: true },
  task:          { type: mongoose.Schema.Types.ObjectId, ref: 'DMDailyTask', default: null },
  customField:   { type: mongoose.Schema.Types.ObjectId, ref: 'DMCustomField', default: null },
  date:          { type: String, required: true }, // YYYY-MM-DD — the date for which this log is
  completedAt:   { type: Date, default: null },
  completedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  count:         { type: Number, default: null }, // for hasCount tasks
  customValue:   { type: String, default: null }, // for custom fields
  notes:         { type: String, default: '' },
  isCompleted:   { type: Boolean, default: false },
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Compound index: one log entry per (client, platform, task/customField, date)
dmDailyLogSchema.index({ client: 1, platform: 1, date: 1 });
dmDailyLogSchema.index({ client: 1, platform: 1, task: 1, date: 1 }, { unique: true, sparse: true, partialFilterExpression: { task: { $ne: null } } });
dmDailyLogSchema.index({ completedBy: 1, date: 1 });

module.exports = mongoose.model('DMDailyLog', dmDailyLogSchema);
