import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Award, FolderOpen } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { getFinancialDashboard, getProfitReport, getStores } from '../../services/api';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { toast } from 'react-toastify';
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { adminNavGroups as navItems } from './adminNavItems';

const PIE_COLORS = ['#d946a0', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#a855f7', '#64748b', '#e11d48', '#0ea5e9', '#d946ef'];

const getMarginPercent = (profit, revenue) => {
  if (!revenue) return '0%';
  return ((profit / revenue) * 100).toFixed(1) + '%';
};

const AdminFinancials = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('monthly'); // daily | monthly | yearly
  const [range, setRange] = useState({ startDate: '', endDate: '' });

  // Tab controls
  const [activeTab, setActiveTab] = useState('overview'); // overview | profit-report
  const [stores, setStores] = useState([]);
  const [profitReport, setProfitReport] = useState({ categories: [], brands: [] });
  const [loadingProfitReport, setLoadingProfitReport] = useState(false);
  const [profitFilter, setProfitFilter] = useState({
    storeId: '',
    startDate: '',
    endDate: '',
  });

  const fetchData = async () => {
    try {
      const params = {
        period,
        ...(range.startDate ? { startDate: range.startDate } : {}),
        ...(range.endDate ? { endDate: range.endDate } : {}),
      };
      const { data } = await getFinancialDashboard(params);
      setDashboard(data);
    } catch (err) {
      toast.error('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const loadStores = async () => {
    try {
      const { data } = await getStores();
      setStores(data || []);
    } catch (err) {
      console.warn('Failed to load stores:', err);
    }
  };

  const fetchProfitReport = async () => {
    setLoadingProfitReport(true);
    try {
      const params = {
        ...(profitFilter.storeId ? { storeId: profitFilter.storeId } : {}),
        ...(profitFilter.startDate ? { startDate: profitFilter.startDate } : {}),
        ...(profitFilter.endDate ? { endDate: profitFilter.endDate } : {}),
      };
      const { data } = await getProfitReport(params);
      setProfitReport(data || { categories: [], brands: [] });
    } catch (err) {
      toast.error('Failed to load profit report');
    } finally {
      setLoadingProfitReport(false);
    }
  };

  useEffect(() => {
    fetchData();
    loadStores();
  }, [period, range.startDate, range.endDate]);

  useEffect(() => {
    if (activeTab === 'profit-report') {
      fetchProfitReport();
    }
  }, [activeTab, profitFilter.storeId, profitFilter.startDate, profitFilter.endDate]);

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="Admin Panel">
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-primary-green border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const d = dashboard || {};
  const profitPositive = (d.netProfit || 0) >= 0;

  // Prepare pie chart data from expense categories
  const pieData = d.expenseByCategory
    ? Object.entries(d.expenseByCategory).map(([name, value], i) => ({ name, value, fill: PIE_COLORS[i % PIE_COLORS.length] }))
    : [];

  return (
    <DashboardLayout navItems={navItems} title="Financials & Profit Reports">
      <div>
        {/* Tab selection */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'overview', label: '📊 Financial Overview' },
            { id: 'profit-report', label: '🏆 Brand & Category Profit Reports' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${activeTab === tab.id ? 'bg-primary-green text-white shadow-md' : 'bg-white border border-card-border text-muted-text hover:bg-gray-50'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
              <div>
                <h1 className="text-2xl font-bold text-dark-navy">📊 Financial Overview</h1>
                <p className="text-muted-text text-sm mt-1">Revenue, expenses, and net profit</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <select value={period} onChange={(e) => setPeriod(e.target.value)} className="border border-card-border rounded-xl py-2.5 px-3 text-sm bg-white">
                  <option value="daily">Daily</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
                <input type="date" value={range.startDate} onChange={(e) => setRange((r) => ({ ...r, startDate: e.target.value }))} className="border border-card-border rounded-xl py-2.5 px-3 text-sm bg-white" />
                <input type="date" value={range.endDate} onChange={(e) => setRange((r) => ({ ...r, endDate: e.target.value }))} className="border border-card-border rounded-xl py-2.5 px-3 text-sm bg-white" />
                <button onClick={() => {
                  const monthlyExportCols = [
                    { label: 'Month', accessor: 'month' },
                    { label: 'Revenue (Rs.)', accessor: (r) => r.revenue?.toLocaleString() },
                    { label: 'Expenses (Rs.)', accessor: (r) => r.expenses?.toLocaleString() },
                    { label: 'Profit (Rs.)', accessor: (r) => r.profit?.toLocaleString() },
                  ];
                  exportToPDF(d.series || d.monthlyData || [], monthlyExportCols, 'Financial Report');
                }} className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">📄 PDF</button>
                <button onClick={() => {
                  const monthlyExportCols = [
                    { label: 'Month', accessor: 'month' },
                    { label: 'Revenue (Rs.)', accessor: (r) => r.revenue?.toLocaleString() },
                    { label: 'Expenses (Rs.)', accessor: (r) => r.expenses?.toLocaleString() },
                    { label: 'Profit (Rs.)', accessor: (r) => r.profit?.toLocaleString() },
                  ];
                  exportToExcel(d.series || d.monthlyData || [], monthlyExportCols, 'financial-report');
                }} className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">📊 Excel</button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center"><ArrowUpRight size={16} className="text-white" /></div>
                </div>
                <p className="text-2xl font-bold text-dark-navy">Rs. {(d.totalRevenue || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-text mt-1">Total Revenue</p>
              </div>
              <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center"><ArrowDownRight size={16} className="text-white" /></div>
                </div>
                <p className="text-2xl font-bold text-dark-navy">Rs. {(d.totalExpenses || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-text mt-1">Total Expenses</p>
              </div>
              <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center"><DollarSign size={16} className="text-white" /></div>
                </div>
                <p className="text-2xl font-bold text-dark-navy">Rs. {(d.totalAdditionalIncome || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-text mt-1">Other Income</p>
              </div>
              <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${profitPositive ? 'from-emerald-500 to-teal-600' : 'from-red-500 to-rose-600'} flex items-center justify-center`}>
                    {profitPositive ? <TrendingUp size={16} className="text-white" /> : <TrendingDown size={16} className="text-white" />}
                  </div>
                </div>
                <p className={`text-2xl font-bold ${profitPositive ? 'text-emerald-600' : 'text-red-600'}`}>Rs. {Math.abs(d.netProfit || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-text mt-1">Net {profitPositive ? 'Profit' : 'Loss'}</p>
              </div>
              <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
                <p className="text-xs text-muted-text">Pending Bills</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">Rs. {(d.pendingExpenses || 0).toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
                <p className="text-xs text-muted-text">Items Sold</p>
                <p className="text-2xl font-bold text-dark-navy mt-1">{(d.totalItemsSold || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
                <p className="text-xs text-muted-text">POS Revenue</p>
                <p className="text-2xl font-bold text-dark-navy mt-1">Rs. {(d.posRevenue || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
                <p className="text-xs text-muted-text">Online Revenue</p>
                <p className="text-2xl font-bold text-dark-navy mt-1">Rs. {(d.onlineRevenue || 0).toLocaleString()}</p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              {/* Monthly Trend */}
              <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
                <h2 className="font-semibold text-dark-navy mb-4">📈 Trend</h2>
                {(d.series || d.monthlyData) && (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={d.series || d.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v) => `Rs. ${v.toLocaleString()}`} />
                      <Legend />
                      <Bar dataKey="revenue" fill="#d946a0" name="Revenue" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="profit" fill="#3b82f6" name="Profit" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Expense Breakdown */}
              <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
                <h2 className="font-semibold text-dark-navy mb-4">🥧 Expense Breakdown</h2>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={95} paddingAngle={2} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                      <Tooltip formatter={(v) => `Rs. ${v.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-muted-text text-sm">No expense data</div>
                )}
              </div>
            </div>

            {/* Profit/Loss Trend Line */}
            {(d.series || d.monthlyData) && (
              <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm mb-8">
                <h2 className="font-semibold text-dark-navy mb-4">📉 Profit Trend</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={d.series || d.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => `Rs. ${v.toLocaleString()}`} />
                    <Line type="monotone" dataKey="profit" stroke="#d946a0" strokeWidth={3} dot={{ r: 4 }} name="Net Profit" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Detailed Breakdown Section */}
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              {/* Revenue Breakdown */}
              <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
                <h2 className="font-semibold text-dark-navy mb-4">💰 Revenue Sources</h2>
                <div className="space-y-3">
                  {[
                    { label: 'POS (In-Store) Sales', value: d.posRevenue || 0, pct: d.totalRevenue ? ((d.posRevenue || 0) / d.totalRevenue * 100).toFixed(1) : 0, color: '#d946a0' },
                    { label: 'Online Orders', value: d.onlineRevenue || 0, pct: d.totalRevenue ? ((d.onlineRevenue || 0) / d.totalRevenue * 100).toFixed(1) : 0, color: '#3b82f6' },
                    { label: 'Additional Income', value: d.totalAdditionalIncome || 0, pct: (d.totalRevenue + (d.totalAdditionalIncome || 0)) ? ((d.totalAdditionalIncome || 0) / (d.totalRevenue + (d.totalAdditionalIncome || 0)) * 100).toFixed(1) : 0, color: '#8b5cf6' },
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-text">{item.label}</span>
                        <span className="font-bold text-dark-navy">Rs. {item.value.toLocaleString()} <span className="text-xs text-muted-text">({item.pct}%)</span></span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(item.pct, 100)}%`, background: item.color }} />
                      </div>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-card-border flex justify-between font-bold text-dark-navy">
                    <span>Total Revenue + Income</span>
                    <span>Rs. {((d.totalRevenue || 0) + (d.totalAdditionalIncome || 0)).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Expense Category Breakdown */}
              <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
                <h2 className="font-semibold text-dark-navy mb-4">📋 Expense Categories</h2>
                {pieData.length > 0 ? (
                  <div className="space-y-2">
                    {pieData.sort((a, b) => b.value - a.value).map((cat, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: cat.fill }} />
                          <span className="text-sm text-dark-navy capitalize">{cat.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-dark-navy">Rs. {cat.value.toLocaleString()}</span>
                          <span className="text-xs text-muted-text ml-2">({(cat.value / (d.totalExpenses || 1) * 100).toFixed(1)}%)</span>
                        </div>
                      </div>
                    ))}
                    <div className="pt-3 border-t border-card-border flex justify-between font-bold text-dark-navy">
                      <span>Total Expenses</span>
                      <span>Rs. {(d.totalExpenses || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-text">Paid</span>
                      <span className="text-green-600 font-semibold">Rs. {(d.paidExpenses || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-text">Pending</span>
                      <span className="text-amber-600 font-semibold">Rs. {(d.pendingExpenses || 0).toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-text text-sm text-center py-8">No expense records found</p>
                )}
              </div>
            </div>

            {/* Summary Table */}
            <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm mb-8">
              <h2 className="font-semibold text-dark-navy mb-4">📊 Financial Summary</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-card-border">
                      <th className="text-left py-3 px-4 text-muted-text font-semibold text-xs uppercase">Category</th>
                      <th className="text-right py-3 px-4 text-muted-text font-semibold text-xs uppercase">Amount (Rs.)</th>
                      <th className="text-right py-3 px-4 text-muted-text font-semibold text-xs uppercase">% of Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-50">
                      <td className="py-3 px-4 font-medium text-dark-navy">💳 POS Sales Revenue</td>
                      <td className="py-3 px-4 text-right font-semibold">{(d.posRevenue || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-muted-text">{d.totalRevenue ? ((d.posRevenue || 0) / d.totalRevenue * 100).toFixed(1) : 0}%</td>
                    </tr>
                    <tr className="border-b border-gray-50">
                      <td className="py-3 px-4 font-medium text-dark-navy">🌐 Online Sales Revenue</td>
                      <td className="py-3 px-4 text-right font-semibold">{(d.onlineRevenue || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-muted-text">{d.totalRevenue ? ((d.onlineRevenue || 0) / d.totalRevenue * 100).toFixed(1) : 0}%</td>
                    </tr>
                    <tr className="border-b border-gray-50 bg-blue-50/30">
                      <td className="py-3 px-4 font-bold text-dark-navy">📈 Total Sales Revenue</td>
                      <td className="py-3 px-4 text-right font-bold text-blue-600">{(d.totalRevenue || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-semibold">100%</td>
                    </tr>
                    <tr className="border-b border-gray-50">
                      <td className="py-3 px-4 font-medium text-dark-navy">💎 Additional Income</td>
                      <td className="py-3 px-4 text-right font-semibold text-purple-600">+ {(d.totalAdditionalIncome || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-muted-text">—</td>
                    </tr>
                    <tr className="border-b border-gray-50">
                      <td className="py-3 px-4 font-medium text-dark-navy">📤 Total Expenses</td>
                      <td className="py-3 px-4 text-right font-semibold text-red-600">- {(d.totalExpenses || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-muted-text">—</td>
                    </tr>
                    <tr className={`${profitPositive ? 'bg-green-50/50' : 'bg-red-50/50'}`}>
                      <td className="py-3 px-4 font-bold text-dark-navy text-base">🏆 Net {profitPositive ? 'Profit' : 'Loss'}</td>
                      <td className={`py-3 px-4 text-right font-bold text-base ${profitPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {profitPositive ? '' : '- '}Rs. {Math.abs(d.netProfit || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-muted-text">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-text mt-3">📌 Net Profit = Total Revenue + Additional Income − Total Expenses</p>
            </div>

            {/* Key Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-2xl border border-card-border p-4 shadow-sm text-center">
                <p className="text-2xl font-bold text-dark-navy">{(d.orderCount || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-text mt-1">Total Orders</p>
              </div>
              <div className="bg-white rounded-2xl border border-card-border p-4 shadow-sm text-center">
                <p className="text-2xl font-bold text-dark-navy">{(d.totalItemsSold || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-text mt-1">Items Sold</p>
              </div>
              <div className="bg-white rounded-2xl border border-card-border p-4 shadow-sm text-center">
                <p className="text-2xl font-bold text-dark-navy">Rs. {d.orderCount ? Math.round((d.totalRevenue || 0) / d.orderCount).toLocaleString() : 0}</p>
                <p className="text-xs text-muted-text mt-1">Avg. Order Value</p>
              </div>
              <div className="bg-white rounded-2xl border border-card-border p-4 shadow-sm text-center">
                <p className="text-2xl font-bold text-dark-navy">{(d.expenseCount || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-text mt-1">Expense Records</p>
              </div>
            </div>
          </>
        )}

        {activeTab === 'profit-report' && (
          <div>
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3 bg-white p-4 rounded-2xl border border-card-border shadow-sm">
              <div className="flex flex-wrap gap-3 items-center">
                <div>
                  <label className="block text-[10px] font-bold text-muted-text uppercase mb-1">Branch</label>
                  <select value={profitFilter.storeId} onChange={(e) => setProfitFilter({...profitFilter, storeId: e.target.value})} className="border border-card-border rounded-xl py-2 px-3 text-xs bg-white h-9 focus:outline-none focus:ring-1 focus:ring-primary-green">
                    <option value="">All Branches</option>
                    {stores.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-text uppercase mb-1">Start Date</label>
                  <input type="date" value={profitFilter.startDate} onChange={(e) => setProfitFilter({...profitFilter, startDate: e.target.value})} className="border border-card-border rounded-xl py-1.5 px-3 text-xs bg-white h-9 focus:outline-none focus:ring-1 focus:ring-primary-green" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-text uppercase mb-1">End Date</label>
                  <input type="date" value={profitFilter.endDate} onChange={(e) => setProfitFilter({...profitFilter, endDate: e.target.value})} className="border border-card-border rounded-xl py-1.5 px-3 text-xs bg-white h-9 focus:outline-none focus:ring-1 focus:ring-primary-green" />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap self-end">
                <button
                  onClick={() => {
                    const cols = [
                      { label: 'Category', accessor: 'name' },
                      { label: 'Revenue (Rs.)', accessor: (r) => r.revenue?.toFixed(2) },
                      { label: 'Cost (Rs.)', accessor: (r) => r.cost?.toFixed(2) },
                      { label: 'Profit (Rs.)', accessor: (r) => r.profit?.toFixed(2) },
                      { label: 'Margin %', accessor: (r) => getMarginPercent(r.profit, r.revenue) }
                    ];
                    exportToCSV(profitReport.categories, cols, 'category-profit-report');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors shadow-sm"
                >
                  Export Categories (CSV)
                </button>
                <button
                  onClick={() => {
                    const cols = [
                      { label: 'Brand', accessor: 'name' },
                      { label: 'Revenue (Rs.)', accessor: (r) => r.revenue?.toFixed(2) },
                      { label: 'Cost (Rs.)', accessor: (r) => r.cost?.toFixed(2) },
                      { label: 'Profit (Rs.)', accessor: (r) => r.profit?.toFixed(2) },
                      { label: 'Margin %', accessor: (r) => getMarginPercent(r.profit, r.revenue) }
                    ];
                    exportToCSV(profitReport.brands, cols, 'brand-profit-report');
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors shadow-sm"
                >
                  Export Brands (CSV)
                </button>
              </div>
            </div>

            {loadingProfitReport ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-primary-green border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Category Profitability */}
                <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm flex flex-col">
                  <h2 className="font-semibold text-dark-navy text-base mb-4 flex items-center gap-1.5">
                    <FolderOpen className="text-primary-green" size={20} /> Category Profitability Report
                  </h2>
                  {profitReport.categories?.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={profitReport.categories}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v) => `Rs. ${v.toLocaleString()}`} />
                          <Legend />
                          <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="cost" fill="#f59e0b" name="Cost" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="profit" fill="#10b981" name="Profit" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>

                      <div className="overflow-x-auto mt-6">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="bg-gray-50 text-muted-text uppercase font-semibold">
                              <th className="px-4 py-2.5">Category</th>
                              <th className="px-4 py-2.5 text-right">Revenue</th>
                              <th className="px-4 py-2.5 text-right">Cost</th>
                              <th className="px-4 py-2.5 text-right">Profit</th>
                              <th className="px-4 py-2.5 text-right">Margin</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 font-medium">
                            {profitReport.categories.map((c, idx) => {
                              const margin = getMarginPercent(c.profit, c.revenue);
                              return (
                                <tr key={idx} className="hover:bg-gray-50/50">
                                  <td className="px-4 py-2.5 text-dark-navy font-bold">{c.name || 'Uncategorized'}</td>
                                  <td className="px-4 py-2.5 text-right">Rs. {c.revenue?.toLocaleString()}</td>
                                  <td className="px-4 py-2.5 text-right text-muted-text">Rs. {c.cost?.toLocaleString()}</td>
                                  <td className="px-4 py-2.5 text-right text-emerald-600 font-bold">Rs. {c.profit?.toLocaleString()}</td>
                                  <td className="px-4 py-2.5 text-right text-indigo-600 font-bold">{margin}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-[260px] text-muted-text text-sm italic">No category-wise profit data available</div>
                  )}
                </div>

                {/* Brand Profitability */}
                <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm flex flex-col">
                  <h2 className="font-semibold text-dark-navy text-base mb-4 flex items-center gap-1.5">
                    <Award className="text-primary-green" size={20} /> Brand Profitability Report
                  </h2>
                  {profitReport.brands?.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={profitReport.brands}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v) => `Rs. ${v.toLocaleString()}`} />
                          <Legend />
                          <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="cost" fill="#f59e0b" name="Cost" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="profit" fill="#10b981" name="Profit" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>

                      <div className="overflow-x-auto mt-6">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="bg-gray-50 text-muted-text uppercase font-semibold">
                              <th className="px-4 py-2.5">Brand</th>
                              <th className="px-4 py-2.5 text-right">Revenue</th>
                              <th className="px-4 py-2.5 text-right">Cost</th>
                              <th className="px-4 py-2.5 text-right">Profit</th>
                              <th className="px-4 py-2.5 text-right">Margin</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 font-medium">
                            {profitReport.brands.map((b, idx) => {
                              const margin = getMarginPercent(b.profit, b.revenue);
                              return (
                                <tr key={idx} className="hover:bg-gray-50/50">
                                  <td className="px-4 py-2.5 text-dark-navy font-bold">{b.name || 'No Brand'}</td>
                                  <td className="px-4 py-2.5 text-right">Rs. {b.revenue?.toLocaleString()}</td>
                                  <td className="px-4 py-2.5 text-right text-muted-text">Rs. {b.cost?.toLocaleString()}</td>
                                  <td className="px-4 py-2.5 text-right text-emerald-600 font-bold">Rs. {b.profit?.toLocaleString()}</td>
                                  <td className="px-4 py-2.5 text-right text-indigo-600 font-bold">{margin}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-[260px] text-muted-text text-sm italic">No brand-wise profit data available</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminFinancials;
