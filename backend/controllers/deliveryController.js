const Order = require('../models/Order');
const Store = require('../models/Store');
const User = require('../models/User');
const { sendNotification } = require('../utils/notificationService');
const { deliveryAssignmentEmail } = require('../utils/emailService');

// @desc    Get orders assigned to delivery guy
// @route   GET /api/delivery/orders
// @access  Private/DeliveryGuy
const getMyDeliveries = async (req, res, next) => {
  try {
    const orders = await Order.find({
      deliveryGuyId: req.user._id,
      $or: [
        { orderStatus: { $in: ['assigned_delivery', 'packed', 'shipped', 'out_for_delivery'] } },
        { orderStatus: 'delivered', paymentMethod: 'cod', paymentStatus: 'pending' },
      ],
    })
      .populate('userId', 'name phone email addresses')
      .populate('storeId', 'name address phone')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) { next(error); }
};

// @desc    Get delivery history (completed/cancelled)
// @route   GET /api/delivery/history
// @access  Private/DeliveryGuy
const getDeliveryHistory = async (req, res, next) => {
  try {
    const orders = await Order.find({
      deliveryGuyId: req.user._id,
      orderStatus: { $in: ['delivered', 'completed', 'cancelled'] },
    })
      .populate('userId', 'name phone')
      .populate('storeId', 'name')
      .sort({ updatedAt: -1 })
      .limit(50);

    res.json(orders);
  } catch (error) { next(error); }
};

// @desc    Update delivery status
// @route   PUT /api/delivery/orders/:id/status
// @access  Private/DeliveryGuy
const updateDeliveryStatus = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      deliveryGuyId: req.user._id,
    });

    if (!order) { res.status(404); return next(new Error('Order not found or not assigned to you')); }

    const { status } = req.body;
    const validStatuses = ['out_for_delivery', 'delivered'];
    if (!validStatuses.includes(status)) {
      res.status(400);
      return next(new Error(`Invalid status. Valid: ${validStatuses.join(', ')}`));
    }

    const previousStatus = order.orderStatus;
    order.orderStatus = status;
    if (status === 'delivered') order.deliveredAt = new Date();

    const updated = await order.save();

    // Update courier balance if needed
    try {
      const { handleOrderStatusChangeForCourier } = require('../utils/courierHelper');
      await handleOrderStatusChangeForCourier(updated, previousStatus, updated.orderStatus);
    } catch (courierErr) {
      console.error('Failed to update courier balance on delivery status update:', courierErr.message);
    }

    // Notify customer
    const customer = await User.findById(order.userId);
    if (customer) {
      const statusMessages = {
        shipped: 'Your order has been shipped!',
        out_for_delivery: 'Your order is out for delivery!',
        delivered: 'Your order has been delivered. Enjoy! 🎉',
      };
      await sendNotification({
        userId: customer._id,
        userEmail: customer.email,
        type: 'delivery_update',
        title: `Order ${status.replace(/_/g, ' ')}`,
        message: statusMessages[status],
        link: `/orders`,
        emailContent: {
          subject: `Smartlover — Your order is ${status.replace(/_/g, ' ')}`,
          html: `<div style="font-family: Arial, sans-serif; padding: 20px;"><h2>Hi ${customer.name}!</h2><p>${statusMessages[status]}</p><p>Order #${order._id.toString().slice(-8).toUpperCase()}</p></div>`,
        },
      });
    }

    res.json(updated);
  } catch (error) { next(error); }
};

// @desc    Mark COD payment as successful and complete order
// @route   PUT /api/delivery/orders/:id/payment-success
// @access  Private/DeliveryGuy
const markCodPaymentSuccessful = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      deliveryGuyId: req.user._id,
    });

    if (!order) { res.status(404); return next(new Error('Order not found or not assigned to you')); }
    if (order.paymentMethod !== 'cod') { res.status(400); return next(new Error('Only COD orders can be marked as payment successful')); }
    if (!['delivered', 'completed'].includes(order.orderStatus)) {
      res.status(400);
      return next(new Error('Order must be delivered before payment can be confirmed'));
    }

    const previousStatus = order.orderStatus;
    order.paymentStatus = 'completed';
    order.orderStatus = 'completed';
    order.completedAt = new Date();

    const updated = await order.save();

    // Update courier balance if needed
    try {
      const { handleOrderStatusChangeForCourier } = require('../utils/courierHelper');
      await handleOrderStatusChangeForCourier(updated, previousStatus, updated.orderStatus);
    } catch (courierErr) {
      console.error('Failed to update courier balance on COD payment success:', courierErr.message);
    }
    res.json(updated);
  } catch (error) { next(error); }
};

// @desc    Get delivery earnings
// @route   GET /api/delivery/earnings
// @access  Private/DeliveryGuy
const getDeliveryEarnings = async (req, res, next) => {
  try {
    const deliveredOrders = await Order.find({
      deliveryGuyId: req.user._id,
      orderStatus: { $in: ['delivered', 'completed'] },
    });

    const totalDeliveries = deliveredOrders.length;
    const DELIVERY_COMMISSION = 150; // Rs.150 per delivery
    const totalEarnings = totalDeliveries * DELIVERY_COMMISSION;

    // This month's stats
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const thisMonth = deliveredOrders.filter((o) => new Date(o.updatedAt) >= startOfMonth);

    res.json({
      totalDeliveries,
      totalEarnings,
      commissionPerDelivery: DELIVERY_COMMISSION,
      thisMonth: {
        deliveries: thisMonth.length,
        earnings: thisMonth.length * DELIVERY_COMMISSION,
      },
    });
  } catch (error) { next(error); }
};

// @desc    Assign delivery guy to order (manager/admin)
// @route   POST /api/delivery/assign/:orderId
// @access  Private/Manager/Admin
const assignDeliveryGuy = async (req, res, next) => {
  try {
    const { deliveryGuyId } = req.body;
    const order = await Order.findById(req.params.orderId);
    if (!order) { res.status(404); return next(new Error('Order not found')); }

    const deliveryGuy = await User.findOne({ _id: deliveryGuyId, role: 'deliveryGuy' });
    if (!deliveryGuy) { res.status(404); return next(new Error('Delivery person not found')); }

    order.deliveryGuyId = deliveryGuyId;
    if (['pending', 'confirmed', 'packed'].includes(order.orderStatus)) {
      order.orderStatus = 'assigned_delivery';
    }
    await order.save();

    // Notify delivery guy
    const emailContent = deliveryAssignmentEmail(order, deliveryGuy.name);
    await sendNotification({
      userId: deliveryGuy._id,
      userEmail: deliveryGuy.email,
      type: 'delivery_assignment',
      title: 'New Delivery Assignment',
      message: `Order #${order._id.toString().slice(-8).toUpperCase()} assigned to you`,
      link: '/delivery',
      emailContent,
    });

    res.json({ message: 'Delivery person assigned', order });
  } catch (error) { next(error); }
};

// @desc    Get available delivery guys for a store
// @route   GET /api/delivery/available
// @access  Private/Manager/Admin
const getAvailableDeliveryGuys = async (req, res, next) => {
  try {
    const filter = { role: 'deliveryGuy' };
    if (req.query.storeId) filter.assignedStore = req.query.storeId;

    const guys = await User.find(filter).select('name phone email assignedStore');
    res.json(guys);
  } catch (error) { next(error); }
};

module.exports = {
  getMyDeliveries,
  getDeliveryHistory,
  updateDeliveryStatus,
  getDeliveryEarnings,
  assignDeliveryGuy,
  getAvailableDeliveryGuys,
  markCodPaymentSuccessful,
};
