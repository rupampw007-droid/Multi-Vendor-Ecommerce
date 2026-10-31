'use client';

import {
  Activity,
  BarChart3,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Palette,
  Settings2,
  ShieldCheck,
  Store,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import useAdmin from '@/hooks/useAdmin';
import axiosInstance from '@/utils/axiosInstance';
import { useToast } from '@/shared/components/toast';

type NavEntry = { label: string; href: string; icon: typeof LayoutDashboard };
type NavGroup = { label: string; entries: NavEntry[] };

const groups: NavGroup[] = [
  {
    label: 'MAIN MENU',
    entries: [
      { label: 'Orders', href: '/dashboard/orders', icon: ClipboardList },
      { label: 'Payments', href: '/dashboard/payments', icon: CreditCard },
      { label: 'Products', href: '/dashboard/products', icon: Package },
      { label: 'Events', href: '/dashboard/events', icon: Activity },
      { label: 'Users', href: '/dashboard/users', icon: Users },
      { label: 'Sellers', href: '/dashboard/sellers', icon: Store },
    ],
  },
  {
    label: 'CONTROLLERS',
    entries: [
      { label: 'Loggers', href: '/dashboard/loggers', icon: BarChart3 },
      { label: 'Management', href: '/dashboard/management', icon: ShieldCheck },
      { label: 'Notifications', href: '/dashboard/notifications', icon: Bell },
    ],
  },
  {
    label: 'CUSTOMIZATION',
    entries: [
      { label: 'All Customization', href: '/dashboard/customization', icon: Palette },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const { admin, isLoading, isError } = useAdmin();

  useEffect(() => {
    if (isError) router.replace('/login');
  }, [isError, router]);

  const handleLogout = async () => {
    try {
      await axiosInstance.post('/api/logout-user', {}, { requireAuth: true });
    } catch {
      toast('Could not confirm logout with the server. Please try again.', 'error');
    } finally {
      window.sessionStorage.clear();
      router.replace('/login');
    }
  };

  const sidebar = (
    <aside className={`admin-sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-brand">
        <Link href="/dashboard" className="brand-lockup" aria-label="Market admin dashboard">
          <span className="brand-mark">m</span>
          {!collapsed && (
            <span className="brand-copy">
              <strong>market</strong>
              <small>ADMIN CONSOLE</small>
            </span>
          )}
        </Link>
        <button
          type="button"
          className="sidebar-collapse-button"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setCollapsed((current) => !current)}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        <button
          type="button"
          className="mobile-close"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        >
          <X size={18} />
        </button>
      </div>
      <div className="admin-identity">
        <div className="admin-avatar" aria-hidden="true">
          {(admin?.name ?? 'A').slice(0, 1).toUpperCase()}
        </div>
        {!collapsed && (
          <div className="admin-identity-copy">
            <strong>{isLoading ? 'Loading admin…' : admin?.name ?? 'Administrator'}</strong>
            <span>{admin?.email ?? 'Admin account'}</span>
          </div>
        )}
        {!collapsed && <ChevronDown size={15} className="identity-chevron" />}
      </div>
      <nav className="sidebar-nav" aria-label="Admin navigation">
        <Link
          href="/dashboard"
          className={`sidebar-link dashboard-link ${pathname === '/dashboard' ? 'sidebar-link-active' : ''}`}
          onClick={() => setSidebarOpen(false)}
          title={collapsed ? 'Dashboard' : undefined}
        >
          <LayoutDashboard size={18} />
          {!collapsed && <span>Dashboard</span>}
        </Link>
        {groups.map((group) => (
          <section className="nav-group" key={group.label}>
            {!collapsed && <h2>{group.label}</h2>}
            {group.entries.map(({ label, href, icon: Icon }) => {
              const active =
                pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`));
              return (
                <Link
                  href={href}
                  key={href}
                  className={`sidebar-link ${active ? 'sidebar-link-active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                  title={collapsed ? label : undefined}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon size={18} />
                  {!collapsed && <span>{label}</span>}
                </Link>
              );
            })}
          </section>
        ))}
        <div className="sidebar-bottom">
          <div className="nav-group">
            {!collapsed && <h2>EXTRAS</h2>}
            <button
              type="button"
              className="sidebar-link logout-link"
              title={collapsed ? 'Logout' : undefined}
              onClick={handleLogout}
            >
              <LogOut size={18} />
              {!collapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </nav>
      <div className="sidebar-footer">
        <Settings2 size={15} />
        {!collapsed && <span>Marketplace operations</span>}
      </div>
    </aside>
  );

  return (
    <div className="admin-shell">
      {sidebarOpen && (
        <button
          className="mobile-sidebar-backdrop"
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className={`sidebar-desktop ${collapsed ? 'sidebar-desktop-collapsed' : ''}`}>
        {sidebar}
      </div>
      <div className={`sidebar-mobile ${sidebarOpen ? 'mobile-sidebar-open' : ''}`}>
        {sidebar}
      </div>
      <div className="admin-main">
        <header className="topbar">
          <button
            type="button"
            className="mobile-menu-button"
            aria-label="Open navigation"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="topbar-breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{pathname === '/dashboard' ? 'Dashboard' : pathname.split('/').pop()?.replaceAll('-', ' ')}</strong>
          </div>
          <div className="topbar-right">
            <span className="topbar-status"><i /> System operational</span>
            <div className="topbar-admin-avatar" aria-label={admin?.name ?? 'Admin'}>
              {(admin?.name ?? 'A').slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>
        <main className="admin-content">
          {isLoading || isError ? (
            <div className="route-loading" role="status">
              <span className="loading-spinner" />
              <span>Verifying administrator access…</span>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
