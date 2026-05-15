const mongoose = require('mongoose');
const { Schema } = mongoose;

const sopAcknowledgementSchema = new Schema({
  sopId:              { type: Schema.Types.ObjectId, ref: 'SOP', required: true },
  sopVersionNumber:   { type: Number, required: true },
  userId:             { type: Schema.Types.ObjectId, ref: 'User', required: true },
  acknowledgedAt:     { type: Date, default: Date.now },
  ipAddress:          { type: String, default: '' },
  userAgent:          { type: String, default: '' },
  signature:          { type: String, default: '' },
  acknowledgementText:{ type: String, default: '' },
  deletedAt:          { type: Date, default: null },
}, { timestamps: true });

sopAcknowledgementSchema.index({ sopId: 1, userId: 1, sopVersionNumber: 1 }, { unique: true });
sopAcknowledgementSchema.index({ userId: 1 });

module.exports = mongoose.model('SOPAcknowledgement', sopAcknowledgementSchema);
