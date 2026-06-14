const Order = require('../models/Order');
const Expense = require('../models/Expense');
const AdditionalIncome = require('../models/AdditionalIncome');
const Store = require('../models/Store');

// @desc    Get combined financial dashboard
// @route   GET /api/finance/dashboard
// @access  Private/Admin/Manager
const getFinancialDashboard = async (req, res, next) => {
  try {
    const { startDate, endDate, storeId, period } = req.query;
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // Store scoping for managers
    let storeFilter = {};
    if (req.user.role === 'manager') {
      const store = await Store.findOne({ managerId: req.user._id });
      if (store) storeFilter = { storeId: store._id };
    } else if (storeId) {
      storeFilter = { storeId };
    }

    // Revenue from orders
    const orderFilter = { ...storeFilter, orderStatus: { $nin: ['cancelled'] } };
    if (Object.keys(dateFilter).length) orderFilter.createdAt = dateFilter;
    const orders = await Order.find(orderFilter);
    const totalRevenue = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const orderCount = orders.length;
    const totalItemsSold = orders.reduce((s, o) => s + (o.items || []).reduce((x, it) => x + (it.quantity || 0), 0), 0);
    const posRevenue = orders.filter((o) => o.isPosOrder).reduce((s, o) => s + (o.totalAmount || 0), 0);
    const onlineRevenue = totalRevenue - posRevenue;

    // Expenses
    const expenseFilter = { ...storeFilter };
    if (Object.keys(dateFilter).length) expenseFilter.date = dateFilter;
    const expenses = await Expense.find(expenseFilter);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const paidExpenses = expenses.filter(e => e.status === 'Paid').reduce((s, e) => s + e.amount, 0);
    const pendingExpenses = expenses.filter(e => e.status === 'Pending').reduce((s, e) => s + e.amount, 0);

    // Additional income
    const incomeFilter = { ...storeFilter };
    if (Object.keys(dateFilter).length) incomeFilter.date = dateFilter;
    const additionalIncomes = await AdditionalIncome.find(incomeFilter);
    const totalAdditionalIncome = additionalIncomes.reduce((s, i) => s + i.amount, 0);

    // Net profit
    const netProfit = totalRevenue + totalAdditionalIncome - totalExpenses;

    // Period series (daily/monthly/yearly). Defaults to monthly (last 12 points).
    const p = ['daily', 'monthly', 'yearly'].includes(String(period)) ? String(period) : 'monthly';
    const now = new Date();
    const makeKey = (d) => {
      if (p === 'daily') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (p === 'yearly') return `${d.getFullYear()}`;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };
    const formatLabel = (key) => {
      if (p === 'daily') return key;
      if (p === 'yearly') return key;
      const [yy, mm] = key.split('-');
      const dt = new Date(Number(yy), Number(mm) - 1, 1);
      return dt.toLocaleDateString('en', { month: 'short', year: '2-digit' });
    };

    const seriesMap = new Map();
    const push = (key, patch) => {
      const cur = seriesMap.get(key) || { key, label: formatLabel(key), revenue: 0, expenses: 0, additionalIncome: 0, profit: 0 };
      const next = { ...cur, ...patch };
      next.profit = (next.revenue || 0) + (next.additionalIncome || 0) - (next.expenses || 0);
      seriesMap.set(key, next);
    };

    for (const o of orders) {
      const key = makeKey(new Date(o.createdAt));
      push(key, { revenue: (seriesMap.get(key)?.revenue || 0) + (o.totalAmount || 0) });
    }
    for (const e of expenses) {
      const key = makeKey(new Date(e.date || e.createdAt));
      push(key, { expenses: (seriesMap.get(key)?.expenses || 0) + (e.amount || 0) });
    }
    for (const i of additionalIncomes) {
      const key = makeKey(new Date(i.date || i.createdAt));
      push(key, { additionalIncome: (seriesMap.get(key)?.additionalIncome || 0) + (i.amount || 0) });
    }

    // ensure at least N points even without date filter
    const targetPoints = p === 'daily' ? 30 : p === 'yearly' ? 5 : 12;
    const startAnchor = (() => {
      if (Object.keys(dateFilter).length && dateFilter.$gte) return new Date(dateFilter.$gte);
      const d = new Date(now);
      if (p === 'daily') d.setDate(d.getDate() - (targetPoints - 1));
      if (p === 'monthly') d.setMonth(d.getMonth() - (targetPoints - 1), 1);
      if (p === 'yearly') d.setFullYear(d.getFullYear() - (targetPoints - 1), 0, 1);
      d.setHours(0, 0, 0, 0);
      return d;
    })();

    for (let n = 0; n < targetPoints; n++) {
      const d = new Date(startAnchor);
      if (p === 'daily') d.setDate(startAnchor.getDate() + n);
      if (p === 'monthly') d.setMonth(startAnchor.getMonth() + n, 1);
      if (p === 'yearly') d.setFullYear(startAnchor.getFullYear() + n, 0, 1);
      const key = makeKey(d);
      if (!seriesMap.has(key)) push(key, {});
    }

    const series = Array.from(seriesMap.values()).sort((a, b) => a.key.localeCompare(b.key));
    const monthlyData = series; // backward compat for UI

    // Expense breakdown by category
    const expenseByCategory = {};
    expenses.forEach(e => {
      if (!expenseByCategory[e.category]) expenseByCategory[e.category] = 0;
      expenseByCategory[e.category] += e.amount;
    });

    res.json({
      totalRevenue,
      posRevenue,
      onlineRevenue,
      totalExpenses,
      paidExpenses,
      pendingExpenses,
      totalAdditionalIncome,
      netProfit,
      orderCount,
      totalItemsSold,
      expenseCount: expenses.length,
      monthlyData,
      period: p,
      series,
      expenseByCategory,
    });
  } catch (error) { next(error); }
};

