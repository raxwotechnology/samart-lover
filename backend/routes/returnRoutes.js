const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getReturnOrder,
  createCustomerReturn,
  listCustomerReturns,
  approveCustomerReturn,
  rejectCustomerReturn,
  managerApproveCustomerReturn,
  managerRejectCustomerReturn,
  exportCustomerReturnsPdf,
} = require('../controllers/returnController');

router.use(protect);

router.get('/orders/:id', authorize('manager', 'admin'), getReturnOrder);
router.post('/customer', authorize('manager', 'admin', 'customer'), createCustomerReturn);
router.get('/customer', authorize('manager', 'admin', 'customer'), listCustomerReturns);
router.put('/customer/:id/manager-approve', authorize('manager'), managerApproveCustomerReturn);
router.put('/customer/:id/manager-reject', authorize('manager'), managerRejectCustomerReturn);
router.put('/customer/:id/approve', authorize('admin'), approveCustomerReturn);
router.put('/customer/:id/reject', authorize('admin'), rejectCustomerReturn);
router.get('/customer/export', authorize('admin'), exportCustomerReturnsPdf);

module.exports = router;

