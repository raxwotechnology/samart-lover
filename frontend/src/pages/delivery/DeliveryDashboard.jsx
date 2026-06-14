import { useState, useEffect } from 'react';
import { Truck, Clock, DollarSign, CheckCircle, MapPin, Phone, Package, ArrowRight, Download } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { getDeliveryOrders, getDeliveryHistory, getDeliveryEarnings, markDeliveryPaymentSuccess, updateDeliveryStatus } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'react-toastify';

const navItems = [
  { path: '/delivery', label: 'Active Orders', icon: Truck },
];

const statusFlow = ['assigned_delivery', 'out_for_delivery', 'delivered'];
const statusColors = {
  assigned_delivery: 'bg-purple-100 text-purple-700',
  out_for_delivery: 'bg-amber-100 text-amber-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const DeliveryDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [history, setHistory] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordersRes, historyRes, earningsRes] = await Promise.all([getDeliveryOrders(), getDeliveryHistory(), getDeliveryEarnings()]);
      setOrders(ordersRes.data);
      setHistory(historyRes.data);
      setEarnings(earningsRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await updateDeliveryStatus(orderId, { status: newStatus });
      toast.success(`Status updated to ${newStatus.replace(/_/g, ' ')}`);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update'); }
  };

  const handlePaymentSuccess = async (orderId) => {
    try {
      await markDeliveryPaymentSuccess(orderId);
      toast.success('COD payment marked successful. Order completed.');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark payment successful');
    }
  };

  const getNextStatus = (s) => { const i = statusFlow.indexOf(s); return i >= 0 && i < statusFlow.length - 1 ? statusFlow[i + 1] : null; };

  // Weekly earnings for chart
  const weeklyData = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const dayDeliveries = history.filter(o => o.orderStatus === 'delivered' && new Date(o.updatedAt || o.createdAt).toDateString() === d.toDateString());
    weeklyData.push({
      day: d.toLocaleDateString('en', { weekday: 'short' }),
      deliveries: dayDeliveries.length,
      earnings: dayDeliveries.length * 150,
    });
  }

  const exportCSV = () => {
    const rows = [['Order ID', 'Customer', 'Amount', 'Status', 'Date'].join(','), ...history.map(o => [o._id.slice(-8), o.userId?.name || 'N/A', o.totalAmount?.toFixed(2), o.orderStatus, new Date(o.createdAt).toLocaleDateString()].join(','))].join('\n');
    const blob = new Blob([rows], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'delivery_history.csv'; a.click();
    toast.success('Report downloaded');
  };

  if (loading) return <DashboardLayout navItems={navItems} title="Delivery Dashboard"><div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></DashboardLayout>;

  return (
    <DashboardLayout navItems={navItems} title="Delivery Dashboard">
      <div>
        <h1 className="text-2xl font-bold text-dark-navy mb-2">🚚 Delivery Dashboard</h1>
        <p className="text-muted-text text-sm mb-6">Manage deliveries and track earnings</p>

        {/* Stats Cards */}
        {earnings && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center mb-3 shadow-lg"><Truck size={18} className="text-white" /></div>
              <p className="text-2xl font-bold text-dark-navy">{orders.length}</p>
              <p className="text-xs text-muted-text">Active Deliveries</p>
            </div>
            <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-3 shadow-lg"><CheckCircle size={18} className="text-white" /></div>
              <p className="text-2xl font-bold text-dark-navy">{earnings.totalDeliveries}</p>
              <p className="text-xs text-muted-text">Completed Total</p>
            </div>
            <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-3 shadow-lg"><DollarSign size={18} className="text-white" /></div>
              <p className="text-2xl font-bold text-dark-navy">Rs. {earnings.thisMonth.earnings.toLocaleString()}</p>
              <p className="text-xs text-muted-text">This Month ({earnings.thisMonth.deliveries} trips)</p>
            </div>
            <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center mb-3 shadow-lg"><DollarSign size={18} className="text-white" /></div>
              <p className="text-2xl font-bold text-dark-navy">Rs. {earnings.totalEarnings.toLocaleString()}</p>
              <p className="text-xs text-muted-text">All-Time Earnings</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[{key: 'active', label: `Active (${orders.length})`}, {key: 'earnings', label: 'Earnings'}, {key: 'history', label: 'History'}].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${tab === t.key ? 'bg-rose-600 text-white' : 'bg-gray-100 text-muted-text hover:bg-gray-200'}`}>{t.label}</button>
          ))}
        </div>

        {tab === 'active' && (
          <div className="bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-card-border"><h2 className="font-semibold text-dark-navy">Active Deliveries</h2></div>
            {orders.length === 0 ? (
              <div className="text-center py-12 text-muted-text"><Truck size={40} className="mx-auto mb-3 text-gray-300" /><p className="text-sm">No active deliveries right now</p></div>
            ) : (
              <div className="divide-y divide-card-border">
                {orders.map(order => {
                  const next = getNextStatus(order.orderStatus);
                  return (
                    <div key={order._id} className="p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded-lg">#{order._id.slice(-8).toUpperCase()}</span>
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[order.orderStatus]}`}>{order.orderStatus?.replace(/_/g, ' ')}</span>
                          </div>
                          <p className="text-sm font-medium text-dark-navy">{order.items?.length} items • Rs. {order.totalAmount?.toFixed(2)}</p>
                          {order.userId && <p className="text-xs text-muted-text mt-1 flex items-center gap-1"><Package size={12} /> {order.userId.name} {order.userId.phone && <><Phone size={12} className="ml-2" /> {order.userId.phone}</>}</p>}
                          {order.deliveryAddress && <p className="text-xs text-muted-text mt-1 flex items-center gap-1"><MapPin size={12} /> {order.deliveryAddress.street}, {order.deliveryAddress.city}</p>}
                          {/* Status Progress */}
                          <div className="flex items-center gap-1 mt-3">
                            {statusFlow.map((s, i) => (
                              <div key={s} className="flex items-center">
                                <div className={`w-2.5 h-2.5 rounded-full ${statusFlow.indexOf(order.orderStatus) >= i ? 'bg-rose-600' : 'bg-gray-200'}`} />
                                {i < statusFlow.length - 1 && <div className={`w-6 h-0.5 ${statusFlow.indexOf(order.orderStatus) > i ? 'bg-rose-600' : 'bg-gray-200'}`} />}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {next && (
                            <button onClick={() => handleStatusUpdate(order._id, next)} className="flex items-center gap-2 bg-rose-600 hover:bg-fuchsia-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors shadow-md flex-shrink-0">
                              {next === 'delivered' ? 'Mark Delivered ✓' : `→ ${next.replace(/_/g, ' ')}`} <ArrowRight size={16} />
                            </button>
                          )}
                          {order.paymentMethod === 'cod' && order.orderStatus === 'delivered' && order.paymentStatus !== 'completed' && (
                            <button
                              onClick={() => handlePaymentSuccess(order._id)}
                              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors shadow-md flex-shrink-0"
                            >
                              Mark as Payment Successful
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'earnings' && (
          <div className="space-y-6">
            {/* Earnings Chart */}
            <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
              <h2 className="font-semibold text-dark-navy mb-4">📈 Weekly Earnings (Rs. 150/delivery)</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v, name) => name === 'earnings' ? `Rs. ${v}` : v} />
                  <Bar dataKey="deliveries" fill="#3b82f6" name="Deliveries" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="earnings" fill="#10b981" name="Earnings (Rs.)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Earnings Breakdown */}
            {earnings && (
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm text-center">
                  <p className="text-muted-text text-xs mb-1">Today</p>
                  <p className="text-xl font-bold text-dark-navy">Rs. {(weeklyData[weeklyData.length - 1]?.earnings || 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-text">{weeklyData[weeklyData.length - 1]?.deliveries || 0} deliveries</p>
                </div>
                <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm text-center">
                  <p className="text-muted-text text-xs mb-1">This Week</p>
                  <p className="text-xl font-bold text-dark-navy">Rs. {weeklyData.reduce((s, d) => s + d.earnings, 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-text">{weeklyData.reduce((s, d) => s + d.deliveries, 0)} deliveries</p>
                </div>
                <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm text-center">
                  <p className="text-muted-text text-xs mb-1">Rate</p>
                  <p className="text-xl font-bold text-emerald-600">Rs. 150</p>
                  <p className="text-xs text-muted-text">per delivery</p>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-card-border flex items-center justify-between">
              <h2 className="font-semibold text-dark-navy">Delivery History ({history.length})</h2>
              {history.length > 0 && <button onClick={exportCSV} className="flex items-center gap-2 bg-rose-600 hover:bg-fuchsia-700 text-white text-xs font-medium px-3 py-2 rounded-xl"><Download size={14} /> CSV</button>}
            </div>
            {history.length === 0 ? (
              <div className="text-center py-12 text-muted-text"><Clock size={40} className="mx-auto mb-3 text-gray-300" /><p>No delivery history</p></div>
            ) : (
              <div className="divide-y divide-card-border">
                {history.map(order => (
                  <div key={order._id} className="px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${order.orderStatus === 'delivered' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                        {order.orderStatus === 'delivered' ? <CheckCircle size={14} className="text-emerald-600" /> : <span className="text-red-500 text-xs">✗</span>}
                      </div>
                      <div>
                        <span className="font-mono text-xs text-muted-text">#{order._id.slice(-8).toUpperCase()}</span>
                        <span className="text-sm text-dark-navy ml-2">{order.userId?.name}</span>
                        <p className="text-xs text-muted-text">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">Rs. {order.totalAmount?.toFixed(2)}</p>
                      {order.orderStatus === 'delivered' && <p className="text-xs text-emerald-600">+Rs. 150</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DeliveryDashboard;
