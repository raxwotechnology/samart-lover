const Expense = require('../models/Expense');
const Store = require('../models/Store');

// @desc    Create expense
// @route   POST /api/expenses
// @access  Private/Admin/Manager
const createExpense = async (req, res, next) => {
  try {
    const { title, category, amount, date, status, notes, storeId, receipt, paymentMethod } = req.body;

    // If manager, auto-assign their store
    let assignedStore = storeId;
    if (!assignedStore && req.user.role === 'manager') {
      const store = await Store.findOne({ managerId: req.user._id });
      if (store) assignedStore = store._id;
    }

    const expense = await Expense.create({
      title,
      category,
      amount,
      date: date || new Date(),
      status: status || 'Pending',
      paymentMethod: paymentMethod || 'Cash',
      notes: notes || '',
      storeId: assignedStore || null,
      createdBy: req.user._id,
      receipt: receipt || '',
    });

    res.status(201).json(expense);
  } catch (error) { next(error); }
};

// @desc    Get all expenses (with filters)
// @route   GET /api/expenses
// @access  Private/Admin/Manager
const getExpenses = async (req, res, next) => {
  try {
    const { category, status, startDate, endDate, storeId } = req.query;
    const filter = {};

    // Manager can only see their store's expenses
    if (req.user.role === 'manager') {
      const store = await Store.findOne({ managerId: req.user._id });
      if (store) filter.storeId = store._id;
    } else if (storeId) {
      filter.storeId = storeId;
    }

    if (category) filter.category = category;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const expenses = await Expense.find(filter)
      .populate('storeId', 'name')
      .populate('createdBy', 'name')
      .sort({ date: -1 });

    res.json(expenses);
  } catch (error) { next(error); }
};

// @desc    Get expense by ID
// @route   GET /api/expenses/:id
// @access  Private/Admin/Manager
const getExpenseById = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('storeId', 'name')
      .populate('createdBy', 'name');

    if (!expense) { res.status(404); return next(new Error('Expense not found')); }
    res.json(expense);
  } catch (error) { next(error); }
};

// @desc    Update expense
// @route   PUT /api/expenses/:id
// @access  Private/Admin/Manager
const updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) { res.status(404); return next(new Error('Expense not found')); }

    const { title, category, amount, date, status, notes, receipt, paymentMethod } = req.body;
    if (title !== undefined) expense.title = title;
    if (category !== undefined) expense.category = category;
    if (amount !== undefined) expense.amount = amount;
    if (date !== undefined) expense.date = date;
    if (status !== undefined) expense.status = status;
    if (paymentMethod !== undefined) expense.paymentMethod = paymentMethod;
    if (notes !== undefined) expense.notes = notes;
    if (receipt !== undefined) expense.receipt = receipt;

    const updated = await expense.save();
    res.json(updated);
  } catch (error) { next(error); }
};

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private/Admin/Manager
const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) { res.status(404); return next(new Error('Expense not found')); }
    await expense.deleteOne();
    res.json({ message: 'Expense deleted' });
  } catch (error) { next(error); }
};

// @desc    Get expense summary (totals by category, paid/pending)
// @route   GET /api/expenses/summary
// @access  Private/Admin/Manager
const getExpenseSummary = async (req, res, next) => {
  try {
    const { startDate, endDate, storeId } = req.query;
    const match = {};

    if (req.user.role === 'manager') {
      const store = await Store.findOne({ managerId: req.user._id });
      if (store) match.storeId = store._id;
    } else if (storeId) {
      match.storeId = require('mongoose').Types.ObjectId(storeId);
    }

    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) match.date.$lte = new Date(endDate);
    }

    // Totals
    const allExpenses = await Expense.find(match);
    const totalExpenses = allExpenses.reduce((s, e) => s + e.amount, 0);
    const paidExpenses = allExpenses.filter(e => e.status === 'Paid').reduce((s, e) => s + e.amount, 0);
    const pendingExpenses = allExpenses.filter(e => e.status === 'Pending').reduce((s, e) => s + e.amount, 0);

    // By category
    const byCategory = {};
    allExpenses.forEach(e => {
      if (!byCategory[e.category]) byCategory[e.category] = { total: 0, paid: 0, pending: 0, count: 0 };
      byCategory[e.category].total += e.amount;
      byCategory[e.category].count += 1;
      if (e.status === 'Paid') byCategory[e.category].paid += e.amount;
      else byCategory[e.category].pending += e.amount;
    });

    // Monthly trend (last 12 months)
    const monthlyTrend = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const monthExpenses = allExpenses.filter(e => {
        const d = new Date(e.date);
        return d >= monthStart && d <= monthEnd;
      });
      monthlyTrend.push({
        month: monthStart.toLocaleDateString('en', { month: 'short', year: '2-digit' }),
        total: monthExpenses.reduce((s, e) => s + e.amount, 0),
        count: monthExpenses.length,
      });
    }

    res.json({
      totalExpenses,
      paidExpenses,
      pendingExpenses,
      totalCount: allExpenses.length,
      byCategory,
      monthlyTrend,
    });
  } catch (error) { next(error); }
};

module.exports = {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
};
