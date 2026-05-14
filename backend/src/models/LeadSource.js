const mongoose = require('mongoose');

const leadSourceSchema = new mongoose.Schema(
  {
    name:      { type: String, required: true, trim: true },
    code:      { type: String, required: true, trim: true, unique: true },
    isActive:  { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

leadSourceSchema.index({ isActive: 1 });

module.exports = mongoose.model('LeadSource', leadSourceSchema);
