import {
  LayoutDashboard, Users, Store, Tag, ShoppingBag, Monitor,
  Ticket, BarChart3, DollarSign, Wallet, Package, Gift,
  CreditCard, UserCog, RotateCcw, Barcode, TrendingUp, Brain,
  Clock, Target, Settings, ChevronRight, Globe, Truck,
} from 'lucide-react';

// Groups shape: [{ label: string, items: [{ path, label, icon }] }]
const adminNavGroups = [
  {
    label: 'Dashboard',
    items: [
      { path: '/admin', label: 'Overview', icon: LayoutDashboard },
    ],
  },
  {
    label: 'User & Employee Management',
    items: [
      { path: '/admin/users',      label: 'Users',      icon: Users },
      { path: '/admin/employees',  label: 'Employees',  icon: UserCog },
      { path: '/admin/attendance', label: 'Attendance', icon: Clock },
      { path: '/admin/leaves',     label: 'Leaves',     icon: Clock },
      { path: '/admin/targets',    label: 'Targets',    icon: Target },
    ],
  },
  {
    label: 'Business Management',
    items: [
      { path: '/admin/stores',     label: 'Stores',     icon: Store },
      { path: '/admin/categories', label: 'Categories', icon: Tag },
      { path: '/admin/products',   label: 'Products',   icon: Package },
      { path: '/admin/couriers',   label: 'Courier Services', icon: Truck },
    ],
  },
  {
    label: 'Sales & Operations',
    items: [
      { path: '/admin/orders',         label: 'Orders',         icon: ShoppingBag },
      { path: '/admin/returns',        label: 'Returns',        icon: RotateCcw },
      { path: '/pos',                  label: 'POS Terminal',   icon: Monitor },
      { path: '/admin/sales-tracking', label: 'Sales Tracking', icon: TrendingUp },
    ],
  },
  {
    label: 'Marketing & Promotions',
    items: [
      { path: '/admin/vouchers',    label: 'Vouchers',    icon: Ticket },
      { path: '/admin/promotions',  label: 'Promotions',  icon: Gift },
    ],
  },
  {
    label: 'Barcode System',
    items: [
      { path: '/admin/barcodes',      label: 'Barcodes',          icon: Barcode },
      { path: '/barcode-generator',   label: 'Barcode Generator', icon: Barcode },
    ],
  },
  {
    label: 'Suppliers & Payments',
    items: [
      { path: '/admin/supplier-payments', label: 'Supplier Payments', icon: Wallet },
    ],
  },
  {
    label: 'Financial Management',
    items: [
      { path: '/admin/expenses',   label: 'Expenses & Income', icon: Wallet },
      { path: '/admin/financials', label: 'Financials',        icon: DollarSign },
      { path: '/admin/payroll',    label: 'Payroll',           icon: CreditCard },
      { path: '/admin/overtime',   label: 'Overtime Pay',      icon: Clock },
    ],
  },
  {
    label: 'Analytics & Reports',
    items: [
      { path: '/admin/reports',     label: 'Reports',        icon: BarChart3 },
      { path: '/admin/predictions', label: 'AI Predictions', icon: Brain },
    ],
  },
  {
    label: 'System Settings',
    items: [
      { path: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
  {
    label: 'Customer View',
    items: [
      { path: '/', label: 'Customer View', icon: Globe },
    ],
  },
];

// Flat list for compatibility (some pages still import default flat array)
const adminNavItems = adminNavGroups.flatMap(g => g.items);

export { adminNavGroups };
export default adminNavItems;
