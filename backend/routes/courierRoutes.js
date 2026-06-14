const express = require('express');
const router = express.Router();
const {
  getCouriers,
  getCourierById,
  createCourier,
  updateCourier,
  deleteCourier,
  getCourierPayments,
  addCourierPayment,
} = require('../controllers/courierController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Get active couriers is public/authenticated (needed for cashier checkouts)
router.route('/')
  .get(getCouriers)
  .post(protect, authorize('admin', 'manager'), createCourier);

router.route('/:id')
  .put(protect, authorize('admin', 'manager'), updateCourier)
  .delete(protect, authorize('admin', 'manager'), deleteCourier);

// Courier detail
router.route('/:id')
  .get(getCourierById);

// Payments
router.route('/:id/payments')
  .get(protect, authorize('admin', 'manager'), getCourierPayments)
  .post(protect, authorize('admin', 'manager'), addCourierPayment);

module.exports = router;
