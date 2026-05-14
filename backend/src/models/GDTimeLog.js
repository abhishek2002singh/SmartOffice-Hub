const mongoose = require('mongoose');

const gdTimeLogSchema = new mongoose.Schema({
  task:     { type: mongoose.Schema.Types.ObjectId, ref: 'GDTask', required: true, index: true },
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
  minutes:  { type: Number, required: true, min: 1 },
  notes:    { type: String, default: '' },
  loggedAt: { type: Date, default: Date.now },
}, { timestamps: true });

gdTimeLogSchema.index({ task: 1, user: 1 });

module.exports = mongoose.model('GDTimeLog', gdTimeLogSchema);
