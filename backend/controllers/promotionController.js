const Promotion = require('../models/Promotion');
const Store = require('../models/Store');

// @desc    Create promotion
// @route   POST /api/promotions
// @access  Admin/Manager
const createPromotion = async (req, res, next) => {
  try {
    const {
      name, type, discountValue, buyQuantity, getQuantity,
      products, categories, conditions, storeId,
      startDate, endDate, description,
    } = req.body;

    // Managers auto-scope to their store
    let resolvedStoreId = storeId;
    if (!resolvedStoreId && req.user.role === 'manager') {
      const store = await Store.findOne({ managerId: req.user._id });
      if (store) resolvedStoreId = store._id;
    }

    const promo = await Promotion.create({
      name,
      type,
      discountValue,
      buyQuantity: buyQuantity || 0,
      getQuantity: getQuantity || 0,
      products: products || [],
      categories: categories || [],
      conditions: conditions || {},
      storeId: resolvedStoreId,
      startDate,
      endDate,
      description: description || '',
      createdBy: req.user._id,
    });

    res.status(201).json(promo);
  } catch (error) { next(error); }
};

// @desc    Get all promotions
// @route   GET /api/promotions
// @access  Admin/Manager
const getPromotions = async (req, res, next) => {
  try {
    const filter = {};

    if (req.user.role === 'manager') {
      const store = await Store.findOne({ managerId: req.user._id });
      if (store) filter.storeId = store._id;
    }

    if (req.query.active === 'true') {
      filter.isActive = true;
      filter.startDate = { $lte: new Date() };
      filter.endDate = { $gte: new Date() };
    }

    const promotions = await Promotion.find(filter)
      .populate('products', 'name price')
      .populate('categories', 'name')
      .populate('storeId', 'name')
      .sort({ createdAt: -1 });

    res.json(promotions);
  } catch (error) { next(error); }
};

// @desc    Update promotion
// @route   PUT /api/promotions/:id
// @access  Admin/Manager
const updatePromotion = async (req, res, next) => {
  try {
    const promo = await Promotion.findById(req.params.id);
    if (!promo) { res.status(404); return next(new Error('Promotion not found')); }

    const fields = ['name', 'type', 'discountValue', 'buyQuantity', 'getQuantity',
      'products', 'categories', 'conditions', 'startDate', 'endDate', 'description', 'isActive'];

    fields.forEach(field => {
      if (req.body[field] !== undefined) promo[field] = req.body[field];
    });

    await promo.save();
    res.json(promo);
  } catch (error) { next(error); }
};

// @desc    Delete promotion
// @route   DELETE /api/promotions/:id
// @access  Admin/Manager
const deletePromotion = async (req, res, next) => {
  try {
    const promo = await Promotion.findById(req.params.id);
    if (!promo) { res.status(404); return next(new Error('Promotion not found')); }
    await promo.deleteOne();
    res.json({ message: 'Promotion deleted' });
  } catch (error) { next(error); }
};

// @desc    Toggle promotion active status
// @route   PUT /api/promotions/:id/toggle
// @access  Admin/Manager
const togglePromotion = async (req, res, next) => {
  try {
    const promo = await Promotion.findById(req.params.id);
    if (!promo) { res.status(404); return next(new Error('Promotion not found')); }
    promo.isActive = !promo.isActive;
    await promo.save();
    res.json(promo);
  } catch (error) { next(error); }
};

// @desc    Get active promotions for POS (cashier's store)
// @route   GET /api/promotions/active
// @access  Private
const getActivePromotions = async (req, res, next) => {
  try {
    const now = new Date();
    const filter = {
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    };

    if (req.user.assignedStore) {
      filter.$or = [
        { storeId: req.user.assignedStore },
        { storeId: null },
        { storeId: { $exists: false } },
      ];
    }

    const promotions = await Promotion.find(filter)
      .populate('products', 'name price images')
      .populate('categories', 'name')
      .lean();

    res.json(promotions);
  } catch (error) { next(error); }
};

module.exports = {
  createPromotion,
  getPromotions,
  updatePromotion,
  deletePromotion,
  togglePromotion,
  getActivePromotions,
};
