const mongoose = require('mongoose');

const registrationOtpSchema = mongoose.Schema(
  {
    email: { type: String, required: true, index: true, unique: true },
    phone: { type: String, required: true },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: 'customer' },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

registrationOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RegistrationOtp = mongoose.model('RegistrationOtp', registrationOtpSchema);

module.exports = RegistrationOtp;
