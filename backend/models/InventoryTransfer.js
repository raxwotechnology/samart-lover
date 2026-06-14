const mongoose = require('mongoose');

const inventoryTransferSchema = mongoose.Schema({
  transferNo: {
    type: String,
    required: true,
    unique: true,
  },
  fromStoreId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
  },
  toStoreId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    sku: String,
    barcode: String,
    qty: {
      type: Number,
      required: true,
      min: 1,
    },
  }],
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

const InventoryTransfer = mongoose.model('InventoryTransfer', inventoryTransferSchema);

module.exports = InventoryTransfer;
