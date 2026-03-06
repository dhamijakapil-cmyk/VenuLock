import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, Lock, Eye, EyeOff, PartyPopper, Briefcase, Building2, LayoutDashboard, Crown, MapPin } from 'lucide-react';
import Logo from '@/components/Logo';
import { cn } from '@/lib/utils';

const ROLES = [
  { id: 'customer', label: 'Customer', icon: PartyPopper, desc: 'Find & book venues', color: 'text-[#C8A960]', bg: 'bg-[#C8A960]/10', border: 'border-[#C8A960]' },
  { id: 'rm', label: 'RM', icon: Briefcase, desc: 'Manage leads', color: 'text-[#111111]', bg: 'bg-[#111111]/10', border: 'border-[#111111]' },
  { id: 'venue_owner', label: 'Venue', icon: Building2, desc: 'List your venue', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-500' },
  { id: 'admin', label: 'Admin', icon: LayoutDashboard, desc: 'Platform admin', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-500' },
];

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';
  const searchParams = new URLSearchParams(location.search);
  const redirectTo = searchParams.get('redirect') || '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');

  // Pre-fill demo credentials based on selected role
  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
    const demos = {
      customer: { email: '', password: '' },
      rm: { email: 'rm1@venulock.in', password: 'rm123' },
      venue_owner: { email: 'venue@venulock.in', password: 'venue123' },
      admin: { email: 'admin@venulock.in', password: 'admin123' },
    };
    if (demos[roleId]?.email) {
      setEmail(demos[roleId].email);
      setPassword(demos[roleId].password);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success('Welcome back!');
      
      // Redirect: custom redirect > role dashboard > previous page
      if (redirectTo) {
        navigate(redirectTo);
      } else {
        const roleDashboards = {
          admin: '/admin/dashboard',
          rm: '/rm/dashboard',
          venue_owner: '/venue-owner/dashboard',
          event_planner: '/planner/dashboard',
          customer: '/my-enquiries',
        };
        navigate(roleDashboards[user.role] || from);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const afterLogin = redirectTo || '/my-enquiries';
    const redirectUrl = window.location.origin + afterLogin;
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col lg:flex-row">
      {/* Left - Dark Premium Banner (Desktop) / Top Banner (Mobile) */}
      <div className="lg:w-1/2 bg-[#111111] relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 -left-20 w-64 h-64 bg-[#C8A960] rounded-full blur-3xl" />
          <div className="absolute bottom-20 -right-20 w-80 h-80 bg-[#C8A960] rounded-full blur-3xl" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-center p-8 lg:p-12">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-8 lg:mb-12">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C8A960] to-[#B5912F] flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl">VenuLock</span>
          </Link>
          
          <div className="hidden lg:block">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 mb-6">
              <Crown className="w-3.5 h-3.5 text-[#C8A960]" />
              <span className="text-[10px] font-semibold text-white/80 uppercase tracking-wider">WE TALK. YOU LOCK.</span>
            </div>
            <h2 className="font-serif text-4xl text-white font-bold mb-4 leading-tight">
              Welcome Back to
              <br />
              <span className="text-[#C8A960]">VenuLock</span>
            </h2>
            <p className="text-white/60 text-lg max-w-md">
              Sign in to access your dashboard, manage enquiries, and discover premium venues.
            </p>
          </div>
          
          {/* Mobile compact header */}
          <div className="lg:hidden text-center py-4">
            <h2 className="font-serif text-2xl text-white font-bold">Welcome Back</h2>
          </div>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-6">
            <h1 className="font-serif text-2xl font-bold text-[#111111]">Sign In</h1>
            <p className="text-[#64748B] text-sm">Continue to your account</p>
          </div>
          
          <div className="hidden lg:block mb-8">
            <h1 className="font-serif text-3xl font-bold text-[#111111]">Sign In</h1>
            <p className="text-[#64748B] mt-1">Continue to your account</p>
          </div>

          {/* Role Selector */}
          <div className="grid grid-cols-4 gap-2 mb-6" data-testid="role-selector">
            {ROLES.map((role) => {
              const Icon = role.icon;
              const isSelected = selectedRole === role.id;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => handleRoleSelect(role.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-150 text-center",
                    isSelected ? `${role.bg} ${role.border}` : "border-slate-200 hover:border-slate-300 bg-white"
                  )}
                  data-testid={`role-${role.id}`}
                >
                  <Icon className={cn("w-5 h-5", isSelected ? role.color : "text-[#64748B]")} />
                  <span className={cn("text-[11px] font-semibold", isSelected ? role.color : "text-[#64748B]")}>
                    {role.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Google Login */}
          <Button
            variant="outline"
            className="w-full mb-6 py-6 border-2"
            onClick={handleGoogleLogin}
            data-testid="google-login-btn"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#FAFAF8] px-2 text-[#64748B]">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10 h-12"
                  data-testid="login-email"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10 pr-10 h-12"
                  data-testid="login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B]"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded border-slate-300" />
                <span className="text-sm text-[#64748B]">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-[#C8A960] hover:underline font-medium">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#111111] hover:bg-[#153055] h-12 text-base"
              disabled={loading}
              data-testid="login-submit"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <p className="text-center mt-6 text-[#64748B]">
            Don't have an account?{' '}
            <Link to={`/register${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`} className="text-[#C8A960] hover:underline font-semibold">
              Sign up
            </Link>
          </p>

          {/* Demo Credentials */}
          <div className="mt-8 p-4 bg-[#111111]/5 border border-[#111111]/10 rounded-xl">
            <p className="text-sm font-semibold text-[#111111] mb-2">Demo Credentials:</p>
            <div className="grid grid-cols-1 gap-1 text-xs text-[#64748B]">
              <p>Admin: admin@venulock.in / admin123</p>
              <p>RM: rm1@venulock.in / rm123</p>
              <p>Venue: venue@venulock.in / venue123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
