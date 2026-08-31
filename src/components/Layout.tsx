import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/i18n';
import { useData } from '@/lib/dataContext';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard, Search, BarChart2, Bell, Users, Settings,
  LogOut, Menu, X, Globe, Shield, Eye, Edit2, User, Wifi, WifiOff,
  ClipboardList, ArrowRightLeft, PieChart, Users2, Sparkles, CalendarX2, Upload, AlertTriangle,
} from 'lucide-react';

const navItems = [
  { path: '/dashboard',         labelKey: 'Dashboard',         icon: LayoutDashboard },
  { path: '/search',            labelKey: 'Search',            icon: Search },
  { path: '/reports',           labelKey: 'Reports',           icon: BarChart2, supervisorPlus: true },
  { path: '/referrals',         labelKey: 'Referrals',         icon: ArrowRightLeft },
  { path: '/demographics',      labelKey: 'Demographics',      icon: PieChart,      supervisorPlus: true },
  { path: '/staff-performance', labelKey: 'Staff Performance', icon: Users2,        supervisorPlus: true },
  { path: '/missed-visits',     labelKey: 'Missed Visits',     icon: CalendarX2 },
  { path: '/alerts',            labelKey: 'Alerts',            icon: Bell },
  { path: '/success-stories',   labelKey: 'Success Stories',   icon: Sparkles,      supervisorPlus: true },
  { path: '/users',             labelKey: 'Users',             icon: Users,         adminOnly: true },
  { path: '/audit',             labelKey: 'Audit Log',         icon: ClipboardList, adminOnly: true },
  { path: '/import',            labelKey: 'Import Data',       icon: Upload,        adminOnly: true },
  { path: '/settings',          labelKey: 'Settings',          icon: Settings },
];

const roleIcons: Record<string, typeof Shield> = {
  admin: Shield, supervisor: Eye, data_entry: Edit2, viewer: User,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline]       = useState(navigator.onLine);
  const [location] = useLocation();
  const { currentUser, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { alerts, backendReachable, pendingCount } = useData();

  const unresolvedAlerts = alerts.filter(a => !a.isResolved).length;
  const myAssignedAlerts = alerts.filter(a => !a.isResolved && a.assignedToUserId === currentUser?.id).length;
  const RoleIcon = currentUser ? (roleIcons[currentUser.role] || User) : User;

  useEffect(() => {
    const goOnline  = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const filteredNav = navItems.filter(item => {
    if (item.adminOnly    && currentUser?.role !== 'admin') return false;
    if (item.supervisorPlus && !['admin', 'supervisor'].includes(currentUser?.role || '')) return false;
    return true;
  });

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-primary-foreground text-xs font-bold">RD</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-sidebar-foreground truncate">{t('Rehabilitation Database')}</p>
            <p className="text-xs text-muted-foreground truncate">{currentUser?.fullName}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredNav.map(item => {
          const Icon = item.icon;
          const isActive = location === item.path || (item.path !== '/dashboard' && location.startsWith(item.path));
          return (
            <Link
              key={item.path}
              href={item.path}
              data-testid={`nav-${item.path.replace('/', '')}`}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer relative ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{t(item.labelKey)}</span>
              {item.labelKey === 'Alerts' && unresolvedAlerts > 0 && (
                <Badge className="text-xs h-5 min-w-5 px-1 bg-destructive text-destructive-foreground">
                  {unresolvedAlerts}
                </Badge>
              )}
              {item.labelKey === 'Alerts' && myAssignedAlerts > 0 && (
                <Badge className="text-xs h-5 min-w-5 px-1 bg-violet-600 text-white">
                  {myAssignedAlerts}★
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
        {/* User info */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent">
          <RoleIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{currentUser?.fullName}</p>
            <p className="text-xs text-muted-foreground">
              {t(currentUser?.role === 'data_entry' ? 'Data Entry'
                : currentUser?.role === 'admin' ? 'Admin'
                : currentUser?.role === 'supervisor' ? 'Supervisor'
                : 'Viewer')}
            </p>
          </div>
        </div>

        {/* Online status */}
        {!isOnline ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-red-500">
            <WifiOff className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'وضع عدم الاتصال' : 'Offline'}</span>
          </div>
        ) : !backendReachable ? (
          <div className="flex items-start gap-2 px-3 py-1.5 rounded-lg text-xs bg-red-50 text-red-600">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">{language === 'ar' ? 'الخادم غير متاح' : 'Server unreachable'}</p>
              <p className="mt-0.5">{language === 'ar'
                ? 'ما يُدخَل الآن محفوظ على هذا الجهاز فقط ولم يصل إلى الخادم.'
                : 'Entries are saved on this device only and have not reached the server.'}</p>
              {pendingCount > 0 && (
                <p className="mt-0.5 font-medium">{language === 'ar'
                  ? `${pendingCount} سجل في انتظار المزامنة`
                  : `${pendingCount} record(s) awaiting sync`}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-green-600">
            <Wifi className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'متصل ومتزامن' : 'Online and synced'}</span>
          </div>
        )}

        {/* Language toggle */}
        <button
          data-testid="lang-toggle"
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <Globe className="w-4 h-4" />
          <span>{language === 'ar' ? 'English' : 'عربي'}</span>
        </button>

        {/* Logout */}
        <button
          data-testid="btn-logout"
          onClick={logout}
          className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('Logout')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-60 flex-col bg-sidebar border-e border-sidebar-border flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-50 flex flex-col w-64 bg-sidebar border-e border-sidebar-border me-auto">
            <div className="absolute top-3 end-3">
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-md hover:bg-sidebar-accent">
                <X className="w-4 h-4" />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar (mobile only) */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-border">
          <button
            data-testid="btn-menu"
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-accent"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold">{t('Rehabilitation Database')}</span>
          <button
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className="p-2 rounded-lg hover:bg-accent"
          >
            <Globe className="w-4 h-4" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
