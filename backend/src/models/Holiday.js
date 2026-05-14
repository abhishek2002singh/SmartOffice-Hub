const mongoose = require('mongoose');
const { Schema } = mongoose;

const holidaySchema = new Schema({
  date:          { type: Date, required: true, unique: true },
  name:          { type: String, required: true, trim: true },
  type:          { type: String, enum: ['national', 'regional', 'optional'], default: 'national' },
  applicableTo:  { type: String, enum: ['all', 'delhi', 'remote'], default: 'all' },
  deletedAt:     { type: Date, default: null },
}, { timestamps: true });

// date index created by unique:true above
holidaySchema.index({ deletedAt: 1 });

module.exports = mongoose.model('Holiday', holidaySchema);
