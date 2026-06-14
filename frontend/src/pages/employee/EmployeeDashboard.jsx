import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Calendar, CheckCircle, AlertCircle, TrendingUp, Coffee, Target, Award } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import useAuthStore from '../../store/authStore';
import { getEmployeeNavGroups } from './employeeNav';
import API from '../../services/api';
import { getActiveBreak, startBreak, endBreak, getMyTargets } from '../../services/api';
import { toast } from 'react-toastify';

const EmployeeDashboard = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({ attendanceCount: 0, leaveBalance: 14, lastSalary: null, todayCheckedIn: false });
  const [loading, setLoading] = useState(true);
  const [onBreak, setOnBreak] = useState(false);
  const [breakData, setBreakData] = useState(null);
  const [targets, setTargets] = useState([]);
  const [breakTimer, setBreakTimer] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const now = new Date();
        const [attendanceRes, leavesRes, salaryRes, breakRes, targetsRes] = await Promise.allSettled([
          API.get('/hr/attendance', { params: { month: now.getMonth() + 1, year: now.getFullYear() } }),
          API.get('/hr/leaves'),
          API.get(`/payroll/history/me`),
          getActiveBreak(),
          getMyTargets(),
        ]);

        const attendance = attendanceRes.status === 'fulfilled' ? attendanceRes.value.data : [];
        const leaves = leavesRes.status === 'fulfilled' ? leavesRes.value.data : [];
        const salary = salaryRes.status === 'fulfilled' ? salaryRes.value.data : [];
        const activeBreak = breakRes.status === 'fulfilled' ? breakRes.value.data : null;
        const myTargets = targetsRes.status === 'fulfilled' ? targetsRes.value.data : [];

        const today = new Date().toDateString();
        const todayRecord = attendance.find(a => new Date(a.date).toDateString() === today);
        const approvedLeaves = leaves.filter(l => l.status === 'approved');
        const usedDays = approvedLeaves.reduce((sum, l) => sum + (l.totalDays || 0), 0);

        setStats({
          attendanceCount: attendance.length,
          leaveBalance: Math.max(0, 14 - usedDays),
          usedLeaves: usedDays,
          pendingLeaves: leaves.filter(l => l.status === 'pending').length,
          lastSalary: salary.length > 0 ? salary[0] : null,
          todayCheckedIn: !!todayRecord,
          todayCheckedOut: !!(todayRecord?.checkOut),
        });

        if (activeBreak) {
          setOnBreak(true);
          setBreakData(activeBreak);
        }
        setTargets(myTargets);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Break timer
  useEffect(() => {
    let interval;
    if (onBreak && breakData?.breakStart) {
      interval = setInterval(() => {
        const elapsed = Math.round((Date.now() - new Date(breakData.breakStart).getTime()) / 1000);
        setBreakTimer(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [onBreak, breakData]);

  const handleCheckIn = async () => {
    try {
      await API.post('/hr/attendance/check-in');
      toast.success('Checked in successfully! ✅');
      setStats(s => ({ ...s, todayCheckedIn: true }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    }
  };

  const handleCheckOut = async () => {
    try {
      await API.post('/hr/attendance/check-out');
      toast.success('Checked out! Have a good day 👋');
      setStats(s => ({ ...s, todayCheckedOut: true }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-out failed');
    }
  };

  const handleStartBreak = async (type) => {
    try {
      const { data } = await startBreak({ type });
      setOnBreak(true);
      setBreakData(data);
      toast.success(`${type === 'lunch' ? '🍽️ Lunch' : '☕ Short'} break started`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start break');
    }
  };

  const handleEndBreak = async () => {
    try {
      const { data } = await endBreak();
      setOnBreak(false);
      setBreakData(null);
      setBreakTimer(0);
      toast.success(`Break ended (${data.duration} min)`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to end break');
    }
  };

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const roleLabel = user?.role === 'deliveryGuy' ? 'Delivery Rider' : user?.role === 'cashier' ? 'Cashier' : user?.role === 'stockEmployee' ? 'Stock Employee' : user?.role;

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
        {/* Welcome Card */}
        <div className="bg-gradient-to-r from-rose-500 to-fuchsia-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Welcome, {user?.name?.split(' ')[0]}! 👋</h1>
              <p className="text-rose-100 mt-1">{roleLabel} • {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl font-bold backdrop-blur-sm">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
          </div>

          {/* Quick Check-in/out + Break */}
          <div className="mt-4 flex flex-wrap gap-3">
            {!stats.todayCheckedIn ? (
              <button onClick={handleCheckIn} className="bg-white text-rose-600 font-semibold px-6 py-2.5 rounded-xl hover:bg-rose-50 transition-colors shadow-md flex items-center gap-2">
                <Clock size={16} /> Check In
              </button>
            ) : !stats.todayCheckedOut ? (
              <>
                <button onClick={handleCheckOut} className="bg-white/20 text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-white/30 transition-colors backdrop-blur-sm flex items-center gap-2 border border-white/30">
                  <CheckCircle size={16} /> Check Out
                </button>
                {!onBreak ? (
                  <>
                    <button onClick={() => handleStartBreak('short')} className="bg-amber-400/90 text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-amber-500 transition-colors flex items-center gap-2 text-sm">
                      <Coffee size={14} /> Short Break
                    </button>
                    <button onClick={() => handleStartBreak('lunch')} className="bg-orange-400/90 text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-orange-500 transition-colors flex items-center gap-2 text-sm">
                      🍽️ Lunch Break
                    </button>
                  </>
                ) : (
                  <button onClick={handleEndBreak} className="bg-red-400 text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-red-500 transition-colors flex items-center gap-2 animate-pulse">
                    <Coffee size={16} /> End Break • {formatTimer(breakTimer)}
                  </button>
                )}
              </>
            ) : (
              <span className="bg-white/20 text-white px-4 py-2.5 rounded-xl backdrop-blur-sm flex items-center gap-2 border border-white/30">
                <CheckCircle size={16} /> Shift Complete ✅
              </span>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-card-border shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-text font-medium uppercase tracking-wide">This Month</span>
              <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center"><Clock size={16} className="text-blue-600" /></div>
            </div>
            <p className="text-2xl font-bold text-dark-navy">{stats.attendanceCount}</p>
            <p className="text-xs text-muted-text">Days Worked</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-card-border shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-text font-medium uppercase tracking-wide">Leave Balance</span>
              <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center"><Calendar size={16} className="text-amber-600" /></div>
            </div>
            <p className="text-2xl font-bold text-dark-navy">{stats.leaveBalance}</p>
            <p className="text-xs text-muted-text">Days remaining ({stats.usedLeaves || 0} used)</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-card-border shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-text font-medium uppercase tracking-wide">Pending</span>
              <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center"><AlertCircle size={16} className="text-orange-600" /></div>
            </div>
            <p className="text-2xl font-bold text-dark-navy">{stats.pendingLeaves || 0}</p>
            <p className="text-xs text-muted-text">Leave requests</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-card-border shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-text font-medium uppercase tracking-wide">Last Salary</span>
              <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center"><TrendingUp size={16} className="text-emerald-600" /></div>
            </div>
            <p className="text-2xl font-bold text-dark-navy">
              {stats.lastSalary ? `Rs. ${stats.lastSalary.netSalary?.toLocaleString()}` : '—'}
            </p>
            <p className="text-xs text-muted-text">
              {stats.lastSalary ? `${stats.lastSalary.month}/${stats.lastSalary.year}` : 'No records yet'}
            </p>
          </div>
        </div>

        {/* Targets Section */}
        {targets.length > 0 && (
          <div className="bg-white rounded-2xl border border-card-border shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target size={20} className="text-primary-green" />
              <h2 className="font-semibold text-dark-navy text-lg">My Targets</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {targets.map(t => {
                const progress = t.targetValue > 0 ? Math.min(100, Math.round((t.achievedValue / t.targetValue) * 100)) : 0;
                const isCompleted = t.status === 'completed';
                return (
                  <div key={t._id} className={`border rounded-xl p-4 ${isCompleted ? 'border-emerald-200 bg-emerald-50/50' : 'border-card-border'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-dark-navy capitalize flex items-center gap-2">
                        {isCompleted && <Award size={14} className="text-emerald-500" />}
                        {t.targetType.replace('_', ' ')}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {isCompleted ? 'Completed ✅' : 'In Progress'}
                      </span>
                    </div>
                    <div className="flex items-end gap-2 mb-2">
                      <span className="text-2xl font-bold text-dark-navy">{t.achievedValue}</span>
                      <span className="text-muted-text text-sm mb-0.5">/ {t.targetValue} {t.targetType === 'sales' ? 'Rs.' : ''}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }} />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-text">{progress}% complete</span>
                      {t.bonusAmount > 0 && (
                        <span className="text-xs font-semibold text-amber-600">
                          🎁 Bonus: Rs. {t.bonusAmount.toLocaleString()} {t.bonusPaid ? '(Paid)' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'My Profile', desc: 'View personal details', path: '/employee/profile', icon: '👤', color: 'bg-violet-50 hover:bg-violet-100' },
            { label: 'Attendance', desc: 'Check-in & history', path: '/employee/attendance', icon: '⏰', color: 'bg-blue-50 hover:bg-blue-100' },
            { label: 'Leave Requests', desc: 'Apply & track leaves', path: '/employee/leaves', icon: '📅', color: 'bg-amber-50 hover:bg-amber-100' },
            { label: 'Salary & EPF/ETF', desc: 'View pay & contributions', path: '/employee/salary', icon: '💰', color: 'bg-emerald-50 hover:bg-emerald-100' },
          ].map((item) => (
            <Link key={item.path} to={item.path} className={`${item.color} rounded-2xl p-5 border border-card-border transition-colors block`}>
              <span className="text-2xl">{item.icon}</span>
              <h3 className="font-semibold text-dark-navy mt-2">{item.label}</h3>
              <p className="text-xs text-muted-text mt-1">{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EmployeeDashboard;
