import { useState, useEffect, useMemo } from 'react';
import { FileDown } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import {
  getAdminOrders, getAdminProducts, getAdminUsers, getCustomerReturns, getExpenses, getAdditionalIncomes,
  getPayrollReport,
} from '../../services/api';
import { toast } from 'react-toastify';
import { adminNavGroups as navItems } from './adminNavItems';
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/exportUtils';

const AdminReports = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [returnsData, setReturnsData] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [returnStatusFilter, setReturnStatusFilter] = useState('all');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('all');
  const [incomeSourceFilter, setIncomeSourceFilter] = useState('all');
  const [salaryMonth, setSalaryMonth] = useState(new Date().getMonth() + 1);
  const [salaryYear, setSalaryYear] = useState(new Date().getFullYear());
  const [salaryRoleFilter, setSalaryRoleFilter] = useState('all');
  const [salaryEmployeeSearch, setSalaryEmployeeSearch] = useState('');
  const [payrollData, setPayrollData] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      try { const { data } = await getAdminOrders(); setOrders(data); }
      catch { toast.error('Failed to load data'); }
      finally { setLoading(false); }
    };
    const fetchAll = async () => {
      try {
        const [u, p, o, r, e, i] = await Promise.all([
          getAdminUsers(),
          getAdminProducts(),
          getAdminOrders(),
          getCustomerReturns({}),
          getExpenses({}),
          getAdditionalIncomes({}),
        ]);
        setUsers(u.data || []);
        setProducts(p.data || []);
        setOrders(o.data || []);
        setReturnsData(r.data || []);
        setExpenses(e.data || []);
        setIncomes(i.data || []);
      } catch {
        toast.error('Failed to load report datasets');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  useEffect(() => {
    const fetchPayroll = async () => {
      try {
        const { data } = await getPayrollReport({
          month: salaryMonth,
          year: salaryYear,
          role: salaryRoleFilter,
          employeeName: salaryEmployeeSearch || undefined,
        });
        setPayrollData(data?.payrolls || []);
      } catch {
        setPayrollData([]);
      }
    };
    if (activeTab === 'salary') fetchPayroll();
  }, [activeTab, salaryMonth, salaryYear, salaryRoleFilter, salaryEmployeeSearch]);

  const filteredUsers = useMemo(
    () => (roleFilter === 'all' ? users : users.filter((u) => u.role === roleFilter)),
    [users, roleFilter]
  );
  const filteredProducts = useMemo(
    () => (categoryFilter === 'all' ? products : products.filter((p) => (p.categoryId?.name || 'Uncategorized') === categoryFilter)),
    [products, categoryFilter]
  );
  const filteredOrders = useMemo(
    () => (orderStatusFilter === 'all' ? orders : orders.filter((o) => o.orderStatus === orderStatusFilter)),
    [orders, orderStatusFilter]
  );
  const filteredReturns = useMemo(
    () => (returnStatusFilter === 'all' ? returnsData : returnsData.filter((r) => r.status === returnStatusFilter)),
    [returnsData, returnStatusFilter]
  );
  const filteredExpenses = useMemo(
    () => (expenseCategoryFilter === 'all' ? expenses : expenses.filter((e) => e.category === expenseCategoryFilter)),
    [expenses, expenseCategoryFilter]
  );
  const filteredIncomes = useMemo(
    () => (incomeSourceFilter === 'all' ? incomes : incomes.filter((i) => i.source === incomeSourceFilter)),
    [incomes, incomeSourceFilter]
  );

  const categories = [...new Set(products.map((p) => p.categoryId?.name || 'Uncategorized'))];
  const orderStatuses = [...new Set(orders.map((o) => o.orderStatus))];
  const returnStatuses = [...new Set(returnsData.map((r) => r.status))];
  const expenseCategories = [...new Set(expenses.map((e) => e.category))];
  const incomeSources = [...new Set(incomes.map((i) => i.source))];
  const payrollNames = [...new Set(payrollData.map((p) => p.employeeId?.name).filter(Boolean))];

  const exportCurrent = (type) => {
    const cfg = {
      users: {
        rows: filteredUsers,
        cols: [
          { label: 'Name', accessor: 'name' }, { label: 'Email', accessor: 'email' }, { label: 'Role', accessor: 'role' },
          { label: 'Phone', accessor: 'phone' }, { label: 'Active', accessor: (r) => (r.isActive ? 'Yes' : 'No') },
        ],
        title: 'Users Report',
      },
      products: {
        rows: filteredProducts,
        cols: [
          { label: 'Name', accessor: 'name' }, { label: 'Category', accessor: (r) => r.categoryId?.name || 'Uncategorized' },
          { label: 'Price', accessor: (r) => Number(r.price || 0).toFixed(2) }, { label: 'Stock', accessor: 'stock' },
          { label: 'Status', accessor: 'status' },
        ],
        title: 'Products Report',
      },
      orders: {
        rows: filteredOrders,
        cols: [
          { label: 'Order ID', accessor: (r) => String(r._id).slice(-8).toUpperCase() }, { label: 'Customer', accessor: (r) => r.userId?.name || 'N/A' },
          { label: 'Status', accessor: 'orderStatus' }, { label: 'Payment', accessor: 'paymentStatus' }, { label: 'Amount', accessor: (r) => Number(r.totalAmount || 0).toFixed(2) },
        ],
        title: 'Orders Report',
      },
      returns: {
        rows: filteredReturns,
        cols: [
          { label: 'RMA', accessor: 'holdBillNo' }, { label: 'Order', accessor: (r) => String(r.orderId?._id || r.orderId).slice(-8).toUpperCase() },
          { label: 'Customer', accessor: (r) => r.customerId?.name || 'N/A' }, { label: 'Status', accessor: 'status' },
        ],
        title: 'Returns Report',
      },
      expenses: {
        rows: filteredExpenses,
        cols: [
          { label: 'Title', accessor: 'title' }, { label: 'Category', accessor: 'category' },
          { label: 'Amount', accessor: (r) => Number(r.amount || 0).toFixed(2) }, { label: 'Status', accessor: 'status' },
        ],
        title: 'Expenses Report',
      },
      incomes: {
        rows: filteredIncomes,
        cols: [
          { label: 'Title', accessor: 'title' }, { label: 'Source', accessor: 'source' },
          { label: 'Amount', accessor: (r) => Number(r.amount || 0).toFixed(2) }, { label: 'Date', accessor: (r) => new Date(r.date).toLocaleDateString() },
        ],
        title: 'Incomes Report',
      },
      salary: {
        rows: payrollData,
        cols: [
          { label: 'Employee', accessor: (r) => r.employeeId?.name || 'N/A' },
          { label: 'Role Category', accessor: (r) => r.employeeId?.role || 'N/A' },
          { label: 'Period', accessor: (r) => `${r.month}/${r.year}` },
          { label: 'Basic', accessor: (r) => Number(r.basicSalary || 0).toFixed(2) },
          { label: 'Bonus', accessor: (r) => Number(r.bonuses || 0).toFixed(2) },
          { label: 'Deductions', accessor: (r) => Number(r.otherDeductions || 0).toFixed(2) },
          { label: 'Net Salary', accessor: (r) => Number(r.netSalary || 0).toFixed(2) },
        ],
        title: 'Salary Category Report',
      },
    }[activeTab];
    if (!cfg) return;
    if (type === 'csv') exportToCSV(cfg.rows, cfg.cols, cfg.title.toLowerCase().replace(/\s+/g, '-'));
    if (type === 'excel') exportToExcel(cfg.rows, cfg.cols, cfg.title.toLowerCase().replace(/\s+/g, '-'));
    if (type === 'pdf') exportToPDF(cfg.rows, cfg.cols, cfg.title);
  };

  if (loading) return <DashboardLayout navItems={navItems} title="Admin Panel"><div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-primary-green border-t-transparent rounded-full animate-spin" /></div></DashboardLayout>;

  return (
    <DashboardLayout navItems={navItems} title="Admin Panel">
      <div>
        <div className="flex items-center justify-between mb-6 gap-3">
          <div><h1 className="text-2xl font-bold text-dark-navy">📊 Categorized Reports</h1><p className="text-muted-text text-sm mt-1">Filter by category/role and export as PDF or Excel</p></div>
          <div className="flex items-center gap-2">
            <button onClick={() => exportCurrent('csv')} className="px-3 py-2 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200">CSV</button>
            <button onClick={() => exportCurrent('excel')} className="px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200">Excel</button>
            <button onClick={() => exportCurrent('pdf')} className="px-3 py-2 rounded-lg text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 flex items-center gap-1"><FileDown size={14} />PDF</button>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap mb-5">
          {[
            ['users', 'Users/Employees'],
            ['products', 'Products'],
            ['orders', 'Orders'],
            ['returns', 'Returns'],
            ['expenses', 'Expenses'],
            ['incomes', 'Incomes'],
            ['salary', 'Salary Reports'],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold ${activeTab === id ? 'bg-primary-green text-white' : 'bg-white border border-card-border text-muted-text hover:bg-gray-50'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
          {activeTab === 'users' && (
            <>
              <div className="mb-3">
                <label className="text-xs text-muted-text mr-2">Role</label>
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="border border-card-border rounded-lg px-3 py-2 text-sm">
                  {['all', 'customer', 'cashier', 'manager', 'deliveryGuy', 'stockEmployee', 'admin'].map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <p className="text-sm text-muted-text">Total: {filteredUsers.length}</p>
            </>
          )}
          {activeTab === 'products' && (
            <>
              <div className="mb-3">
                <label className="text-xs text-muted-text mr-2">Category</label>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="border border-card-border rounded-lg px-3 py-2 text-sm">
                  <option value="all">all</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <p className="text-sm text-muted-text">Total: {filteredProducts.length}</p>
            </>
          )}
          {activeTab === 'orders' && (
            <>
              <div className="mb-3">
                <label className="text-xs text-muted-text mr-2">Status</label>
                <select value={orderStatusFilter} onChange={(e) => setOrderStatusFilter(e.target.value)} className="border border-card-border rounded-lg px-3 py-2 text-sm">
                  <option value="all">all</option>
                  {orderStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <p className="text-sm text-muted-text">Total: {filteredOrders.length}</p>
            </>
          )}
          {activeTab === 'returns' && (
            <>
              <div className="mb-3">
                <label className="text-xs text-muted-text mr-2">Status</label>
                <select value={returnStatusFilter} onChange={(e) => setReturnStatusFilter(e.target.value)} className="border border-card-border rounded-lg px-3 py-2 text-sm">
                  <option value="all">all</option>
                  {returnStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <p className="text-sm text-muted-text">Total: {filteredReturns.length}</p>
            </>
          )}
          {activeTab === 'expenses' && (
            <>
              <div className="mb-3">
                <label className="text-xs text-muted-text mr-2">Category</label>
                <select value={expenseCategoryFilter} onChange={(e) => setExpenseCategoryFilter(e.target.value)} className="border border-card-border rounded-lg px-3 py-2 text-sm">
                  <option value="all">all</option>
                  {expenseCategories.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <p className="text-sm text-muted-text">Total: {filteredExpenses.length}</p>
            </>
          )}
          {activeTab === 'incomes' && (
            <>
              <div className="mb-3">
                <label className="text-xs text-muted-text mr-2">Source</label>
                <select value={incomeSourceFilter} onChange={(e) => setIncomeSourceFilter(e.target.value)} className="border border-card-border rounded-lg px-3 py-2 text-sm">
                  <option value="all">all</option>
                  {incomeSources.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <p className="text-sm text-muted-text">Total: {filteredIncomes.length}</p>
            </>
          )}
          {activeTab === 'salary' && (
            <>
              <div className="mb-3 flex flex-wrap gap-2 items-center">
                <label className="text-xs text-muted-text">Month</label>
                <input type="number" min="1" max="12" value={salaryMonth} onChange={(e) => setSalaryMonth(Number(e.target.value || 1))} className="border border-card-border rounded-lg px-2 py-1.5 text-sm w-20" />
                <label className="text-xs text-muted-text">Year</label>
                <input type="number" value={salaryYear} onChange={(e) => setSalaryYear(Number(e.target.value || new Date().getFullYear()))} className="border border-card-border rounded-lg px-2 py-1.5 text-sm w-24" />
                <label className="text-xs text-muted-text">Role Category</label>
                <select value={salaryRoleFilter} onChange={(e) => setSalaryRoleFilter(e.target.value)} className="border border-card-border rounded-lg px-3 py-2 text-sm">
                  {['all', 'cashier', 'manager', 'deliveryGuy', 'stockEmployee'].map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <label className="text-xs text-muted-text">Search Employee</label>
                <input
                  list="salary-employee-list"
                  value={salaryEmployeeSearch}
                  onChange={(e) => setSalaryEmployeeSearch(e.target.value)}
                  placeholder="Type name to search/select"
                  className="border border-card-border rounded-lg px-3 py-2 text-sm"
                />
                <datalist id="salary-employee-list">
                  {payrollNames.map((name) => <option key={name} value={name} />)}
                </datalist>
              </div>
              <p className="text-sm text-muted-text">Total: {payrollData.length}</p>
            </>
          )}
          <div className="mt-4 text-xs text-muted-text">
            Use the export buttons (CSV / Excel / PDF) to download the currently filtered report.
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden mt-5">
          <div className="px-5 py-3 border-b border-card-border">
            <h3 className="text-sm font-semibold text-dark-navy m-0">Detailed Preview</h3>
          </div>
          <div className="overflow-x-auto">
            {activeTab === 'users' && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-text">Name</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-text">Email</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-text">Role</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-text">Phone</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-text">Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {filteredUsers.map((u) => (
                    <tr key={u._id}>
                      <td className="px-4 py-2.5">{u.name}</td>
                      <td className="px-4 py-2.5">{u.email}</td>
                      <td className="px-4 py-2.5">{u.role}</td>
                      <td className="px-4 py-2.5">{u.phone || '-'}</td>
                      <td className="px-4 py-2.5">{u.isActive ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'products' && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-text">Name</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-text">Category</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-text">Price</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-text">Stock</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-text">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {filteredProducts.map((p) => (
                    <tr key={p._id}>
                      <td className="px-4 py-2.5">{p.name}</td>
                      <td className="px-4 py-2.5">{p.categoryId?.name || 'Uncategorized'}</td>
                      <td className="px-4 py-2.5">Rs. {Number(p.price || 0).toFixed(2)}</td>
                      <td className="px-4 py-2.5">{p.stock}</td>
                      <td className="px-4 py-2.5">{p.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'orders' && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-text">Order</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-text">Customer</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-text">Status</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-text">Payment</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-text">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {filteredOrders.map((o) => (
                    <tr key={o._id}>
                      <td className="px-4 py-2.5">#{String(o._id).slice(-8).toUpperCase()}</td>
                      <td className="px-4 py-2.5">{o.userId?.name || 'N/A'}</td>
                      <td className="px-4 py-2.5">{o.orderStatus}</td>
                      <td className="px-4 py-2.5">{o.paymentStatus}</td>
                      <td className="px-4 py-2.5">Rs. {Number(o.totalAmount || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'returns' && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-text">RMA</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-text">Order</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-text">Customer</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-text">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {filteredReturns.map((r) => (
                    <tr key={r._id}>
                      <td className="px-4 py-2.5">{r.holdBillNo}</td>
                      <td className="px-4 py-2.5">#{String(r.orderId?._id || r.orderId).slice(-8).toUpperCase()}</td>
                      <td className="px-4 py-2.5">{r.customerId?.name || 'N/A'}</td>
                      <td className="px-4 py-2.5">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'expenses' && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-text">Title</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-text">Category</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-text">Amount</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-text">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {filteredExpenses.map((e) => (
                    <tr key={e._id}>
                      <td className="px-4 py-2.5">{e.title}</td>
                      <td className="px-4 py-2.5">{e.category}</td>
                      <td className="px-4 py-2.5">Rs. {Number(e.amount || 0).toFixed(2)}</td>
                      <td className="px-4 py-2.5">{e.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'incomes' && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-text">Title</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-text">Source</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-text">Amount</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-text">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {filteredIncomes.map((i) => (
                    <tr key={i._id}>
                      <td className="px-4 py-2.5">{i.title}</td>
                      <td className="px-4 py-2.5">{i.source}</td>
                      <td className="px-4 py-2.5">Rs. {Number(i.amount || 0).toFixed(2)}</td>
                      <td className="px-4 py-2.5">{new Date(i.date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'salary' && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-text">Employee</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-text">Role Category</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-text">Period</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-text">Basic</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-text">Bonus</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-text">Deductions</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-text">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {payrollData.map((p) => (
                    <tr key={p._id}>
                      <td className="px-4 py-2.5">{p.employeeId?.name || 'N/A'}</td>
                      <td className="px-4 py-2.5">{p.employeeId?.role || 'N/A'}</td>
                      <td className="px-4 py-2.5">{p.month}/{p.year}</td>
                      <td className="px-4 py-2.5">Rs. {Number(p.basicSalary || 0).toFixed(2)}</td>
                      <td className="px-4 py-2.5">Rs. {Number(p.bonuses || 0).toFixed(2)}</td>
                      <td className="px-4 py-2.5">Rs. {Number(p.otherDeductions || 0).toFixed(2)}</td>
                      <td className="px-4 py-2.5">Rs. {Number(p.netSalary || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {((activeTab === 'users' && filteredUsers.length === 0)
              || (activeTab === 'products' && filteredProducts.length === 0)
              || (activeTab === 'orders' && filteredOrders.length === 0)
              || (activeTab === 'returns' && filteredReturns.length === 0)
              || (activeTab === 'expenses' && filteredExpenses.length === 0)
              || (activeTab === 'incomes' && filteredIncomes.length === 0)
              || (activeTab === 'salary' && payrollData.length === 0)) && (
              <div className="px-4 py-10 text-sm text-center text-muted-text">No records for selected filters.</div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminReports;
