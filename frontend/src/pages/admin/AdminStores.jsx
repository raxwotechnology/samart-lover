import { useState, useEffect } from 'react';
import { Store, ToggleLeft, ToggleRight, ExternalLink, Plus, X, Edit2, Trash2 } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { getAdminStores, toggleStoreStatus, createStore, updateStore, deleteStore } from '../../services/api';
import API from '../../services/api';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import { adminNavGroups as navItems } from './adminNavItems';
import { toAbsoluteLogoUrl, toAbsoluteBannerUrl } from '../../utils/imageUtils';

const emptyForm = { name: '', description: '', address: '', city: '', phone: '', email: '', bannerImage: '', logo: '', managerId: '' };

const AdminStores = () => {
  const [stores, setStores] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchStores = async () => {
    try { const { data } = await getAdminStores(); setStores(data); }
    catch { toast.error('Failed to load stores'); }
    finally { setLoading(false); }
  };

  const fetchManagers = async () => {
    try { const { data } = await API.get('/admin/users'); setManagers((data.users || data).filter(u => u.role === 'manager')); }
    catch { /* ignore */ }
  };

  useEffect(() => { fetchStores(); fetchManagers(); }, []);

  const handleToggle = async (id) => {
    try { await toggleStoreStatus(id); toast.success('Status updated'); fetchStores(); }
    catch { toast.error('Failed'); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) return;
    try { await deleteStore(id); toast.success('Store deleted'); fetchStores(); }
    catch { toast.error('Failed to delete store'); }
  };

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setShowModal(true); };

  const openEdit = (s) => {
    setEditingId(s._id);
    setForm({ name: s.name||'', description: s.description||'', address: s.address||'', city: s.city||'', phone: s.phone||'', email: s.email||'', bannerImage: s.bannerImage||'', logo: s.logo||'', managerId: s.managerId?._id||'' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editingId) { await updateStore(editingId, form); toast.success('Store updated!'); }
      else { await createStore(form); toast.success('Store created!'); }
      setShowModal(false); fetchStores();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  if (loading) return <DashboardLayout navItems={navItems} title="Admin Panel"><div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-primary-green border-t-transparent rounded-full animate-spin" /></div></DashboardLayout>;

  return (
    <DashboardLayout navItems={navItems} title="Admin Panel">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-dark-navy">🏪 Store Management</h1>
            <p className="text-muted-text text-sm mt-1">{stores.length} registered stores</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 bg-primary-green text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-600 shadow-lg shadow-emerald-200 text-sm">
            <Plus size={18} /> Add Store
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map(store => (
            <div key={store._id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-all ${store.isActive ? 'border-card-border' : 'border-red-200 opacity-75'}`}>
              <div className="h-28 bg-gradient-to-br from-emerald-400 to-teal-500 relative">
                {store.bannerImage && <img src={toAbsoluteBannerUrl(store.bannerImage)} alt="" className="w-full h-full object-cover" />}
                <span className={`absolute top-3 right-3 text-xs font-semibold px-3 py-1 rounded-full ${store.isActive ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                  {store.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  {store.logo ? <img src={toAbsoluteLogoUrl(store.logo)} alt="" className="w-10 h-10 rounded-xl object-cover" /> : <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><Store size={18} className="text-primary-green" /></div>}
                  <div><h3 className="font-semibold text-dark-navy">{store.name}</h3><p className="text-xs text-muted-text">{store.city || 'No city'}</p></div>
                </div>
                <div className="text-xs text-muted-text space-y-1 mb-4">
                  <p><span className="font-medium text-dark-navy">Manager:</span> {store.managerId?.name || 'N/A'}</p>
                  <p><span className="font-medium text-dark-navy">Phone:</span> {store.phone || '—'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleToggle(store._id)} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold flex-1 justify-center ${store.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
                    {store.isActive ? <><ToggleRight size={16} /> Deactivate</> : <><ToggleLeft size={16} /> Activate</>}
                  </button>
                  <button onClick={() => openEdit(store)} className="p-2 rounded-xl border border-card-border hover:bg-blue-50 text-blue-500"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(store._id, store.name)} className="p-2 rounded-xl border border-card-border hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                  <Link to={`/store/${store._id}`} className="p-2 rounded-xl border border-card-border hover:bg-gray-50"><ExternalLink size={14} className="text-muted-text" /></Link>
                </div>
              </div>
            </div>
          ))}
        </div>
        {stores.length === 0 && <div className="bg-white rounded-2xl border border-card-border p-12 text-center text-muted-text"><Store size={48} className="mx-auto mb-3 text-gray-300" /><p>No stores yet</p></div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-card-border flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-lg font-bold text-dark-navy">{editingId ? 'Edit Store' : 'Add New Store'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-navy mb-1">Store Name *</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Smartlover Kadawatha"
                  className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green" />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-navy mb-1">Assign Manager</label>
                <select value={form.managerId} onChange={e => setForm({...form, managerId: e.target.value})}
                  className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-green">
                  <option value="">Select manager...</option>
                  {managers.map(m => <option key={m._id} value={m._id}>{m.name} ({m.email})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-dark-navy mb-1">City</label>
                  <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="Colombo"
                    className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-navy mb-1">Phone</label>
                  <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+94 XX XXX XXXX"
                    className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-navy mb-1">Address</label>
                <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Street address"
                  className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green" />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-navy mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="store@example.com"
                  className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green" />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-navy mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows="2" placeholder="About this store..."
                  className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-green" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-dark-navy mb-1">Logo URL</label>
                  <input value={form.logo} onChange={e => setForm({...form, logo: e.target.value})} placeholder="https://..."
                    className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-navy mb-1">Banner URL</label>
                  <input value={form.bannerImage} onChange={e => setForm({...form, bannerImage: e.target.value})} placeholder="https://..."
                    className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-primary-green text-white py-2.5 rounded-xl font-semibold hover:bg-emerald-600 disabled:opacity-50 text-sm">
                  {saving ? 'Saving...' : editingId ? 'Update Store' : 'Create Store'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-card-border py-2.5 rounded-xl text-muted-text hover:bg-gray-50 text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminStores;
