const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db');
const User = require('../models/User');
const Store = require('../models/Store');

const addsmartlover = async () => {
  try {
    await connectDB();

    const adminUser = await User.findOne({ role: 'admin' });
    const managers = await User.find({ role: 'manager' }).sort({ createdAt: 1 });
    const manager = managers[0] || adminUser;

    if (!manager) {
      console.error('❌ Error: No manager or admin user found. Please run bootstrapAdmin.js first.');
      process.exit(1);
    }

    const storeData = {
      managerId: manager._id,
      name: 'Smartlover',
      slug: 'smartlover',
      description: 'Premium store offering fashion, cosmetics, and accessories.',
      address: '411/1/B,Kandy RD,kadawatha',
      city: 'Colombo',
      phone: '0765318012',
      email: 'support@smartlover.lk',
      bannerImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200',
      logo: '/uploads/logo-smartlover.jpg',
      operatingHours: { open: '09:00', close: '21:00' },
      isActive: true,
    };

    // Find and update, or create if doesn't exist
    const smartlover = await Store.findOneAndUpdate(
      { name: 'Smartlover' },
      { $set: storeData },
      { new: true, upsert: true }
    );

    console.log('✅ Smartlover successfully updated/created:', smartlover);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating/updating Smartlover:', error.message);
    process.exit(1);
  }
};

addsmartlover();
