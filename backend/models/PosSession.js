const mongoose = require('mongoose');

const denomLineSchema = mongoose.Schema(
  {
    denom: { type: Number, required: true },
    qty: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const posSessionSchema = mongoose.Schema(
  {
    storeId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Store' },
    cashierId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },

    openingCashAmount: { type: Number, default: 0 },
    openingDenoms: { type: [denomLineSchema], default: [] },

    closingCashCountedAmount: { type: Number, default: 0 },
    closingDenoms: { type: [denomLineSchema], default: [] },

    expectedCash: { type: Number, default: 0 },
    expectedNonCash: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
    totalItemsSold: { type: Number, default: 0 },

    variance: { type: Number, default: 0 }, // counted - expectedCash
    varianceFlagged: { type: Boolean, default: false },
    varianceNote: { type: String, trim: true },
  },
  { timestamps: true }
);

posSessionSchema.index({ storeId: 1, cashierId: 1, startedAt: -1 });
posSessionSchema.index({ status: 1, cashierId: 1 });

const PosSession = mongoose.model('PosSession', posSessionSchema);

module.exports = PosSession;

