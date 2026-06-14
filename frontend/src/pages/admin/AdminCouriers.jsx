import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Truck } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { getCouriers, getCourierById, createCourier, updateCourier, deleteCourier, addCourierPayment } from '../../services/api';
import { toast } from 'react-toastify';
import { adminNavGroups as navItems } from './adminNavItems';

const AdminCouriers = () => {
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedCourier, setSelectedCourier] = useState(null);
  const [form, setForm] = useState({ name: '', address: '', phone: '', charge: '', balance: '', isActive: true });
  const [saving, setSaving] = useState(false);
  const [payments, setPayments] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  const fetchCouriers = async () => {
    try {
      const { data } = await getCouriers({ all: true });
      setCouriers(data || []);
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to load courier services';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourierDetails = async (id) => {
    try {
      const { data } = await getCourierById(id);
      setPayments(data?.payments || []);
    } catch (err) {
      setPayments([]);
    }
  };

  useEffect(() => {
    fetchCouriers();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', address: '', phone: '', charge: '', balance: '', isActive: true });
    setShowModal(true);
  };

  const openEdit = (courier) => {
    setEditingId(courier._id);
    setForm({
      name: courier.name,
      address: courier.address || '',
      phone: courier.phone || '',
      charge: courier.charge?.toString() || '0',
      balance: courier.balance?.toString() || '0',
      isActive: courier.isActive !== false,
    });
    setShowModal(true);
  };

  const openPayments = async (courier) => {
    setSelectedCourier(courier);
    setPayments([]);
    setPaymentAmount('');
    setPaymentNote('');
    setShowPaymentsModal(true);
    await fetchCourierDetails(courier._id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        address: form.address || '',
        phone: form.phone || '',
        isActive: !!form.isActive,
      };

      if (form.balance !== '') {
        payload.balance = Number(form.balance) || 0;
      }
      if (form.charge !== '') {
        payload.charge = Number(form.charge) || 0;
      }

      if (editingId) {
        await updateCourier(editingId, payload);
        toast.success('Courier service updated');
      } else {
        await createCourier(payload);
        toast.success('Courier service created');
      }
      setShowModal(false);
      fetchCouriers();
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.response?.statusText || err.message || 'Failed to save courier service';
      console.error('Courier save error:', err.response || err);
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedCourier) return;
    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }
    try {
      const { data } = await addCourierPayment(selectedCourier._id, { amount: amountNum, note: paymentNote });
      toast.success('Courier payment recorded');
      setPaymentAmount('');
      setPaymentNote('');
      setSelectedCourier(prev => ({
        ...prev,
        balance: data.balance
      }));
      setPayments(data.payments || []);
      fetchCouriers();
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to record payment';
      toast.error(errorMsg);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this courier service?')) return;
    try {
      await deleteCourier(id);
      toast.success('Courier service deleted');
      fetchCouriers();
    } catch (err) {
      toast.error('Failed to delete courier service');
    }
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-dark-navy">Courier Services</h1>
            <p className="text-muted-text text-sm mt-1">{couriers.length} registered services</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-primary-green text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-600 shadow-lg shadow-emerald-200 transition-all text-sm"
          >
            <Plus size={18} /> Add Courier Service
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {couriers.map((courier) => (
            <div key={courier._id} className="bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden hover:shadow-md transition-all group p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-50 flex items-center justify-center">
                    <Truck size={20} className="text-indigo-600" />
                  </div>
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${courier.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                    {courier.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <h3 className="font-bold text-dark-navy text-base mb-1">{courier.name}</h3>
                <p className="text-xs text-muted-text mb-1">{courier.address || 'Address not set'}</p>
                <p className="text-xs text-muted-text mb-3">{courier.phone || 'Phone not set'}</p>
                <div className="pt-2 border-t border-slate-50 mb-3">
                  <p className="text-xs text-muted-text font-medium">Default Delivery Charge:</p>
                  <p className="text-sm font-bold text-emerald-600">Rs. {(courier.charge || 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-text font-medium mt-1.5">Outstanding Balance:</p>
                  <p className="text-base font-black text-indigo-600">Rs. {(courier.balance || 0).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 pt-2 border-t border-gray-50">
                <button
                  onClick={() => openEdit(courier)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-bold text-blue-500 bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  <Edit2 size={12} /> Edit
                </button>
                <button
                  onClick={() => openPayments(courier)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                >
                  💵 Pay
                </button>
                <button
                  onClick={() => handleDelete(courier._id)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {couriers.length === 0 && (
          <div className="bg-white rounded-2xl border border-card-border p-12 text-center text-muted-text text-sm">
            No courier services registered yet. Click "Add Courier Service" to create one.
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-card-border flex items-center justify-between">
              <h2 className="text-lg font-bold text-dark-navy">{editingId ? 'Edit Courier Service' : 'New Courier Service'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-navy mb-1">Service Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Domex, PromptX" className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green" />
              </div>
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-navy mb-1">Courier Address</label>
                  <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Office address or pickup location" className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-navy mb-1">Phone Number</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="e.g. 0344-1234567" className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-dark-navy mb-1">Delivery Charge (Rs.)</label>
                    <input type="number" min="0" value={form.charge} onChange={(e) => setForm({ ...form, charge: e.target.value })} placeholder="350" className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-navy mb-1">Initial Balance (Rs.)</label>
                    <input type="number" min="0" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} placeholder="0" className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 rounded text-primary-green focus:ring-primary-green" />
                <label htmlFor="isActive" className="text-sm font-medium text-dark-navy cursor-pointer select-none">Active and available for POS orders</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-primary-green text-white py-2.5 rounded-xl font-semibold hover:bg-emerald-600 transition-all disabled:opacity-50 text-sm shadow-md">
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-card-border py-2.5 rounded-xl font-semibold text-muted-text hover:bg-gray-50 transition-all text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payments Modal */}
      {showPaymentsModal && selectedCourier && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowPaymentsModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-card-border flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 text-white">
              <div>
                <h2 className="text-lg font-bold">Courier Payments</h2>
                <p className="text-xs text-slate-300 mt-0.5">{selectedCourier.name}</p>
              </div>
              <button onClick={() => setShowPaymentsModal(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white"><X size={20} /></button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Outstanding Balance Banner */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-center">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500">Outstanding Balance</span>
                <h3 className="text-2xl font-black text-indigo-600 mt-1">Rs. {(selectedCourier.balance || 0).toLocaleString()}</h3>
              </div>

              {/* Record Payment Form */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-dark-navy border-b border-gray-100 pb-2">Record New Payment</h4>
                <div>
                  <label className="block text-sm font-medium text-dark-navy mb-1">Payment Amount (Rs.) *</label>
                  <input type="number" min="0" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="e.g. 5000" className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-navy mb-1">Note / Reference</label>
                  <input value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} placeholder="e.g. Cheque #1234, Bank transfer reference" className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green" />
                </div>
                <button type="button" onClick={handlePayment} className="w-full bg-primary-green hover:bg-emerald-600 text-white py-2.5 rounded-xl font-semibold transition-all text-sm shadow-lg shadow-emerald-100">
                  Record Payment
                </button>
              </div>

              {/* Payment History */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-dark-navy border-b border-gray-100 pb-2">Payment History</h4>
                {payments.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {payments.map((payment) => (
                      <div key={payment._id || payment.createdAt} className="rounded-xl border border-card-border p-3 bg-slate-50">
                        <div className="flex items-center justify-between text-sm font-bold text-dark-navy mb-1">
                          <span>Rs. {payment.amount.toLocaleString()}</span>
                          <span className="text-[10px] font-normal text-muted-text">{new Date(payment.date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-muted-text">{payment.note || 'No note provided'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-text text-center py-4 bg-slate-50 rounded-xl border border-dashed border-card-border">No payments recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminCouriers;
