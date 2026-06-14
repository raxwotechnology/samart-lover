import { useState, useEffect } from 'react';
import { User, MapPin, Phone, Mail, Save, Plus, Trash2, Shield, Package } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { getMe, updateProfile } from '../../services/api';
import { toast } from 'react-toastify';
import useAuthStore from '../../store/authStore';
import { Link } from 'react-router-dom';

const navItems = [
  { path: '/profile', label: 'My Profile', icon: User },
  { path: '/orders', label: 'My Orders', icon: Package },
  { path: '/wishlist', label: 'Wishlist', icon: MapPin },
];

const Profile = () => {
  const { user, login } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    addresses: [],
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await getMe();
        setForm({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          password: '',
          addresses: data.addresses || [],
        });
      } catch (err) {
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddressChange = (index, field, value) => {
    const updated = [...form.addresses];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, addresses: updated });
  };

  const addAddress = () => {
    setForm({
      ...form,
      addresses: [...form.addresses, { street: '', city: '', state: '', zipCode: '', country: '', isDefault: false }],
    });
  };

  const removeAddress = (index) => {
    const updated = form.addresses.filter((_, i) => i !== index);
    setForm({ ...form, addresses: updated });
  };

  const setDefaultAddress = (index) => {
    const updated = form.addresses.map((addr, i) => ({ ...addr, isDefault: i === index }));
    setForm({ ...form, addresses: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name: form.name, email: form.email, phone: form.phone, addresses: form.addresses };
      if (form.password) payload.password = form.password;
      const { data } = await updateProfile(payload);
      login(data);
      toast.success('Profile updated successfully!');
      setForm((prev) => ({ ...prev, password: '' }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="My Account">
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-primary-green border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="My Account">
      <div className="max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-dark-navy">My Profile</h1>
          <p className="text-muted-text text-sm mt-1">Manage your account details and delivery addresses</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <User size={20} className="text-primary-green" />
              </div>
              <div>
                <h2 className="font-semibold text-dark-navy">Personal Information</h2>
                <p className="text-xs text-muted-text">Update your name, email, and phone</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-navy mb-1.5">Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="w-full border border-card-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-navy mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full border border-card-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-navy mb-1.5">Phone</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className="w-full border border-card-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-navy mb-1.5">New Password <span className="text-muted-text font-normal">(optional)</span></label>
                <div className="relative">
                  <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Leave blank to keep current"
                    className="w-full border border-card-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Addresses */}
          <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <MapPin size={20} className="text-blue-500" />
                </div>
                <div>
                  <h2 className="font-semibold text-dark-navy">Delivery Addresses</h2>
                  <p className="text-xs text-muted-text">Manage your saved addresses</p>
                </div>
              </div>
              <button
                type="button"
                onClick={addAddress}
                className="flex items-center gap-1.5 text-sm font-medium text-primary-green hover:text-emerald-700 transition-colors"
              >
                <Plus size={16} /> Add
              </button>
            </div>

            {form.addresses.length === 0 && (
              <div className="text-center py-8 text-muted-text text-sm">
                <MapPin size={32} className="mx-auto mb-2 text-gray-300" />
                No addresses saved yet. Click "Add" to add one.
              </div>
            )}

            <div className="space-y-4">
              {form.addresses.map((addr, i) => (
                <div key={i} className={`border rounded-xl p-4 transition-all ${addr.isDefault ? 'border-primary-green bg-emerald-50/50' : 'border-card-border'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <button
                      type="button"
                      onClick={() => setDefaultAddress(i)}
                      className={`text-xs font-semibold px-3 py-1 rounded-full transition-all ${
                        addr.isDefault ? 'bg-primary-green text-white' : 'bg-gray-100 text-muted-text hover:bg-gray-200'
                      }`}
                    >
                      {addr.isDefault ? '✓ Default' : 'Set as Default'}
                    </button>
                    <button type="button" onClick={() => removeAddress(i)} className="text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input placeholder="Street" value={addr.street || ''} onChange={(e) => handleAddressChange(i, 'street', e.target.value)} className="border border-card-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green" />
                    <input placeholder="City" value={addr.city || ''} onChange={(e) => handleAddressChange(i, 'city', e.target.value)} className="border border-card-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green" />
                    <input placeholder="State" value={addr.state || ''} onChange={(e) => handleAddressChange(i, 'state', e.target.value)} className="border border-card-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green" />
                    <input placeholder="Zip Code" value={addr.zipCode || ''} onChange={(e) => handleAddressChange(i, 'zipCode', e.target.value)} className="border border-card-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-primary-green text-white px-8 py-3 rounded-xl font-semibold hover:bg-emerald-600 shadow-lg shadow-emerald-200 transition-all disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
