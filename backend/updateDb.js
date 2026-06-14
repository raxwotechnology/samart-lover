const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = require('./config/db');
const Settings = require('./models/Settings');
const Store = require('./models/Store');

const updateDatabase = async () => {
  try {
    await connectDB();
    console.log('Connected to DB. Updating Settings and Stores...');

    // Update Settings
    const settingsUpdateResult = await Settings.updateMany(
      {},
      { 
        $set: { 
          shopName: 'Smartlover',
          footerText: '© 2026 Smartlover. All rights reserved.',
          email: 'support@smartlover.lk',
          phone: '0765318012',
          address: '411/1/B,Kandy RD,kadawatha, Sri Lanka'
        } 
      }
    );
    console.log(`Settings updated: ${settingsUpdateResult.modifiedCount}`);

    // Update Stores
    const storeUpdateResult = await Store.updateMany(
      {},
      { 
        $set: { 
          name: 'Smartlover',
          email: 'support@smartlover.lk',
          phone: '0765318012',
          address: '411/1/B,Kandy RD,kadawatha'
        } 
      }
    );
    console.log(`Stores updated: ${storeUpdateResult.modifiedCount}`);

    process.exit(0);
  } catch (err) {
    console.error('Error updating DB:', err);
    process.exit(1);
  }
};

updateDatabase();
