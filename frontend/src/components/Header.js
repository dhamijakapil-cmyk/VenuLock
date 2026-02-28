import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, X, User, LogOut, LayoutDashboard, Bell } from 'lucide-react';
import { USER_ROLES } from '@/lib/utils';
import Logo from '@/components/Logo';

const Header = ({ transparent = false }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getDashboardLink = () => {
    if (!user) return '/';
    return USER_ROLES[user.role]?.dashboard || '/';
  };

  return (
    <header
      className={`sticky top-0 z-50 ${
        transparent
          ? 'bg-white/80 backdrop-blur-md border-b border-white/20'
          : 'bg-white border-b border-slate-200'
      }`}
    >
      <div className="container-main">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Logo size="header" linkTo="/" />

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              to="/venues"
              className="text-[#64748B] hover:text-[#0B1F3B] font-medium transition-colors"
              data-testid="nav-venues"
            >
              Discover Venues
            </Link>
            <Link
              to="/venues?event_type=wedding"
              className="text-[#64748B] hover:text-[#0B1F3B] font-medium transition-colors"
              data-testid="nav-weddings"
            >
              Weddings
            </Link>
            <Link
              to="/venues?event_type=corporate"
              className="text-[#64748B] hover:text-[#0B1F3B] font-medium transition-colors"
              data-testid="nav-corporate"
            >
              Corporate
            </Link>
          </nav>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  data-testid="notifications-btn"
                >
                  <Bell className="w-5 h-5" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2"
                      data-testid="user-menu-btn"
                    >
                      {user?.picture ? (
                        <img
                          src={user.picture}
                          alt={user.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#0B1F3B] flex items-center justify-center text-white text-sm font-medium">
                          {user?.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-[#0B1F3B]">{user?.name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5 text-sm text-[#64748B]">
                      {user?.email}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to={getDashboardLink()} className="flex items-center gap-2">
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/my-enquiries" className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        My Enquiries
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-red-600 flex items-center gap-2"
                      data-testid="logout-btn"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/login')}
                  data-testid="login-btn"
                >
                  Login
                </Button>
                <Button
                  className="bg-[#0B1F3B] hover:bg-[#153055] text-white"
                  onClick={() => navigate('/register')}
                  data-testid="register-btn"
                >
                  Register
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="mobile-menu-btn"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-[#0B1F3B]" />
            ) : (
              <Menu className="w-6 h-6 text-[#0B1F3B]" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200 animate-slideDown">
          <nav className="container-main py-4 space-y-2">
            <Link
              to="/venues"
              className="block py-2 text-[#0B1F3B] font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Discover Venues
            </Link>
            <Link
              to="/venues?event_type=wedding"
              className="block py-2 text-[#0B1F3B] font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Weddings
            </Link>
            <Link
              to="/venues?event_type=corporate"
              className="block py-2 text-[#0B1F3B] font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Corporate
            </Link>
            <div className="pt-4 border-t border-slate-200">
              {isAuthenticated ? (
                <>
                  <Link
                    to={getDashboardLink()}
                    className="block py-2 text-[#0B1F3B] font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="block py-2 text-red-600 font-medium"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      navigate('/login');
                      setMobileMenuOpen(false);
                    }}
                  >
                    Login
                  </Button>
                  <Button
                    className="flex-1 bg-[#0B1F3B]"
                    onClick={() => {
                      navigate('/register');
                      setMobileMenuOpen(false);
                    }}
                  >
                    Register
                  </Button>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
