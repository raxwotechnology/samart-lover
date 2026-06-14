import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { managerNavGroups as navItems } from './managerNavItems';
import { toast } from 'react-toastify';
import { createCustomerReturn, getCustomerReturns, getReturnOrder, managerApproveCustomerReturn, managerRejectCustomerReturn } from '../../services/api';

const ManagerReturns = () => {
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [returns, setReturns] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [activeStatus, setActiveStatus] = useState('all');

  const fetchReturns = async () => {
    try {
      const { data } = await getCustomerReturns({});
      setReturns(data || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchReturns();
    const id = setInterval(fetchReturns, 15000);
    return () => clearInterval(id);
  }, []);

  const visibleReturns = activeStatus === 'all'
    ? returns
    : returns.filter((r) => r.status === activeStatus);

  const lookupOrder = async () => {
    if (!orderId.trim()) return;
    setLoadingOrder(true);
    try {
      const { data } = await getReturnOrder(orderId.trim());
      setOrder(data);
      const base = (data.items || []).map((i) => ({
        productId: i.productId,
        name: i.name,
        soldQty: i.quantity,
        qty: 0,
        condition: 'good',
        reason: '',
      }));
      setItems(base);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load order');
      setOrder(null);
      setItems([]);
    } finally {
      setLoadingOrder(false);
    }
  };

  const submitReturn = async (e) => {
    e.preventDefault();
    if (!order?._id) {
      toast.error('Lookup an order first');
      return;
    }
    const payloadItems = items
      .filter((i) => Number(i.qty) > 0)
      .map((i) => ({ productId: i.productId, qty: Number(i.qty), condition: i.condition, reason: i.reason }));
    if (payloadItems.length === 0) {
      toast.error('Select at least one item to return');
      return;
    }
    setSubmitting(true);
    try {
      await createCustomerReturn({ orderId: order._id, items: payloadItems, notes });
      toast.success('Return request submitted');
      setOrderId('');
      setOrder(null);
      setItems([]);
      setNotes('');
      fetchReturns();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit return');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout navItems={navItems} title="Manager Dashboard">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-navy">Customer Returns</h1>
          <p className="text-muted-text text-sm mt-1">Create return requests and track their status.</p>
        </div>

        <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-dark-navy mb-1">Order ID *</label>
              <input value={orderId} onChange={(e) => setOrderId(e.target.value)} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm" />
            </div>
            <button onClick={lookupOrder} disabled={loadingOrder} className="bg-primary-green hover:bg-emerald-600 text-white font-semibold px-5 py-2.5 rounded-xl disabled:opacity-50">
              {loadingOrder ? 'Loading...' : 'Lookup'}
            </button>
          </div>

          {order && (
            <form onSubmit={submitReturn} className="mt-5 space-y-4">
              <div className="text-sm text-muted-text">
                <span className="font-semibold text-dark-navy">Order</span> #{String(order._id).slice(-8).toUpperCase()} • {new Date(order.createdAt).toLocaleString()}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-text">Item</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-text">Sold</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-text">Return Qty</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-text">Condition</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-text">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border">
                    {items.map((i, idx) => (
                      <tr key={String(i.productId)}>
                        <td className="px-4 py-2.5 font-medium text-dark-navy">{i.name}</td>
                        <td className="px-4 py-2.5 text-muted-text">{i.soldQty}</td>
                        <td className="px-4 py-2.5">
                          <input
                            type="number"
                            min="0"
                            max={i.soldQty}
                            value={i.qty}
                            onChange={(e) => {
                              const v = Math.min(Number(e.target.value || 0), i.soldQty);
                              setItems((prev) => prev.map((p, j) => (j === idx ? { ...p, qty: v } : p)));
                            }}
                            className="w-24 border border-card-border rounded-lg px-3 py-2 text-sm"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <select value={i.condition} onChange={(e) => setItems((prev) => prev.map((p, j) => (j === idx ? { ...p, condition: e.target.value } : p)))} className="border border-card-border rounded-lg px-3 py-2 text-sm bg-white">
                            <option value="good">Not damaged</option>
                            <option value="damaged">Damaged</option>
                          </select>
                        </td>
                        <td className="px-4 py-2.5">
                          <input value={i.reason} onChange={(e) => setItems((prev) => prev.map((p, j) => (j === idx ? { ...p, reason: e.target.value } : p)))} className="w-full border border-card-border rounded-lg px-3 py-2 text-sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-navy mb-1">Notes (optional)</label>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm" />
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={submitting} className="bg-primary-green hover:bg-emerald-600 text-white font-semibold px-6 py-2.5 rounded-xl disabled:opacity-50">
                  {submitting ? 'Submitting...' : 'Submit Return Request'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <h2 className="font-semibold text-dark-navy m-0">Return Requests</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {['all', 'requested', 'approved', 'on_hold', 'rejected', 'resolved'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setActiveStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    activeStatus === s
                      ? 'bg-primary-green text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {s.replaceAll('_', ' ')}
                </button>
              ))}
              <button
                type="button"
                onClick={fetchReturns}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100"
              >
                Refresh
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-text">RMA</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-text">Order</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-text">Customer</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-text">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-text">Date</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-text">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {visibleReturns.map((r) => (
                  <tr key={r._id}>
                    <td className="px-4 py-2.5 font-medium text-dark-navy">{r.holdBillNo}</td>
                    <td className="px-4 py-2.5 text-muted-text">#{String(r.orderId?._id || r.orderId).slice(-8).toUpperCase()}</td>
                    <td className="px-4 py-2.5 text-muted-text">{r.customerId?.name || '—'}</td>
                    <td className="px-4 py-2.5"><span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">{r.status}</span></td>
                    <td className="px-4 py-2.5 text-muted-text">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5 text-right">
                      {r.status === 'requested' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={async () => {
                              setSavingId(r._id);
                              try {
                                await managerApproveCustomerReturn(r._id, {});
                                toast.success('Return approved');
                                fetchReturns();
                              } catch (err) {
                                toast.error(err.response?.data?.message || 'Failed to approve');
                              } finally {
                                setSavingId(null);
                              }
                            }}
                            disabled={savingId === r._id}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={async () => {
                              const reason = prompt('Rejection reason:');
                              if (!reason) return;
                              setSavingId(r._id);
                              try {
                                await managerRejectCustomerReturn(r._id, { reason });
                                toast.success('Return rejected');
                                fetchReturns();
                              } catch (err) {
                                toast.error(err.response?.data?.message || 'Failed to reject');
                              } finally {
                                setSavingId(null);
                              }
                            }}
                            disabled={savingId === r._id}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-text">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {visibleReturns.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-text">No returns yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManagerReturns;

