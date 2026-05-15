const mongoose = require('mongoose');
const { Schema } = mongoose;

const goalSchema = new Schema({
  employeeId:       { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  cycleId:          { type: Schema.Types.ObjectId, ref: 'PerformanceCycle', required: true },
  kraId:            { type: Schema.Types.ObjectId, ref: 'KRA', default: null },
  title:            { type: String, required: true, trim: true },
  description:      { type: String, trim: true, default: '' },
  targetValue:      { type: String, trim: true, default: '' }, // can be numeric or descriptive
  achievedValue:    { type: String, trim: true, default: '' },
  weightagePercent: { type: Number, min: 0, max: 100, default: 0 },
  status:           { type: String, enum: ['set', 'in_progress', 'achieved', 'missed'], default: 'set' },
  setByManager:     { type: Boolean, default: false },
  createdBy:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy:        { type: Schema.Types.ObjectId, ref: 'User' },
  deletedAt:        { type: Date, default: null },
}, { timestamps: true });

goalSchema.index({ employeeId: 1, cycleId: 1 });
goalSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('Goal', goalSchema);
