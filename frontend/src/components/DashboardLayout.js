import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, api } from '@/context/AuthContext';
import NotificationBell from '@/components/NotificationBell';
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  MapPin,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  X,
  CreditCard,
  BarChart3,
  CalendarDays,
  Activity,
  UserCheck,
  TrendingUp,
  Megaphone,
  Home,
  IndianRupee,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import BrandLogo from '@/components/BrandLogo';

const DashboardLayout = ({ children, title, breadcrumbs = [] }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/team/login');
  };

  // Define navigation based on role
  const getNavigation = () => {
    const home = { name: 'Home', href: '/team/dashboard', icon: Home };
    switch (user?.role) {
      case 'admin':
        return [
          home,
          { name: 'Operations', href: '/team/admin/dashboard', icon: LayoutDashboard },
          { name: 'Control Room', href: '/team/admin/control-room', icon: Activity },
          { name: 'Announcements', href: '/team/admin/announcements', icon: Megaphone },
          { name: 'Conversion Intel', href: '/team/admin/conversion-intelligence', icon: TrendingUp },
          { name: 'Channel Performance', href: '/team/admin/channel-performance', icon: Megaphone },
          { name: 'RM Analytics', href: '/team/admin/rm-analytics', icon: UserCheck },
          { name: 'Users', href: '/team/admin/users', icon: Users },
          { name: 'Venues', href: '/team/admin/venues', icon: Building2 },
          { name: 'Client Cases', href: '/team/admin/leads', icon: FileText },
          { name: 'Payments', href: '/team/admin/payments', icon: CreditCard },
          { name: 'Analytics', href: '/team/admin/payments/analytics', icon: BarChart3 },
          { name: 'Cities', href: '/team/admin/cities', icon: MapPin },
        ];
      case 'rm':
        return [
          home,
          { name: 'Pipeline', href: '/team/rm/dashboard', icon: LayoutDashboard },
          { name: 'Conversion', href: '/team/rm/conversion', icon: TrendingUp },
          { name: 'Execution', href: '/team/rm/execution', icon: Activity },
          { name: 'Settlement', href: '/team/rm/settlement', icon: IndianRupee },
          { name: 'My Performance', href: '/team/rm/my-performance', icon: BarChart3 },
        ];
      case 'hr':
        return [
          home,
          { name: 'Staff Verification', href: '/team/hr/dashboard', icon: UserCheck },
        ];
      case 'venue_owner':
        return [
          home,
          { name: 'My Venues', href: '/team/venue-owner/dashboard', icon: LayoutDashboard },
          { name: 'Add Venue', href: '/team/venue-owner/create', icon: Building2 },
          { name: 'Calendar', href: '/team/venue-owner/calendar', icon: CalendarDays },
        ];
      case 'event_planner':
        return [
          home,
          { name: 'Dashboard', href: '/team/planner/dashboard', icon: LayoutDashboard },
        ];
      case 'venue_specialist':
        return [
          home,
          { name: 'My Venues', href: '/team/specialist/dashboard', icon: Building2 },
        ];
      case 'vam':
        return [
          home,
          { name: 'Review Queue', href: '/team/vam/dashboard', icon: FileText },
        ];
      case 'finance':
        return [
          home,
          { name: 'Finance Dashboard', href: '/team/finance/dashboard', icon: IndianRupee },
          { name: 'Payment Ledger', href: '/team/finance/ledger', icon: FileText },
        ];
      case 'operations':
        return [
          home,
          { name: 'Operations', href: '/team/operations/dashboard', icon: Activity },
        ];
      case 'marketing':
        return [
          home,
          { name: 'Marketing', href: '/team/marketing/dashboard', icon: Globe },
        ];
      default:
        return [home];
    }
  };

  const navigation = getNavigation();

  // Fetch sidebar badge counts
  const [badgeCounts, setBadgeCounts] = useState({});
  const fetchBadges = useCallback(async () => {
    try {
      const res = await api.get('/team/badge-counts');
      setBadgeCounts(res.data || {});
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchBadges();
    const interval = setInterval(fetchBadges, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [fetchBadges]);

  const getRoleLabel = () => {
    switch (user?.role) {
      case 'admin': return 'Operations Control Center';
      case 'rm': return 'Relationship Manager Console';
      case 'hr': return 'Human Resources';
      case 'venue_owner': return 'Partner Console';
      case 'event_planner': return 'Partner Console';
      case 'venue_specialist': return 'Venue Specialist';
      case 'vam': return 'Acquisition Manager';
      default: return 'User';
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F7]">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between h-16 px-4 md:px-6">
          {/* Left - Logo & Mobile Menu */}
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 -ml-2"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              data-testid="mobile-sidebar-toggle"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <BrandLogo size="sm" linkTo="/" />
            <span className="hidden md:inline-block text-xs bg-[#F0E6D2] text-[#111111] px-2 py-1 font-medium border-l-2 border-[#D4B36A]">
              {getRoleLabel()}
            </span>
          </div>

          {/* Right - Actions */}
          <div className="flex items-center gap-4">
            <NotificationBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2" data-testid="user-menu">
                  {user?.picture ? (
                    <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#111111] flex items-center justify-center text-white text-sm font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="hidden md:inline font-medium text-[#111111]">{user?.name}</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm text-[#64748B]">{user?.email}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/" className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    View Website
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600" data-testid="logout-btn">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed lg:sticky top-16 left-0 z-30 h-[calc(100vh-64px)] w-64 bg-white border-r border-slate-200 transition-transform duration-300 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <nav className="p-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#F0E6D2] text-[#111111] border-l-4 border-[#D4B36A] -ml-px'
                      : 'text-[#64748B] hover:bg-slate-50 hover:text-[#111111]'
                  }`}
                  data-testid={`nav-${item.name.toLowerCase().replace(/\s/g, '-')}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="flex-1">{item.name}</span>
                  {badgeCounts[item.name] > 0 && (
                    <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1" data-testid={`badge-${item.name.toLowerCase().replace(/\s/g, '-')}`}>
                      {badgeCounts[item.name] > 99 ? '99+' : badgeCounts[item.name]}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Quick Stats - Bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200">
            <Link
              to="/"
              className="flex items-center gap-2 text-sm text-[#64748B] hover:text-[#111111]"
            >
              <Building2 className="w-4 h-4" />
              Back to Website
            </Link>
          </div>
        </aside>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-64px)]">
          {/* Breadcrumbs & Title */}
          <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sm:py-5">
            {breadcrumbs.length > 0 && (
              <nav className="flex items-center gap-2 text-sm text-[#64748B] mb-2">
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <span>/</span>}
                    {crumb.href ? (
                      <Link to={crumb.href} className="hover:text-[#111111]">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-[#111111]">{crumb.label}</span>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            )}
            <h1 className="font-serif text-2xl font-bold text-[#111111]">{title}</h1>
          </div>

          {/* Page Content */}
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
