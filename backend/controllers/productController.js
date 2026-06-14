const Product = require('../models/Product');
const PriceHistory = require('../models/PriceHistory');

// @desc    Get all products (with filtering, sorting, pagination)
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = { status: 'active' };

    if (req.query.category) filter.categoryId = req.query.category;
    if (req.query.store) filter.storeId = req.query.store;
    if (req.query.featured === 'true') filter.isFeatured = true;
    if (req.query.onSale === 'true') filter.isOnSale = true;

    // Price range
    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) filter.price.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) filter.price.$lte = Number(req.query.maxPrice);
    }

    // Rating filter
    if (req.query.rating) {
      filter.averageRating = { $gte: Number(req.query.rating) };
    }

    // Build sort
    let sort = {};
    switch (req.query.sort) {
      case 'price_low':
        sort = { price: 1 };
        break;
      case 'price_high':
        sort = { price: -1 };
        break;
      case 'rating':
        sort = { averageRating: -1 };
        break;
      case 'newest':
        sort = { createdAt: -1 };
        break;
      case 'popular':
        sort = { totalReviews: -1 };
        break;
      default:
        sort = { createdAt: -1 };
    }

    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .populate('categoryId', 'name slug')
      .populate('storeId', 'name slug logo')
      .sort(sort)
      .skip(skip)
      .limit(limit);
    // Convert relative image paths to absolute URLs
    const hostPrefix = `${req.protocol}://${req.get('host')}`;
    const normalizeProduct = (p) => {
      const obj = p.toObject ? p.toObject() : p;
      if (Array.isArray(obj.images)) {
        obj.images = obj.images.map((img) => {
          if (!img) return '';
          if (/^https?:\/\//i.test(img)) return img;
          if (img.startsWith('/')) return `${hostPrefix}${img}`;
          return `${hostPrefix}/${img}`;
        });
      }
      return obj;
    };

    res.json({
      products: products.map(normalizeProduct),
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search products
// @route   GET /api/products/search
// @access  Public
const searchProducts = async (req, res, next) => {
  try {
    const keyword = req.query.q;
    if (!keyword) {
      return res.json({ products: [] });
    }

    const products = await Product.find({
      $or: [
        { name: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
      ],
      status: 'active',
    })
      .populate('categoryId', 'name slug')
      .populate('storeId', 'name slug logo')
      .limit(20);
    const hostPrefix = `${req.protocol}://${req.get('host')}`;
    const normalizeProduct = (p) => {
      const obj = p.toObject ? p.toObject() : p;
      if (Array.isArray(obj.images)) {
        obj.images = obj.images.map((img) => {
          if (!img) return '';
          if (/^https?:\/\//i.test(img)) return img;
          if (img.startsWith('/')) return `${hostPrefix}${img}`;
          return `${hostPrefix}/${img}`;
        });
      }
      return obj;
    };

    res.json({ products: products.map(normalizeProduct) });
  } catch (error) {
    next(error);
  }
};

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
const getFeaturedProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ isFeatured: true, status: 'active' })
      .populate('categoryId', 'name slug')
      .populate('storeId', 'name slug logo')
      .limit(12);
    const hostPrefix = `${req.protocol}://${req.get('host')}`;
    const normalizeProduct = (p) => {
      const obj = p.toObject ? p.toObject() : p;
      if (Array.isArray(obj.images)) {
        obj.images = obj.images.map((img) => {
          if (!img) return '';
          if (/^https?:\/\//i.test(img)) return img;
          if (img.startsWith('/')) return `${hostPrefix}${img}`;
          return `${hostPrefix}/${img}`;
        });
      }
      return obj;
    };
    res.json(products.map(normalizeProduct));
  } catch (error) {
    next(error);
  }
};

// @desc    Get deals / on-sale products
// @route   GET /api/products/deals
// @access  Public
const getDeals = async (req, res, next) => {
  try {
    const products = await Product.find({ isOnSale: true, status: 'active' })
      .populate('categoryId', 'name slug')
      .populate('storeId', 'name slug logo')
      .sort({ discount: -1 })
      .limit(12);
    const hostPrefix = `${req.protocol}://${req.get('host')}`;
    const normalizeProduct = (p) => {
      const obj = p.toObject ? p.toObject() : p;
      if (Array.isArray(obj.images)) {
        obj.images = obj.images.map((img) => {
          if (!img) return '';
          if (/^https?:\/\//i.test(img)) return img;
          if (img.startsWith('/')) return `${hostPrefix}${img}`;
          return `${hostPrefix}/${img}`;
        });
      }
      return obj;
    };
    res.json(products.map(normalizeProduct));
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('categoryId', 'name slug')
      .populate('storeId', 'name slug logo city phone email');

    if (product) {
      const hostPrefix = `${req.protocol}://${req.get('host')}`;
      const obj = product.toObject ? product.toObject() : product;
      if (Array.isArray(obj.images)) {
        obj.images = obj.images.map((img) => {
          if (!img) return '';
          if (/^https?:\/\//i.test(img)) return img;
          if (img.startsWith('/')) return `${hostPrefix}${img}`;
          return `${hostPrefix}/${img}`;
        });
      }
      res.json(obj);
    } else {
      res.status(404);
      next(new Error('Product not found'));
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/StoreOwner
const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      categoryId,
      subCategory,
      brand,
      description,
      price,
      mrp,
      discount,
      unit,
      variants,
      stock,
      images,
      isFeatured,
      isOnSale,
      allowKokoOnline,
      allowKokoPos,
      purchasePrice,
    } = req.body;

    if (!req.body.storeId) {
      res.status(400);
      return next(new Error('Store ID is required')); 
    }

    const slug = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();

    const product = await Product.create({
      storeId: req.body.storeId,
      name,
      slug,
      categoryId,
      subCategory,
      brand,
      description,
      price,
      mrp,
      discount: discount || Math.round(((mrp - price) / mrp) * 100),
      unit,
      variants: variants || [],
      stock,
      images: images || [],
      isFeatured: isFeatured || false,
      isOnSale: isOnSale || false,
      allowKokoOnline: allowKokoOnline !== undefined ? !!allowKokoOnline : true,
      allowKokoPos: allowKokoPos !== undefined ? !!allowKokoPos : true,
      lastCost: Number(purchasePrice || 0),
      avgCost: Number(purchasePrice || 0),
      costPrice: Number(purchasePrice || 0),
      newStock: stock || 0,
      oldStock: 0,
      stockType: 'new',
    });

    // Return product with absolute image URLs
    const hostPrefix = `${req.protocol}://${req.get('host')}`;
    const obj = product.toObject ? product.toObject() : product;
    if (Array.isArray(obj.images)) {
      obj.images = obj.images.map((img) => {
        if (!img) return '';
        if (/^https?:\/\//i.test(img)) return img;
        if (img.startsWith('/')) return `${hostPrefix}${img}`;
        return `${hostPrefix}/${img}`;
      });
    }
    res.status(201).json(obj);
  } catch (error) {
    next(error);
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/StoreOwner
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404);
      return next(new Error('Product not found'));
    }

    const fields = [
      'name', 'categoryId', 'subCategory', 'brand', 'description', 'price',
      'mrp', 'discount', 'unit', 'variants', 'stock', 'images',
      'isFeatured', 'isOnSale', 'status', 'allowKokoOnline', 'allowKokoPos',
      'stockType', 'oldStock', 'newStock', 'costPrice',
    ];

    // Log price change if price or cost changed
    const priceChanged = req.body.price !== undefined && Number(req.body.price) !== product.price;
    const costChanged = req.body.costPrice !== undefined && Number(req.body.costPrice) !== Number(product.costPrice || 0);
    const mrpChanged = req.body.mrp !== undefined && Number(req.body.mrp) !== Number(product.mrp || 0);

    if (priceChanged || costChanged || mrpChanged) {
      const oldPrice = product.price;
      const newPrice = Number(req.body.price || product.price);
      const changePercent = oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice * 100) : 0;

      await PriceHistory.create({
        productId: product._id,
        storeId: product.storeId,
        oldPrice,
        newPrice,
        oldCost: Number(product.costPrice || product.lastCost || 0),
        newCost: Number(req.body.costPrice || req.body.purchasePrice || product.costPrice || 0),
        oldMrp: Number(product.mrp || 0),
        newMrp: Number(req.body.mrp || product.mrp || 0),
        priceChangePercent: Math.round(changePercent * 10) / 10,
        reason: req.body.priceChangeReason || 'Price update',
        changedBy: req.user?._id,
      });
    }

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    });

    if (req.body.name) {
      product.slug = req.body.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    }

    if (req.body.purchasePrice !== undefined) {
      const parsedPurchasePrice = Number(req.body.purchasePrice || 0);
      product.lastCost = parsedPurchasePrice;
      product.avgCost = parsedPurchasePrice;
      if (!req.body.costPrice) product.costPrice = parsedPurchasePrice;
    }

    const updated = await product.save();
    const hostPrefix = `${req.protocol}://${req.get('host')}`;
    const obj = updated.toObject ? updated.toObject() : updated;
    if (Array.isArray(obj.images)) {
      obj.images = obj.images.map((img) => {
        if (!img) return '';
        if (/^https?:\/\//i.test(img)) return img;
        if (img.startsWith('/')) return `${hostPrefix}/${img}`;
        return `${hostPrefix}/${img}`;
      });
    }
    res.json(obj);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/StoreOwner/Admin
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404);
      return next(new Error('Product not found'));
    }
    await product.deleteOne();
    res.json({ message: 'Product removed' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get products for a store owner's store (including inactive)
// @route   GET /api/products/my-store
// @access  Private/StoreOwner
const getMyProducts = async (req, res, next) => {
  try {
    const Store = require('../models/Store');
    const store = await Store.findOne({ managerId: req.user._id });
    if (!store) {
      res.status(404);
      return next(new Error('No store found for this user'));
    }
    let products = await Product.find({ storeId: store._id })
      .populate('categoryId', 'name slug')
      .sort({ createdAt: -1 });
    const hostPrefix = `${req.protocol}://${req.get('host')}`;
    const normalizeProduct = (p) => {
      const obj = p.toObject ? p.toObject() : p;
      if (Array.isArray(obj.images)) {
        obj.images = obj.images.map((img) => {
          if (!img) return '';
          if (/^https?:\/\//i.test(img)) return img;
          if (img.startsWith('/')) return `${hostPrefix}${img}`;
          return `${hostPrefix}/${img}`;
        });
      }
      return obj;
    };
    products = products.map(normalizeProduct);
    res.json({ products, store });
  } catch (error) {
    next(error);
  }
};

// @desc    Get price history for a product
// @route   GET /api/products/:id/price-history
// @access  Private/Admin/Manager
const getPriceHistory = async (req, res, next) => {
  try {
    const history = await PriceHistory.find({ productId: req.params.id })
      .populate('changedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(history);
  } catch (error) { next(error); }
};

// @desc    Import products from Excel sheet
// @route   POST /api/products/import-excel
// @access  Private/Manager/Admin
const importProductsExcel = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      return next(new Error('Please upload an Excel file'));
    }

    const Store = require('../models/Store');
    let storeId = req.body.storeId;
    if (!storeId && req.user.role === 'manager') {
      const store = await Store.findOne({ managerId: req.user._id });
      if (store) storeId = store._id;
    }
    if (!storeId && req.user.role === 'admin') {
      // Default to the first store if admin didn't specify one
      const store = await Store.findOne({ isActive: true });
      if (store) storeId = store._id;
    }

    if (!storeId) {
      res.status(400);
      return next(new Error('Store ID is required for product import'));
    }

    const Category = require('../models/Category');
    const exceljs = require('exceljs');
    const workbook = new exceljs.Workbook();
    
    // Check if buffer or path is available
    if (req.file.buffer) {
      await workbook.xlsx.load(req.file.buffer);
    } else {
      await workbook.xlsx.readFile(req.file.path);
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      res.status(400);
      return next(new Error('Empty Excel file'));
    }

    let count = 0;
    const errors = [];

    // Loop through rows (skip header row 1)
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      
      // If row is empty, skip
      if (!row.getCell(1).value) continue;

      const name = String(row.getCell(1).value || '').trim();
      const categoryName = String(row.getCell(2).value || '').trim();
      const subCategory = String(row.getCell(3).value || '').trim();
      const brand = String(row.getCell(4).value || '').trim();
      const description = String(row.getCell(5).value || '').trim();
      const price = Number(row.getCell(6).value || 0);
      const mrp = Number(row.getCell(7).value || 0);
      const costPrice = Number(row.getCell(8).value || 0);
      const unit = String(row.getCell(9).value || 'pcs').trim();
      const stock = Number(row.getCell(10).value || 0);
      const barcode = row.getCell(11).value ? String(row.getCell(11).value).trim() : undefined;
      const sku = row.getCell(12).value ? String(row.getCell(12).value).trim() : undefined;

      if (!name || !categoryName || !description || !price || !mrp) {
        errors.push(`Row ${rowNumber}: Name, Category, Description, Price, and MRP are required.`);
        continue;
      }

      try {
        // Resolve Category
        let category = await Category.findOne({ name: { $regex: new RegExp(`^${categoryName}$`, 'i') } });
        if (!category) {
          const catSlug = categoryName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
          category = await Category.create({
            name: categoryName,
            slug: catSlug,
            description: `Auto-generated category for ${categoryName}`,
          });
        }

        const slug = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();

        await Product.create({
          storeId,
          name,
          slug,
          categoryId: category._id,
          subCategory: subCategory || undefined,
          brand: brand || undefined,
          description,
          price,
          mrp,
          discount: Math.round(((mrp - price) / mrp) * 100) || 0,
          unit,
          stock,
          images: [],
          isFeatured: false,
          isOnSale: false,
          allowKokoOnline: true,
          allowKokoPos: true,
          lastCost: costPrice,
          avgCost: costPrice,
          costPrice: costPrice,
          newStock: stock,
          oldStock: 0,
          stockType: 'new',
          barcode,
          sku,
        });

        count++;
      } catch (err) {
        errors.push(`Row ${rowNumber}: ${err.message}`);
      }
    }

    res.json({
      message: `${count} products imported successfully`,
      count,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  searchProducts,
  getFeaturedProducts,
  getDeals,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getMyProducts,
  getPriceHistory,
  importProductsExcel,
};
