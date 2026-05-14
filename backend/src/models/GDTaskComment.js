const mongoose = require('mongoose');

const gdTaskCommentSchema = new mongoose.Schema({
  task:      { type: mongoose.Schema.Types.ObjectId, ref: 'GDTask', required: true, index: true },
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
  message:   { type: String, required: true, trim: true },
  mentions:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

gdTaskCommentSchema.index({ task: 1, createdAt: 1 });

module.exports = mongoose.model('GDTaskComment', gdTaskCommentSchema);
