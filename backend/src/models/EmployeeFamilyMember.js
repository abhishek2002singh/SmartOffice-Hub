const mongoose = require('mongoose');
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const employeeFamilyMemberSchema = new Schema({
  employeeId: { type: ObjectId, ref: 'Employee', required: true },
  name:       { type: String, required: true, trim: true },
  relation:   { type: String, required: true, enum: ['Spouse', 'Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister', 'Guardian', 'Other'] },
  dob:        { type: Date, default: null },
  contact:    { type: String, trim: true, default: '' },
  isNominee:  { type: Boolean, default: false },
  deletedAt:  { type: Date, default: null },
}, { timestamps: true });

employeeFamilyMemberSchema.index({ employeeId: 1 });

module.exports = mongoose.model('EmployeeFamilyMember', employeeFamilyMemberSchema);
