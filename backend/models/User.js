const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
    },
    role: {
      type: String,
      enum: ['customer', 'manager', 'admin', 'cashier', 'deliveryGuy', 'stockEmployee', 'marketing'],
      default: 'customer',
    },
    permissions: {
      canAddProducts: { type: Boolean, default: true },
      canDeleteProducts: { type: Boolean, default: true },
      canEditPrices: { type: Boolean, default: true },
      canManageInventory: { type: Boolean, default: true },
      canViewFinancials: { type: Boolean, default: true },
      canManageEmployees: { type: Boolean, default: true },
    },
    assignedStore: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
    },
    avatar: {
      type: String,
    },
    addresses: [
      {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
        isDefault: { type: Boolean, default: false },
      },
    ],
    // Loyalty Program
    loyaltyPoints: {
      type: Number,
      default: 0,
    },
    vouchers: [
      {
        voucherId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Voucher',
        },
        code: String,
        type: { type: String, enum: ['percentage', 'fixed'] },
        value: Number,
        minOrderAmount: Number,
        expiresAt: Date,
        isUsed: { type: Boolean, default: false },
        claimedAt: { type: Date, default: Date.now },
        usedAt: Date,
      },
    ],
    // Employee Info (for cashier, deliveryGuy, and other staff)
    employeeInfo: {
      salary: { type: Number, default: 0 },
      department: { type: String },
      joinDate: { type: Date },
      bankAccount: { type: String },
      bankName: { type: String },
      epfNo: { type: String },
      etfNo: { type: String },
      agreementUrl: { type: String },
    },
    // Preferred currency
    preferredCurrency: {
      type: String,
      enum: ['LKR', 'USD'],
      default: 'LKR',
    },
    // Account status
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Encrypt password using bcrypt
// Use promise-style middleware (no callback `next`) for Mongoose v8/v9 compatibility.
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  // Allow controlled flows (e.g., OTP-completed registrations) to persist an already-hashed password.
  if (/^\$2[aby]\$\d{2}\$/.test(this.password || '')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', userSchema);

module.exports = User;
