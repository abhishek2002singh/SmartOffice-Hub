const mongoose = require('mongoose');

const performanceCycleSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  type:      { type: String, enum: ['quarterly', 'half_yearly', 'annual'], required: true },
  startDate: { type: Date, required: true },
  endDate:   { type: Date, required: true },
  status:    { type: String, enum: ['planned', 'active', 'in_review', 'completed'], default: 'planned' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

performanceCycleSchema.index({ status: 1 });
performanceCycleSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('PerformanceCycle', performanceCycleSchema);
