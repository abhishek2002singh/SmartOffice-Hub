const mongoose = require('mongoose');

const COMM_TYPES      = ['call', 'whatsapp', 'sms', 'email', 'note', 'meeting'];
const COMM_DIRECTIONS = ['in', 'out'];

const communicationSchema = new mongoose.Schema(
  {
    lead:      { type: mongoose.Schema.Types.ObjectId, ref: 'Lead',   default: null, index: true },
    client:    { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null, index: true },
    type:      { type: String, enum: COMM_TYPES,      required: true },
    direction: { type: String, enum: COMM_DIRECTIONS, default: 'out' },
    content:   { type: String, required: true, trim: true },
    duration:  { type: Number, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

communicationSchema.index({ lead: 1,   createdAt: -1 });
communicationSchema.index({ client: 1, createdAt: -1 });

module.exports = mongoose.model('Communication', communicationSchema);
module.exports.COMM_TYPES      = COMM_TYPES;
module.exports.COMM_DIRECTIONS = COMM_DIRECTIONS;
