const mongoose = require('mongoose');

const employeeBreakSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    breakStart: {
      type: Date,
      required: true,
    },
    breakEnd: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number, // minutes
      default: 0,
    },
    type: {
      type: String,
      enum: ['lunch', 'short', 'other'],
      default: 'short',
    },
  },
  {
    timestamps: true,
  }
);

employeeBreakSchema.index({ employeeId: 1, date: -1 });

module.exports = mongoose.model('EmployeeBreak', employeeBreakSchema);
