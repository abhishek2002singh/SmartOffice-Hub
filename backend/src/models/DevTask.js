const mongoose = require('mongoose');

const devTaskSchema = new mongoose.Schema({
  projectId:   { type: mongoose.Schema.Types.ObjectId, ref: 'DevProject', required: true },
  milestoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'DevMilestone' },
  title:       { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  assignedTo:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reportedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: ['feature', 'improvement', 'chore', 'documentation'],
    default: 'feature',
  },
  status: {
    type: String,
    enum: ['backlog', 'todo', 'in_progress', 'code_review', 'testing', 'done', 'blocked'],
    default: 'backlog',
  },
  priority: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
  estimatedHours: { type: Number },
  actualHours:    { type: Number, default: 0 },
  dueDate:        { type: Date },
  completedDate:  { type: Date },
  tags:           [{ type: String, trim: true }],
  dependencies:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'DevTask' }],
  attachments:    [{ type: String }], // Google Drive links
  kanbanOrder:    { type: Number, default: 0 }, // for Kanban drag-drop ordering
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt:  { type: Date, default: null },
}, { timestamps: true });

devTaskSchema.index({ projectId: 1, status: 1 });
devTaskSchema.index({ assignedTo: 1, status: 1 });
devTaskSchema.index({ milestoneId: 1 });
devTaskSchema.index({ dueDate: 1 });
devTaskSchema.index({ projectId: 1, kanbanOrder: 1 });

module.exports = mongoose.model('DevTask', devTaskSchema);
