const mongoose = require('mongoose');

const clientContactSchema = new mongoose.Schema(
  {
    client:    { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    name:      { type: String, required: true, trim: true },
    role:      { type: String, trim: true },
    email:     { type: String, lowercase: true, trim: true },
    mobile:    { type: String, trim: true },
    isPrimary: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ClientContact', clientContactSchema);
