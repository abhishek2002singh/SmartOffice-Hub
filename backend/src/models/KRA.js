const mongoose = require('mongoose');

const kraSchema = new mongoose.Schema({
  name:             { type: String, required: true, trim: true },
  description:      { type: String, trim: true, default: '' },
  applicableRoles:  { type: [String], default: [] }, // e.g. ['TEAM_MEMBER', 'DEPT_HEAD']
  measurableUnits:  { type: String, trim: true, default: '' }, // e.g. 'leads/month', 'tasks completed'
  weightagePercent: { type: Number, min: 0, max: 100, default: 0 },
  isActive:         { type: Boolean, default: true },
  createdBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt:        { type: Date, default: null },
}, { timestamps: true });

kraSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('KRA', kraSchema);
