const express = require('express');
const router = express.Router();
const {
  getFinancialDashboard,
  addAdditionalIncome,
  getAdditionalIncomes,
  deleteAdditionalIncome,
  updateAdditionalIncome,
  getProfitReport,
} = require('../controllers/financeController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin', 'manager'));

router.get('/dashboard', getFinancialDashboard);
router.get('/profit-report', getProfitReport);
router.route('/income').get(getAdditionalIncomes).post(addAdditionalIncome);
router.put('/income/:id', updateAdditionalIncome);
router.delete('/income/:id', deleteAdditionalIncome);

module.exports = router;
