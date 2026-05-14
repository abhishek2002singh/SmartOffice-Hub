const mongoose = require('mongoose');

const devTimeLogSchema = new mongoose.Schema({
  taskId:    { type: mongoose.Schema.Types.ObjectId, ref: 'DevTask', required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'DevProject', required: true },
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  minutes:   { type: Number, required: true, min: 1 },
  date:      { type: Date, default: Date.now },
  notes:     { type: String, trim: true },
}, { timestamps: true });

devTimeLogSchema.index({ taskId: 1 });
devTimeLogSchema.index({ projectId: 1, user: 1 });
devTimeLogSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('DevTimeLog', devTimeLogSchema);
