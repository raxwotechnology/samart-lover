import { useState, useEffect, Fragment } from 'react';
import { CheckCircle, XCircle, ChevronDown, ChevronUp, Truck } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { getStoreOrders, updateOrderStatus, assignDeliveryGuy, getAvailableDeliveryGuys, getCouriers } from '../../services/api';
import useCurrencyStore from '../../store/currencyStore';
import { toast } from 'react-toastify';
import { managerNavGroups as navItems } from './managerNavItems';

const statusColors = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  assigned_delivery: 'bg-purple-100 text-purple-700',
  packed: 'bg-indigo-100 text-indigo-700',
  shipped: 'bg-cyan-100 text-cyan-700',
  out_for_delivery: 'bg-teal-100 text-teal-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

const paymentColors = {
  pending: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-600',
};

const statusFlow = ['pending', 'confirmed', 'assigned_delivery', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'completed', 'cancelled'];

const StoreOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [courierFilter, setCourierFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [expandedId, setExpandedId] = useState(null);
  const [deliveryGuys, setDeliveryGuys] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const { convertPrice, formatPrice } = useCurrencyStore();

  const fetchOrders = async () => {
    try {
      const { data } = await getStoreOrders();
      setOrders(data);
      const { data: guys } = await getAvailableDeliveryGuys(data?.[0]?.storeId?._id ? { storeId: data[0].storeId._id } : {});
      setDeliveryGuys(guys || []);
      const { data: courierList } = await getCouriers({ all: true });
      setCouriers(courierList || []);
    } catch (err) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, { orderStatus: newStatus });
      toast.success(`Order status updated to ${newStatus.replace(/_/g, ' ')}`);
      fetchOrders();
    } catch (err) {
      toast.error('Failed to update status');
    }
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

  const handleCancel = async (orderId, e) => {
    e.stopPropagation();
    try {
      await updateOrderStatus(orderId, { orderStatus: 'cancelled', paymentStatus: 'failed' });
      toast.success('Order cancelled');
      fetchOrders();
    } catch (err) {
      toast.error('Failed to cancel order');
    }
  };

  const filtered = (filter === 'all' ? orders : orders.filter((o) => o.orderStatus === filter))
    .filter((order) => {
      if (courierFilter === 'all') return true;
      return order.items?.some((item) => String(item.courierId || '') === courierFilter);
    })
    .sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'amount_high') return (b.totalAmount || 0) - (a.totalAmount || 0);
      if (sortBy === 'amount_low') return (a.totalAmount || 0) - (b.totalAmount || 0);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="Manager Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-primary-green border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="Manager Dashboard">
      <div>
        <div className="mb-6">
          <div className="bg-white rounded-3xl border border-card-border shadow-sm p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-dark-navy">Orders</h1>
              <p className="text-muted-text text-sm mt-1">Manage statuses, payments, and delivery assignments.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-muted-text hidden sm:block">
                <span className="font-semibold text-dark-navy">{orders.length}</span> total
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-card-border rounded-xl py-2.5 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-green"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="amount_high">Amount high to low</option>
                <option value="amount_low">Amount low to high</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['all', ...statusFlow].map((status) => {
            const count = status === 'all' ? orders.length : orders.filter((o) => o.orderStatus === status).length;
            return (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  filter === status
                    ? 'bg-primary-green text-white shadow-lg shadow-emerald-200'
                    : 'bg-white border border-card-border text-muted-text hover:bg-gray-50'
                }`}
              >
                {status === 'all' ? 'All' : status.replace(/_/g, ' ')}
                <span className={`ml-2 inline-flex items-center justify-center min-w-[22px] h-[18px] px-1.5 rounded-full text-[10px] font-bold ${
                  filter === status ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Courier Filter */}
        <div className="mb-6 flex items-center gap-3">
          <Truck size={16} className="text-muted-text" />
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setCourierFilter('all')}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                courierFilter === 'all'
                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                  : 'bg-white border border-card-border text-muted-text hover:bg-gray-50'
              }`}
            >
              All Couriers
            </button>
            {couriers.map((courier) => (
              <button
                key={courier._id}
                onClick={() => setCourierFilter(courier._id)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  courierFilter === courier._id
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                    : 'bg-white border border-card-border text-muted-text hover:bg-gray-50'
                }`}
              >
                {courier.name}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Order</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Customer</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Total</th>
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
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <p className="font-medium text-dark-navy">{order.userId?.name || 'N/A'}</p>
                        <p className="text-xs text-muted-text">{order.userId?.email}</p>
                      </td>
                      <td className="px-6 py-3.5 font-semibold">{formatPrice(convertPrice(order.totalAmount || 0))}</td>
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
                          className={`text-xs font-semibold px-3 py-1.5 rounded-full border-0 cursor-pointer ${statusColors[order.orderStatus] || 'bg-gray-100 text-gray-600'}`}
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
                              onClick={(e) => { e.stopPropagation(); handleStatusUpdate(order._id, 'confirmed'); }}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition-colors"
                            >
                              <CheckCircle size={14} /> Approve
                            </button>
                          )}
                          {!['delivered', 'completed', 'cancelled'].includes(order.orderStatus) && (
                            <button
                              onClick={(e) => handleCancel(order._id, e)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold transition-colors"
                            >
                              <XCircle size={14} /> Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedId === order._id && (
                      <tr>
                        <td colSpan={8} className="px-6 py-4 bg-gray-50">
                          <div className="space-y-4 text-sm">
                            <p><strong>Assigned Delivery:</strong> {order.deliveryGuyId?.name || 'Not assigned'}</p>
                            <p><strong>Delivery Address:</strong> {order.deliveryAddress ? `${order.deliveryAddress.street}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state} ${order.deliveryAddress.zipCode}` : 'N/A'}</p>
                            <div>
                              <strong className="block mb-2">Order Items:</strong>
                              <div className="space-y-3 bg-white rounded-xl p-4">
                                {order.items?.map((item, i) => {
                                  const courierName = couriers.find(c => String(c._id) === String(item.courierId))?.name || 'No courier assigned';
                                  return (
                                    <div key={i} className="border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                                      <div className="flex items-start justify-between mb-2">
                                        <div>
                                          <p className="font-medium text-dark-navy">{item.name}</p>
                                          <p className="text-xs text-muted-text">Qty: {item.quantity} × Rs. {(item.price || 0).toLocaleString()}</p>
                                        </div>
                                        <p className="font-semibold text-dark-navy">Rs. {((item.price || 0) * item.quantity).toLocaleString()}</p>
                                      </div>
                                      <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-1 text-indigo-600">
                                          <Truck size={14} />
                                          <span>{courierName}</span>
                                        </div>
                                        {item.courierCharge && (
                                          <p className="text-muted-text">Courier: Rs. {(item.courierCharge || 0).toLocaleString()}</p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
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

export default StoreOrders;
