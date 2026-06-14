import { useState, useEffect } from 'react';
import { Package, ShoppingBag, DollarSign, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { getMyStoreProducts, getStoreOrders } from '../../services/api';
import { Link } from 'react-router-dom';
import { managerNavGroups as navItems } from './managerNavItems';


const StoreOverview = () => {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, ordersRes] = await Promise.all([
          getMyStoreProducts(),
          getStoreOrders(),
        ]);

        const products = productsRes.data.products;
        const orders = ordersRes.data;

        const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const pendingOrders = orders.filter((o) => o.orderStatus === 'pending').length;
        const deliveredOrders = orders.filter((o) => o.orderStatus === 'delivered').length;

        setStats({
          totalProducts: products.length,
          activeProducts: products.filter((p) => p.status === 'active').length,
          totalOrders: orders.length,
          totalRevenue,
          pendingOrders,
          deliveredOrders,
        });

        setRecentOrders(orders.slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="Manager Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-primary-green border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const statCards = [
    { label: 'Total Products', value: stats?.totalProducts || 0, icon: Package, color: 'emerald', gradient: 'from-emerald-400 to-teal-500' },
    { label: 'Total Orders', value: stats?.totalOrders || 0, icon: ShoppingBag, color: 'blue', gradient: 'from-blue-400 to-indigo-500' },
    { label: 'Revenue', value: `Rs. ${(stats?.totalRevenue || 0).toLocaleString()}`, icon: DollarSign, color: 'amber', gradient: 'from-amber-400 to-orange-500' },
    { label: 'Pending Orders', value: stats?.pendingOrders || 0, icon: Clock, color: 'purple', gradient: 'from-purple-400 to-pink-500' },
  ];

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-blue-100 text-blue-700',
    packed: 'bg-indigo-100 text-indigo-700',
    shipped: 'bg-cyan-100 text-cyan-700',
    out_for_delivery: 'bg-teal-100 text-teal-700',
    delivered: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <DashboardLayout navItems={navItems} title="Store Dashboard">
      <div>
        <div className="mb-8">
          <div className="bg-gradient-to-br from-rose-500 via-fuchsia-500 to-purple-600 rounded-3xl p-6 text-white shadow-lg">
            <h1 className="text-2xl sm:text-3xl font-bold">Store Overview</h1>
            <p className="text-white/80 text-sm mt-1">Track products, orders, and revenue at a glance.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/manager/orders" className="bg-white/15 hover:bg-white/20 backdrop-blur px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
                View Orders
              </Link>
              <Link to="/manager/products" className="bg-white/15 hover:bg-white/20 backdrop-blur px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
                Manage Products
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((card) => (
            <div key={card.label} className="bg-white rounded-2xl border border-card-border p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg`}>
                  <card.icon size={20} className="text-white" />
                </div>
                <TrendingUp size={16} className="text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-dark-navy">{card.value}</p>
              <p className="text-xs text-muted-text mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-card-border flex items-center justify-between">
            <h2 className="font-semibold text-dark-navy">Recent Orders</h2>
            <Link to="/manager/orders" className="text-sm text-rose-600 hover:text-fuchsia-700 font-medium">
              View All
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-text">
              <AlertCircle size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No orders yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-6 py-3 font-medium text-muted-text">Order ID</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-text">Customer</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-text">Total</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-text">Status</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-text">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {recentOrders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3.5 font-mono text-xs">{order._id.slice(-8).toUpperCase()}</td>
                      <td className="px-6 py-3.5">{order.userId?.name || 'N/A'}</td>
                      <td className="px-6 py-3.5 font-semibold">Rs. {(order.totalAmount || 0).toLocaleString()}</td>
                      <td className="px-6 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[order.orderStatus] || 'bg-gray-100 text-gray-600'}`}>
                          {order.orderStatus?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-muted-text">{new Date(order.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StoreOverview;
