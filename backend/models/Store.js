const mongoose = require('mongoose');

const storeSchema = mongoose.Schema(
  {
    // Renamed from ownerId to managerId
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
    },
    address: {
      type: String,
    },
    city: {
      type: String,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'], // 'location.type' must be 'Point'
      },
      coordinates: {
        type: [Number],
      },
    },
    phone: {
      type: String,
    },
    email: {
      type: String,
    },
    bannerImage: {
      type: String,
    },
    logo: {
      type: String,
    },
    operatingHours: {
      open: String,
      close: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Backward compatibility: virtual alias ownerId -> managerId
storeSchema.virtual('ownerId').get(function () {
  return this.managerId;
});

// Index for geolocational search if needed later
storeSchema.index({ location: '2dsphere' });

const Store = mongoose.model('Store', storeSchema);

module.exports = Store;
