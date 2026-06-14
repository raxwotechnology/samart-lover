const Wishlist = require('../models/Wishlist');

// @desc    Get user wishlist
// @route   GET /api/wishlist
// @access  Private
const getWishlist = async (req, res, next) => {
  try {
    let wishlist = await Wishlist.findOne({ userId: req.user._id })
      .populate('products', 'name price mrp discount unit images averageRating totalReviews storeId isFeatured isOnSale stock');

    if (!wishlist) {
      wishlist = await Wishlist.create({ userId: req.user._id, products: [] });
    }

    res.json(wishlist);
  } catch (error) {
    next(error);
  }
};

// @desc    Add product to wishlist
// @route   POST /api/wishlist/:productId
// @access  Private
const addToWishlist = async (req, res, next) => {
  try {
    let wishlist = await Wishlist.findOne({ userId: req.user._id });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        userId: req.user._id,
        products: [req.params.productId],
      });
    } else {
      if (!wishlist.products.includes(req.params.productId)) {
        wishlist.products.push(req.params.productId);
        await wishlist.save();
      }
    }

    wishlist = await Wishlist.findOne({ userId: req.user._id })
      .populate('products', 'name price mrp discount unit images averageRating totalReviews storeId isFeatured isOnSale stock');

    res.json(wishlist);
  } catch (error) {
    next(error);
  }
};

// @desc    Remove product from wishlist
// @route   DELETE /api/wishlist/:productId
// @access  Private
const removeFromWishlist = async (req, res, next) => {
  try {
    const wishlist = await Wishlist.findOne({ userId: req.user._id });

    if (!wishlist) {
      res.status(404);
      return next(new Error('Wishlist not found'));
    }

    wishlist.products = wishlist.products.filter(
      (p) => p.toString() !== req.params.productId
    );
    await wishlist.save();

    const updated = await Wishlist.findOne({ userId: req.user._id })
      .populate('products', 'name price mrp discount unit images averageRating totalReviews storeId isFeatured isOnSale stock');

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

module.exports = { getWishlist, addToWishlist, removeFromWishlist };
