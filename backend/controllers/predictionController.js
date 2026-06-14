const Order = require('../models/Order');
const Expense = require('../models/Expense');
const Store = require('../models/Store');

// Simple linear regression
function linearRegression(data) {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0]?.y || 0 };
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  data.forEach((d, i) => {
    sumX += i;
    sumY += d.y;
    sumXY += i * d.y;
    sumX2 += i * i;
  });
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n || 0 };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope: isNaN(slope) ? 0 : slope, intercept: isNaN(intercept) ? 0 : intercept };
}

function predict(reg, x) {
  return Math.max(0, reg.slope * x + reg.intercept);
}

// Helper: group orders by period
async function aggregateByPeriod(storeFilter, startDate, periodType) {
  let groupId;
  if (periodType === 'daily') {
    groupId = {
      year: { $year: '$createdAt' },
      month: { $month: '$createdAt' },
      day: { $dayOfMonth: '$createdAt' },
    };
  } else if (periodType === 'weekly') {
    groupId = {
      year: { $isoWeekYear: '$createdAt' },
      week: { $isoWeek: '$createdAt' },
    };
  } else {
    groupId = {
      year: { $year: '$createdAt' },
      month: { $month: '$createdAt' },
    };
  }

  return Order.aggregate([
    {
      $match: {
        ...storeFilter,
        orderStatus: { $nin: ['cancelled'] },
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: groupId,
        revenue: { $sum: '$totalAmount' },
        orders: { $sum: 1 },
        items: { $sum: { $cond: [{ $isArray: '$items' }, { $size: '$items' }, 0] } },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } },
  ]);
}

async function aggregateExpensesByPeriod(storeFilter, startDate, periodType) {
  let groupId;
  if (periodType === 'daily') {
    groupId = { year: { $year: '$date' }, month: { $month: '$date' }, day: { $dayOfMonth: '$date' } };
  } else if (periodType === 'weekly') {
    groupId = { year: { $isoWeekYear: '$date' }, week: { $isoWeek: '$date' } };
  } else {
    groupId = { year: { $year: '$date' }, month: { $month: '$date' } };
  }

  return Expense.aggregate([
    { $match: { ...storeFilter, date: { $gte: startDate } } },
    { $group: { _id: groupId, expenses: { $sum: '$amount' } } },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } },
  ]);
}

function buildPeriodKey(id, periodType) {
  if (periodType === 'daily') return `${id.year}-${String(id.month).padStart(2, '0')}-${String(id.day).padStart(2, '0')}`;
  if (periodType === 'weekly') return `${id.year}-W${String(id.week).padStart(2, '0')}`;
  return `${id.year}-${String(id.month).padStart(2, '0')}`;
}

function buildPeriodLabel(id, periodType) {
  if (periodType === 'daily') {
    const d = new Date(id.year, id.month - 1, id.day);
    return d.toLocaleDateString('en', { day: 'numeric', month: 'short' });
  }
  if (periodType === 'weekly') return `W${id.week} '${String(id.year).slice(-2)}`;
  const d = new Date(id.year, id.month - 1, 1);
  return d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
}

