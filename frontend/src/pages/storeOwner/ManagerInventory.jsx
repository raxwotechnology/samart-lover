import { useState, useEffect } from 'react';
import { Package, AlertTriangle, Search } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { toast } from 'react-toastify';
import { exportToCSV, exportToExcel } from '../../utils/exportUtils';
import { managerNavGroups as navItems } from './managerNavItems';
import { getMyStoreProducts } from '../../services/api';
import API from '../../services/api';

const ManagerInventory = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [sortBy, setSortBy] = useState('stock-asc');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          getMyStoreProducts(),
          API.get('/categories'),
        ]);
        setProducts(prodRes.data?.products || prodRes.data || []);
        setCategories(catRes.data || []);
      } catch (err) {
        toast.error('Failed to load inventory');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = products
    .filter(p => {
      const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search);
      const matchCat = catFilter === 'all' || p.category === catFilter || p.categoryId === catFilter;
      const matchStock = stockFilter === 'all'
        || (stockFilter === 'low' && p.stock > 0 && p.stock <= 10)
        || (stockFilter === 'out' && p.stock <= 0)
        || (stockFilter === 'ok' && p.stock > 10);
      return matchSearch && matchCat && matchStock;
    })
    .sort((a, b) => {
      if (sortBy === 'stock-asc') return (a.stock || 0) - (b.stock || 0);
      if (sortBy === 'stock-desc') return (b.stock || 0) - (a.stock || 0);
      if (sortBy === 'name') return a.name?.localeCompare(b.name);
      if (sortBy === 'price') return (b.price || 0) - (a.price || 0);
      return 0;
    });

  const totalProducts = products.length;
  const outOfStock = products.filter(p => p.stock <= 0).length;
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= 10).length;
  const totalStockValue = products.reduce((s, p) => s + (p.price || 0) * (p.stock || 0), 0);

  const exportCols = [
    { label: 'Name', accessor: 'name' },
    { label: 'SKU', accessor: (r) => r.sku || r.barcode || 'N/A' },
    { label: 'Price (Rs.)', accessor: (r) => r.price?.toFixed(2) },
    { label: 'Stock', accessor: (r) => r.stock?.toString() },
    { label: 'Status', accessor: (r) => r.stock <= 0 ? 'Out of Stock' : r.stock <= 10 ? 'Low Stock' : 'In Stock' },
    { label: 'Value (Rs.)', accessor: (r) => ((r.price || 0) * (r.stock || 0)).toFixed(2) },
  ];

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-dark-navy">📦 Store Inventory</h1>
            <p className="text-muted-text text-sm mt-1">Stock levels and product tracking</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => exportToCSV(filtered, exportCols, 'store-inventory')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">📄 CSV</button>
            <button onClick={() => exportToExcel(filtered, exportCols, 'store-inventory')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">📊 Excel</button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center mb-2">
              <Package size={18} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-dark-navy">{totalProducts}</p>
            <p className="text-xs text-muted-text mt-1">Total Products</p>
          </div>
          <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center mb-2">
              <AlertTriangle size={18} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-red-600">{outOfStock}</p>
            <p className="text-xs text-muted-text mt-1">Out of Stock</p>
          </div>
          <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-2">
              <AlertTriangle size={18} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-amber-600">{lowStock}</p>
            <p className="text-xs text-muted-text mt-1">Low Stock (≤10)</p>
          </div>
          <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
            <p className="text-xs text-muted-text">Total Stock Value</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">Rs. {totalStockValue.toLocaleString()}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input placeholder="Search by name or barcode..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-card-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green" />
          </div>
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
            className="border border-card-border rounded-xl py-2.5 px-4 text-sm bg-white">
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}
            className="border border-card-border rounded-xl py-2.5 px-4 text-sm bg-white">
            <option value="all">All Stock</option>
            <option value="ok">In Stock (&gt;10)</option>
            <option value="low">Low Stock (1-10)</option>
            <option value="out">Out of Stock</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            className="border border-card-border rounded-xl py-2.5 px-4 text-sm bg-white">
            <option value="stock-asc">Stock: Low → High</option>
            <option value="stock-desc">Stock: High → Low</option>
            <option value="name">Name A-Z</option>
            <option value="price">Price: High → Low</option>
          </select>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Product</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">SKU/Barcode</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Price</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Stock</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Status</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {filtered.map(p => {
                  const stockStatus = p.stock <= 0 ? 'out' : p.stock <= 10 ? 'low' : 'ok';
                  return (
                    <tr key={p._id} className={`hover:bg-gray-50 transition-colors ${stockStatus === 'out' ? 'bg-red-50/50' : stockStatus === 'low' ? 'bg-amber-50/50' : ''}`}>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          {p.images?.[0] ? (
                            <img src={p.images[0]} alt="" className="w-10 h-10 rounded-xl object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center"><Package size={16} className="text-gray-400" /></div>
                          )}
                          <span className="font-medium text-dark-navy">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 font-mono text-xs text-muted-text">{p.sku || p.barcode || '—'}</td>
                      <td className="px-6 py-3.5 font-semibold">Rs. {p.price?.toLocaleString()}</td>
                      <td className="px-6 py-3.5">
                        <span className={`text-lg font-bold ${stockStatus === 'out' ? 'text-red-600' : stockStatus === 'low' ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {p.stock}
                        </span>
                        <span className="text-xs text-muted-text ml-1">/{p.unit || 'pcs'}</span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          stockStatus === 'out' ? 'bg-red-100 text-red-700' : stockStatus === 'low' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {stockStatus === 'out' ? 'Out of Stock' : stockStatus === 'low' ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 font-semibold text-muted-text">Rs. {((p.price || 0) * (p.stock || 0)).toLocaleString()}</td>
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

export default ManagerInventory;
