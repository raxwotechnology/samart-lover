const express = require('express');
const router = express.Router();
const { getSalesPredictions } = require('../controllers/predictionController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/sales', authorize('admin', 'manager'), getSalesPredictions);

module.exports = router;
