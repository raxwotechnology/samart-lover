const User = require('../models/User');
const Store = require('../models/Store');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { sendNotification } = require('../utils/notificationService');

// @desc    Get all users
// @route   GET /api/admin/users
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) { next(error); }
};

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
const updateUserRole = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) { res.status(404); return next(new Error('User not found')); }
    user.role = req.body.role;
    await user.save();
    res.json({ _id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (error) { next(error); }
};

// @desc    Toggle user active status (activate/deactivate)
// @route   PUT /api/admin/users/:id/toggle-status
const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) { res.status(404); return next(new Error('User not found')); }

    // Prevent deactivating yourself
    if (user._id.toString() === req.user._id.toString()) {
      res.status(400);
      return next(new Error('You cannot deactivate your own account'));
    }

    user.isActive = !user.isActive;
    await user.save();

    // Notify user
    await sendNotification({
      userId: user._id,
      type: 'account_update',
      title: user.isActive ? 'Account Activated ✅' : 'Account Deactivated ⛔',
      message: user.isActive
        ? 'Your account has been reactivated. You can now log in again.'
        : 'Your account has been deactivated by an administrator.',
    });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) { next(error); }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) { res.status(404); return next(new Error('User not found')); }
    await user.deleteOne();
    res.json({ message: 'User removed' });
  } catch (error) { next(error); }
};

// @desc    Get all stores (including inactive)
// @route   GET /api/admin/stores
const getAllStores = async (req, res, next) => {
  try {
    const stores = await Store.find({}).populate('managerId', 'name email').sort({ createdAt: -1 });
    res.json(stores);
  } catch (error) { next(error); }
};

// @desc    Toggle store active status
// @route   PUT /api/admin/stores/:id/toggle
const toggleStore = async (req, res, next) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) { res.status(404); return next(new Error('Store not found')); }
    store.isActive = !store.isActive;
    await store.save();
    res.json(store);
  } catch (error) { next(error); }
};

// @desc    Get all orders
// @route   GET /api/admin/orders
const getAllOrders = async (req, res, next) => {
  try {
    const { startDate, endDate, storeId, status } = req.query;
    const filter = {};
    if (storeId) filter.storeId = storeId;
    if (status) filter.orderStatus = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(filter)
      .populate('userId', 'name email')
      .populate('storeId', 'name')
      .populate('deliveryGuyId', 'name email phone')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) { next(error); }
};

// @desc    Get all products for admin
// @route   GET /api/admin/products
const getAllProducts = async (req, res, next) => {
  try {
    const products = await Product.find({})
      .populate('categoryId', 'name')
      .populate('storeId', 'name')
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (error) { next(error); }
};

// @desc    Approve order
// @route   PUT /api/admin/orders/:id/approve
const approveOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) { res.status(404); return next(new Error('Order not found')); }

    if (order.orderStatus !== 'pending') {
      res.status(400);
      return next(new Error(`Cannot approve order with status "${order.orderStatus}"`));
    }

    order.orderStatus = 'confirmed';
    const updated = await order.save();

    // Notify customer
    await sendNotification({
      userId: order.userId,
      type: 'order_update',
      title: 'Order Confirmed ✅',
      message: `Your order #${order._id.toString().slice(-8).toUpperCase()} has been approved and confirmed.`,
      link: '/orders',
    });

    res.json(updated);
  } catch (error) { next(error); }
};

// @desc    Cancel order
// @route   PUT /api/admin/orders/:id/cancel
const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) { res.status(404); return next(new Error('Order not found')); }

    if (['delivered', 'completed', 'cancelled'].includes(order.orderStatus)) {
      res.status(400);
      return next(new Error(`Cannot cancel order with status "${order.orderStatus}"`));
    }

    // Restore stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: item.quantity },
      });
    }

    const previousStatus = order.orderStatus;
    order.orderStatus = 'cancelled';
    order.paymentStatus = order.paymentStatus === 'completed' ? 'refunded' : 'failed';
    const updated = await order.save();

    // Update courier balance if needed
    try {
      const { handleOrderStatusChangeForCourier } = require('../utils/courierHelper');
      await handleOrderStatusChangeForCourier(updated, previousStatus, updated.orderStatus);
    } catch (courierErr) {
      console.error('Failed to update courier balance on admin cancellation:', courierErr.message);
    }

    // Notify customer
    await sendNotification({
      userId: order.userId,
      type: 'order_update',
      title: 'Order Cancelled ❌',
      message: `Your order #${order._id.toString().slice(-8).toUpperCase()} has been cancelled.${req.body.reason ? ' Reason: ' + req.body.reason : ''}`,
      link: '/orders',
    });

    res.json(updated);
  } catch (error) { next(error); }
};

// @desc    Get platform stats
// @route   GET /api/admin/stats
const getStats = async (req, res, next) => {
  try {
    const [users, stores, products, orders] = await Promise.all([
      User.countDocuments(),
      Store.countDocuments(),
      Product.countDocuments(),
      Order.find({}),
    ]);

    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const pendingOrders = orders.filter((o) => o.orderStatus === 'pending').length;
    const completedOrders = orders.filter((o) => ['delivered', 'completed'].includes(o.orderStatus)).length;
    const cancelledOrders = orders.filter((o) => o.orderStatus === 'cancelled').length;
    const activeUsers = await User.countDocuments({ isActive: true });
    const deactivatedUsers = await User.countDocuments({ isActive: false });

    res.json({
      users,
      activeUsers,
      deactivatedUsers,
      stores,
      products,
      totalOrders: orders.length,
      totalRevenue,
      pendingOrders,
      completedOrders,
      cancelledOrders,
    });
  } catch (error) { next(error); }
};

// @desc    Create a user (including Admins/Managers)
// @route   POST /api/admin/users
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, permissions } = req.body;
    if (!name || !email || !password) {
      res.status(400);
      return next(new Error('Name, email, and password are required'));
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      return next(new Error('User already exists'));
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'customer',
      phone: phone || '',
      permissions: permissions || {
        canAddProducts: true,
        canDeleteProducts: true,
        canEditPrices: true,
        canManageInventory: true,
        canViewFinancials: true,
        canManageEmployees: true,
      },
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      permissions: user.permissions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user permissions
// @route   PUT /api/admin/users/:id/permissions
const updateUserPermissions = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      return next(new Error('User not found'));
    }

    if (req.body.permissions) {
      user.permissions = {
        ...user.permissions,
        ...req.body.permissions,
      };
    }
    await user.save();
    res.json({
      _id: user._id,
      name: user.name,
      role: user.role,
      permissions: user.permissions,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  updateUserRole,
  toggleUserStatus,
  deleteUser,
  getAllStores,
  toggleStore,
  getAllOrders,
  getAllProducts,
  approveOrder,
  cancelOrder,
  getStats,
  createUser,
  updateUserPermissions,
};
