const mongoose = require('mongoose');

const supplierReturnItemSchema = mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product' },
    qty: { type: Number, required: true, min: 1 },
    unitCostAtReturn: { type: Number, min: 0 },
  },
  { _id: false }
);

const supplierReturnSchema = mongoose.Schema(
  {
    storeId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Store' },
    supplierId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Supplier' },
    returnedAt: { type: Date, default: Date.now },
    reason: {
      type: String,
      enum: ['damaged', 'expired', 'wrong_item', 'other'],
      required: true,
    },
    items: { type: [supplierReturnItemSchema], required: true, validate: (v) => Array.isArray(v) && v.length > 0 },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

supplierReturnSchema.index({ storeId: 1, returnedAt: -1 });

const SupplierReturn = mongoose.model('SupplierReturn', supplierReturnSchema);

module.exports = SupplierReturn;

