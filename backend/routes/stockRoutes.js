const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  createStockReceipt,
  listStockReceipts,
  getReceiptByGRN,
  createSupplierReturn,
  listSupplierReturns,
  createInventoryTransfer,
  getInventoryTransfers,
  completeInventoryTransfer,
  cancelInventoryTransfer,
} = require('../controllers/stockController');

router.use(protect, authorize('admin', 'manager', 'stockEmployee', 'cashier'));

router.route('/receipts')
  .get(listStockReceipts)
  .post(createStockReceipt);

router.get('/receipts/grn/:grnNumber', getReceiptByGRN);

router.route('/supplier-returns')
  .get(listSupplierReturns)
  .post(createSupplierReturn);

router.route('/transfers')
  .get(getInventoryTransfers)
  .post(createInventoryTransfer);

router.put('/transfers/:id/complete', completeInventoryTransfer);
router.put('/transfers/:id/cancel', cancelInventoryTransfer);

module.exports = router;
