const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/User');
const Store = require('./models/Store');
const Category = require('./models/Category');
const Product = require('./models/Product');
const Voucher = require('./models/Voucher');

const connectDB = require('./config/db');

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing catalog/business data only (keep auth users intact)
    await Store.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await Voucher.deleteMany({});

    console.log('Catalog data cleared (users preserved)...');

    // Keep existing users/accounts and attach seeded stores to available managers
    const adminUser = await User.findOne({ role: 'admin' });
    const managers = await User.find({ role: 'manager' }).sort({ createdAt: 1 }).limit(2);
    const manager1 = managers[0] || adminUser;
    const manager2 = managers[1] || manager1;

    if (!adminUser) {
      throw new Error('No admin user found. Create an admin account before seeding.');
    }

    // Create Stores
    const store1 = await Store.create({
      managerId: manager1._id,
      name: 'Smartlover Atelier',
      slug: 'zage-atelier',
      description: 'Contemporary fashion boutique with premium wardrobe staples, accessories, and seasonal style drops.',
      address: '456 Fashion Avenue, Colombo 03',
      city: 'Colombo',
      phone: '+94112555101',
      email: 'hello@zageatelier.com',
      bannerImage: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200',
      logo: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200',
      operatingHours: { open: '07:00', close: '22:00' },
      isActive: true,
    });

    const store2 = await Store.create({
      managerId: manager2._id,
      name: 'Smartlover Beauty Lab',
      slug: 'zage-beauty-lab',
      description: 'Luxury cosmetics and skincare destination featuring clean beauty formulas and salon-grade essentials.',
      address: '789 Beauty Boulevard, Colombo 04',
      city: 'Colombo',
      phone: '+94112555202',
      email: 'info@smartloverlab.com',
      bannerImage: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200',
      logo: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200',
      operatingHours: { open: '08:00', close: '21:00' },
      isActive: true,
    });

    const store3 = await Store.create({
      managerId: manager1._id,
      name: 'Smartlover',
      slug: 'smartlover',
      description: 'Premium store offering fashion, cosmetics, and accessories.',
      address: '742 Store Lane, Colombo',
      city: 'Colombo',
      phone: '071 9781939',
      email: 'support@smartlover.lk',
      bannerImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200',
      logo: '/uploads/logo-smartlover.jpg',
      operatingHours: { open: '09:00', close: '21:00' },
      isActive: true,
    });

    console.log('Stores created...');

    // Keep existing staff users and remap assigned stores
    await User.updateMany({ role: 'cashier' }, { $set: { assignedStore: store1._id } });
    await User.updateMany({ role: 'deliveryGuy' }, { $set: { assignedStore: store2._id } });

    // Create Categories
    const categories = await Category.insertMany([
      { name: "Women's Fashion", slug: 'womens-fashion', icon: '👗', image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400', isActive: true },
      { name: "Men's Fashion", slug: 'mens-fashion', icon: '👔', image: 'https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?w=400', isActive: true },
      { name: 'Accessories', slug: 'accessories', icon: '👜', image: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=400', isActive: true },
      { name: 'Cosmetics', slug: 'cosmetics', icon: '💄', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400', isActive: true },
      { name: 'Skincare', slug: 'skincare', icon: '🧴', image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400', isActive: true },
      { name: 'Haircare', slug: 'haircare', icon: '💇', image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400', isActive: true },
      { name: 'Beauty Tools', slug: 'beauty-tools', icon: '✨', image: 'https://images.unsplash.com/photo-1631214524020-3f0f8e92907f?w=400', isActive: true },
    ]);

    console.log('Categories created...');

    // Create Products (with barcodes, SKUs, and multi-currency pricing)
    const products = [
      {
        storeId: store1._id, name: 'Satin Wrap Midi Dress', slug: 'satin-wrap-midi-dress',
        categoryId: categories[0]._id, description: 'Elegant satin wrap dress with a flattering silhouette for evening events and smart-casual styling.',
        price: 12400, priceLKR: 12400, priceUSD: 38.75, mrp: 14600, discount: 15, unit: 'piece',
        stock: 85, images: ['https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600'],
        averageRating: 4.7, totalReviews: 41, isFeatured: true, isOnSale: true, status: 'active',
        barcode: '5901234567001', sku: 'ZA-WMN-001',
      },
      {
        storeId: store1._id, name: 'Tailored Wide-Leg Trousers', slug: 'tailored-wide-leg-trousers',
        categoryId: categories[0]._id, description: 'High-waist tailored trousers in a soft drape fabric designed for elevated everyday wear.',
        price: 9800, priceLKR: 9800, priceUSD: 30.62, mrp: 11600, discount: 15, unit: 'piece',
        stock: 72, images: ['https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=600'],
        averageRating: 4.5, totalReviews: 28, isFeatured: false, isOnSale: false, status: 'active',
        barcode: '5901234567002', sku: 'ZA-WMN-002',
      },
      {
        storeId: store1._id, name: 'Slim Fit Oxford Shirt', slug: 'slim-fit-oxford-shirt',
        categoryId: categories[1]._id, description: 'Premium cotton oxford shirt with crisp collar and breathable fabric for office or occasion dressing.',
        price: 8900, priceLKR: 8900, priceUSD: 27.81, mrp: 10200, discount: 13, unit: 'piece',
        stock: 96, images: ['https://images.unsplash.com/photo-1603252109303-2751441dd157?w=600'],
        averageRating: 4.6, totalReviews: 36, isFeatured: true, isOnSale: true, status: 'active',
        barcode: '5901234567003', sku: 'ZA-MEN-001',
      },
      {
        storeId: store2._id, name: 'Minimal Bomber Jacket', slug: 'minimal-bomber-jacket',
        categoryId: categories[1]._id, description: 'Lightweight bomber jacket with modern cut, rib cuffs, and matte finish for transitional weather.',
        price: 15600, priceLKR: 15600, priceUSD: 48.75, mrp: 18200, discount: 14, unit: 'piece',
        stock: 64, images: ['https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=600'],
        averageRating: 4.8, totalReviews: 22, isFeatured: true, isOnSale: true, status: 'active',
        barcode: '5901234567004', sku: 'ZA-MEN-002',
      },
      {
        storeId: store1._id, name: 'Structured Mini Crossbody', slug: 'structured-mini-crossbody',
        categoryId: categories[2]._id, description: 'Compact crossbody bag with gold-tone hardware and adjustable strap for day-to-night styling.',
        price: 7600, priceLKR: 7600, priceUSD: 23.75, mrp: 9200, discount: 17, unit: 'piece',
        stock: 104, images: ['https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=600'],
        averageRating: 4.7, totalReviews: 51, isFeatured: true, isOnSale: false, status: 'active',
        barcode: '5901234567005', sku: 'ZA-ACC-001',
      },
      {
        storeId: store2._id, name: 'Classic Steel Chronograph Watch', slug: 'classic-steel-chronograph-watch',
        categoryId: categories[2]._id, description: 'Polished stainless-steel watch with water resistance and timeless chronograph styling.',
        price: 18900, priceLKR: 18900, priceUSD: 59.06, mrp: 21500, discount: 12, unit: 'piece',
        stock: 38, images: ['https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=600'],
        averageRating: 4.8, totalReviews: 17, isFeatured: false, isOnSale: true, status: 'active',
        barcode: '5901234567006', sku: 'ZA-ACC-002',
      },
      {
        storeId: store2._id, name: 'Velvet Matte Lipstick Set', slug: 'velvet-matte-lipstick-set',
        categoryId: categories[3]._id, description: 'Long-wear matte lipstick trio with highly pigmented shades and comfortable finish.',
        price: 5200, priceLKR: 5200, priceUSD: 16.25, mrp: 6400, discount: 19, unit: 'set',
        stock: 130, images: ['https://images.unsplash.com/photo-1583241800698-89f5fba95f73?w=600'],
        averageRating: 4.6, totalReviews: 73, isFeatured: true, isOnSale: true, status: 'active',
        barcode: '5901234567007', sku: 'ZA-COS-001',
      },
      {
        storeId: store2._id, name: 'Illuminating Liquid Foundation', slug: 'illuminating-liquid-foundation',
        categoryId: categories[3]._id, description: 'Buildable medium-coverage foundation with natural luminous finish and all-day comfort.',
        price: 6800, priceLKR: 6800, priceUSD: 21.25, mrp: 7900, discount: 14, unit: 'bottle',
        stock: 116, images: ['https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600'],
        averageRating: 4.5, totalReviews: 49, isFeatured: true, isOnSale: false, status: 'active',
        barcode: '5901234567008', sku: 'ZA-COS-002',
      },
      {
        storeId: store2._id, name: 'Hydra Glow Face Serum', slug: 'hydra-glow-face-serum',
        categoryId: categories[4]._id, description: 'Hyaluronic acid serum that deeply hydrates skin and boosts radiance with lightweight texture.',
        price: 7200, priceLKR: 7200, priceUSD: 22.50, mrp: 8600, discount: 16, unit: 'bottle',
        stock: 140, images: ['https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600'],
        averageRating: 4.9, totalReviews: 88, isFeatured: true, isOnSale: true, status: 'active',
        barcode: '5901234567009', sku: 'ZA-SKN-001',
      },
      {
        storeId: store1._id, name: 'SPF 50 Daily Defense Cream', slug: 'spf-50-daily-defense-cream',
        categoryId: categories[4]._id, description: 'Broad-spectrum sunscreen with non-greasy finish suitable under makeup and daily wear.',
        price: 4900, priceLKR: 4900, priceUSD: 15.31, mrp: 5900, discount: 17, unit: 'tube',
        stock: 154, images: ['https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600'],
        averageRating: 4.7, totalReviews: 65, isFeatured: false, isOnSale: true, status: 'active',
        barcode: '5901234567010', sku: 'ZA-SKN-002',
      },
      {
        storeId: store1._id, name: 'Repair & Shine Shampoo', slug: 'repair-and-shine-shampoo',
        categoryId: categories[5]._id, description: 'Sulfate-free shampoo enriched with argan oil to strengthen strands and enhance shine.',
        price: 4300, priceLKR: 4300, priceUSD: 13.44, mrp: 5200, discount: 17, unit: 'bottle',
        stock: 122, images: ['https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600'],
        averageRating: 4.4, totalReviews: 39, isFeatured: false, isOnSale: false, status: 'active',
        barcode: '5901234567011', sku: 'ZA-HRC-001',
      },
      {
        storeId: store2._id, name: 'Keratin Smooth Conditioner', slug: 'keratin-smooth-conditioner',
        categoryId: categories[5]._id, description: 'Salon-grade conditioner to reduce frizz, detangle, and leave hair silky after every wash.',
        price: 4600, priceLKR: 4600, priceUSD: 14.38, mrp: 5600, discount: 18, unit: 'bottle',
        stock: 98, images: ['https://images.unsplash.com/photo-1626015365106-415f61c4d426?w=600'],
        averageRating: 4.6, totalReviews: 42, isFeatured: true, isOnSale: true, status: 'active',
        barcode: '5901234567012', sku: 'ZA-HRC-002',
      },
      {
        storeId: store1._id, name: 'Luxury Makeup Brush Set', slug: 'luxury-makeup-brush-set',
        categoryId: categories[6]._id, description: 'Professional 10-piece brush set with ultra-soft bristles for flawless blending and contouring.',
        price: 8400, priceLKR: 8400, priceUSD: 26.25, mrp: 9800, discount: 14, unit: 'set',
        stock: 76, images: ['https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=600'],
        averageRating: 4.8, totalReviews: 31, isFeatured: true, isOnSale: true, status: 'active',
        barcode: '5901234567013', sku: 'ZA-BTY-001',
      },
      {
        storeId: store2._id, name: 'Rose Quartz Facial Roller', slug: 'rose-quartz-facial-roller',
        categoryId: categories[6]._id, description: 'Cooling facial massage roller that supports absorption of skincare products and boosts glow.',
        price: 3500, priceLKR: 3500, priceUSD: 10.94, mrp: 4200, discount: 17, unit: 'piece',
        stock: 118, images: ['https://images.unsplash.com/photo-1601612628452-9e99ced43524?w=600'],
        averageRating: 4.5, totalReviews: 54, isFeatured: false, isOnSale: true, status: 'active',
        barcode: '5901234567014', sku: 'ZA-BTY-002',
      },
    ];

    await Product.insertMany(products);

    // Create sample vouchers
    await Voucher.insertMany([
      {
        code: 'WELCOME10',
        type: 'percentage',
        value: 10,
        minOrderAmount: 500,
        maxDiscountAmount: 200,
        maxUses: 1000,
        usedCount: 0,
        expiresAt: new Date('2027-12-31'),
        isActive: true,
        createdBy: adminUser._id,
        source: 'promotion',
        description: 'Welcome discount - 10% off your first order!',
      },
      {
        code: 'FRESH500',
        type: 'fixed',
        value: 500,
        minOrderAmount: 3000,
        maxUses: 500,
        usedCount: 0,
        expiresAt: new Date('2027-06-30'),
        isActive: true,
        createdBy: adminUser._id,
        source: 'admin',
        description: 'Rs.500 off on orders above Rs.3000',
      },
    ]);

    console.log('Products & Vouchers created...');
    console.log('');
    console.log('=== SEED DATA COMPLETE ===');
    console.log('');
    console.log('Existing user accounts are preserved.');
    console.log('Seed updates only categories, products, stores, and vouchers.');
    console.log('');
    console.log('Voucher Codes: WELCOME10, FRESH500');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
