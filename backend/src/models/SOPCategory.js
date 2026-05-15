const mongoose = require('mongoose');
const { Schema } = mongoose;

const sopCategorySchema = new Schema({
  name:         { type: String, required: true, trim: true },
  description:  { type: String, default: '' },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
  iconName:     { type: String, default: 'FileText' },
  sortOrder:    { type: Number, default: 0 },
  createdBy:    { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy:    { type: Schema.Types.ObjectId, ref: 'User' },
  deletedAt:    { type: Date, default: null },
}, { timestamps: true });

sopCategorySchema.index({ sortOrder: 1 });

module.exports = mongoose.model('SOPCategory', sopCategorySchema);
