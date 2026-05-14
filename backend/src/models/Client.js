const mongoose = require('mongoose');

const HEALTH_SCORES = ['red', 'yellow', 'green'];
const INDUSTRIES = [
  'real_estate', 'education', 'healthcare', 'finance', 'ecommerce',
  'hospitality', 'manufacturing', 'retail', 'technology', 'media', 'other',
];

const addressSchema = new mongoose.Schema({
  label:   { type: String, trim: true, default: 'Primary' },
  line1:   { type: String, trim: true },
  city:    { type: String, trim: true },
  state:   { type: String, trim: true },
  pincode: { type: String, trim: true },
  isDefault: { type: Boolean, default: false },
}, { _id: false });

const clientSchema = new mongoose.Schema(
  {
    name:           { type: String, required: true, trim: true },
    companyName:    { type: String, trim: true },
    email:          { type: String, lowercase: true, trim: true },
    mobile:         { type: String, trim: true, index: true },
    gstin:          { type: String, trim: true, uppercase: true },
    pan:            { type: String, trim: true, uppercase: true },
    industry:       { type: String, enum: INDUSTRIES, default: 'other' },
    addresses:      [addressSchema],

    accountManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    healthScore:    { type: String, enum: HEALTH_SCORES, default: 'green' },
    onboardingDate: { type: Date, default: Date.now },

    convertedFrom:  { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null },

    tags:  [{ type: String, trim: true }],
    notes: { type: String, trim: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

clientSchema.index({ createdAt: -1 });
clientSchema.index({ deletedAt: 1 });
clientSchema.index({ healthScore: 1 });
clientSchema.index({ accountManager: 1 });

module.exports = mongoose.model('Client', clientSchema);
module.exports.INDUSTRIES    = INDUSTRIES;
module.exports.HEALTH_SCORES = HEALTH_SCORES;
