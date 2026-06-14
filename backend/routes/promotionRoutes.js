const express = require('express');
const router = express.Router();
const {
  createPromotion, getPromotions, updatePromotion,
  deletePromotion, togglePromotion, getActivePromotions,
} = require('../controllers/promotionController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/active', getActivePromotions);
router.get('/', authorize('admin', 'manager'), getPromotions);
router.post('/', authorize('admin', 'manager'), createPromotion);
router.put('/:id', authorize('admin', 'manager'), updatePromotion);
router.put('/:id/toggle', authorize('admin', 'manager'), togglePromotion);
router.delete('/:id', authorize('admin', 'manager'), deletePromotion);

module.exports = router;