// @desc    Add additional income
// @route   POST /api/finance/income
// @access  Private/Admin/Manager
const addAdditionalIncome = async (req, res, next) => {
  try {
    const { title, source, amount, date, notes, storeId, paymentMethod } = req.body;

    let assignedStore = storeId;
    if (!assignedStore && req.user.role === 'manager') {
      const store = await Store.findOne({ managerId: req.user._id });
      if (store) assignedStore = store._id;
    }

    const income = await AdditionalIncome.create({
      title,
      source,
      amount,
      date: date || new Date(),
      paymentMethod: paymentMethod || 'Cash',
      notes: notes || '',
      storeId: assignedStore || null,
      createdBy: req.user._id,
    });

    res.status(201).json(income);
  } catch (error) { next(error); }
};

// @desc    Get additional incomes
// @route   GET /api/finance/income
// @access  Private/Admin/Manager
const getAdditionalIncomes = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = {};

    if (req.user.role === 'manager') {
      const store = await Store.findOne({ managerId: req.user._id });
      if (store) filter.storeId = store._id;
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const incomes = await AdditionalIncome.find(filter)
      .populate('createdBy', 'name')
      .sort({ date: -1 });

    res.json(incomes);
  } catch (error) { next(error); }
};

// @desc    Delete additional income
// @route   DELETE /api/finance/income/:id
// @access  Private/Admin/Manager
const deleteAdditionalIncome = async (req, res, next) => {
  try {
    const income = await AdditionalIncome.findById(req.params.id);
    if (!income) { res.status(404); return next(new Error('Income record not found')); }
    await income.deleteOne();
    res.json({ message: 'Income record deleted' });
  } catch (error) { next(error); }
};

// @desc    Update additional income
// @route   PUT /api/finance/income/:id
// @access  Private/Admin/Manager
const updateAdditionalIncome = async (req, res, next) => {
  try {
    const income = await AdditionalIncome.findById(req.params.id);
    if (!income) { res.status(404); return next(new Error('Income record not found')); }

    if (req.user.role === 'manager') {
      const store = await Store.findOne({ managerId: req.user._id });
      if (!store || String(income.storeId) !== String(store._id)) {
        res.status(403);
        return next(new Error('Not authorized to update this income record'));
      }
    }

    const fields = ['title', 'source', 'amount', 'date', 'notes', 'paymentMethod'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) income[f] = req.body[f];
    });
    await income.save();
    res.json(income);
  } catch (error) { next(error); }
};

// @desc    Get profit report by Category and Brand
// @route   GET /api/finance/profit-report
// @access  Private/Admin/Manager
const getProfitReport = async (req, res, next) => {
  try {
    const { startDate, endDate, storeId } = req.query;
    const filter = { orderStatus: { $nin: ['cancelled'] } };

    const Store = require('../models/Store');
    if (req.user.role === 'manager') {
      const store = await Store.findOne({ managerId: req.user._id });
      if (store) filter.storeId = store._id;
    } else if (storeId) {
      filter.storeId = storeId;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(filter)
      .populate({
        path: 'items.productId',
        populate: {
          path: 'categoryId',
          select: 'name'
        }
      });

    const categoryReport = {};
    const brandReport = {};

    orders.forEach(order => {
      order.items.forEach(item => {
        const qty = Number(item.quantity || 0);
        const revenue = Number(item.price || 0) * qty;
        const cost = Number(item.unitCostAtSale || 0) * qty;
        const profit = revenue - cost;

        const product = item.productId;
        const categoryName = product && product.categoryId ? product.categoryId.name : 'Uncategorized';
        const brandName = product && product.brand ? product.brand : 'Generic';

        // Group by Category
        if (!categoryReport[categoryName]) {
          categoryReport[categoryName] = { sales: 0, cost: 0, profit: 0, itemsSold: 0 };
        }
        categoryReport[categoryName].sales += revenue;
        categoryReport[categoryName].cost += cost;
        categoryReport[categoryName].profit += profit;
        categoryReport[categoryName].itemsSold += qty;

        // Group by Brand
        if (!brandReport[brandName]) {
          brandReport[brandName] = { sales: 0, cost: 0, profit: 0, itemsSold: 0 };
        }
        brandReport[brandName].sales += revenue;
        brandReport[brandName].cost += cost;
        brandReport[brandName].profit += profit;
        brandReport[brandName].itemsSold += qty;
      });
    });

    // Format into arrays
    const categories = Object.entries(categoryReport).map(([name, data]) => ({
      name,
      sales: Math.round(data.sales * 100) / 100,
      cost: Math.round(data.cost * 100) / 100,
      profit: Math.round(data.profit * 100) / 100,
      itemsSold: data.itemsSold
    })).sort((a, b) => b.profit - a.profit);

    const brands = Object.entries(brandReport).map(([name, data]) => ({
      name,
      sales: Math.round(data.sales * 100) / 100,
      cost: Math.round(data.cost * 100) / 100,
      profit: Math.round(data.profit * 100) / 100,
      itemsSold: data.itemsSold
    })).sort((a, b) => b.profit - a.profit);

    res.json({ categories, brands });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFinancialDashboard,
  addAdditionalIncome,
  getAdditionalIncomes,
  deleteAdditionalIncome,
  updateAdditionalIncome,
  getProfitReport,
};
