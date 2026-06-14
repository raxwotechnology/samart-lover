import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import useAuthStore from '../store/authStore';
import useSettingsStore from '../store/settingsStore';
import { requestRegistrationOtp, verifyRegistrationOtp } from '../services/api';
import { toast } from 'react-toastify';

// Sri Lankan phone validation
const SL_PHONE_REGEX = /^(?:\+94|0)?[0-9]{9}$/;
const isValidSLPhone = (phone) => {
  if (!phone) return true; // optional field
  return SL_PHONE_REGEX.test(phone.replace(/[\s\-()]/g, ''));
};

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const login = useAuthStore((state) => state.login);
  const settings = useSettingsStore((s) => s.settings);
  const brandName = settings?.shopName || 'Smartlover';
  const brandLogoUrl = settings?.logoUrl;
  const navigate = useNavigate();

  const handlePhoneChange = (value) => {
    setPhone(value);
    if (value && !isValidSLPhone(value)) {
      setPhoneError('Enter a valid Sri Lankan number (e.g., 0771234567 or +94771234567)');
    } else {
      setPhoneError('');
    }
  };

  const requestOtpHandler = async (e) => {
    e?.preventDefault?.();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (!phone) {
      toast.error('Phone number is required for OTP verification');
      return;
    }
    if (phone && !isValidSLPhone(phone)) {
      toast.error('Please enter a valid Sri Lankan phone number');
      return;
    }
    setLoading(true);
    try {
      await requestRegistrationOtp({ name, email, password, phone });
      setOtpRequested(true);
      toast.success('OTP sent to your phone');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtpHandler = async (e) => {
    e?.preventDefault?.();
    if (!otp || otp.trim().length !== 6) {
      toast.error('Enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const { data } = await verifyRegistrationOtp({ email, otp: otp.trim() });
      login(data);
      toast.success('Account created successfully!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-stone-100 py-12">
      <motion.div
        className="bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-card-border w-full max-w-md mx-4"
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold text-primary-green inline-flex items-center gap-2 mb-4">
            {brandLogoUrl && <img src={brandLogoUrl} alt={brandName} className="w-9 h-9 rounded object-cover" />}
            <span>{brandName}</span>
          </Link>
          <h1 className="text-2xl font-bold text-dark-navy mt-0 mb-2">Create Account</h1>
          <p className="text-muted-text m-0">Join {brandName} for curated style and beauty essentials</p>
        </div>

        <form onSubmit={otpRequested ? verifyOtpHandler : requestOtpHandler} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-navy mb-1.5" htmlFor="reg-name">
              Full Name
            </label>
            <input
              type="text"
              id="reg-name"
              className="w-full border border-card-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-green focus:border-transparent outline-none transition-all"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-navy mb-1.5" htmlFor="reg-email">
              Email Address
            </label>
            <input
              type="email"
              id="reg-email"
              className="w-full border border-card-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-green focus:border-transparent outline-none transition-all"
              placeholder="yourname@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-navy mb-1.5" htmlFor="reg-phone">
              Phone Number <span className="text-xs text-muted-text font-normal">(Sri Lankan)</span>
            </label>
            <input
              type="tel"
              id="reg-phone"
              className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:border-transparent outline-none transition-all ${
                phoneError ? 'border-red-400 focus:ring-red-300' : 'border-card-border focus:ring-primary-green'
              }`}
              placeholder="0771234567 or +94771234567"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
            />
            {phoneError && (
              <p className="text-xs text-red-500 mt-1">{phoneError}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-navy mb-1.5" htmlFor="reg-password">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="reg-password"
                className="w-full border border-card-border rounded-xl px-4 py-3 pr-12 focus:ring-2 focus:ring-primary-green focus:border-transparent outline-none transition-all"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-text hover:text-dark-navy"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {otpRequested && (
            <>
              <div>
                <label className="block text-sm font-medium text-dark-navy mb-1.5" htmlFor="reg-otp">
                  OTP Code
                </label>
                <input
                  type="text"
                  id="reg-otp"
                  className="w-full border border-card-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-green focus:border-transparent outline-none transition-all"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                />
              </div>
              <button
                type="button"
                onClick={requestOtpHandler}
                disabled={loading}
                className="w-full border border-primary-green text-primary-green font-semibold py-3 rounded-xl hover:bg-rose-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Resend OTP
              </button>
            </>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-green text-white font-semibold py-3.5 rounded-xl hover:bg-fuchsia-700 transition-all shadow-lg shadow-rose-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (otpRequested ? 'Verifying OTP...' : 'Sending OTP...') : (otpRequested ? 'Verify OTP & Create Account' : 'Send OTP')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-text">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-green font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
