import { useState, useEffect, Fragment } from 'react';
import { CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { getAdminOrders, updateOrderStatus, approveOrder, cancelOrder, assignDeliveryGuy, getAvailableDeliveryGuys, getCouriers } from '../../services/api';
import useCurrencyStore from '../../store/currencyStore';
import { toast } from 'react-toastify';
import { adminNavGroups as navItems } from './adminNavItems';

const statusColors = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  assigned_delivery: 'bg-purple-100 text-purple-700',
  packed: 'bg-indigo-100 text-indigo-700',
  shipped: 'bg-cyan-100 text-cyan-700',
  out_for_delivery: 'bg-teal-100 text-teal-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const paymentColors = {
  pending: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-600',
};

const statusFlow = ['pending', 'confirmed', 'assigned_delivery', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'completed', 'cancelled'];

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [couriers, setCouriers] = useState([]);
  const [courierFilter, setCourierFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [expandedId, setExpandedId] = useState(null);
  const [deliveryGuys, setDeliveryGuys] = useState([]);
  const { convertPrice, formatPrice } = useCurrencyStore();

  const fetchOrders = async () => {
    try {
      const { data } = await getAdminOrders();
      setOrders(data);
      const { data: guys } = await getAvailableDeliveryGuys();
      setDeliveryGuys(guys || []);
      const { data: courierList } = await getCouriers({ all: true });
      setCouriers(courierList || []);
    } catch (err) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getOrderCourierDetails = (order) => {
    if (order.courierService) {
      return {
        name: order.courierService,
        charge: order.deliveryFee || 0,
      };
    }
    
    // Find item-level courier
    const itemCouriers = order.items
      ?.map((item) => couriers.find((c) => c._id === item.courierId))
      .filter(Boolean);
      
    if (itemCouriers && itemCouriers.length > 0) {
      const names = [...new Set(itemCouriers.map((c) => c.name))].join(', ');
      const charge = order.items.reduce((sum, item) => sum + (item.courierCharge || 0), 0);
      return {
        name: names,
        charge: charge,
      };
    }
    
    return {
      name: 'N/A',
      charge: 0,
    };
  };

  const handleAssignDelivery = async (orderId, deliveryGuyId) => {
    if (!deliveryGuyId) return;
    try {
      await assignDeliveryGuy(orderId, { deliveryGuyId });
      toast.success('Delivery person assigned');
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign delivery');
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, { orderStatus: newStatus });
      toast.success('Status updated');
      fetchOrders();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleApprove = async (orderId, e) => {
    e.stopPropagation();
    if (!window.confirm('Approve this order? It will be marked as Confirmed.')) return;
    try {
      await approveOrder(orderId);
      toast.success('Order approved ✅');
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve order');
    }
  };

  const handleCancel = async (orderId, e) => {
    e.stopPropagation();
    const reason = window.prompt('Reason for cancellation (optional):');
    if (reason === null) return; // user pressed Cancel on prompt
    try {
      await cancelOrder(orderId, { reason });
      toast.success('Order cancelled');
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel order');
    }
  };

  const filtered = (filter === 'all' ? orders : orders.filter((o) => o.orderStatus === filter))
    .filter((o) => {
      if (courierFilter === 'all') return true;
      if (o.courierService && o.courierService.toLowerCase() === courierFilter.toLowerCase()) {
        return true;
      }
      return o.items?.some((item) => {
        const itemCourier = couriers.find((c) => c._id === item.courierId);
        return itemCourier && itemCourier.name.toLowerCase() === courierFilter.toLowerCase();
      });
    })
    .sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'amount_high') return (b.totalAmount || 0) - (a.totalAmount || 0);
      if (sortBy === 'amount_low') return (a.totalAmount || 0) - (b.totalAmount || 0);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  // Summary stats
  const pendingCount = orders.filter((o) => o.orderStatus === 'pending').length;
  const totalRevenue = orders.filter((o) => ['delivered', 'completed'].includes(o.orderStatus)).reduce((s, o) => s + o.totalAmount, 0);

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="Admin Panel">
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-primary-green border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="Admin Panel">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-dark-navy">Order Management</h1>
            <p className="text-muted-text text-sm mt-1">
              {orders.length} total · <span className="text-amber-600">{pendingCount} pending approval</span> · Revenue: <span className="text-emerald-600 font-semibold">{formatPrice(convertPrice(totalRevenue))}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={courierFilter}
              onChange={(e) => setCourierFilter(e.target.value)}
              className="border border-card-border rounded-xl py-2.5 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-green"
            >
              <option value="all">All Courier Services</option>
              {couriers.map((c) => (
                <option key={c._id} value={c.name}>{c.name}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-card-border rounded-xl py-2.5 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-green"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="amount_high">Amount high to low</option>
              <option value="amount_low">Amount low to high</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['all', ...statusFlow].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                filter === status
                  ? 'bg-primary-green text-white shadow-lg shadow-emerald-200'
                  : 'bg-white border border-card-border text-muted-text hover:bg-gray-50'
              }`}
            >
              {status === 'all' ? `All (${orders.length})` : `${status.replace(/_/g, ' ')} (${orders.filter((o) => o.orderStatus === status).length})`}
            </button>
          ))}
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Order</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Customer</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Store</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Total</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Courier</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Payment</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Status</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Delivery</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Date</th>
                  <th className="text-right px-6 py-3 font-medium text-muted-text">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {filtered.map((order) => (
                  <Fragment key={order._id}>
                    <tr
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${order.orderStatus === 'cancelled' ? 'opacity-50' : ''}`}
                      onClick={() => setExpandedId(expandedId === order._id ? null : order._id)}
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">#{order._id.slice(-8).toUpperCase()}</span>
                          {expandedId === order._id ? <ChevronUp size={14} /> : <ChevronDown size={14} className="text-gray-400" />}
                          {order.isPosOrder && (
                            <span className="text-[10px] font-bold bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded">POS</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <p className="font-medium text-dark-navy">{order.userId?.name || 'N/A'}</p>
                        <p className="text-xs text-muted-text">{order.userId?.email}</p>
                      </td>
                      <td className="px-6 py-3.5 text-muted-text">{order.storeId?.name || 'N/A'}</td>
                      <td className="px-6 py-3.5 font-semibold">{formatPrice(convertPrice(order.totalAmount))}</td>
                      <td className="px-6 py-3.5">
                        {(() => {
                          const details = getOrderCourierDetails(order);
                          if (details.name === 'N/A') {
                            return <span className="text-gray-400">N/A</span>;
                          }
                          return (
                            <div>
                              <p className="font-semibold text-indigo-600">{details.name}</p>
                              <p className="text-xs text-muted-text font-medium">Rs. {details.charge.toLocaleString()}</p>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${paymentColors[order.paymentStatus] || 'bg-gray-100 text-gray-600'}`}>
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <select
                          value={order.orderStatus}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-full border-0 appearance-none cursor-pointer ${statusColors[order.orderStatus]} focus:outline-none focus:ring-2 focus:ring-primary-green`}
                        >
                          {statusFlow.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                        </select>
                      </td>
                      <td className="px-6 py-3.5">
                        <select
                          value={order.deliveryGuyId?._id || ''}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleAssignDelivery(order._id, e.target.value)}
                          className="border border-card-border rounded-lg py-1.5 px-2 text-xs"
                        >
                          <option value="">Assign delivery</option>
                          {deliveryGuys.map((g) => (
                            <option key={g._id} value={g._id}>{g.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-3.5 text-muted-text text-xs">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {order.orderStatus === 'pending' && (
                            <button
                              onClick={(e) => handleApprove(order._id, e)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition-colors"
                              title="Approve order"
                            >
                              <CheckCircle size={14} />
                              Approve
                            </button>
                          )}
                          {!['delivered', 'completed', 'cancelled'].includes(order.orderStatus) && (
                            <button
                              onClick={(e) => handleCancel(order._id, e)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold transition-colors"
                              title="Cancel order"
                            >
                              <XCircle size={14} />
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedId === order._id && (
                      <tr>
                        <td colSpan={10} className="px-6 py-4 bg-gray-50 text-sm">
                          <p><strong>Assigned Delivery:</strong> {order.deliveryGuyId?.name || 'Not assigned'}</p>
                          <p><strong>Delivery Address:</strong> {order.deliveryAddress ? `${order.deliveryAddress.street}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state} ${order.deliveryAddress.zipCode}` : 'N/A'}</p>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-text text-sm">No orders found</div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminOrders;
