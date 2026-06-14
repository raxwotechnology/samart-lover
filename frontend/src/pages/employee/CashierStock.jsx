import { useState, useEffect } from 'react';
import { Package, AlertTriangle, Search } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { toast } from 'react-toastify';
import { getEmployeeNavGroups } from './employeeNav';
import useAuthStore from '../../store/authStore';
import API from '../../services/api';

const CashierStock = () => {
  const { user } = useAuthStore();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data } = await API.get('/pos/products');
        setProducts(data);
      } catch (err) {
        toast.error('Failed to load stock data');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const filtered = products
    .filter(p => {
      const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search);
      const matchStock = stockFilter === 'all'
        || (stockFilter === 'low' && p.stock > 0 && p.stock <= 10)
        || (stockFilter === 'out' && p.stock <= 0)
        || (stockFilter === 'ok' && p.stock > 10);
      return matchSearch && matchStock;
    })
    .sort((a, b) => (a.stock || 0) - (b.stock || 0));

  const total = products.length;
  const outOfStock = products.filter(p => p.stock <= 0).length;
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= 10).length;
  const inStock = products.filter(p => p.stock > 10).length;

  if (loading) {
    return (
      <DashboardLayout navItems={getEmployeeNavGroups(user?.role)} title="Employee Portal">
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-primary-green border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={getEmployeeNavGroups(user?.role)} title="Employee Portal">
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-dark-navy">📦 Stock View</h1>
          <p className="text-muted-text text-sm mt-1">Current stock levels for your store</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center mb-2">
              <Package size={16} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-dark-navy">{total}</p>
            <p className="text-xs text-muted-text">Total Products</p>
          </div>
          <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
            <p className="text-2xl font-bold text-emerald-600">{inStock}</p>
            <p className="text-xs text-muted-text">In Stock</p>
          </div>
          <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
            <p className="text-2xl font-bold text-amber-600">{lowStock}</p>
            <p className="text-xs text-muted-text">Low Stock (≤10)</p>
          </div>
          <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center mb-2">
              <AlertTriangle size={16} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-red-600">{outOfStock}</p>
            <p className="text-xs text-muted-text">Out of Stock</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input placeholder="Search by name or barcode..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-card-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green" />
          </div>
          <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}
            className="border border-card-border rounded-xl py-2.5 px-4 text-sm bg-white">
            <option value="all">All Stock</option>
            <option value="ok">In Stock (&gt;10)</option>
            <option value="low">Low Stock (1-10)</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>

        {/* Products List */}
        <div className="bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Product</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Barcode</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Price</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Stock</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {filtered.map(p => {
                  const status = p.stock <= 0 ? 'out' : p.stock <= 10 ? 'low' : 'ok';
                  return (
                    <tr key={p._id} className={`hover:bg-gray-50 ${status === 'out' ? 'bg-red-50/50' : status === 'low' ? 'bg-amber-50/50' : ''}`}>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          {p.images?.[0] ? (
                            <img src={p.images[0]} alt="" className="w-9 h-9 rounded-lg object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center"><Package size={14} className="text-gray-400" /></div>
                          )}
                          <span className="font-medium text-dark-navy">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 font-mono text-xs text-muted-text">{p.barcode || p.sku || '—'}</td>
                      <td className="px-6 py-3.5 font-semibold">Rs. {p.price?.toLocaleString()}</td>
                      <td className="px-6 py-3.5">
                        <span className={`text-lg font-bold ${status === 'out' ? 'text-red-600' : status === 'low' ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          status === 'out' ? 'bg-red-100 text-red-700' : status === 'low' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {status === 'out' ? 'Out of Stock' : status === 'low' ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="text-center py-12 text-muted-text text-sm">No products found</div>}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CashierStock;
