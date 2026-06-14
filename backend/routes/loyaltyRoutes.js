const express = require('express');
const router = express.Router();
const {
  getMyPoints, getLoyaltyHistory, redeemPoints, issueBonusPoints,
  applyVoucher, applyPromoCode, getAvailableVouchers, claimVoucher,
  getAllVouchers,
  createVoucher, updateVoucher, deleteVoucher,
} = require('../controllers/loyaltyController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/points', getMyPoints);
router.get('/history', getLoyaltyHistory);
router.get('/vouchers', getAvailableVouchers);
router.get('/vouchers/admin', authorize('admin', 'manager'), getAllVouchers);
router.post('/vouchers/:code/claim', claimVoucher);
router.post('/redeem', redeemPoints);
router.post('/voucher/apply', applyVoucher);
router.post('/promo/apply', applyPromoCode);
router.post('/bonus', authorize('admin', 'manager'), issueBonusPoints);

// Voucher CRUD (admin/manager)
router.post('/vouchers', authorize('admin', 'manager'), createVoucher);
router.put('/vouchers/:id', authorize('admin', 'manager'), updateVoucher);
router.delete('/vouchers/:id', authorize('admin', 'manager'), deleteVoucher);

module.exports = router;
