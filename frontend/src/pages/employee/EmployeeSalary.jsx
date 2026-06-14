import { useState, useEffect } from 'react';
import { LayoutDashboard, User, Clock, Calendar, CreditCard, TrendingUp, FileText, DollarSign } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import useAuthStore from '../../store/authStore';
import { getEmployeeNavGroups } from './employeeNav';
import API, { exportSalaryHistory } from '../../services/api';
import { toast } from 'react-toastify';

const EmployeeSalary = () => {
  const { user } = useAuthStore();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const downloadSalaryReport = async (format) => {
    try {
      const { data } = await exportSalaryHistory('me', { format });
      const blob = new Blob([data], {
        type: format === 'pdf'
          ? 'application/pdf'
          : format === 'xlsx'
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'text/csv',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `salary-report.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Salary report exported (${format.toUpperCase()})`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to export salary report');
    }
  };

  useEffect(() => {
    const fetchSalary = async () => {
      try {
        const { data } = await API.get('/payroll/history/me');
        setHistory(data);
        if (data.length > 0) setSelectedRecord(data[0]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSalary();
  }, []);

  const basicSalary = user?.employeeInfo?.salary || 0;
  const epfEmployee = Math.round(basicSalary * 0.08);
  const epfEmployer = Math.round(basicSalary * 0.12);
  const etfEmployer = Math.round(basicSalary * 0.03);

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
        <h1 className="text-2xl font-bold text-dark-navy">💰 Salary & EPF/ETF</h1>
        <div className="flex gap-2">
          <button onClick={() => downloadSalaryReport('pdf')} className="px-3 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white">Export PDF</button>
          <button onClick={() => downloadSalaryReport('xlsx')} className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white">Export Excel</button>
        </div>

        {/* Salary Overview Card */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-blue-200 text-sm">Basic Monthly Salary</p>
              <p className="text-3xl font-bold mt-1">Rs. {basicSalary.toLocaleString()}</p>
            </div>
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <DollarSign size={28} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/20">
            <div>
              <p className="text-blue-200 text-xs">Net Take-Home</p>
              <p className="text-xl font-bold">Rs. {(basicSalary - epfEmployee).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-blue-200 text-xs">Total EPF (You + Employer)</p>
              <p className="text-xl font-bold">Rs. {(epfEmployee + epfEmployer).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-blue-200 text-xs">ETF (Employer)</p>
              <p className="text-xl font-bold">Rs. {etfEmployer.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* EPF/ETF Breakdown */}
        <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
          <h3 className="font-semibold text-dark-navy mb-4 flex items-center gap-2"><FileText size={18} /> Monthly EPF/ETF Breakdown</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-card-border/50">
              <span className="text-sm text-dark-navy">Basic Salary</span>
              <span className="font-semibold text-dark-navy">Rs. {basicSalary.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-card-border/50">
              <div>
                <span className="text-sm text-red-600">EPF - Employee Contribution (8%)</span>
                <p className="text-xs text-muted-text">Deducted from your salary</p>
              </div>
              <span className="font-semibold text-red-600">- Rs. {epfEmployee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-card-border/50 bg-emerald-50/50 -mx-2 px-2 rounded">
              <div>
                <span className="text-sm text-emerald-700">EPF - Employer Contribution (12%)</span>
                <p className="text-xs text-muted-text">Paid by employer to your EPF account</p>
              </div>
              <span className="font-semibold text-emerald-600">+ Rs. {epfEmployer.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-card-border/50 bg-blue-50/50 -mx-2 px-2 rounded">
              <div>
                <span className="text-sm text-blue-700">ETF - Employer Contribution (3%)</span>
                <p className="text-xs text-muted-text">Paid by employer to your ETF account</p>
              </div>
              <span className="font-semibold text-blue-600">+ Rs. {etfEmployer.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-t-2 border-dark-navy/20 mt-2">
              <span className="font-bold text-dark-navy">Net Salary (Take-Home)</span>
              <span className="text-xl font-bold text-primary-green">Rs. {(basicSalary - epfEmployee).toLocaleString()}</span>
            </div>
          </div>

          {/* EPF/ETF Numbers */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-muted-text">EPF Number</p>
              <p className="font-semibold text-dark-navy">{user?.employeeInfo?.epfNo || 'Not assigned'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-muted-text">ETF Number</p>
              <p className="font-semibold text-dark-navy">{user?.employeeInfo?.etfNo || 'Not assigned'}</p>
            </div>
          </div>
        </div>

        {/* Payment History */}
        <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
          <h3 className="font-semibold text-dark-navy mb-4 flex items-center gap-2"><TrendingUp size={18} /> Payment History</h3>
          {history.length === 0 ? (
            <p className="text-center text-muted-text py-8">No salary records yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-card-border text-muted-text text-xs">
                    <th className="text-left py-2 px-3">Period</th>
                    <th className="text-right py-2 px-3">Basic</th>
                    <th className="text-right py-2 px-3">EPF (You)</th>
                    <th className="text-right py-2 px-3">EPF (Employer)</th>
                    <th className="text-right py-2 px-3">ETF</th>
                    <th className="text-right py-2 px-3">Net Salary</th>
                    <th className="text-center py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record) => (
                    <tr key={record._id} className="border-b border-card-border/50 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedRecord(record)}>
                      <td className="py-3 px-3 font-medium">
                        {new Date(0, record.month - 1).toLocaleString('en', { month: 'short' })} {record.year}
                      </td>
                      <td className="py-3 px-3 text-right">Rs. {record.basicSalary?.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right text-red-600">-{record.epfEmployee?.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right text-emerald-600">+{record.epfEmployer?.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right text-blue-600">+{record.etfEmployer?.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right font-bold text-dark-navy">Rs. {record.netSalary?.toLocaleString()}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${record.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {record.status === 'paid' ? '✅ Paid' : '⏳ Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Selected Record Detail */}
        {selectedRecord && (
          <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
            <h3 className="font-semibold text-dark-navy mb-3">
              📄 Payslip: {new Date(0, selectedRecord.month - 1).toLocaleString('en', { month: 'long' })} {selectedRecord.year}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-muted-text">Basic</p>
                <p className="font-semibold">Rs. {selectedRecord.basicSalary?.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-muted-text">Allowances</p>
                <p className="font-semibold">Rs. {(selectedRecord.allowances || 0).toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-muted-text">Bonuses</p>
                <p className="font-semibold">Rs. {(selectedRecord.bonuses || 0).toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-muted-text">Gross</p>
                <p className="font-semibold">Rs. {selectedRecord.grossSalary?.toLocaleString()}</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3">
                <p className="text-xs text-red-500">EPF Deduction (8%)</p>
                <p className="font-semibold text-red-600">- Rs. {selectedRecord.epfEmployee?.toLocaleString()}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3">
                <p className="text-xs text-emerald-600">EPF Employer (12%)</p>
                <p className="font-semibold text-emerald-600">+ Rs. {selectedRecord.epfEmployer?.toLocaleString()}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-xs text-blue-600">ETF Employer (3%)</p>
                <p className="font-semibold text-blue-600">+ Rs. {selectedRecord.etfEmployer?.toLocaleString()}</p>
              </div>
              <div className="bg-emerald-100 rounded-xl p-3">
                <p className="text-xs text-emerald-700">Net Salary</p>
                <p className="font-bold text-lg text-emerald-700">Rs. {selectedRecord.netSalary?.toLocaleString()}</p>
              </div>
            </div>
            {selectedRecord.paidAt && (
              <p className="text-xs text-muted-text mt-3">Paid on: {new Date(selectedRecord.paidAt).toLocaleDateString()}</p>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default EmployeeSalary;
