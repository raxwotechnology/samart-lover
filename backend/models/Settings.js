const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  shopName: { type: String, default: 'Smartlover' },
  tagline: { type: String, default: 'Where style meets skincare' },
  logo: { type: String, default: '' },
  logoUrl: { type: String, default: '' },
  email: { type: String, default: 'hello@smartlover.lk' },
  phone: { type: String, default: '0765318012' },
  phone2: { type: String, default: '' },
  address: { type: String, default: '411/1/B,Kandy RD,kadawatha, Sri Lanka' },
  city: { type: String, default: 'Colombo' },
  country: { type: String, default: 'Sri Lanka' },
  currency: { type: String, default: 'LKR' },
  exchangeRate: { type: Number, default: 320 },
  deliveryFeeThreshold: { type: Number, default: 5000 },
  deliveryFee: { type: Number, default: 350 },
  taxRate: { type: Number, default: 0.08 },
  loyaltyPointsPerUnit: { type: Number, default: 100 },
  loyaltyPointValue: { type: Number, default: 1 },
  socialLinks: {
    facebook: { type: String, default: '' },
    instagram: { type: String, default: '' },
    twitter: { type: String, default: '' },
  },
  footerText: { type: String, default: '© 2026 Smartlover. All rights reserved.' },
  heroProducts: [{
    name: { type: String },
    price: { type: Number },
    emoji: { type: String },
  }],
  maintenanceMode: { type: Boolean, default: false },
  rolePermissions: {
    cashier: {
      canGenerateBarcodes: { type: Boolean, default: true },
      canAccessReturns: { type: Boolean, default: false },
      canViewInventory: { type: Boolean, default: false },
      canApplyDiscounts: { type: Boolean, default: true },
      canViewSalesReports: { type: Boolean, default: false },
      canManageStock: { type: Boolean, default: false },
    },
    manager: {
      canGenerateBarcodes: { type: Boolean, default: true },
      canAccessReturns: { type: Boolean, default: true },
      canManagePayroll: { type: Boolean, default: true },
      canManageSupplierPayments: { type: Boolean, default: true },
      canViewPredictions: { type: Boolean, default: false },
      canManagePromotions: { type: Boolean, default: true },
    },
  },
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
