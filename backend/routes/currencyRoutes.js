const express = require('express');
const router = express.Router();
const { getExchangeRate } = require('../utils/currencyService');

// @desc    Get current exchange rate (public)
// @route   GET /api/currency/rate
// @access  Public
router.get('/rate', async (req, res, next) => {
  try {
    const rate = await getExchangeRate();
    res.json({
      base: 'USD',
      target: 'LKR',
      rate,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
