const mongoose = require('mongoose');

const paymentOtpSchema = mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

paymentOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PaymentOtp = mongoose.model('PaymentOtp', paymentOtpSchema);

module.exports = PaymentOtp;
