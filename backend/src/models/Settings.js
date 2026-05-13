const mongoose = require('mongoose');

// Singleton settings document — always one record (upserted)
const settingsSchema = new mongoose.Schema(
  {
    companyName: { type: String, default: 'ANK Digital Media', trim: true },
    companyEmail: { type: String, default: 'info@ankdigitalmedia.com', trim: true },
    companyPhone: { type: String, default: '09999779817', trim: true },
    companyWebsite: { type: String, default: 'ankdigitalmedia.com', trim: true },
    companyAddress: { type: String, default: 'Delhi, India', trim: true },
    fiscalYearStart: { type: String, default: 'April', enum: ['January', 'April', 'July', 'October'] },
    timezone: { type: String, default: 'Asia/Kolkata' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
