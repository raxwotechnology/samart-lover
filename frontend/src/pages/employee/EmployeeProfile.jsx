import { useState, useEffect } from 'react';
import { LayoutDashboard, User, Clock, Calendar, CreditCard, Mail, Phone, MapPin, Building, Save } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import useAuthStore from '../../store/authStore';
import { getEmployeeNavGroups } from './employeeNav';
import API from '../../services/api';
import { toast } from 'react-toastify';

const EmployeeProfile = () => {
  const { user, setUser } = useAuthStore();
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  const roleLabel = user?.role === 'deliveryGuy' ? 'Delivery Rider' : user?.role === 'cashier' ? 'Cashier' : user?.role;

  const handleSavePhone = async () => {
    setSaving(true);
    try {
      const { data } = await API.put('/auth/profile', { phone });
      setUser(data);
      toast.success('Phone updated!');
    } catch (err) {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout navItems={getEmployeeNavGroups(user?.role)} title="Employee Portal">
      <div className="max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold text-dark-navy">👤 My Profile</h1>

        {/* Profile Header */}
        <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center text-4xl font-bold backdrop-blur-sm">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{user?.name}</h2>
              <p className="text-violet-100">{roleLabel}</p>
              <p className="text-violet-200 text-sm mt-1">Member since {new Date(user?.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
          <h3 className="font-semibold text-dark-navy mb-4 flex items-center gap-2"><User size={18} /> Personal Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-text block mb-1">Full Name</label>
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-dark-navy">
                <User size={14} className="text-gray-400" /> {user?.name}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-text block mb-1">Email</label>
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-dark-navy">
                <Mail size={14} className="text-gray-400" /> {user?.email}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-text block mb-1">Phone</label>
              <div className="flex gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <Phone size={14} className="text-gray-400 ml-3" />
                  <input value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 border border-card-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green" placeholder="+94 7X XXX XXXX" />
                </div>
                <button onClick={handleSavePhone} disabled={saving}
                  className="bg-primary-green text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-1">
                  <Save size={14} /> {saving ? '...' : 'Save'}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-text block mb-1">Role</label>
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-dark-navy">
                <Building size={14} className="text-gray-400" /> {roleLabel}
              </div>
            </div>
          </div>
        </div>

        {/* Employment Info */}
        <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
          <h3 className="font-semibold text-dark-navy mb-4 flex items-center gap-2"><Building size={18} /> Employment Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-text block mb-1">Department</label>
              <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-dark-navy">
                {user?.employeeInfo?.department || '—'}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-text block mb-1">Joined</label>
              <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-dark-navy">
                {user?.employeeInfo?.joinDate ? new Date(user.employeeInfo.joinDate).toLocaleDateString() : '—'}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-text block mb-1">EPF Number</label>
              <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-dark-navy">
                {user?.employeeInfo?.epfNo || '—'}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-text block mb-1">ETF Number</label>
              <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-dark-navy">
                {user?.employeeInfo?.etfNo || '—'}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-text block mb-1">Bank</label>
              <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-dark-navy">
                {user?.employeeInfo?.bankName || '—'}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-text block mb-1">Account Number</label>
              <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-dark-navy">
                {user?.employeeInfo?.bankAccount ? `****${user.employeeInfo.bankAccount.slice(-4)}` : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EmployeeProfile;
