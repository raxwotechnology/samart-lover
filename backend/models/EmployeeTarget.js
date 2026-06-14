const mongoose = require('mongoose');

const employeeTargetSchema = new mongoose.Schema(
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
    targetType: {
      type: String,
      enum: ['sales', 'deliveries', 'items_sold', 'attendance'],
      required: true,
    },
    targetValue: {
      type: Number,
      required: true,
      min: 0,
    },
    achievedValue: {
      type: Number,
      default: 0,
    },
    month: {
      type: Number, // 1-12
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'missed'],
      default: 'active',
    },
    bonusAmount: {
      type: Number,
      default: 0,
    },
    bonusPaid: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

employeeTargetSchema.index({ employeeId: 1, month: 1, year: 1 });
employeeTargetSchema.index({ storeId: 1, month: 1, year: 1 });

module.exports = mongoose.model('EmployeeTarget', employeeTargetSchema);
