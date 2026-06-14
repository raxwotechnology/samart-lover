const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed', 'bogo', 'buy_x_get_y'],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    // For buy_x_get_y: buy X items, get Y free
    buyQuantity: { type: Number, default: 0 },
    getQuantity: { type: Number, default: 0 },
    // Products this promo applies to (empty = all products)
    products: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    }],
    // Categories this promo applies to
    categories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    }],
    conditions: {
      minOrderAmount: { type: Number, default: 0 },
      maxDiscountAmount: { type: Number, default: 0 }, // 0 = no cap
      maxUses: { type: Number, default: 0 }, // 0 = unlimited
      usedCount: { type: Number, default: 0 },
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

promotionSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('Promotion', promotionSchema);
