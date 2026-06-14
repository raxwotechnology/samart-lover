import { useState, useEffect } from 'react';
import { Gift, Trophy, Star, ArrowUpCircle, ArrowDownCircle, Clock, Ticket } from 'lucide-react';
import { getMyLoyaltyPoints, getLoyaltyHistory, getAvailableVouchers, redeemPoints, claimVoucher } from '../../services/api';
import { toast } from 'react-toastify';

const CustomerLoyalty = () => {
  const [points, setPoints] = useState(0);
  const [history, setHistory] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redeemAmount, setRedeemAmount] = useState('');
  const [tab, setTab] = useState('overview');
  const [claimingCode, setClaimingCode] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [ptsRes, histRes, vchRes] = await Promise.all([getMyLoyaltyPoints(), getLoyaltyHistory(), getAvailableVouchers()]);
      setPoints(ptsRes.data.points);
      setHistory(histRes.data);
      setVouchers(vchRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleRedeem = async () => {
    const pts = parseInt(redeemAmount);
    if (!pts || pts < 10) return toast.error('Minimum 10 points');
    if (pts > points) return toast.error('Insufficient points');
    try {
      const { data } = await redeemPoints({ points: pts });
      toast.success(`Redeemed! Rs.${data.discount} discount earned`);
      setRedeemAmount('');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Redeem failed'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-primary-green border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-dark-navy mb-2">🎁 Loyalty & Rewards</h1>
      <p className="text-muted-text text-sm mb-8">Earn points on every purchase and redeem for discounts</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-6 text-white shadow-xl shadow-amber-200">
          <div className="flex items-center gap-3 mb-3"><div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center"><Trophy size={24} /></div>
            <div><p className="text-amber-100 text-xs">Your Points</p><p className="text-3xl font-bold">{points.toLocaleString()}</p></div></div>
          <p className="text-xs text-amber-100">= Rs. {points.toLocaleString()} discount value</p>
        </div>
        <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
          <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center"><Star size={24} className="text-emerald-600" /></div>
            <div><p className="text-muted-text text-xs">Total Earned</p><p className="text-2xl font-bold text-dark-navy">{history.filter(h => h.type === 'earned').reduce((s, h) => s + h.points, 0)}</p></div></div>
        </div>
        <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
          <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center"><Gift size={24} className="text-violet-600" /></div>
            <div><p className="text-muted-text text-xs">Redeemed</p><p className="text-2xl font-bold text-dark-navy">{Math.abs(history.filter(h => h.type === 'redeemed').reduce((s, h) => s + h.points, 0))}</p></div></div>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {['overview', 'history', 'vouchers'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${tab === t ? 'bg-primary-green text-white' : 'bg-gray-100 text-muted-text hover:bg-gray-200'}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
            <h2 className="font-semibold text-dark-navy mb-4">💰 Redeem Points</h2>
            <p className="text-sm text-muted-text mb-4">1 point = Rs. 1 discount. Minimum 10 points.</p>
            <div className="flex gap-3">
              <input type="number" value={redeemAmount} onChange={(e) => setRedeemAmount(e.target.value)} placeholder="Enter points" className="flex-1 border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green" />
              <button onClick={handleRedeem} className="bg-amber-500 hover:bg-amber-600 text-white font-medium px-6 py-2.5 rounded-xl transition-colors text-sm">Redeem</button>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
            <h2 className="font-semibold text-dark-navy mb-4">📋 How It Works</h2>
            <div className="space-y-3 text-sm text-muted-text">
              <p>✅ Earn <strong>1 point per Rs. 100</strong> spent</p>
              <p>✅ Redeem points for instant discounts</p>
              <p>✅ Use voucher codes for extra savings</p>
              <p>✅ Points <strong>never expire</strong>!</p>
            </div>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden">
          {history.length === 0 ? <div className="text-center py-12 text-muted-text"><Clock size={40} className="mx-auto mb-3 text-gray-300" /><p>No transactions yet</p></div> : (
            <div className="divide-y divide-card-border">
              {history.map(tx => (
                <div key={tx._id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${tx.points > 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                      {tx.points > 0 ? <ArrowUpCircle size={18} className="text-emerald-600" /> : <ArrowDownCircle size={18} className="text-red-500" />}
                    </div>
                    <div><p className="text-sm font-medium text-dark-navy">{tx.description}</p><p className="text-xs text-muted-text">{new Date(tx.createdAt).toLocaleString()}</p></div>
                  </div>
                  <p className={`font-bold text-sm ${tx.points > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{tx.points > 0 ? '+' : ''}{tx.points} pts</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'vouchers' && (
        <div className="grid gap-4">
          {vouchers.length === 0 ? <div className="bg-white rounded-2xl border border-card-border p-12 text-center text-muted-text"><Ticket size={40} className="mx-auto mb-3 text-gray-300" /><p>No vouchers available</p></div> : vouchers.map(v => (
            <div key={v._id} className="bg-white rounded-2xl border border-card-border border-l-4 border-l-violet-500 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center"><Ticket size={22} className="text-white" /></div>
                <div><p className="font-mono font-bold text-lg text-dark-navy">{v.code}</p><p className="text-xs text-muted-text">{v.description}</p></div>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-50 text-emerald-700 font-bold px-4 py-2 rounded-xl text-sm">{v.type === 'percentage' ? `${v.value}% OFF` : `Rs. ${v.value} OFF`}</span>
                <button
                  type="button"
                  disabled={claimingCode === v.code}
                  onClick={async () => {
                    try {
                      setClaimingCode(v.code);
                      await claimVoucher(v.code);
                      toast.success(`Voucher ${v.code} claimed`);
                      fetchData();
                    } catch (err) {
                      toast.error(err.response?.data?.message || 'Failed to claim voucher');
                    } finally {
                      setClaimingCode('');
                    }
                  }}
                  className="bg-violet-600 text-white font-semibold px-4 py-2 rounded-xl text-sm hover:bg-violet-700 disabled:opacity-60"
                >
                  {claimingCode === v.code ? 'Claiming...' : 'Claim'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerLoyalty;
