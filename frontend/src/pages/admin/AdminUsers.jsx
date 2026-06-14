import { useState, useEffect } from 'react';
import { Trash2, Search, ToggleLeft, ToggleRight, ShieldAlert, Key, UserPlus, X, Save } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { getAdminUsers, updateUserRole, toggleUserStatus, deleteUser, createAdminUser, updateUserPermissions } from '../../services/api';
import { toast } from 'react-toastify';
import { adminNavGroups as navItems } from './adminNavItems';

const roleColors = {
  customer: 'bg-sky-100 text-sky-700',
  manager: 'bg-amber-100 text-amber-700',
  admin: 'bg-violet-100 text-violet-700',
  cashier: 'bg-teal-100 text-teal-700',
  deliveryGuy: 'bg-blue-100 text-blue-700',
  stockEmployee: 'bg-orange-100 text-orange-700',
  marketing: 'bg-rose-100 text-rose-700',
};

const defaultPermissions = {
  canAddProducts: true,
  canDeleteProducts: true,
  canEditPrices: true,
  canManageInventory: true,
  canViewFinancials: true,
  canManageEmployees: true,
};

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', email: '', password: '', phone: '', role: 'admin' });
  const [addingUser, setAddingUser] = useState(false);

  const [showPermModal, setShowPermModal] = useState(false);
  const [permUser, setPermUser] = useState(null);
  const [permToggles, setPermToggles] = useState(defaultPermissions);
  const [savingPerms, setSavingPerms] = useState(false);

  const fetchUsers = async () => {
    try {
      const { data } = await getAdminUsers();
      setUsers(data);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateUserRole(userId, { role: newRole });
      toast.success('Role updated');
      fetchUsers();
    } catch (err) {
      toast.error('Failed to update role');
    }
  };

  const handleToggleStatus = async (userId, userName, currentStatus) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} "${userName}"?`)) return;
    try {
      const { data } = await toggleUserStatus(userId);
      toast.success(data.message || `User ${action}d`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} user`);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Permanently delete this user? This cannot be undone.')) return;
    try {
      await deleteUser(userId);
      toast.success('User deleted');
      fetchUsers();
    } catch (err) {
      toast.error('Failed to delete user');
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newForm.name || !newForm.email || !newForm.password) {
      toast.error('Name, email, and password are required');
      return;
    }
    setAddingUser(true);
    try {
      await createAdminUser({
        ...newForm,
        permissions: defaultPermissions,
      });
      toast.success(`${newForm.role.toUpperCase()} registered successfully!`);
      setShowAddModal(false);
      setNewForm({ name: '', email: '', password: '', phone: '', role: 'admin' });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register user');
    } finally {
      setAddingUser(false);
    }
  };

  const openPermissionsModal = (user) => {
    setPermUser(user);
    setPermToggles({
      canAddProducts: user.permissions?.canAddProducts !== false,
      canDeleteProducts: user.permissions?.canDeleteProducts !== false,
      canEditPrices: user.permissions?.canEditPrices !== false,
      canManageInventory: user.permissions?.canManageInventory !== false,
      canViewFinancials: user.permissions?.canViewFinancials !== false,
      canManageEmployees: user.permissions?.canManageEmployees !== false,
    });
    setShowPermModal(true);
  };

  const handleSavePermissions = async () => {
    if (!permUser) return;
    setSavingPerms(true);
    try {
      await updateUserPermissions(permUser._id, { permissions: permToggles });
      toast.success(`Permissions updated for ${permUser.name}`);
      setShowPermModal(false);
      setPermUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update permissions');
    } finally {
      setSavingPerms(false);
    }
  };

  const filtered = users.filter((u) => {
    const matchesSearch = u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? u.isActive !== false : u.isActive === false);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const activeCount = users.filter((u) => u.isActive !== false).length;
  const inactiveCount = users.filter((u) => u.isActive === false).length;

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
            <h1 className="text-2xl font-bold text-dark-navy">User Management</h1>
            <p className="text-muted-text text-sm mt-1">
              {users.length} total · <span className="text-emerald-600">{activeCount} active</span> · <span className="text-red-500">{inactiveCount} deactivated</span>
            </p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-primary-green text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-600 text-sm shadow-md">
            <UserPlus size={18} /> Register Admin/Staff
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-card-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green bg-white"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green bg-white"
          >
            <option value="all">All Roles</option>
            <option value="customer">Customer</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
            <option value="cashier">Cashier</option>
            <option value="deliveryGuy">Delivery</option>
            <option value="stockEmployee">Stock Employee</option>
            <option value="marketing">Marketing Agent</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green bg-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Deactivated</option>
          </select>
        </div>

        <div className="bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium text-muted-text">User</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Email</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Phone</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Role</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Status</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-text">Joined</th>
                  <th className="text-right px-6 py-3 font-medium text-muted-text">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {filtered.map((user) => (
                  <tr key={user._id} className={`hover:bg-gray-50 transition-colors ${user.isActive === false ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm ${user.isActive === false ? 'bg-gray-400' : 'bg-gradient-to-br from-emerald-400 to-teal-500'}`}>
                          {user.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <span className="font-medium text-dark-navy">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-muted-text">{user.email}</td>
                    <td className="px-6 py-3.5 text-muted-text">{user.phone || '—'}</td>
                    <td className="px-6 py-3.5">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user._id, e.target.value)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border-0 appearance-none cursor-pointer ${roleColors[user.role] || 'bg-gray-100 text-gray-700'} focus:outline-none focus:ring-2 focus:ring-primary-green`}
                      >
                        <option value="customer">Customer</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                        <option value="cashier">Cashier</option>
                        <option value="deliveryGuy">Delivery Guy</option>
                        <option value="stockEmployee">Stock Employee</option>
                        <option value="marketing">Marketing Agent</option>
                      </select>
                    </td>
                    <td className="px-6 py-3.5">
                      <button
                        onClick={() => handleToggleStatus(user._id, user.name, user.isActive !== false)}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                          user.isActive !== false
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                        title={user.isActive !== false ? 'Click to deactivate' : 'Click to activate'}
                      >
                        {user.isActive !== false ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        {user.isActive !== false ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-3.5 text-muted-text">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {(user.role === 'admin' || user.role === 'manager' || user.role === 'cashier') && (
                          <button
                            onClick={() => openPermissionsModal(user)}
                            className="p-2 rounded-lg hover:bg-violet-50 text-violet-500 hover:text-violet-700 transition-colors"
                            title="Manage Permissions"
                          >
                            <Key size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(user._id)}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                          title="Delete user permanently"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-text text-sm">No users found</div>
            )}
          </div>
        </div>

        {/* Add User Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-card-border flex items-center justify-between">
                <h2 className="text-lg font-bold text-dark-navy flex items-center gap-2">
                  <UserPlus className="text-primary-green" size={20} /> Register Admin/Staff
                </h2>
                <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddUser} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-navy mb-1">Full Name *</label>
                  <input required value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} placeholder="Alex Smith" className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-navy mb-1">Email *</label>
                  <input required type="email" value={newForm.email} onChange={(e) => setNewForm({ ...newForm, email: e.target.value })} placeholder="alex@zage.com" className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-navy mb-1">Phone Number</label>
                  <input value={newForm.phone} onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })} placeholder="+94 7X XXX XXXX" className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-navy mb-1">Password *</label>
                  <input required type="password" value={newForm.password} onChange={(e) => setNewForm({ ...newForm, password: e.target.value })} placeholder="Min 6 characters" className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-navy mb-1">System Role *</label>
                  <select value={newForm.role} onChange={(e) => setNewForm({ ...newForm, role: e.target.value })} className="w-full border border-card-border rounded-xl py-2.5 px-4 text-sm bg-white">
                    <option value="admin">Administrator</option>
                    <option value="manager">Manager</option>
                    <option value="cashier">Cashier</option>
                    <option value="marketing">Marketing Agent</option>
                    <option value="stockEmployee">Stock Employee</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={addingUser} className="flex-1 bg-primary-green text-white py-2.5 rounded-xl font-semibold hover:bg-emerald-600 disabled:opacity-50 text-sm shadow-md">
                    {addingUser ? 'Registering...' : 'Register User'}
                  </button>
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 border border-card-border py-2.5 rounded-xl font-semibold text-muted-text hover:bg-gray-50 text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Permissions Modal */}
        {showPermModal && permUser && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowPermModal(false)}>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-card-border flex items-center justify-between">
                <h2 className="text-lg font-bold text-dark-navy flex items-center gap-2">
                  <ShieldAlert className="text-violet-600" size={20} /> Manage Permissions
                </h2>
                <button onClick={() => setShowPermModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-gray-50 p-3.5 rounded-xl">
                  <p className="text-xs text-muted-text">Configuring permissions for:</p>
                  <p className="font-bold text-dark-navy mt-0.5">{permUser.name} ({permUser.email})</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize mt-1 inline-block ${roleColors[permUser.role]}`}>{permUser.role}</span>
                </div>

                <div className="space-y-3.5">
                  {[
                    { key: 'canAddProducts', label: 'Add Products', desc: 'Can insert new products to inventory' },
                    { key: 'canDeleteProducts', label: 'Delete Products', desc: 'Can remove products from store catalog' },
                    { key: 'canEditPrices', label: 'Edit Prices', desc: 'Can change product cost, MRP and customer prices' },
                    { key: 'canManageInventory', label: 'Manage Inventory', desc: 'Can receive stock receipt (GRN) and handle supplier returns' },
                    { key: 'canViewFinancials', label: 'View Financials', desc: 'Can access profit reports and income/expense ledger' },
                    { key: 'canManageEmployees', label: 'Manage Employees', desc: 'Can register employee details and agreements' },
                  ].map((perm) => (
                    <div key={perm.key} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0 pb-2">
                      <div>
                        <p className="text-sm font-semibold text-dark-navy">{perm.label}</p>
                        <p className="text-xs text-muted-text mt-0.5">{perm.desc}</p>
                      </div>
                      <button
                        onClick={() => setPermToggles({ ...permToggles, [perm.key]: !permToggles[perm.key] })}
                        className="text-violet-600 hover:text-violet-800 transition-colors"
                      >
                        {permToggles[perm.key] ? <ToggleRight size={38} className="text-emerald-500" /> : <ToggleLeft size={38} className="text-gray-300" />}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-4 border-t border-card-border">
                  <button onClick={handleSavePermissions} disabled={savingPerms} className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl font-semibold disabled:opacity-50 text-sm shadow-md transition-colors">
                    <Save size={16} /> {savingPerms ? 'Saving...' : 'Save Permissions'}
                  </button>
                  <button onClick={() => setShowPermModal(false)} className="flex-1 border border-card-border py-2.5 rounded-xl font-semibold text-muted-text hover:bg-gray-50 text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminUsers;
