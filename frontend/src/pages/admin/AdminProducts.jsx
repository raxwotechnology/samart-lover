import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Search, X, ChevronDown, ChevronUp, Package, FileSpreadsheet, Upload, AlertTriangle } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { getAdminProducts, getCategories, getStores, getAdminStores, createProduct, updateProduct, deleteProduct, getSuppliers, importProductsExcel } from '../../services/api';
import { toast } from 'react-toastify';
import { adminNavGroups as navItems } from './adminNavItems';
import SuppliersPanel from '../inventory/SuppliersPanel';
import StockReceivingPanel from '../inventory/StockReceivingPanel';
import SupplierReturnsPanel from '../inventory/SupplierReturnsPanel';

const emptyForm = {
  name: '', categoryId: '', description: '', price: '', mrp: '', discount: '', unit: 'kg',
  stock: '', purchasePrice: '', images: '', isFeatured: false, isOnSale: false, allowKokoOnline: true, allowKokoPos: true, status: 'active', storeId: '', brand: '',
};

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stores, setStores] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('products'); // products | suppliers | receiving | supplierReturns
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [search, setSearch] = useState('');
  
  // Filtering states
  const [categoryFilter, setCategoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [importing, setImporting] = useState(false);
  
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [expandedProduct, setExpandedProduct] = useState(null);

  // Direct price editing state
  const [editingPrices, setEditingPrices] = useState({}); // productId: price

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      // Load products and categories first
      const [prodRes, catRes] = await Promise.all([
        getAdminProducts(),
        getCategories(),
      ]);
      setProducts(prodRes.data || []);
      setCategories(catRes.data || []);

      // Load stores (admin route first, fallback to public stores)
      let storesRes;
      try {
        storesRes = await getAdminStores();
      } catch {
        storesRes = await getStores();
      }
      const loadedStores = (storesRes.data || storesRes) || [];
      const storesArray = Array.isArray(loadedStores) ? loadedStores : [];
      setStores(storesArray);
      if (storesArray.length === 0) {
        toast.warning('No store branches loaded. Please add or activate a store before creating products.');
      }
      // Ensure selected store is set before fetching suppliers
      const resolvedStoreId = selectedStoreId || storesArray[0]?._id || '';
      if (!selectedStoreId && storesArray[0]?._id) {
        setSelectedStoreId(storesArray[0]._id);
      }

      // Fetch suppliers only when a storeId is available (supplier API requires storeId)
      if (resolvedStoreId) {
        try {
          const supRes = await getSuppliers({ storeId: resolvedStoreId });
          setSuppliers(supRes.data || []);
        } catch (supErr) {
          // If suppliers fail to load for the selected store, show a warning but continue
          console.warn('Failed to load suppliers for store', resolvedStoreId, supErr);
          setSuppliers([]);
        }
      } else {
        setSuppliers([]);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load products';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedStoreId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!selectedStoreId && stores.length > 0) {
      setSelectedStoreId(stores[0]._id);
    }
  }, [selectedStoreId, stores]);

  useEffect(() => {
    if (stores.length > 0 && !form.storeId) {
      const defaultStoreId = selectedStoreId || stores[0]._id;
      setForm((prev) => ({ ...prev, storeId: defaultStoreId || prev.storeId }));
    }
  }, [stores, selectedStoreId, form.storeId]);

  const openCreate = () => {
    setEditingId(null);
    // Auto-select the currently filtered store, or first store if available
    const defaultStoreId = selectedStoreId || (stores && stores.length > 0 ? stores[0]._id : '');
    if (!selectedStoreId && defaultStoreId) {
      setSelectedStoreId(defaultStoreId);
    }
    setForm({ ...emptyForm, storeId: defaultStoreId });
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditingId(product._id);
    setForm({
      name: product.name || '',
      categoryId: product.categoryId?._id || '',
      description: product.description || '',
      price: product.price || '',
      mrp: product.mrp || '',
      discount: product.discount || '',
      unit: product.unit || 'kg',
      stock: product.stock || 0,
      purchasePrice: product.avgCost || product.lastCost || '',
      images: (product.images || []).join(', '),
      isFeatured: !!product.isFeatured,
      isOnSale: !!product.isOnSale,
      allowKokoOnline: product.allowKokoOnline !== false,
      allowKokoPos: product.allowKokoPos !== false,
      status: product.status || 'active',
      storeId: product.storeId?._id || '',
      brand: product.brand || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        mrp: Number(form.mrp) || Number(form.price),
        discount: Number(form.discount) || 0,
        stock: Number(form.stock),
        purchasePrice: Number(form.purchasePrice) || 0,
        images: form.images ? form.images.split(',').map((s) => s.trim()).filter(Boolean) : [],
        storeId: form.storeId || selectedStoreId || stores[0]?._id,
      };
      if (!payload.storeId) {
        toast.error('Store is required');
        setSaving(false);
        return;
      }
      if (editingId) {
        await updateProduct(editingId, payload);
        toast.success('Product updated');
      } else {
        await createProduct(payload);
        toast.success('Product created');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleExcelImport = async (e) => {
    e.preventDefault();
    if (!excelFile) {
      toast.error('Please select a file to import');
      return;
    }
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', excelFile);
      const importStoreId = selectedStoreId || stores[0]?._id;
      if (importStoreId) formData.append('storeId', importStoreId);
      
      const { data } = await importProductsExcel(formData);
      toast.success(data.message || 'Products imported successfully!');
      if (data.errors && data.errors.length > 0) {
        console.warn('Import warnings:', data.errors);
        toast.warning(`Import completed with ${data.errors.length} warnings. See console for details.`);
      }
      setShowExcelModal(false);
      setExcelFile(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Excel import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await deleteProduct(id);
      toast.success('Product deleted');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete product');
    }
  };

  const handleSaveInlinePrice = async (product, nextPrice) => {
    try {
      const payload = {
        name: product.name,
        categoryId: product.categoryId?._id,
        storeId: product.storeId?._id,
        price: Number(nextPrice),
        mrp: product.mrp,
        stock: product.stock,
      };
      await updateProduct(product._id, payload);
      toast.success(`Updated ${product.name} price to Rs. ${nextPrice}`);
      setEditingPrices(prev => {
        const copy = { ...prev };
        delete copy[product._id];
        return copy;
      });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update price');
    }
  };

  const filtered = products.filter((p) => {
    const matchesSearch = (p?.name || '').toLowerCase().includes(search.toLowerCase()) || 
                          (p?.sku || '').toLowerCase().includes(search.toLowerCase()) || 
                          (p?.barcode || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || p.categoryId?._id === categoryFilter;
    const matchesSupplier = !supplierFilter || p.defaultSupplierId === supplierFilter;
    return matchesSearch && matchesCategory && matchesSupplier;
  });

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'products', label: 'Products' },
              { id: 'suppliers', label: 'Suppliers' },
              { id: 'receiving', label: 'Stock Receiving' },
              { id: 'supplierReturns', label: 'Supplier Returns' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${
                  activeTab === t.id ? 'bg-primary-green text-white' : 'bg-white border border-card-border text-muted-text hover:bg-gray-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {(activeTab === 'suppliers' || activeTab === 'receiving' || activeTab === 'supplierReturns' || activeTab === 'products') && (
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="border border-card-border rounded-xl py-2.5 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-green"
            >
              <option value="">All stores</option>
              {stores.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          )}
        </div>

        {activeTab === 'suppliers' && (
          <SuppliersPanel storeId={selectedStoreId} stores={stores} onStoreChange={setSelectedStoreId} />
        )}
        {activeTab === 'receiving' && (
          <StockReceivingPanel
            storeId={selectedStoreId}
            products={products.filter((p) => p && (!selectedStoreId || p?.storeId?._id === selectedStoreId))}
          />
        )}
        {activeTab === 'supplierReturns' && (
          <SupplierReturnsPanel
            storeId={selectedStoreId}
            products={products.filter((p) => p && (!selectedStoreId || p?.storeId?._id === selectedStoreId))}
          />
        )}

        {activeTab === 'products' && (
          <>
        {error && <div className="mb-4 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm">{error}</div>}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-dark-navy">Products</h1>
            <p className="text-muted-text text-sm mt-1">{products.length} total products</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setShowExcelModal(true)} className="flex items-center gap-2 bg-white border border-card-border text-muted-text hover:text-dark-navy px-5 py-2.5 rounded-xl font-semibold transition-colors text-sm shadow-sm">
              <FileSpreadsheet size={18} className="text-emerald-600" /> Excel Import
            </button>
            <button onClick={openCreate} className="flex items-center gap-2 bg-primary-green text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-600 text-sm shadow-md">
              <Plus size={18} /> Add Product
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, SKU, or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-card-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green bg-white"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green bg-white"
          >
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green bg-white"
          >
            <option value="">All Suppliers</option>
            {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>

        <div className="bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Product</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Store</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Brand</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text w-48">Price (LKR)</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Stock</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Status</th>
                  <th className="text-right px-6 py-3 font-medium text-muted-text">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {filtered.map((product) => {
                  const isExpanded = expandedProduct === product._id;
                  const isLowStock = product.stock <= 5;
                  const inlinePrice = editingPrices[product._id] !== undefined ? editingPrices[product._id] : product.price;
                  
                  return (
                    <React.Fragment key={product._id}>
                      <tr className={`${isLowStock ? 'bg-red-50/30' : ''} hover:bg-gray-50/50 transition-colors`}>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setExpandedProduct(isExpanded ? null : product._id)}
                              className="p-1 rounded hover:bg-gray-100 text-gray-400"
                              title="Show price rows"
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            <div>
                              <div className="font-medium text-dark-navy">{product.name}</div>
                              <div className="text-xs text-muted-text flex items-center gap-1.5 mt-0.5">
                                <span className="bg-gray-100 px-1.5 py-0.5 rounded">{product.categoryId?.name || '-'}</span>
                                {product.barcode && <span className="font-mono text-gray-400">BC: {product.barcode}</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-muted-text">{product.storeId?.name || '-'}</td>
                        <td className="px-6 py-3.5 text-muted-text font-medium">{product.brand || <span className="text-gray-300 italic">None</span>}</td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-400 text-xs">Rs.</span>
                            <input
                              type="number"
                              step="0.01"
                              value={inlinePrice}
                              onChange={(e) => setEditingPrices({ ...editingPrices, [product._id]: e.target.value })}
                              className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-green focus:border-transparent bg-white text-dark-navy transition-all"
                            />
                            {editingPrices[product._id] !== undefined && Number(editingPrices[product._id]) !== product.price && (
                              <button
                                onClick={() => handleSaveInlinePrice(product, editingPrices[product._id])}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                              >
                                Save
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${isLowStock ? 'text-red-700 bg-red-100/80 border border-red-200 animate-pulse' : 'text-gray-700'}`}>
                            {product.stock}
                          </span>
                          <span className="text-xs text-muted-text ml-0.5">/{product.unit}</span>
                          {product.priceRows?.length > 0 && (
                            <span className="ml-1.5 text-xs text-indigo-500 font-medium">({product.priceRows.length} rows)</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${product.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{product.status}</span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => openEdit(product)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"><Edit2 size={16} /></button>
                            <button onClick={() => handleDelete(product._id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                      {/* Price Rows Expansion */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="px-8 pb-4 pt-0 bg-indigo-50/30">
                            <div className="rounded-xl border border-indigo-100 bg-white p-4 shadow-inner">
                              <p className="text-xs font-bold text-indigo-700 mb-3 flex items-center gap-1"><Package size={12} /> Stock Price Rows — {product.name}</p>
                              {!product.priceRows || product.priceRows.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">No price rows yet. Stock will be tracked by price row when received via GRN.</p>
                              ) : (
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-left text-gray-400 border-b border-gray-100">
                                      <th className="pb-2 pr-4 font-medium">#</th>
                                      <th className="pb-2 pr-4 font-medium">Cost Price</th>
                                      <th className="pb-2 pr-4 font-medium">Qty in Stock</th>
                                      <th className="pb-2 pr-4 font-medium">Last Received</th>
                                      <th className="pb-2 font-medium">Total Value</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {product.priceRows.map((row, idx) => (
                                      <tr key={row._id || idx} className="border-b border-gray-50 hover:bg-indigo-50/30">
                                        <td className="py-1.5 pr-4 text-gray-400">{idx + 1}</td>
                                        <td className="py-1.5 pr-4 font-semibold text-dark-navy">Rs. {Number(row.costPrice).toFixed(2)}</td>
                                        <td className="py-1.5 pr-4">
                                          <span className={`px-2 py-0.5 rounded-full font-bold ${row.qty > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{row.qty}</span>
                                        </td>
                                        <td className="py-1.5 pr-4 text-gray-500">{row.receivedAt ? new Date(row.receivedAt).toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'}) : '-'}</td>
                                        <td className="py-1.5 font-medium text-indigo-700">Rs. {(Number(row.costPrice) * Number(row.qty)).toFixed(2)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot>
                                    <tr className="border-t border-gray-200 font-bold">
                                      <td colSpan={2} className="pt-2 text-gray-500 font-medium">Total Stock Value</td>
                                      <td className="pt-2 text-dark-navy">{product.priceRows.reduce((s,r) => s + Number(r.qty||0), 0)}</td>
                                      <td />
                                      <td className="pt-2 text-indigo-700">Rs. {product.priceRows.reduce((s,r) => s + Number(r.costPrice||0)*Number(r.qty||0), 0).toFixed(2)}</td>
                                    </tr>
                                  </tfoot>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="text-center py-12 text-muted-text text-sm font-medium">No products found</div>}
          </div>
        </div>

        {/* Excel Import Modal */}
        {showExcelModal && (
          <div className="fixed inset-0 bg-black/50 z-100 flex items-center justify-center p-4" onClick={() => setShowExcelModal(false)}>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-card-border flex items-center justify-between bg-white rounded-t-2xl z-10">
                <h2 className="text-lg font-bold text-dark-navy flex items-center gap-2">
                  <FileSpreadsheet className="text-emerald-600" size={20} /> Import Products Excel
                </h2>
                <button onClick={() => setShowExcelModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={20} /></button>
              </div>
              <form onSubmit={handleExcelImport} className="p-6 space-y-4">
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-800 space-y-2">
                  <p className="font-semibold flex items-center gap-1"><AlertTriangle size={12} /> Excel Sheet Columns Template:</p>
                  <p className="font-mono bg-white/70 p-2 rounded leading-relaxed border border-indigo-100/50">
                    Name | Category | Subcategory | Brand | Description | Price | MRP | CostPrice | Unit | Stock | Barcode | SKU
                  </p>
                  <p>First row is treated as header and skipped. Category is auto-resolved or auto-created.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-navy mb-1.5">Store Branch Destination *</label>
                  <select required value={selectedStoreId} onChange={(e) => setSelectedStoreId(e.target.value)} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-green">
                    <option value="">Select destination store</option>
                    {stores.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="border-2 border-dashed border-gray-200 hover:border-primary-green rounded-xl p-6 text-center cursor-pointer transition-colors relative bg-gray-50">
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    required
                    onChange={(e) => setExcelFile(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm font-medium text-dark-navy">
                    {excelFile ? excelFile.name : 'Click or Drag Excel File to upload'}
                  </p>
                  <p className="text-xs text-muted-text mt-1">Supports XLSX, XLS files</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={importing} className="flex-1 bg-primary-green text-white py-2.5 rounded-xl font-semibold hover:bg-emerald-600 disabled:opacity-50 text-sm shadow-md">
                    {importing ? 'Importing...' : 'Upload & Import'}
                  </button>
                  <button type="button" onClick={() => setShowExcelModal(false)} className="flex-1 border border-card-border py-2.5 rounded-xl font-semibold text-muted-text hover:bg-gray-50 text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/50 z-100 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-card-border flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
                <h2 className="text-lg font-bold text-dark-navy">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-dark-navy mb-1">Product Name *</label>
                    <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-navy mb-1">Brand <span className="text-muted-text font-normal">(Optional)</span></label>
                    <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Generic" className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-navy mb-1">Category *</label>
                    {form.categoryId && (
                      <p className="text-xs text-primary-green mb-1">Selected: {categories.find(c => c._id === form.categoryId)?.name}</p>
                    )}
                    <select required value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm">
                      <option value="">Select category</option>
                      {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-navy mb-1">Store *</label>
                    {form.storeId && (
                      <p className="text-xs text-primary-green mb-1">Selected: {stores.find(s => s._id === form.storeId)?.name}</p>
                    )}
                    <select required value={form.storeId} onChange={(e) => setForm({ ...form, storeId: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm">
                      <option value="">Select store</option>
                      {stores.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-navy mb-1">Price *</label>
                    <input type="number" step="0.01" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-navy mb-1">MRP</label>
                    <input type="number" step="0.01" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-navy mb-1">Stock *</label>
                    <input type="number" required value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-navy mb-1">Purchase Price</label>
                    <input type="number" min="0" step="0.01" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-navy mb-1">Discount %</label>
                    <input type="number" min="0" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-navy mb-1">Unit</label>
                    <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm bg-white">
                      {['kg', 'g', 'L', 'ml', 'pcs', 'pack', 'dozen', 'bunch'].map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-dark-navy mb-1">Description</label>
                    <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm resize-none" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-dark-navy mb-1">Image URLs <span className="text-muted-text font-normal">(comma separated)</span></label>
                    <input value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm" />
                  </div>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} className="w-4 h-4 rounded text-primary-green focus:ring-primary-green" />
                      Featured
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.isOnSale} onChange={(e) => setForm({ ...form, isOnSale: e.target.checked })} className="w-4 h-4 rounded text-primary-green focus:ring-primary-green" />
                      On Sale
                    </label>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-dark-navy mb-1">Koko Pay Availability</label>
                    <div className="flex flex-wrap gap-6 border border-card-border rounded-xl px-4 py-3">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.allowKokoOnline}
                          onChange={(e) => setForm({ ...form, allowKokoOnline: e.target.checked })}
                          className="w-4 h-4 rounded text-primary-green focus:ring-primary-green"
                        />
                        Allow Koko on Online Checkout
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.allowKokoPos}
                          onChange={(e) => setForm({ ...form, allowKokoPos: e.target.checked })}
                          className="w-4 h-4 rounded text-primary-green focus:ring-primary-green"
                        />
                        Allow Koko on POS
                      </label>
                    </div>
                  </div>
                  {editingId && (
                    <div>
                      <label className="block text-sm font-medium text-dark-navy mb-1">Status</label>
                      <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm bg-white">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving} className="flex-1 bg-primary-green text-white py-2.5 rounded-xl font-semibold hover:bg-emerald-600 disabled:opacity-50">
                    {saving ? 'Saving...' : editingId ? 'Update Product' : 'Create Product'}
                  </button>
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-card-border py-2.5 rounded-xl font-semibold text-muted-text hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminProducts;
