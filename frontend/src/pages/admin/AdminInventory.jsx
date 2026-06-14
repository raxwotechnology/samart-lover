import { useState, useEffect } from 'react';
import { Package, AlertTriangle, Search, ArrowUpDown, RefreshCw, Send, CheckCircle, XCircle, X } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { toast } from 'react-toastify';
import { exportToCSV, exportToExcel } from '../../utils/exportUtils';
import { adminNavGroups as navItems } from './adminNavItems';
import API, { 
  getStores, getExpenses, getAdditionalIncomes, 
  createInventoryTransfer, getInventoryTransfers, 
  completeInventoryTransfer, cancelInventoryTransfer 
} from '../../services/api';

const AdminInventory = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stores, setStores] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Tab control
  const [activeTab, setActiveTab] = useState('inventory'); // inventory | transfers
  
  // Filters
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [sortBy, setSortBy] = useState('stock-asc');
  
  // Branch-wise filter states
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [branchExpenses, setBranchExpenses] = useState(0);
  const [branchIncome, setBranchIncome] = useState(0);

  // Transfer Wizard modal states
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({
    fromStoreId: '',
    toStoreId: '',
    items: [] // { productId, name, qty, maxStock }
  });
  const [transferSearch, setTransferSearch] = useState('');
  const [transferProducts, setTransferProducts] = useState([]);
  const [submittingTransfer, setSubmittingTransfer] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes, storesRes, transRes] = await Promise.all([
        API.get('/products'),
        API.get('/categories'),
        getStores(),
        getInventoryTransfers(),
      ]);
      setProducts(prodRes.data?.products || prodRes.data || []);
      setCategories(catRes.data || []);
      setStores(storesRes.data || []);
      setTransfers(transRes.data || []);
    } catch (err) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const fetchBranchFinance = async (storeId) => {
    if (!storeId) {
      setBranchExpenses(0);
      setBranchIncome(0);
      return;
    }
    try {
      const [expRes, incRes] = await Promise.all([
        getExpenses({ storeId }),
        getAdditionalIncomes({ storeId }),
      ]);
      const totalExp = (expRes.data || []).reduce((s, e) => s + (e.amount || 0), 0);
      const totalInc = (incRes.data || []).reduce((s, i) => s + (i.amount || 0), 0);
      setBranchExpenses(totalExp);
      setBranchIncome(totalInc);
    } catch (err) {
      console.warn('Failed to fetch branch finance:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchBranchFinance(selectedStoreId);
  }, [selectedStoreId]);

  // Load products for transfer wizard origin store
  useEffect(() => {
    if (transferForm.fromStoreId) {
      const filteredSourceProds = products.filter(p => p.storeId?._id === transferForm.fromStoreId && p.stock > 0);
      setTransferProducts(filteredSourceProds);
    } else {
      setTransferProducts([]);
    }
  }, [transferForm.fromStoreId, products]);

  const filtered = products
    .filter(p => {
      const matchStore = !selectedStoreId || p.storeId?._id === selectedStoreId;
      const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search) || p.sku?.toLowerCase().includes(search.toLowerCase());
      const matchCat = catFilter === 'all' || p.categoryId === catFilter || p.categoryId?._id === catFilter;
      const matchStock = stockFilter === 'all'
        || (stockFilter === 'low' && p.stock > 0 && p.stock <= 5)
        || (stockFilter === 'out' && p.stock <= 0)
        || (stockFilter === 'ok' && p.stock > 5);
      return matchStore && matchSearch && matchCat && matchStock;
    })
    .sort((a, b) => {
      if (sortBy === 'stock-asc') return (a.stock || 0) - (b.stock || 0);
      if (sortBy === 'stock-desc') return (b.stock || 0) - (a.stock || 0);
      if (sortBy === 'name') return a.name?.localeCompare(b.name);
      if (sortBy === 'price') return (b.price || 0) - (a.price || 0);
      return 0;
    });

  const totalProducts = filtered.length;
  const outOfStock = filtered.filter(p => p.stock <= 0).length;
  const lowStock = filtered.filter(p => p.stock > 0 && p.stock <= 5).length;
  const totalStockValue = filtered.reduce((s, p) => s + (p.price || 0) * (p.stock || 0), 0);

  const exportCols = [
    { label: 'Name', accessor: 'name' },
    { label: 'SKU/Barcode', accessor: (r) => r.sku || r.barcode || 'N/A' },
    { label: 'Price (Rs.)', accessor: (r) => r.price?.toFixed(2) },
    { label: 'Stock', accessor: (r) => r.stock?.toString() },
    { label: 'Status', accessor: (r) => r.stock <= 0 ? 'Out of Stock' : r.stock <= 5 ? 'Low Stock' : 'In Stock' },
    { label: 'Value (Rs.)', accessor: (r) => ((r.price || 0) * (r.stock || 0)).toFixed(2) },
  ];

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    if (!transferForm.fromStoreId || !transferForm.toStoreId || transferForm.items.length === 0) {
      toast.error('Source, destination and at least one product is required');
      return;
    }
    setSubmittingTransfer(true);
    try {
      await createInventoryTransfer({
        fromStoreId: transferForm.fromStoreId,
        toStoreId: transferForm.toStoreId,
        items: transferForm.items.map(it => ({
          productId: it.productId,
          name: it.name,
          qty: it.qty
        }))
      });
      toast.success('Inventory transfer request created');
      setShowTransferModal(false);
      setTransferForm({ fromStoreId: '', toStoreId: '', items: [] });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create transfer');
    } finally {
      setSubmittingTransfer(false);
    }
  };

  const handleCompleteTransfer = async (id) => {
    if (!window.confirm('Receive this transfer and update stock?')) return;
    try {
      await completeInventoryTransfer(id);
      toast.success('Inventory received and stock updated');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete transfer');
    }
  };

  const handleCancelTransfer = async (id) => {
    if (!window.confirm('Cancel this transfer?')) return;
    try {
      await cancelInventoryTransfer(id);
      toast.success('Transfer cancelled');
      fetchData();
    } catch (err) {
      toast.error('Failed to cancel transfer');
    }
  };

  const addTransferItem = (product) => {
    if (transferForm.items.some(i => i.productId === product._id)) {
      toast.info('Product already added');
      return;
    }
    setTransferForm({
      ...transferForm,
      items: [...transferForm.items, { productId: product._id, name: product.name, qty: 1, maxStock: product.stock }]
    });
  };

  const updateTransferItemQty = (productId, val) => {
    const itemsCopy = transferForm.items.map(i => {
      if (i.productId === productId) {
        const nextQty = Math.max(1, Math.min(i.maxStock, Number(val)));
        return { ...i, qty: nextQty };
      }
      return i;
    });
    setTransferForm({ ...transferForm, items: itemsCopy });
  };

  const removeTransferItem = (productId) => {
    setTransferForm({
      ...transferForm,
      items: transferForm.items.filter(i => i.productId !== productId)
    });
  };

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
            <h1 className="text-2xl font-bold text-dark-navy">📦 Store Inventory</h1>
            <p className="text-muted-text text-sm mt-1">Multi-branch stock levels and transfers</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setShowTransferModal(true)} className="bg-white border border-card-border text-muted-text hover:text-dark-navy font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm shadow-sm flex items-center gap-1.5">
              <RefreshCw size={16} /> New Stock Transfer
            </button>
            <button onClick={() => exportToCSV(filtered, exportCols, 'inventory')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow">CSV</button>
            <button onClick={() => exportToExcel(filtered, exportCols, 'inventory')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow">Excel</button>
          </div>
        </div>

        {/* Tab selection */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'inventory', label: 'Inventory list' },
            { id: 'transfers', label: 'Branch Transfers log' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${activeTab === tab.id ? 'bg-primary-green text-white shadow-md' : 'bg-white border border-card-border text-muted-text hover:bg-gray-50'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'inventory' && (
          <>
            {/* Branch and Stat summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center mb-2">
                  <Package size={18} className="text-white" />
                </div>
                <p className="text-2xl font-bold text-dark-navy">{totalProducts}</p>
                <p className="text-xs text-muted-text mt-1">Unique Products</p>
              </div>
              <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center mb-2">
                  <AlertTriangle size={18} className="text-white" />
                </div>
                <p className="text-2xl font-bold text-red-600">{outOfStock}</p>
                <p className="text-xs text-muted-text mt-1">Out of Stock</p>
              </div>
              <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center mb-2">
                  <AlertTriangle size={18} className="text-white animate-pulse" />
                </div>
                <p className="text-2xl font-bold text-red-600">{lowStock}</p>
                <p className="text-xs text-muted-text mt-1">Low Stock (≤5)</p>
              </div>
              <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
                <p className="text-xs text-muted-text">Filtered Stock Value</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">Rs. {totalStockValue.toLocaleString()}</p>
              </div>
            </div>

            {/* Branch Specific Financials Widget */}
            {selectedStoreId && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-5 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 shadow-sm">
                <div>
                  <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wider">Store Branch Finance Summary</p>
                  <h3 className="font-bold text-dark-navy text-base mt-0.5">🏪 {stores.find(s => s._id === selectedStoreId)?.name || 'Store'}</h3>
                </div>
                <div className="bg-white border border-indigo-100/50 rounded-xl p-3 shadow-inner">
                  <p className="text-xs text-muted-text">Branch Expenses</p>
                  <p className="text-lg font-bold text-red-600 mt-0.5">Rs. {branchExpenses.toLocaleString()}</p>
                </div>
                <div className="bg-white border border-indigo-100/50 rounded-xl p-3 shadow-inner">
                  <p className="text-xs text-muted-text">Branch Income</p>
                  <p className="text-lg font-bold text-emerald-600 mt-0.5">Rs. {branchIncome.toLocaleString()}</p>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input placeholder="Search by name, SKU or barcode..." value={search} onChange={(e) => setSearch(e.target.value)}
                  className="w-full border border-card-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green bg-white text-dark-navy" />
              </div>
              <select value={selectedStoreId} onChange={(e) => setSelectedStoreId(e.target.value)}
                className="border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green bg-white">
                <option value="">All Branches</option>
                {stores.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
              <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
                className="border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green bg-white">
                <option value="all">All Categories</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
              <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}
                className="border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green bg-white">
                <option value="all">All Stock</option>
                <option value="ok">In Stock (&gt;5)</option>
                <option value="low">Low Stock (1-5)</option>
                <option value="out">Out of Stock</option>
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green bg-white">
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
                      <th className="text-left px-6 py-3 font-medium text-muted-text">Store Branch</th>
                      <th className="text-left px-6 py-3 font-medium text-muted-text">SKU/Barcode</th>
                      <th className="text-left px-6 py-3 font-medium text-muted-text">Price</th>
                      <th className="text-left px-6 py-3 font-medium text-muted-text">Stock</th>
                      <th className="text-left px-6 py-3 font-medium text-muted-text">Status</th>
                      <th className="text-left px-6 py-3 font-medium text-muted-text">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border">
                    {filtered.map(p => {
                      const stockStatus = p.stock <= 0 ? 'out' : p.stock <= 5 ? 'low' : 'ok';
                      return (
                        <tr key={p._id} className={`hover:bg-gray-50 transition-colors ${stockStatus === 'out' ? 'bg-red-50/50' : stockStatus === 'low' ? 'bg-red-50/30' : ''}`}>
                          <td className="px-6 py-3.5 font-medium text-dark-navy">{p.name}</td>
                          <td className="px-6 py-3.5 text-muted-text">{p.storeId?.name || '—'}</td>
                          <td className="px-6 py-3.5 font-mono text-xs text-muted-text">{p.sku || p.barcode || '—'}</td>
                          <td className="px-6 py-3.5 font-semibold">Rs. {p.price?.toLocaleString()}</td>
                          <td className="px-6 py-3.5">
                            <span className={`text-base font-bold px-2 py-0.5 rounded-full ${stockStatus === 'out' ? 'text-red-700 bg-red-100 border border-red-200' : stockStatus === 'low' ? 'text-red-700 bg-red-100 border border-red-200 animate-pulse' : 'text-emerald-700'}`}>
                              {p.stock}
                            </span>
                            <span className="text-xs text-muted-text ml-1">/{p.unit || 'pcs'}</span>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                              stockStatus === 'out' ? 'bg-red-100 text-red-700' : stockStatus === 'low' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
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
                {filtered.length === 0 && <div className="text-center py-12 text-muted-text text-sm font-medium">No products found</div>}
              </div>
            </div>
          </>
        )}

        {activeTab === 'transfers' && (
          <div className="bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-6 py-3 font-medium text-muted-text">Transfer No</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-text">From Branch</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-text">To Branch</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-text">Items</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-text">Status</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-text">Date Requested</th>
                    <th className="text-right px-6 py-3 font-medium text-muted-text">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {transfers.map((tr) => (
                    <tr key={tr._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-dark-navy text-xs">{tr.transferNo}</td>
                      <td className="px-6 py-4 text-muted-text">{tr.fromStoreId?.name}</td>
                      <td className="px-6 py-4 text-muted-text">{tr.toStoreId?.name}</td>
                      <td className="px-6 py-4">
                        <div className="text-xs space-y-1">
                          {tr.items.map((i, idx) => (
                            <div key={idx} className="bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 text-gray-700">
                              {i.name} <span className="font-bold">x {i.qty}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          tr.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          tr.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {tr.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-text text-xs">{new Date(tr.createdAt).toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        {tr.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleCompleteTransfer(tr._id)} className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-semibold text-xs px-2.5 py-1.5 rounded-lg border border-emerald-200/50 transition-colors">
                              <CheckCircle size={12} /> Receive
                            </button>
                            <button onClick={() => handleCancelTransfer(tr._id)} className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs px-2.5 py-1.5 rounded-lg border border-red-200/50 transition-colors">
                              <XCircle size={12} /> Cancel
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {transfers.length === 0 && <div className="text-center py-12 text-muted-text text-sm font-medium">No inventory transfers logged</div>}
            </div>
          </div>
        )}

        {/* Inventory Transfer Wizard Modal */}
        {showTransferModal && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowTransferModal(false)}>
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-card-border flex items-center justify-between">
                <h2 className="text-lg font-bold text-dark-navy flex items-center gap-2">
                  <Send className="text-indigo-600" size={20} /> Branch Inventory Transfer Wizard
                </h2>
                <button onClick={() => setShowTransferModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={20} /></button>
              </div>

              <form onSubmit={handleCreateTransfer} className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-text uppercase mb-1">Source Branch (From) *</label>
                    <select required value={transferForm.fromStoreId} onChange={(e) => setTransferForm({ ...transferForm, fromStoreId: e.target.value, items: [] })}
                      className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-green">
                      <option value="">Select origin store</option>
                      {stores.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-text uppercase mb-1">Destination Branch (To) *</label>
                    <select required value={transferForm.toStoreId} onChange={(e) => setTransferForm({ ...transferForm, toStoreId: e.target.value })}
                      className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-green">
                      <option value="">Select destination store</option>
                      {stores.map(s => <option key={s._id} value={s._id} disabled={s._id === transferForm.fromStoreId}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                {transferForm.fromStoreId && (
                  <div className="border border-card-border rounded-xl p-4 bg-gray-50 space-y-3">
                    <label className="block text-xs font-bold text-dark-navy uppercase">Search & Add Products from Source</label>
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input placeholder="Type product name to search..." value={transferSearch} onChange={(e) => setTransferSearch(e.target.value)}
                        className="w-full border border-card-border rounded-lg py-2 pl-9 pr-4 text-xs bg-white text-dark-navy" />
                    </div>

                    {transferSearch.trim() && (
                      <div className="bg-white border border-card-border rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-50 shadow-inner">
                        {transferProducts
                          .filter(p => p.name?.toLowerCase().includes(transferSearch.toLowerCase()))
                          .map(p => (
                            <div key={p._id} onClick={() => { addTransferItem(p); setTransferSearch(''); }}
                              className="px-3 py-2 text-xs hover:bg-indigo-50 cursor-pointer flex justify-between items-center text-dark-navy">
                              <span>{p.name}</span>
                              <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">Qty: {p.stock}</span>
                            </div>
                          ))}
                        {transferProducts.filter(p => p.name?.toLowerCase().includes(transferSearch.toLowerCase())).length === 0 && (
                          <div className="p-3 text-center text-xs text-gray-400 italic">No in-stock products found</div>
                        )}
                      </div>
                    )}

                    {/* Selected transfer items */}
                    <div className="space-y-2 mt-3">
                      <p className="text-xs font-semibold text-muted-text uppercase">Transfer Basket ({transferForm.items.length})</p>
                      {transferForm.items.map((item, idx) => (
                        <div key={idx} className="bg-white border border-card-border rounded-lg p-3 flex justify-between items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-dark-navy truncate">{item.name}</p>
                            <p className="text-[10px] text-gray-400">Available: {item.maxStock}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input type="number" min="1" max={item.maxStock} value={item.qty} onChange={(e) => updateTransferItemQty(item.productId, e.target.value)}
                              className="w-16 border border-gray-200 rounded px-2 py-1 text-xs text-center font-bold" />
                            <button type="button" onClick={() => removeTransferItem(item.productId)}
                              className="text-red-500 hover:text-red-700 text-xs px-2 py-1 hover:bg-red-50 rounded">Remove</button>
                          </div>
                        </div>
                      ))}
                      {transferForm.items.length === 0 && (
                        <p className="text-xs text-gray-400 italic text-center py-4 bg-white border border-dashed rounded-lg border-gray-200">No items added to basket. Search above to add items.</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={submittingTransfer || transferForm.items.length === 0} className="flex-1 bg-primary-green text-white py-2.5 rounded-xl font-semibold hover:bg-emerald-600 disabled:opacity-50 text-sm shadow-md flex items-center justify-center gap-2">
                    <Send size={16} /> {submittingTransfer ? 'Sending...' : 'Initiate Stock Transfer'}
                  </button>
                  <button type="button" onClick={() => setShowTransferModal(false)} className="flex-1 border border-card-border py-2.5 rounded-xl font-semibold text-muted-text hover:bg-gray-50 text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminInventory;
