const mongoose = require('mongoose');

const devMilestoneSchema = new mongoose.Schema({
  projectId:   { type: mongoose.Schema.Types.ObjectId, ref: 'DevProject', required: true },
  title:       { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  sequence:    { type: Number, required: true },
  dueDate:     { type: Date, required: true },
  completedDate: { type: Date },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'delayed'],
    default: 'pending',
  },
  deliverables: [{ type: String, trim: true }],
  assignedTo:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt:   { type: Date, default: null },
}, { timestamps: true });

devMilestoneSchema.index({ projectId: 1, sequence: 1 });
devMilestoneSchema.index({ projectId: 1, status: 1 });
devMilestoneSchema.index({ dueDate: 1 });

module.exports = mongoose.model('DevMilestone', devMilestoneSchema);
