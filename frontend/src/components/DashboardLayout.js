import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  MapPin,
  Settings,
  LogOut,
  Bell,
  ChevronDown,
  Menu,
  X,
  CreditCard,
  BarChart3,
  CalendarDays,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import Logo from '@/components/Logo';

const DashboardLayout = ({ children, title, breadcrumbs = [] }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Define navigation based on role
  const getNavigation = () => {
    switch (user?.role) {
      case 'admin':
        return [
          { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
          { name: 'Users', href: '/admin/users', icon: Users },
          { name: 'Venues', href: '/admin/venues', icon: Building2 },
          { name: 'Client Cases', href: '/admin/leads', icon: FileText },
          { name: 'Payments', href: '/admin/payments', icon: CreditCard },
          { name: 'Analytics', href: '/admin/payments/analytics', icon: BarChart3 },
          { name: 'Cities', href: '/admin/cities', icon: MapPin },
        ];
      case 'rm':
        return [
          { name: 'Dashboard', href: '/rm/dashboard', icon: LayoutDashboard },
        ];
      case 'venue_owner':
        return [
          { name: 'Dashboard', href: '/venue-owner/dashboard', icon: LayoutDashboard },
          { name: 'Add Venue', href: '/venue-owner/create', icon: Building2 },
          { name: 'Calendar', href: '/venue-owner/calendar', icon: CalendarDays },
        ];
      case 'event_planner':
        return [
          { name: 'Dashboard', href: '/planner/dashboard', icon: LayoutDashboard },
        ];
      default:
        return [];
    }
  };

  const navigation = getNavigation();

  const getRoleLabel = () => {
    switch (user?.role) {
      case 'admin': return 'Operations Control Center';
      case 'rm': return 'Relationship Manager Console';
      case 'venue_owner': return 'Partner Console';
      case 'event_planner': return 'Partner Console';
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
            <Logo size="header" linkTo="/" />
            <span className="hidden md:inline-block text-xs bg-[#F0E6D2] text-[#0B1F3B] px-2 py-1 font-medium border-l-2 border-[#C9A227]">
              {getRoleLabel()}
            </span>
          </div>

          {/* Right - Actions */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative" data-testid="notifications-btn">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2" data-testid="user-menu">
                  {user?.picture ? (
                    <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#0B1F3B] flex items-center justify-center text-white text-sm font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="hidden md:inline font-medium text-[#0B1F3B]">{user?.name}</span>
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
                      ? 'bg-[#F0E6D2] text-[#0B1F3B] border-l-4 border-[#C9A227] -ml-px'
                      : 'text-[#64748B] hover:bg-slate-50 hover:text-[#0B1F3B]'
                  }`}
                  data-testid={`nav-${item.name.toLowerCase().replace(/\s/g, '-')}`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Quick Stats - Bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200">
            <Link
              to="/"
              className="flex items-center gap-2 text-sm text-[#64748B] hover:text-[#0B1F3B]"
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
          <div className="bg-white border-b border-slate-200 px-6 py-4">
            {breadcrumbs.length > 0 && (
              <nav className="flex items-center gap-2 text-sm text-[#64748B] mb-2">
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <span>/</span>}
                    {crumb.href ? (
                      <Link to={crumb.href} className="hover:text-[#0B1F3B]">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-[#0B1F3B]">{crumb.label}</span>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            )}
            <h1 className="font-serif text-2xl font-bold text-[#0B1F3B]">{title}</h1>
          </div>

          {/* Page Content */}
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
