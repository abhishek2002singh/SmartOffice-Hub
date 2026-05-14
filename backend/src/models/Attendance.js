const mongoose = require('mongoose');
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const attendanceSchema = new Schema({
  employeeId: { type: ObjectId, ref: 'Employee', required: true },
  date:       { type: Date, required: true },  // normalized to UTC midnight for the calendar day
  checkIn:    { type: Date, default: null },
  checkOut:   { type: Date, default: null },
  workHours:  { type: Number, default: null },  // decimal hours
  status: {
    type: String,
    enum: ['present', 'absent', 'half_day', 'late', 'wfh', 'holiday', 'leave', 'week_off'],
    default: 'present',
  },
  isWFH:      { type: Boolean, default: false },
  notes:      { type: String, trim: true, default: '' },
  ipAddress:  { type: String, default: '' },
  location:   { type: String, default: '' },
  modifiedBy: { type: ObjectId, ref: 'User', default: null },
}, { timestamps: true });

// One record per employee per calendar day
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1, status: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
