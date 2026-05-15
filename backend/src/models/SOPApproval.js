const mongoose = require('mongoose');
const { Schema } = mongoose;

const sopApprovalSchema = new Schema({
  sopId:          { type: Schema.Types.ObjectId, ref: 'SOP', required: true, index: true },
  versionNumber:  { type: Number, required: true },
  requestedBy:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  requestedAt:    { type: Date, default: Date.now },
  reviewerId:     { type: Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt:     { type: Date, default: null },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'changes_requested'],
    default: 'pending',
    index: true,
  },
  reviewComments: { type: String, default: '' },
  deletedAt:      { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('SOPApproval', sopApprovalSchema);
