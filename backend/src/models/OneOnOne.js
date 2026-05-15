const mongoose = require('mongoose');
const { Schema } = mongoose;

const actionItemSchema = new Schema({
  text:        { type: String, required: true, trim: true },
  dueDate:     { type: Date, default: null },
  completed:   { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
}, { _id: true });

const oneOnOneSchema = new Schema({
  managerId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  employeeId:   { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  scheduledAt:  { type: Date, required: true },
  conductedAt:  { type: Date, default: null },
  agenda:       { type: String, trim: true, default: '' },
  notes:        { type: String, trim: true, default: '' },
  actionItems:  { type: [actionItemSchema], default: [] },
  status:       { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },
  createdBy:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy:    { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

oneOnOneSchema.index({ managerId: 1, scheduledAt: -1 });
oneOnOneSchema.index({ employeeId: 1, scheduledAt: -1 });

module.exports = mongoose.model('OneOnOne', oneOnOneSchema);
