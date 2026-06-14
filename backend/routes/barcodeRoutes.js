const express = require('express');
const router = express.Router();
const { generateBarcode, getBarcodeLogs } = require('../controllers/barcodeController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All barcode routes require auth
router.use(protect);

// Generate barcode (log + return product data) — cashier, manager, admin
router.post('/generate', authorize('cashier', 'manager', 'admin'), generateBarcode);

// Get barcode activity logs — admin only
router.get('/logs', authorize('admin'), getBarcodeLogs);

module.exports = router;
