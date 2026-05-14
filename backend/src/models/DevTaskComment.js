const mongoose = require('mongoose');

const devTaskCommentSchema = new mongoose.Schema({
  taskId:   { type: mongoose.Schema.Types.ObjectId, ref: 'DevTask', required: true },
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message:  { type: String, required: true, trim: true },
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

devTaskCommentSchema.index({ taskId: 1, createdAt: 1 });

module.exports = mongoose.model('DevTaskComment', devTaskCommentSchema);
