const mongoose = require('mongoose');

const dmDailyTaskSchema = new mongoose.Schema({
  platform:    { type: mongoose.Schema.Types.ObjectId, ref: 'DMPlatform', required: true, index: true },
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  hasCount:    { type: Boolean, default: false }, // tasks like "Comments reply (Numbers)"
  isActive:    { type: Boolean, default: true },
  sortOrder:   { type: Number, default: 0 },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt:   { type: Date, default: null },
}, { timestamps: true });

dmDailyTaskSchema.index({ platform: 1, deletedAt: 1, sortOrder: 1 });

module.exports = mongoose.model('DMDailyTask', dmDailyTaskSchema);
