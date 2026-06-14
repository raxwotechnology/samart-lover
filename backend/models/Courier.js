const mongoose = require('mongoose');

const courierSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    address: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
      sparse: true,
    },
    charge: {
      type: Number,
      default: 0,
    },
    balance: {
      // outstanding balance owed to courier (positive = owed to courier)
      type: Number,
      default: 0,
    },
    payments: [
      {
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        note: { type: String },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Courier = mongoose.model('Courier', courierSchema);

module.exports = Courier;
