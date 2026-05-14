const mongoose = require('mongoose');

// ANK custom severity definitions:
// blocker   = deployment/release stopped, client-facing crash
// critical  = major feature completely broken, no workaround
// major     = feature partly broken, workaround exists
// minor     = small issue, doesn't affect core workflow
// cosmetic  = UI/design only, no functional impact

const devBugSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'DevProject', required: true },
  taskId:    { type: mongoose.Schema.Types.ObjectId, ref: 'DevTask' }, // bug found during this task
  title:     { type: String, required: true, trim: true },
  description:       { type: String, trim: true },
  stepsToReproduce:  { type: String, trim: true },
  expectedBehavior:  { type: String, trim: true },
  actualBehavior:    { type: String, trim: true },
  severity: {
    type: String,
    enum: ['blocker', 'critical', 'major', 'minor', 'cosmetic'],
    required: true,
  },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'fixed', 'verified', 'closed', 'wont_fix', 'duplicate'],
    default: 'open',
  },
  foundIn: { type: String, enum: ['staging', 'production', 'local', 'other'], default: 'staging' },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  screenshots: [{ type: String }], // Google Drive links
  resolvedAt:  { type: Date },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt:   { type: Date, default: null },
}, { timestamps: true });

devBugSchema.index({ projectId: 1, status: 1 });
devBugSchema.index({ projectId: 1, severity: 1 });
devBugSchema.index({ assignedTo: 1, status: 1 });
devBugSchema.index({ createdAt: -1 });

module.exports = mongoose.model('DevBug', devBugSchema);
