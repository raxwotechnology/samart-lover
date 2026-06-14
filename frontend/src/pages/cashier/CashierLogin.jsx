import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { loginUser } from '../../services/api';
import useAuthStore from '../../store/authStore';
import useSettingsStore from '../../store/settingsStore';
import { toast } from 'react-toastify';

const CashierLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const settings = useSettingsStore((s) => s.settings);
  const brandName = settings?.shopName || 'Smartlover';
  const brandLogoUrl = settings?.logoUrl;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await loginUser({ email, password });

      if (data.role !== 'cashier') {
        setError('This login is for cashiers only. Please use the main login page.');
        setLoading(false);
        return;
      }

      login(data);
      toast.success(`Welcome, ${data.name}!`);
      navigate('/pos');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pos-login-page">
      <div className="pos-login-bg" />
      <div className="pos-login-container">
        {/* Left: Branding */}
        <div className="pos-login-branding">
          <div className="pos-login-brand-content">
            <div className="pos-login-logo">
              {brandLogoUrl ? <img src={brandLogoUrl} alt={brandName} className="w-12 h-12 rounded-xl object-cover" /> : <ShoppingCart size={40} />}
            </div>
            <h1>{brandName}</h1>
            <p className="pos-login-tagline">Fashion & Beauty POS</p>
            <div className="pos-login-features">
              <div className="pos-login-feature">
                <span className="pos-feature-icon">⚡</span>
                <span>Fast Checkout</span>
              </div>
              <div className="pos-login-feature">
                <span className="pos-feature-icon">📦</span>
                <span>Real-time Inventory</span>
              </div>
              <div className="pos-login-feature">
                <span className="pos-feature-icon">🧾</span>
                <span>Digital Receipts</span>
              </div>
              <div className="pos-login-feature">
                <span className="pos-feature-icon">📱</span>
                <span>Barcode Scanning</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Login Form */}
        <div className="pos-login-form-section">
          <form onSubmit={handleSubmit} className="pos-login-form">
            <div className="pos-login-form-header">
              <h2>Cashier Sign In</h2>
              <p>Enter your credentials to access the POS terminal</p>
            </div>

            {error && (
              <div className="pos-login-error">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="pos-form-group">
              <label htmlFor="pos-email">Email Address</label>
              <input
                id="pos-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cashier@store.com"
                required
                autoFocus
                className="pos-input"
              />
            </div>

            <div className="pos-form-group">
              <label htmlFor="pos-password">Password</label>
              <div className="pos-password-wrapper">
                <input
                  id="pos-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="pos-input"
                />
                <button
                  type="button"
                  className="pos-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="pos-login-btn"
            >
              {loading ? (
                <span className="pos-login-spinner" />
              ) : (
                'Sign In to POS'
              )}
            </button>

            <div className="pos-login-footer-link">
              <a href="/login">← Back to main login</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CashierLogin;
