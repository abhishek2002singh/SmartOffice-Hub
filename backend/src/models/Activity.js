const mongoose = require('mongoose');

const ACTIVITY_TYPES = ['note', 'call', 'email', 'meeting', 'stage_change', 'assignment', 'whatsapp', 'system'];

const activitySchema = new mongoose.Schema(
  {
    lead:      { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    type:      { type: String, enum: ACTIVITY_TYPES, required: true },
    note:      { type: String, trim: true },
    from:      { type: String, trim: true },
    to:        { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

activitySchema.index({ lead: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
module.exports.ACTIVITY_TYPES = ACTIVITY_TYPES;
