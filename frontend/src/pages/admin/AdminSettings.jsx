import { useState, useEffect, useRef } from 'react';
import { Settings, Save, Upload, Globe, Phone, Mail, MapPin, Palette, DollarSign, Gift, Shield, Store, UserCog } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { getSettings, updateSettings, uploadLogo } from '../../services/api';
import { toast } from 'react-toastify';
import { adminNavGroups as navItems } from './adminNavItems';
import useSettingsStore from '../../store/settingsStore';

const SettingsInputField = ({ label, value, onChange, type = 'text', placeholder = '', suffix = '' }) => (
  <div>
    <label className="text-xs font-medium text-muted-text block mb-1">{label}</label>
    <div className="relative">
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        className="w-full border border-card-border rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green"
        placeholder={placeholder}
      />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-text">{suffix}</span>}
    </div>
  </div>
);

const AdminSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('general');
  const fileRef = useRef(null);
  const setSettingsLocal = useSettingsStore((s) => s.setSettingsLocal);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await getSettings();
      setSettings(data);
      setSettingsLocal(data);
    } catch (err) { toast.error('Failed to load settings'); }
    finally { setLoading(false); }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSocialChange = (field, value) => {
    setSettings(prev => ({ ...prev, socialLinks: { ...prev.socialLinks, [field]: value } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await updateSettings(settings);
      setSettings(data);
      setSettingsLocal(data);
      toast.success('Settings saved successfully!');
    } catch (err) { toast.error('Failed to save settings'); }
    finally { setSaving(false); }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Reset file input so same file can be re-uploaded
    e.target.value = '';
    const formData = new FormData();
    formData.append('logo', file);
    try {
      const { data } = await uploadLogo(formData);
      // Backend returns relative path like /uploads/logo-xxx.png
      const logoPath = data.logoUrl || data.logo;
      const merged = { ...settings, logoUrl: logoPath, logo: logoPath };
      setSettings(merged);
      // Force-update the global store so DashboardLayout & Navbar reflect instantly
      setSettingsLocal(merged);
      toast.success('Logo uploaded successfully! ✅');
    } catch (err) {
      toast.error('Failed to upload logo: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) return <DashboardLayout navItems={navItems} title="Smartlover Admin Panel"><div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-primary-green border-t-transparent rounded-full animate-spin" /></div></DashboardLayout>;

  const tabs = [
    { key: 'general', label: 'General', icon: Globe },
    { key: 'contact', label: 'Contact', icon: Phone },
    { key: 'commerce', label: 'Commerce', icon: DollarSign },
    { key: 'loyalty', label: 'Loyalty', icon: Gift },
    { key: 'permissions', label: 'Permissions', icon: UserCog },
    { key: 'social', label: 'Social', icon: Palette },
    { key: 'advanced', label: 'Advanced', icon: Shield },
  ];

  return (
    <DashboardLayout navItems={navItems} title="Smartlover Admin Panel">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-dark-navy">⚙️ Brand Settings</h1>
            <p className="text-muted-text text-sm mt-1">Manage your fashion and beauty storefront configuration</p>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 bg-primary-green hover:bg-emerald-600 text-white font-medium px-6 py-2.5 rounded-xl transition-colors shadow-md disabled:opacity-50">
            <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors ${tab === t.key ? 'bg-primary-green text-white' : 'bg-gray-100 text-muted-text hover:bg-gray-200'}`}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {/* General */}
        {tab === 'general' && (
          <div className="space-y-6">
            {/* Logo */}
            <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
              <h2 className="font-semibold text-dark-navy mb-4">Shop Branding</h2>
              <div className="flex items-center gap-6 mb-6">
                <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-card-border flex items-center justify-center overflow-hidden bg-gray-50">
                  {(settings.logoUrl || settings.logo) ? (
                    <img src={settings.logoUrl || settings.logo} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Store size={32} className="text-gray-300" />
                  )}
                </div>
                <div>
                  <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
                    <Upload size={14} /> Upload Logo
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  <p className="text-xs text-muted-text mt-2">PNG, JPG, or SVG. Max 2MB.</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <SettingsInputField label="Shop Name" value={settings.shopName} onChange={(v) => handleChange('shopName', v)} placeholder="Smartlover" />
                <SettingsInputField label="Tagline" value={settings.tagline} onChange={(v) => handleChange('tagline', v)} placeholder="Where style meets skincare" />
              </div>
            </div>

            {/* Footer */}
            <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
              <h2 className="font-semibold text-dark-navy mb-4">Footer</h2>
              <SettingsInputField label="Footer Text" value={settings.footerText} onChange={(v) => handleChange('footerText', v)} placeholder="© 2026 Smartlover. All rights reserved." />
            </div>

            {/* Hero Products */}
            <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
              <h2 className="font-semibold text-dark-navy mb-2">🏠 Landing Page Hero Products</h2>
              <p className="text-xs text-muted-text mb-4">These appear as floating badges on the homepage hero section.</p>
              {[0, 1].map((idx) => {
                const products = settings.heroProducts || [];
                const prod = products[idx] || { name: '', price: '', emoji: '' };
                const updateHeroProduct = (field, value) => {
                  const updated = [...(settings.heroProducts || [{ name: '', price: '', emoji: '' }, { name: '', price: '', emoji: '' }])];
                  if (!updated[idx]) updated[idx] = { name: '', price: '', emoji: '' };
                  updated[idx] = { ...updated[idx], [field]: value };
                  handleChange('heroProducts', updated);
                };
                return (
                  <div key={idx} className="mb-4 p-4 rounded-xl border border-card-border bg-gray-50">
                    <p className="text-xs font-bold text-muted-text mb-3 uppercase">Product Badge {idx + 1}</p>
                    <div className="grid grid-cols-3 gap-3">
                      <SettingsInputField label="Name" value={prod.name} onChange={(v) => updateHeroProduct('name', v)} placeholder={idx === 0 ? 'Luxe Tote Bag' : 'Radiance Serum'} />
                      <SettingsInputField label="Price (LKR)" value={prod.price} onChange={(v) => updateHeroProduct('price', v)} type="number" placeholder="9500" />
                      <SettingsInputField label="Emoji" value={prod.emoji} onChange={(v) => updateHeroProduct('emoji', v)} placeholder={idx === 0 ? '👜' : '✨'} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Contact */}
        {tab === 'contact' && (
          <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
            <h2 className="font-semibold text-dark-navy mb-4 flex items-center gap-2"><Phone size={18} /> Contact Details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <SettingsInputField label="Email" value={settings.email} onChange={(v) => handleChange('email', v)} placeholder="hello@smartlover.lk" />
              <SettingsInputField label="Primary Phone" value={settings.phone} onChange={(v) => handleChange('phone', v)} placeholder="0765318012" />
              <SettingsInputField label="Secondary Phone" value={settings.phone2} onChange={(v) => handleChange('phone2', v)} placeholder="Optional" />
              <SettingsInputField label="Country" value={settings.country} onChange={(v) => handleChange('country', v)} placeholder="Sri Lanka" />
              <SettingsInputField label="City" value={settings.city} onChange={(v) => handleChange('city', v)} placeholder="Colombo" />
              <div className="sm:col-span-2">
                <SettingsInputField label="Full Address" value={settings.address} onChange={(v) => handleChange('address', v)} placeholder="411/1/B,Kandy RD,kadawatha" />
              </div>
            </div>
          </div>
        )}

        {/* Commerce */}
        {tab === 'commerce' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
              <h2 className="font-semibold text-dark-navy mb-4 flex items-center gap-2"><DollarSign size={18} /> Currency & Pricing</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                <SettingsInputField label="Default Currency" value={settings.currency} onChange={(v) => handleChange('currency', v)} />
                <SettingsInputField label="USD → LKR Rate" value={settings.exchangeRate} onChange={(v) => handleChange('exchangeRate', v)} type="number" suffix="LKR per USD" />
                <SettingsInputField label="Tax Rate" value={settings.taxRate} onChange={(v) => handleChange('taxRate', v)} type="number" suffix="e.g. 0.08 = 8%" />
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
              <h2 className="font-semibold text-dark-navy mb-4 flex items-center gap-2">🚚 Delivery</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <SettingsInputField label="Free Delivery Threshold" value={settings.deliveryFeeThreshold} onChange={(v) => handleChange('deliveryFeeThreshold', v)} type="number" suffix="Rs." />
                <SettingsInputField label="Delivery Fee" value={settings.deliveryFee} onChange={(v) => handleChange('deliveryFee', v)} type="number" suffix="Rs." />
              </div>
              <p className="text-xs text-muted-text mt-3">Orders above the threshold get free delivery. Otherwise delivery fee is charged.</p>
            </div>
          </div>
        )}

        {/* Loyalty */}
        {tab === 'loyalty' && (
          <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
            <h2 className="font-semibold text-dark-navy mb-4 flex items-center gap-2"><Gift size={18} /> Loyalty Points Configuration</h2>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <SettingsInputField label="Points Per Unit Spent" value={settings.loyaltyPointsPerUnit} onChange={(v) => handleChange('loyaltyPointsPerUnit', v)} type="number" suffix="Rs. per 1 point" />
              <SettingsInputField label="Point Redemption Value" value={settings.loyaltyPointValue} onChange={(v) => handleChange('loyaltyPointValue', v)} type="number" suffix="Rs. per point" />
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 text-sm text-emerald-800">
              <p className="font-medium mb-1">How it works:</p>
              <p className="text-xs">Customer earns 1 point for every Rs. {settings.loyaltyPointsPerUnit} spent.</p>
              <p className="text-xs">Each point is worth Rs. {settings.loyaltyPointValue} when redeemed.</p>
            </div>
          </div>
        )}

        {/* Permissions */}
        {tab === 'permissions' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
              <h2 className="font-semibold text-dark-navy mb-4 flex items-center gap-2"><UserCog size={18} /> Role Permissions</h2>
              <p className="text-xs text-muted-text mb-6">Control feature access for each role. Changes take effect immediately after saving.</p>

              {/* Cashier Permissions */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-dark-navy mb-3 flex items-center gap-2">
                  <span className="w-7 h-7 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center text-xs font-bold">C</span>
                  Cashier Permissions
                </h3>
                <div className="space-y-3 pl-9">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-dark-navy">Barcode Generation</p>
                      <p className="text-xs text-muted-text">Allow cashiers to generate and print barcodes</p>
                    </div>
                    <button onClick={() => handleChange('rolePermissions', {
                      ...settings.rolePermissions,
                      cashier: { ...settings.rolePermissions?.cashier, canGenerateBarcodes: !settings.rolePermissions?.cashier?.canGenerateBarcodes }
                    })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.rolePermissions?.cashier?.canGenerateBarcodes !== false ? 'bg-rose-500' : 'bg-gray-300'}`}>
                      <div className={`w-4.5 h-4.5 bg-white rounded-full absolute top-[3px] transition-all shadow-md ${settings.rolePermissions?.cashier?.canGenerateBarcodes !== false ? 'right-[3px]' : 'left-[3px]'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-dark-navy">Return Access</p>
                      <p className="text-xs text-muted-text">Allow cashiers to process customer returns</p>
                    </div>
                    <button onClick={() => handleChange('rolePermissions', {
                      ...settings.rolePermissions,
                      cashier: { ...settings.rolePermissions?.cashier, canAccessReturns: !settings.rolePermissions?.cashier?.canAccessReturns }
                    })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.rolePermissions?.cashier?.canAccessReturns ? 'bg-rose-500' : 'bg-gray-300'}`}>
                      <div className={`w-4.5 h-4.5 bg-white rounded-full absolute top-[3px] transition-all shadow-md ${settings.rolePermissions?.cashier?.canAccessReturns ? 'right-[3px]' : 'left-[3px]'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-dark-navy">View Inventory</p>
                      <p className="text-xs text-muted-text">Allow cashiers to view stock levels</p>
                    </div>
                    <button onClick={() => handleChange('rolePermissions', {
                      ...settings.rolePermissions,
                      cashier: { ...settings.rolePermissions?.cashier, canViewInventory: !settings.rolePermissions?.cashier?.canViewInventory }
                    })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.rolePermissions?.cashier?.canViewInventory ? 'bg-rose-500' : 'bg-gray-300'}`}>
                      <div className={`w-4.5 h-4.5 bg-white rounded-full absolute top-[3px] transition-all shadow-md ${settings.rolePermissions?.cashier?.canViewInventory ? 'right-[3px]' : 'left-[3px]'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-dark-navy">Apply Discounts</p>
                      <p className="text-xs text-muted-text">Allow cashiers to apply manual discounts at POS</p>
                    </div>
                    <button onClick={() => handleChange('rolePermissions', {
                      ...settings.rolePermissions,
                      cashier: { ...settings.rolePermissions?.cashier, canApplyDiscounts: !(settings.rolePermissions?.cashier?.canApplyDiscounts !== false) }
                    })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.rolePermissions?.cashier?.canApplyDiscounts !== false ? 'bg-rose-500' : 'bg-gray-300'}`}>
                      <div className={`w-4.5 h-4.5 bg-white rounded-full absolute top-[3px] transition-all shadow-md ${settings.rolePermissions?.cashier?.canApplyDiscounts !== false ? 'right-[3px]' : 'left-[3px]'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-dark-navy">Sales Reports</p>
                      <p className="text-xs text-muted-text">Allow cashiers to view sales reports</p>
                    </div>
                    <button onClick={() => handleChange('rolePermissions', {
                      ...settings.rolePermissions,
                      cashier: { ...settings.rolePermissions?.cashier, canViewSalesReports: !settings.rolePermissions?.cashier?.canViewSalesReports }
                    })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.rolePermissions?.cashier?.canViewSalesReports ? 'bg-rose-500' : 'bg-gray-300'}`}>
                      <div className={`w-4.5 h-4.5 bg-white rounded-full absolute top-[3px] transition-all shadow-md ${settings.rolePermissions?.cashier?.canViewSalesReports ? 'right-[3px]' : 'left-[3px]'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Manager Permissions */}
              <div>
                <h3 className="text-sm font-bold text-dark-navy mb-3 flex items-center gap-2">
                  <span className="w-7 h-7 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-xs font-bold">M</span>
                  Manager Permissions
                </h3>
                <div className="space-y-3 pl-9">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-dark-navy">Barcode Generation</p>
                      <p className="text-xs text-muted-text">Allow managers to generate and print barcodes</p>
                    </div>
                    <button onClick={() => handleChange('rolePermissions', {
                      ...settings.rolePermissions,
                      manager: { ...settings.rolePermissions?.manager, canGenerateBarcodes: !settings.rolePermissions?.manager?.canGenerateBarcodes }
                    })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.rolePermissions?.manager?.canGenerateBarcodes !== false ? 'bg-rose-500' : 'bg-gray-300'}`}>
                      <div className={`w-4.5 h-4.5 bg-white rounded-full absolute top-[3px] transition-all shadow-md ${settings.rolePermissions?.manager?.canGenerateBarcodes !== false ? 'right-[3px]' : 'left-[3px]'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-dark-navy">Return Access</p>
                      <p className="text-xs text-muted-text">Allow managers to process customer returns</p>
                    </div>
                    <button onClick={() => handleChange('rolePermissions', {
                      ...settings.rolePermissions,
                      manager: { ...settings.rolePermissions?.manager, canAccessReturns: !settings.rolePermissions?.manager?.canAccessReturns }
                    })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.rolePermissions?.manager?.canAccessReturns !== false ? 'bg-rose-500' : 'bg-gray-300'}`}>
                      <div className={`w-4.5 h-4.5 bg-white rounded-full absolute top-[3px] transition-all shadow-md ${settings.rolePermissions?.manager?.canAccessReturns !== false ? 'right-[3px]' : 'left-[3px]'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-dark-navy">Payroll Management</p>
                      <p className="text-xs text-muted-text">Allow managers to process salary payments</p>
                    </div>
                    <button onClick={() => handleChange('rolePermissions', {
                      ...settings.rolePermissions,
                      manager: { ...settings.rolePermissions?.manager, canManagePayroll: !(settings.rolePermissions?.manager?.canManagePayroll !== false) }
                    })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.rolePermissions?.manager?.canManagePayroll !== false ? 'bg-rose-500' : 'bg-gray-300'}`}>
                      <div className={`w-4.5 h-4.5 bg-white rounded-full absolute top-[3px] transition-all shadow-md ${settings.rolePermissions?.manager?.canManagePayroll !== false ? 'right-[3px]' : 'left-[3px]'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-dark-navy">Supplier Payments</p>
                      <p className="text-xs text-muted-text">Allow managers to manage supplier payment ledger</p>
                    </div>
                    <button onClick={() => handleChange('rolePermissions', {
                      ...settings.rolePermissions,
                      manager: { ...settings.rolePermissions?.manager, canManageSupplierPayments: !(settings.rolePermissions?.manager?.canManageSupplierPayments !== false) }
                    })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.rolePermissions?.manager?.canManageSupplierPayments !== false ? 'bg-rose-500' : 'bg-gray-300'}`}>
                      <div className={`w-4.5 h-4.5 bg-white rounded-full absolute top-[3px] transition-all shadow-md ${settings.rolePermissions?.manager?.canManageSupplierPayments !== false ? 'right-[3px]' : 'left-[3px]'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-dark-navy">AI Predictions</p>
                      <p className="text-xs text-muted-text">Allow managers to view AI sales forecasts</p>
                    </div>
                    <button onClick={() => handleChange('rolePermissions', {
                      ...settings.rolePermissions,
                      manager: { ...settings.rolePermissions?.manager, canViewPredictions: !settings.rolePermissions?.manager?.canViewPredictions }
                    })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.rolePermissions?.manager?.canViewPredictions ? 'bg-rose-500' : 'bg-gray-300'}`}>
                      <div className={`w-4.5 h-4.5 bg-white rounded-full absolute top-[3px] transition-all shadow-md ${settings.rolePermissions?.manager?.canViewPredictions ? 'right-[3px]' : 'left-[3px]'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-dark-navy">Promotions</p>
                      <p className="text-xs text-muted-text">Allow managers to create and manage promotions</p>
                    </div>
                    <button onClick={() => handleChange('rolePermissions', {
                      ...settings.rolePermissions,
                      manager: { ...settings.rolePermissions?.manager, canManagePromotions: !(settings.rolePermissions?.manager?.canManagePromotions !== false) }
                    })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.rolePermissions?.manager?.canManagePromotions !== false ? 'bg-rose-500' : 'bg-gray-300'}`}>
                      <div className={`w-4.5 h-4.5 bg-white rounded-full absolute top-[3px] transition-all shadow-md ${settings.rolePermissions?.manager?.canManagePromotions !== false ? 'right-[3px]' : 'left-[3px]'}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-rose-50 rounded-xl p-4 text-sm text-rose-800">
              <p className="font-medium mb-1">⚠️ Note:</p>
              <p className="text-xs">Admin always has full access to all features. Permission changes apply to Cashier and Manager roles only.</p>
              <p className="text-xs mt-1">Remember to click <strong>Save Changes</strong> after modifying permissions.</p>
            </div>
          </div>
        )}

        {/* Social */}
        {tab === 'social' && (
          <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
            <h2 className="font-semibold text-dark-navy mb-4 flex items-center gap-2"><Palette size={18} /> Social Media Links</h2>
            <div className="space-y-4">
              <SettingsInputField label="Facebook URL" value={settings.socialLinks?.facebook} onChange={(v) => handleSocialChange('facebook', v)} placeholder="https://facebook.com/smartlovercorner" />
              <SettingsInputField label="Instagram URL" value={settings.socialLinks?.instagram} onChange={(v) => handleSocialChange('instagram', v)} placeholder="https://instagram.com/smartlovercorner" />
              <SettingsInputField label="Twitter URL" value={settings.socialLinks?.twitter} onChange={(v) => handleSocialChange('twitter', v)} placeholder="https://x.com/smartlover" />
            </div>
          </div>
        )}

        {/* Advanced */}
        {tab === 'advanced' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
              <h2 className="font-semibold text-dark-navy mb-4 flex items-center gap-2"><Shield size={18} /> Maintenance Mode</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-dark-navy">Enable Maintenance Mode</p>
                  <p className="text-xs text-muted-text">When enabled, customers will see a maintenance page</p>
                </div>
                <button onClick={() => handleChange('maintenanceMode', !settings.maintenanceMode)}
                  className={`w-14 h-7 rounded-full transition-colors relative ${settings.maintenanceMode ? 'bg-red-500' : 'bg-gray-300'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-md ${settings.maintenanceMode ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
              {settings.maintenanceMode && (
                <div className="mt-3 bg-red-50 rounded-xl p-3 text-xs text-red-600 font-medium">⚠️ Maintenance mode is ON. Customers cannot access the site.</div>
              )}
            </div>

            {/* Config Summary */}
            <div className="bg-gray-50 rounded-2xl border border-card-border p-6">
              <h2 className="font-semibold text-dark-navy mb-3">Current Configuration</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {[
                  { l: 'Currency', v: settings.currency },
                  { l: 'Exchange Rate', v: `1 USD = ${settings.exchangeRate} LKR` },
                  { l: 'Tax Rate', v: `${(settings.taxRate * 100).toFixed(0)}%` },
                  { l: 'Delivery Fee', v: `Rs. ${settings.deliveryFee}` },
                  { l: 'Free Delivery Above', v: `Rs. ${settings.deliveryFeeThreshold}` },
                  { l: 'Points per Rs.', v: `${settings.loyaltyPointsPerUnit}` },
                  { l: 'Point Value', v: `Rs. ${settings.loyaltyPointValue}` },
                  { l: 'Maintenance', v: settings.maintenanceMode ? '🔴 ON' : '🟢 OFF' },
                ].map(c => (
                  <div key={c.l} className="bg-white rounded-xl p-3 shadow-sm">
                    <p className="text-muted-text">{c.l}</p>
                    <p className="font-semibold text-dark-navy mt-1">{c.v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminSettings;
