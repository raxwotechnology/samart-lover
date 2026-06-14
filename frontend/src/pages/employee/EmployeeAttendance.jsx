import { useState, useEffect } from 'react';
import { LayoutDashboard, User, Clock, Calendar, CreditCard, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import useAuthStore from '../../store/authStore';
import { getEmployeeNavGroups } from './employeeNav';
import API from '../../services/api';
import { toast } from 'react-toastify';

const statusColors = {
  present: 'bg-emerald-100 text-emerald-700',
  absent: 'bg-red-100 text-red-700',
  leave: 'bg-amber-100 text-amber-700',
  late: 'bg-orange-100 text-orange-700',
};

const EmployeeAttendance = () => {
  const { user } = useAuthStore();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [todayRecord, setTodayRecord] = useState(null);

  const fetchAttendance = async () => {
    try {
      const { data } = await API.get('/hr/attendance', { params: { month, year } });
      setRecords(data);
      const today = new Date().toDateString();
      setTodayRecord(data.find(a => new Date(a.date).toDateString() === today) || null);
    } catch (err) {
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAttendance(); }, [month, year]);

  const handleCheckIn = async () => {
    try {
      await API.post('/hr/attendance/check-in');
      toast.success('Checked in! ✅');
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    }
  };

  const handleCheckOut = async () => {
    try {
      await API.post('/hr/attendance/check-out');
      toast.success('Checked out! 👋');
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-out failed');
    }
  };

  const totalHours = records.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);
  const totalOvertime = records.reduce((sum, r) => sum + (r.overtime || 0), 0);
  const presentDays = records.filter(r => r.status === 'present').length;

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
        <h1 className="text-2xl font-bold text-dark-navy">⏰ My Attendance</h1>

        {/* Today's Status */}
        <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
          <h3 className="font-semibold text-dark-navy mb-3">Today's Status</h3>
          <div className="flex items-center gap-4 flex-wrap">
            {!todayRecord ? (
              <button onClick={handleCheckIn}
                className="flex items-center gap-2 bg-primary-green hover:bg-emerald-600 text-white font-medium px-6 py-3 rounded-xl transition-colors shadow-md">
                <Clock size={18} /> Check In Now
              </button>
            ) : !todayRecord.checkOut ? (
              <>
                <span className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-1">
                  <CheckCircle size={14} /> Checked in at {new Date(todayRecord.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <ArrowRight size={16} className="text-gray-400" />
                <button onClick={handleCheckOut}
                  className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-medium px-6 py-2.5 rounded-xl transition-colors">
                  <XCircle size={16} /> Check Out
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-sm font-semibold">
                  In: {new Date(todayRecord.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <ArrowRight size={16} className="text-gray-400" />
                <span className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-sm font-semibold">
                  Out: {new Date(todayRecord.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-sm">
                  {todayRecord.hoursWorked?.toFixed(1)}h worked
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Monthly Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-card-border text-center">
            <p className="text-2xl font-bold text-dark-navy">{presentDays}</p>
            <p className="text-xs text-muted-text">Days Present</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-card-border text-center">
            <p className="text-2xl font-bold text-dark-navy">{totalHours.toFixed(1)}</p>
            <p className="text-xs text-muted-text">Total Hours</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-card-border text-center">
            <p className="text-2xl font-bold text-amber-600">{totalOvertime.toFixed(1)}</p>
            <p className="text-xs text-muted-text">Overtime Hours</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-card-border text-center">
            <p className="text-2xl font-bold text-dark-navy">{records.filter(r => r.status === 'leave').length}</p>
            <p className="text-xs text-muted-text">Leave Days</p>
          </div>
        </div>

        {/* Month Selector + History */}
        <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-dark-navy">Attendance History</h3>
            <div className="flex gap-2">
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
                className="border border-card-border rounded-lg px-3 py-2 text-sm bg-white">
                {[...Array(12)].map((_, i) => (
                  <option key={i} value={i + 1}>{new Date(0, i).toLocaleString('en', { month: 'long' })}</option>
                ))}
              </select>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))}
                className="border border-card-border rounded-lg px-3 py-2 text-sm bg-white">
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {records.length === 0 ? (
            <p className="text-center text-muted-text py-8">No attendance records for this month</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-card-border text-muted-text text-xs">
                    <th className="text-left py-2 px-3">Date</th>
                    <th className="text-left py-2 px-3">Check In</th>
                    <th className="text-left py-2 px-3">Check Out</th>
                    <th className="text-left py-2 px-3">Hours</th>
                    <th className="text-left py-2 px-3">Overtime</th>
                    <th className="text-left py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r._id} className="border-b border-card-border/50 hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-medium">{new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                      <td className="py-2.5 px-3">{r.checkIn ? new Date(r.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td className="py-2.5 px-3">{r.checkOut ? new Date(r.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td className="py-2.5 px-3">{r.hoursWorked?.toFixed(1) || '—'}</td>
                      <td className="py-2.5 px-3 text-amber-600">{r.overtime ? `+${r.overtime.toFixed(1)}h` : '—'}</td>
                      <td className="py-2.5 px-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[r.status] || 'bg-gray-100 text-gray-600'}`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EmployeeAttendance;
