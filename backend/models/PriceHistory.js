const mongoose = require('mongoose');

const priceHistorySchema = mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Product',
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
    },
    oldPrice: { type: Number, required: true },
    newPrice: { type: Number, required: true },
    oldCost: { type: Number, default: 0 },
    newCost: { type: Number, default: 0 },
    oldMrp: { type: Number, default: 0 },
    newMrp: { type: Number, default: 0 },
    priceChangePercent: { type: Number, default: 0 },
    reason: { type: String, trim: true },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

priceHistorySchema.index({ productId: 1, createdAt: -1 });

module.exports = mongoose.model('PriceHistory', priceHistorySchema);
