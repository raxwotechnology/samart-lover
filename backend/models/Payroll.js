const mongoose = require('mongoose');

const payrollSchema = mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      ref: 'Store',
    },
    month: {
      type: Number,
      required: true, // 1-12
    },
    year: {
      type: Number,
      required: true,
    },
    basicSalary: {
      type: Number,
      required: true,
    },
    daysWorked: {
      type: Number,
      default: 0,
    },
    totalWorkingDays: {
      type: Number,
      default: 26,
    },
    overtimeHours: {
      type: Number,
      default: 0,
    },
    overtimePay: {
      type: Number,
      default: 0,
    },
    allowances: {
      type: Number,
      default: 0,
    },
    deductions: {
      type: Number,
      default: 0,
    },
    // Sri Lanka EPF/ETF calculations
    epfEmployee: {
      type: Number,
      default: 0, // 8% of basic
    },
    epfEmployer: {
      type: Number,
      default: 0, // 12% of basic
    },
    etfEmployer: {
      type: Number,
      default: 0, // 3% of basic
    },
    grossSalary: {
      type: Number,
      default: 0,
    },
    netSalary: {
      type: Number,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'processing', 'paid', 'failed'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'cash', 'cheque'],
      default: 'bank_transfer',
    },
    paidAt: {
      type: Date,
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// One payroll record per employee per month/year
payrollSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });

const Payroll = mongoose.model('Payroll', payrollSchema);

module.exports = Payroll;
