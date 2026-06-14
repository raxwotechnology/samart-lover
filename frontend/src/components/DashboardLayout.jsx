import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronRight, LogOut, Home } from 'lucide-react';
import useAuthStore from '../store/authStore';
import useSettingsStore from '../store/settingsStore';

// ─── Shared NavLink ────────────────────────────────────────────────────────────
const NavLink = ({ item, location, collapsed, onNavigate }) => {
  const isRoot = item.path === '/admin' || item.path === '/manager' || item.path === '/employee';
  const isActive = isRoot
    ? location.pathname === item.path
    : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

  return (
    <Link
      to={item.path}
      onClick={onNavigate}
      title={item.label}
      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all group ${
        isActive
          ? 'bg-rose-50 text-rose-600'
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
      }`}
    >
      <item.icon
        size={17}
        className={`flex-shrink-0 ${isActive ? 'text-rose-500' : 'text-slate-400 group-hover:text-slate-700'}`}
      />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {isActive && <ChevronRight size={13} className="text-rose-400 flex-shrink-0" />}
        </>
      )}
    </Link>
  );
};

// ─── Sidebar Content ───────────────────────────────────────────────────────────
const SidebarContent = ({ navItems, collapsed, location, onNavigate }) => {
  // Detect if navItems is a grouped array (array of { label, items })
  const isGrouped = navItems.length > 0 && navItems[0]?.items;

  if (!isGrouped) {
    // Legacy flat list
    return (
      <nav className="p-3 space-y-0.5 flex-1 overflow-y-auto">
        {navItems.map(item => (
          <NavLink key={item.path} item={item} location={location} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </nav>
    );
  }

  return (
    <nav className="p-2 flex-1 overflow-y-auto">
      {navItems.map((group, gi) => (
        <div key={gi} className="mb-1">
          {!collapsed && (
            <p className="text-[9.5px] font-bold uppercase tracking-widest text-slate-400 px-3 pt-3 pb-1 select-none">
              {group.label}
            </p>
          )}
          {collapsed && gi > 0 && <div className="border-t border-slate-100 my-1.5 mx-2" />}
          <div className="space-y-0.5">
            {group.items.map(item => (
              <NavLink key={item.path} item={item} location={location} collapsed={collapsed} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const DashboardLayout = ({ children, navItems, title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const settings = useSettingsStore((s) => s.settings);
  const fetchSettings = useSettingsStore((s) => s.fetchSettings);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Force re-fetch settings on mount so logo is always fresh
  useEffect(() => {
    fetchSettings(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const brandName = settings?.shopName || 'Smartlover';
  // Use whichever logo field is populated (logoUrl is built by settingsStore from logo path)
  const logoSrc = settings?.logoUrl || settings?.logo || '';

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const sidebarW = collapsed ? 'w-[68px]' : 'w-64';
  const mainML   = collapsed ? 'lg:ml-[68px]' : 'lg:ml-64';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">

      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3 sticky top-0 z-50 shadow-sm flex-shrink-0">

        {/* Mobile hamburger */}
        <button
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Desktop collapse */}
        <button
          className="hidden lg:flex p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          onClick={() => setCollapsed(!collapsed)}
        >
          <Menu size={18} />
        </button>

        {/* Brand */}
        <Link to={user?.role === 'admin' ? '/admin' : user?.role === 'manager' ? '/manager' : '/employee'}
          className="flex items-center gap-2.5 flex-shrink-0"
        >
          {logoSrc ? (
            <img
              src={logoSrc}
              alt={brandName}
              className="w-8 h-8 rounded-lg object-cover border border-slate-200"
              onError={e => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-fuchsia-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {brandName.charAt(0)}
            </div>
          )}
          <span className="hidden sm:block font-bold text-slate-800 text-[15px] truncate max-w-[150px]">
            {brandName}
          </span>
        </Link>

        <div className="flex-1" />

        {/* Page title chip */}
        <span className="hidden md:inline-flex items-center text-[11px] font-bold uppercase tracking-widest bg-rose-50 text-rose-600 px-3 py-1.5 rounded-full border border-rose-100">
          {title}
        </span>

        {/* User + logout */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-400 to-fuchsia-500 flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <p className="text-[12px] font-semibold text-slate-800 leading-tight">{user?.name}</p>
              <p className="text-[10px] text-slate-400 capitalize leading-tight">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors border border-red-100"
          >
            <LogOut size={17} />
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* ── Mobile Overlay ──────────────────────────────────────────────── */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside
          className={`
            fixed top-14 left-0 z-40
            ${sidebarW}
            bg-white border-r border-slate-200
            flex flex-col transition-all duration-250 ease-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
          style={{ height: 'calc(100vh - 56px)' }}
        >
          <SidebarContent
            navItems={navItems}
            collapsed={collapsed}
            location={location}
            onNavigate={() => setSidebarOpen(false)}
          />
        </aside>

        {/* ── Main Content ─────────────────────────────────────────────────── */}
        <main className={`flex-1 min-w-0 transition-all duration-250 ${mainML}`}>
          <div className="p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-56px)]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
