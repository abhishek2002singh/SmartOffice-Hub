const mongoose = require('mongoose');
const { Schema } = mongoose;

const progressItemSchema = new Schema({
  checklistItemId: { type: Schema.Types.ObjectId },
  title:           { type: String, required: true },
  description:     { type: String, default: '' },
  type:            { type: String, default: 'complete_task' },
  sopId:           { type: Schema.Types.ObjectId, ref: 'SOP', default: null },
  daysFromJoining: { type: Number, default: 1 },
  mandatory:       { type: Boolean, default: true },
  assignedRole:    { type: String, default: 'Self' },
  sortOrder:       { type: Number, default: 0 },
  dueDate:         { type: Date, default: null },
  status: {
    type: String,
    enum: ['pending', 'completed', 'skipped', 'overdue'],
    default: 'pending',
  },
  completedAt:  { type: Date, default: null },
  completedBy:  { type: Schema.Types.ObjectId, ref: 'User', default: null },
  notes:        { type: String, default: '' },
}, { _id: true });

const employeeOnboardingProgressSchema = new Schema({
  employeeId:   { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  checklistId:  { type: Schema.Types.ObjectId, ref: 'OnboardingChecklist', required: true },
  checklistName:{ type: String, default: '' },
  startDate:    { type: Date, required: true },
  items:        { type: [progressItemSchema], default: [] },
  overallStatus:{
    type: String,
    enum: ['in_progress', 'completed', 'overdue'],
    default: 'in_progress',
  },
  completedAt:  { type: Date, default: null },
  createdBy:    { type: Schema.Types.ObjectId, ref: 'User' },
  deletedAt:    { type: Date, default: null },
}, { timestamps: true });

employeeOnboardingProgressSchema.index({ employeeId: 1, checklistId: 1 }, { unique: true });

module.exports = mongoose.model('EmployeeOnboardingProgress', employeeOnboardingProgressSchema);
