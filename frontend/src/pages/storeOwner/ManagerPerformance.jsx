import { useState, useEffect } from 'react';
import { BarChart3, Clock, Target, Calendar, Award, Coffee, User } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { getEmployees, getEmployeePerformance } from '../../services/api';
import { toast } from 'react-toastify';
import { managerNavGroups as navItems } from './managerNavItems';

const ManagerPerformance = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingPerf, setLoadingPerf] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await getEmployees();
        setEmployees(data);
      } catch (err) {
        toast.error('Failed to load employees');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSelectEmployee = async (empId) => {
    setSelectedEmployee(empId);
    setLoadingPerf(true);
    try {
      const { data } = await getEmployeePerformance(empId);
      setPerformance(data);
    } catch (err) {
      toast.error('Failed to load performance data');
      setPerformance(null);
    } finally {
      setLoadingPerf(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="Manager Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-primary-green border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="Manager Dashboard">
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-dark-navy">📊 Employee Performance</h1>
          <p className="text-muted-text text-sm mt-1">Current month performance overview</p>
        </div>

        {/* Employee Selection */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          {employees.map(emp => (
            <button
              key={emp._id}
              onClick={() => handleSelectEmployee(emp._id)}
              className={`p-4 rounded-2xl border text-center transition-all ${
                selectedEmployee === emp._id
                  ? 'border-primary-green bg-emerald-50 shadow-md'
                  : 'border-card-border bg-white hover:border-emerald-200 hover:bg-emerald-50/50'
              }`}
            >
              <div className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold ${
                selectedEmployee === emp._id ? 'bg-primary-green' : 'bg-gray-300'
              }`}>
                {emp.name?.charAt(0)?.toUpperCase()}
              </div>
              <p className="text-sm font-semibold text-dark-navy truncate">{emp.name?.split(' ')[0]}</p>
              <p className="text-xs text-muted-text">{emp.role}</p>
            </button>
          ))}
        </div>

        {/* Performance Dashboard */}
        {loadingPerf && (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-4 border-primary-green border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loadingPerf && performance && (
          <div className="space-y-6">
            {/* Employee Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl font-bold backdrop-blur-sm">
                  {performance.employee?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{performance.employee?.name}</h2>
                  <p className="text-indigo-200">{performance.employee?.role} • {performance.employee?.email}</p>
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Attendance */}
              <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center"><Clock size={16} className="text-blue-600" /></div>
                  <span className="text-xs text-muted-text font-medium uppercase">Attendance</span>
                </div>
                <p className="text-3xl font-bold text-dark-navy">{performance.attendance.attendanceRate}%</p>
                <p className="text-xs text-muted-text mt-1">{performance.attendance.presentDays} / {performance.attendance.totalWorkDays} days</p>
                <div className="w-full h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${performance.attendance.attendanceRate}%` }} />
                </div>
              </div>

              {/* Avg Hours */}
              <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center"><BarChart3 size={16} className="text-emerald-600" /></div>
                  <span className="text-xs text-muted-text font-medium uppercase">Avg Hours</span>
                </div>
                <p className="text-3xl font-bold text-dark-navy">{performance.attendance.avgHours}</p>
                <p className="text-xs text-muted-text mt-1">hours per day</p>
              </div>

              {/* Breaks */}
              <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center"><Coffee size={16} className="text-amber-600" /></div>
                  <span className="text-xs text-muted-text font-medium uppercase">Breaks</span>
                </div>
                <p className="text-3xl font-bold text-dark-navy">{performance.breaks.avgBreakMinutes}</p>
                <p className="text-xs text-muted-text mt-1">avg min/day ({performance.breaks.breakCount} total)</p>
              </div>

              {/* Targets */}
              <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center"><Target size={16} className="text-purple-600" /></div>
                  <span className="text-xs text-muted-text font-medium uppercase">Targets</span>
                </div>
                <p className="text-3xl font-bold text-dark-navy">{performance.targets.completed}/{performance.targets.total}</p>
                <p className="text-xs text-muted-text mt-1">met this month</p>
                {performance.targets.totalBonusEarned > 0 && (
                  <p className="text-xs text-emerald-600 font-semibold mt-1">🎁 Rs. {performance.targets.totalBonusEarned.toLocaleString()} bonus</p>
                )}
              </div>
            </div>

            {/* Leaves Summary */}
            <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={18} className="text-primary-green" />
                <h3 className="font-semibold text-dark-navy">Leave Summary (This Month)</h3>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-2xl font-bold text-dark-navy">{performance.leaves.total}</p>
                  <p className="text-xs text-muted-text">Total Requests</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl">
                  <p className="text-2xl font-bold text-emerald-600">{performance.leaves.approved}</p>
                  <p className="text-xs text-muted-text">Approved</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl">
                  <p className="text-2xl font-bold text-amber-600">{performance.leaves.pending}</p>
                  <p className="text-xs text-muted-text">Pending</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {!selectedEmployee && !loadingPerf && (
          <div className="text-center py-16 text-muted-text">
            <User size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Select an employee to view performance</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ManagerPerformance;
