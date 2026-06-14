const mongoose = require('mongoose');

const returnItemSchema = mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product' },
    orderItemName: { type: String },
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    condition: { type: String, enum: ['damaged', 'good'], required: true },
    reason: { type: String, trim: true },
  },
  { _id: false }
);

const customerReturnSchema = mongoose.Schema(
  {
    storeId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Store' },
    orderId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Order' },
    customerId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },

    status: {
      type: String,
      enum: ['requested', 'approved', 'rejected', 'on_hold', 'resolved'],
      default: 'requested',
    },

    items: { type: [returnItemSchema], required: true, validate: (v) => Array.isArray(v) && v.length > 0 },

    resolution: {
      type: String,
      enum: ['store_credit', 'exchange', 'upgrade'],
    },
    storeCreditPoints: { type: Number, default: 0 },
    upgradeAdditionalAmount: { type: Number, default: 0 },
    upgradePaymentMethod: { type: String },

    holdBillNo: { type: String },
    holdStatus: { type: String, enum: ['none', 'open', 'closed'], default: 'none' },

    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String, trim: true },
  },
  { timestamps: true }
);

customerReturnSchema.index({ storeId: 1, createdAt: -1 });
customerReturnSchema.index({ orderId: 1 }, { unique: false });

const CustomerReturn = mongoose.model('CustomerReturn', customerReturnSchema);

module.exports = CustomerReturn;

