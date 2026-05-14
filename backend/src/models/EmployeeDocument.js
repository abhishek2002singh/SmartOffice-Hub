const mongoose = require('mongoose');
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const DOCUMENT_TYPES = [
  'offer_letter', 'joining_letter', 'appointment_letter',
  'id_proof', 'address_proof', 'pan_card', 'aadhaar_card',
  'education', 'experience', 'relieving', 'nda', 'other',
];

const employeeDocumentSchema = new Schema({
  employeeId: { type: ObjectId, ref: 'Employee', required: true },
  type:        { type: String, enum: DOCUMENT_TYPES, required: true },
  name:        { type: String, required: true, trim: true },
  gdriveFileId:{ type: String, default: '' },
  gdriveLink:  { type: String, default: '' },
  mimeType:    { type: String, default: '' },
  sizeBytes:   { type: Number, default: 0 },
  expiresAt:   { type: Date, default: null },
  uploadedBy:  { type: ObjectId, ref: 'User', required: true },
  deletedAt:   { type: Date, default: null },
}, { timestamps: true });

employeeDocumentSchema.index({ employeeId: 1, type: 1 });
employeeDocumentSchema.index({ deletedAt: 1 });
employeeDocumentSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('EmployeeDocument', employeeDocumentSchema);
