const Courier = require('../models/Courier');

/**
 * Updates outstanding balance for couriers assigned to an order.
 * @param {Object} order - The order document
 * @param {number} multiplier - 1 to add to balance, -1 to subtract
 */
const updateCourierBalanceForOrder = async (order, multiplier) => {
  try {
    // 1. Order-level courier service
    if (order.courierService && order.deliveryFee > 0) {
      const courier = await Courier.findOne({ name: order.courierService });
      if (courier) {
        courier.balance = (courier.balance || 0) + (order.deliveryFee * multiplier);
        await courier.save();
      }
    }

    // 2. Item-level courier service
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        if (item.courierId && item.courierCharge > 0) {
          const courier = await Courier.findById(item.courierId);
          if (courier) {
            const charge = order.isPosOrder ? item.courierCharge : (item.courierCharge * (item.quantity || 1));
            courier.balance = (courier.balance || 0) + (charge * multiplier);
            await courier.save();
          }
        }
      }
    }
  } catch (error) {
    console.error('Error updating courier balance:', error);
  }
};

/**
 * Automatically handles order status transitions to update courier balance.
 * @param {Object} order - The updated order document
 * @param {string} previousStatus - The previous status of the order
 * @param {string} newStatus - The new status of the order
 */
const handleOrderStatusChangeForCourier = async (order, previousStatus, newStatus) => {
  const isCompletedState = (status) => ['delivered', 'completed'].includes(status);
  const wasCompleted = isCompletedState(previousStatus);
  const isCompleted = isCompletedState(newStatus);

  if (!wasCompleted && isCompleted) {
    // Transition to completed: add to balance
    await updateCourierBalanceForOrder(order, 1);
  } else if (wasCompleted && !isCompleted) {
    // Transition away from completed (e.g. cancelled): subtract from balance
    await updateCourierBalanceForOrder(order, -1);
  }
};

module.exports = {
  updateCourierBalanceForOrder,
  handleOrderStatusChangeForCourier,
};