// @desc    Get sales predictions (supports daily/weekly/monthly)
// @route   GET /api/predictions/sales
// @access  Private/Admin/Manager
const getSalesPredictions = async (req, res, next) => {
  try {
    const { months = 12, period = 'monthly' } = req.query;

    // Store scoping for managers
    let storeFilter = {};
    if (req.user.role === 'manager') {
      const store = await Store.findOne({ managerId: req.user._id });
      if (store) storeFilter = { storeId: store._id };
    }

    const now = new Date();
    let startDate;
    let forecastPeriods = 3;

    if (period === 'daily') {
      startDate = new Date(now.getTime() - Number(months) * 30 * 24 * 60 * 60 * 1000);
      forecastPeriods = 7; // predict next 7 days
    } else if (period === 'weekly') {
      startDate = new Date(now.getTime() - Number(months) * 30 * 24 * 60 * 60 * 1000);
      forecastPeriods = 4; // predict next 4 weeks
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth() - Number(months), 1);
      forecastPeriods = 3; // predict next 3 months
    }

    const revenueAgg = await aggregateByPeriod(storeFilter, startDate, period);
    const expenseAgg = await aggregateExpensesByPeriod(storeFilter, startDate, period);

    // Build unified map
    const dataMap = new Map();
    revenueAgg.forEach((r) => {
      const key = buildPeriodKey(r._id, period);
      dataMap.set(key, {
        key,
        label: buildPeriodLabel(r._id, period),
        revenue: r.revenue || 0,
        orders: r.orders || 0,
        expenses: 0,
        profit: 0,
      });
    });

    expenseAgg.forEach((e) => {
      const key = buildPeriodKey(e._id, period);
      if (dataMap.has(key)) {
        dataMap.get(key).expenses = e.expenses || 0;
      } else {
        dataMap.set(key, {
          key,
          label: buildPeriodLabel(e._id, period),
          revenue: 0,
          orders: 0,
          expenses: e.expenses || 0,
          profit: 0,
        });
      }
    });

    const historical = Array.from(dataMap.values()).sort((a, b) => a.key.localeCompare(b.key));
    historical.forEach((h) => { h.profit = h.revenue - h.expenses; });

    // Linear regression
    const revenueData = historical.map((h, i) => ({ x: i, y: h.revenue }));
    const expenseData = historical.map((h, i) => ({ x: i, y: h.expenses }));
    const orderData = historical.map((h, i) => ({ x: i, y: h.orders }));

    const revReg = linearRegression(revenueData);
    const expReg = linearRegression(expenseData);
    const ordReg = linearRegression(orderData);

    // Predict future periods
    const predictions = [];
    const n = historical.length;
    for (let i = 0; i < forecastPeriods; i++) {
      let label, key;
      if (period === 'daily') {
        const d = new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000);
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        label = d.toLocaleDateString('en', { day: 'numeric', month: 'short' });
      } else if (period === 'weekly') {
        const d = new Date(now.getTime() + (i + 1) * 7 * 24 * 60 * 60 * 1000);
        const weekNum = Math.ceil(((d - new Date(d.getFullYear(), 0, 1)) / 86400000 + new Date(d.getFullYear(), 0, 1).getDay() + 1) / 7);
        key = `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
        label = `W${weekNum} '${String(d.getFullYear()).slice(-2)}`;
      } else {
        const d = new Date(now.getFullYear(), now.getMonth() + 1 + i, 1);
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        label = d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
      }

      const predRevenue = Math.round(predict(revReg, n + i));
      const predExpenses = Math.round(predict(expReg, n + i));
      const predOrders = Math.round(predict(ordReg, n + i));

      predictions.push({
        key,
        label,
        revenue: predRevenue,
        expenses: predExpenses,
        orders: predOrders,
        profit: predRevenue - predExpenses,
        isPrediction: true,
      });
    }

    // Trend analysis
    const recentCount = Math.min(3, historical.length);
    const olderCount = Math.min(6, historical.length) - recentCount;
    const recentMonths = historical.slice(-recentCount);
    const olderMonths = historical.slice(-(recentCount + olderCount), -recentCount);
    const recentAvg = recentMonths.reduce((s, h) => s + h.revenue, 0) / (recentMonths.length || 1);
    const olderAvg = olderMonths.reduce((s, h) => s + h.revenue, 0) / (olderMonths.length || 1);
    const growthRate = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg * 100) : 0;

    let trend = 'stable';
    if (growthRate > 5) trend = 'up';
    else if (growthRate < -5) trend = 'down';

    const totalRevenue = historical.reduce((s, h) => s + h.revenue, 0);
    const totalExpenses = historical.reduce((s, h) => s + h.expenses, 0);
    const avgRevenue = Math.round(totalRevenue / (historical.length || 1));
    const nextPrediction = predictions[0]?.revenue || 0;

    res.json({
      historical,
      predictions,
      period,
      trend,
      growthRate: Math.round(growthRate * 10) / 10,
      summary: {
        totalRevenue,
        totalExpenses,
        avgMonthlyRevenue: avgRevenue,
        nextMonthPrediction: nextPrediction,
        predictedGrowth: Math.round(((nextPrediction - avgRevenue) / (avgRevenue || 1)) * 100 * 10) / 10,
      },
      regression: {
        revenueSlope: Math.round(revReg.slope),
        expenseSlope: Math.round(expReg.slope),
      },
    });
  } catch (error) { next(error); }
};

module.exports = { getSalesPredictions };
