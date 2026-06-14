import { useState, useEffect } from 'react';
import { LayoutDashboard, User, Clock, Calendar, CreditCard, Plus, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import useAuthStore from '../../store/authStore';
import { getEmployeeNavGroups } from './employeeNav';
import API from '../../services/api';
import { toast } from 'react-toastify';

const statusColors = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

const statusIcons = {
  pending: AlertCircle,
  approved: CheckCircle,
  rejected: XCircle,
};

const EmployeeLeaves = () => {
  const { user } = useAuthStore();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ type: 'casual', startDate: '', endDate: '', reason: '' });

  const fetchLeaves = async () => {
    try {
      const { data } = await API.get('/hr/leaves');
      setLeaves(data);
    } catch (err) {
      toast.error('Failed to load leaves');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeaves(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate || !form.reason) {
      toast.error('All fields are required');
      return;
    }
    setSubmitting(true);
    try {
      await API.post('/hr/leaves', form);
      toast.success('Leave request submitted! 📋');
      setShowForm(false);
      setForm({ type: 'casual', startDate: '', endDate: '', reason: '' });
      fetchLeaves();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const approved = leaves.filter(l => l.status === 'approved');
  const usedDays = approved.reduce((sum, l) => sum + (l.totalDays || 0), 0);
  const pending = leaves.filter(l => l.status === 'pending');

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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-dark-navy">📅 My Leaves</h1>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-primary-green hover:bg-emerald-600 text-white font-medium px-5 py-2.5 rounded-xl transition-colors shadow-md">
            <Plus size={16} /> Request Leave
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-card-border text-center">
            <p className="text-2xl font-bold text-dark-navy">14</p>
            <p className="text-xs text-muted-text">Total Allowance</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-card-border text-center">
            <p className="text-2xl font-bold text-emerald-600">{Math.max(0, 14 - usedDays)}</p>
            <p className="text-xs text-muted-text">Remaining</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-card-border text-center">
            <p className="text-2xl font-bold text-blue-600">{usedDays}</p>
            <p className="text-xs text-muted-text">Used</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-card-border text-center">
            <p className="text-2xl font-bold text-amber-600">{pending.length}</p>
            <p className="text-xs text-muted-text">Pending</p>
          </div>
        </div>

        {/* Leave Request Form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
            <h3 className="font-semibold text-dark-navy mb-4">New Leave Request</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-text block mb-1">Leave Type</label>
                <select value={form.type} onChange={(e) => setForm({...form, type: e.target.value})}
                  className="w-full border border-card-border rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-green">
                  <option value="casual">Casual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="annual">Annual Leave</option>
                  <option value="maternity">Maternity Leave</option>
                  <option value="paternity">Paternity Leave</option>
                  <option value="unpaid">Unpaid Leave</option>
                </select>
              </div>
              <div />
              <div>
                <label className="text-xs text-muted-text block mb-1">Start Date</label>
                <input type="date" value={form.startDate} onChange={(e) => setForm({...form, startDate: e.target.value})}
                  className="w-full border border-card-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green" />
              </div>
              <div>
                <label className="text-xs text-muted-text block mb-1">End Date</label>
                <input type="date" value={form.endDate} onChange={(e) => setForm({...form, endDate: e.target.value})}
                  className="w-full border border-card-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-text block mb-1">Reason</label>
                <textarea rows={3} value={form.reason} onChange={(e) => setForm({...form, reason: e.target.value})}
                  className="w-full border border-card-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green resize-none" placeholder="Explain your reason..." />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-sm text-muted-text hover:text-dark-navy">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="bg-primary-green hover:bg-emerald-600 text-white font-medium px-6 py-2.5 rounded-xl transition-colors disabled:opacity-50">
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Leave History */}
        <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
          <h3 className="font-semibold text-dark-navy mb-4">Leave History</h3>
          {leaves.length === 0 ? (
            <p className="text-center text-muted-text py-8">No leave requests yet</p>
          ) : (
            <div className="space-y-3">
              {leaves.map((leave) => {
                const Icon = statusIcons[leave.status] || AlertCircle;
                return (
                  <div key={leave._id} className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 border border-card-border/50">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${statusColors[leave.status]}`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-dark-navy capitalize">{leave.leaveType || leave.type} Leave</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[leave.status]}`}>
                          {leave.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-text mt-1">
                        {new Date(leave.startDate).toLocaleDateString()} — {new Date(leave.endDate).toLocaleDateString()} ({leave.totalDays} day{leave.totalDays > 1 ? 's' : ''})
                      </p>
                      <p className="text-sm text-dark-navy mt-1">{leave.reason}</p>
                      {leave.rejectionReason && (
                        <p className="text-xs text-red-500 mt-1">❌ Rejection: {leave.rejectionReason}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EmployeeLeaves;
