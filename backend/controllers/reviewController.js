const Review = require('../models/Review');
const Product = require('../models/Product');

// @desc    Get reviews for a product
// @route   GET /api/reviews/product/:productId
// @access  Public
const sendError = (res, status, message) => res.status(status).json({ message });

const getProductReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      productId: req.params.productId,
    })
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to load reviews');
  }
};

// @desc    Create a review
// @route   POST /api/reviews/product/:productId
// @access  Private
const createReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const existing = await Review.findOne({
      userId: req.user._id,
      productId: req.params.productId,
    });

    if (existing) {
      return sendError(res, 400, 'You have already reviewed this product');
    }

    const review = await Review.create({
      userId: req.user._id,
      productId: req.params.productId,
      rating,
      comment,
    });

    // Update product average rating
    const productRating = await updateProductRating(req.params.productId);

    const populated = await Review.findById(review._id).populate('userId', 'name avatar');
    res.status(201).json({
      ...populated.toObject(),
      productRating,
    });
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to create review');
  }
};

// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private
const updateReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return sendError(res, 404, 'Review not found');
    }

    if (review.userId.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'Not authorized');
    }

    review.rating = req.body.rating || review.rating;
    review.comment = req.body.comment || review.comment;
    await review.save();

    await updateProductRating(review.productId);

    const populated = await Review.findById(review._id).populate('userId', 'name avatar');
    res.json(populated);
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to update review');
  }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return sendError(res, 404, 'Review not found');
    }

    if (
      review.userId.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return sendError(res, 403, 'Not authorized');
    }

    const productId = review.productId;
    await review.deleteOne();
    await updateProductRating(productId);

    res.json({ message: 'Review removed' });
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to delete review');
  }
};

// Helper: recalculate product rating
async function updateProductRating(productId) {
  const reviews = await Review.find({ productId });
  const product = await Product.findById(productId);
  if (product) {
    if (reviews.length > 0) {
      const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      product.averageRating = Math.round(avg * 10) / 10;
      product.totalReviews = reviews.length;
    } else {
      product.averageRating = 0;
      product.totalReviews = 0;
    }
    await product.save();
    return {
      averageRating: product.averageRating,
      totalReviews: product.totalReviews,
    };
  }
  return null;
}

module.exports = { getProductReviews, createReview, updateReview, deleteReview };
