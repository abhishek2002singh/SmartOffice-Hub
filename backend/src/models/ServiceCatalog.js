const mongoose = require('mongoose');

const CATEGORIES = ['web', 'digital_marketing', 'messaging', 'advertising', 'other'];

const serviceCatalogSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    code:        { type: String, required: true, trim: true, unique: true, uppercase: true },
    category:    { type: String, enum: CATEGORIES, default: 'other' },
    description: { type: String, trim: true },
    isActive:    { type: Boolean, default: true },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt:   { type: Date, default: null },
  },
  { timestamps: true }
);

serviceCatalogSchema.index({ category: 1, isActive: 1 });

module.exports = mongoose.model('ServiceCatalog', serviceCatalogSchema);
module.exports.CATEGORIES = CATEGORIES;
