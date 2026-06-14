require('dotenv').config();
const connectDB = require('../config/db');
const Product = require('../models/Product');

const run = async () => {
  try {
    await connectDB();
    const result = await Product.updateMany(
      {
        $or: [
          { allowKokoOnline: { $exists: false } },
          { allowKokoPos: { $exists: false } },
        ],
      },
      {
        $set: {
          allowKokoOnline: true,
          allowKokoPos: true,
        },
      }
    );
    console.log(`Backfill complete. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
    process.exit(0);
  } catch (error) {
    console.error('Backfill failed:', error.message);
    process.exit(1);
  }
};

run();
