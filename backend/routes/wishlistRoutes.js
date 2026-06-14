const express = require('express');
const router = express.Router();
const { getWishlist, addToWishlist, removeFromWishlist } = require('../controllers/wishlistController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/').get(getWishlist);
router.route('/:productId').post(addToWishlist).delete(removeFromWishlist);

module.exports = router;
