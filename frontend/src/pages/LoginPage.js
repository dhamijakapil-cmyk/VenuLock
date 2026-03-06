import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, Lock, Eye, EyeOff, User, Briefcase, Building2, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLES = [
  { id: 'customer', label: 'Customer', icon: User, desc: 'Find & book venues' },
  { id: 'rm', label: 'RM', icon: Briefcase, desc: 'Manage leads' },
  { id: 'venue_owner', label: 'Venue', icon: Building2, desc: 'List your venue' },
  { id: 'admin', label: 'Admin', icon: LayoutDashboard, desc: 'Platform admin' },
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
    } else {
      setEmail('');
      setPassword('');
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
      toast.error(error.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const afterLogin = redirectTo || '/my-enquiries';
    const redirectUrl = window.location.origin + afterLogin;
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const showGoogleLogin = selectedRole !== 'admin';

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col lg:flex-row">
      {/* Left - Dark Premium Banner */}
      <div className="lg:w-1/2 bg-[#111] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(200,169,96,0.06)_0%,transparent_70%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C8A960]/15 to-transparent" />
        
        <div className="relative z-10 h-full flex flex-col justify-center p-8 lg:p-12">
          {/* Wordmark */}
          <Link to="/" className="flex items-center gap-1.5 mb-8 lg:mb-12">
            <span className="text-[13px] font-semibold tracking-[0.35em] text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>VENU</span>
            <span className="w-px h-3.5 bg-[#C8A960]/50 mx-1" />
            <span className="text-[13px] font-semibold tracking-[0.35em] text-[#C8A960]" style={{ fontFamily: "'DM Sans', sans-serif" }}>LOCK</span>
          </Link>
          
          <div className="hidden lg:block">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/[0.04] border border-white/[0.08] mb-6">
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em]" style={{ fontFamily: "'DM Sans', sans-serif" }}>We Talk. You Lock.</span>
            </div>
            <h2 className="text-3xl lg:text-4xl text-white font-medium mb-4 leading-tight" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>
              Welcome Back to
              <br />
              <span className="text-[#C8A960]">VenuLock</span>
            </h2>
            <p className="text-white/45 text-[15px] max-w-md leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Sign in to access your dashboard, manage enquiries, and discover premium venues.
            </p>
          </div>
          
          {/* Mobile compact header */}
          <div className="lg:hidden text-center py-4">
            <h2 className="text-2xl text-white font-medium" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>Welcome Back</h2>
          </div>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-6">
            <h1 className="text-2xl font-medium text-[#111]" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>Sign In</h1>
            <p className="text-[#6B7280] text-[13px] mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>Continue to your account</p>
          </div>
          
          <div className="hidden lg:block mb-8">
            <h1 className="text-3xl font-medium text-[#111]" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>Sign In</h1>
            <p className="text-[#6B7280] text-[13px] mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>Continue to your account</p>
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
                    "flex flex-col items-center gap-1.5 p-3 border-2 transition-all duration-150 text-center",
                    isSelected
                      ? "bg-[#111] border-[#111] text-white"
                      : "border-[#E5E5E5] hover:border-[#C8A960]/40 bg-white text-[#6B7280]"
                  )}
                  data-testid={`role-${role.id}`}
                >
                  <Icon className={cn("w-5 h-5", isSelected ? "text-[#C8A960]" : "text-[#9CA3AF]")} />
                  <span className={cn("text-[11px] font-bold tracking-wide", isSelected ? "text-white" : "text-[#6B7280]")}>
                    {role.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Google Login - hidden for Admin */}
          {showGoogleLogin && (
            <>
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 border-2 border-[#E5E5E5] bg-white hover:border-[#C8A960]/40 transition-colors text-[13px] font-semibold text-[#374151]"
                data-testid="google-login-btn"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#E5E5E5]" />
                </div>
                <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                  <span className="bg-[#FAFAF8] px-3 text-[#9CA3AF] font-medium">Or continue with email</span>
                </div>
              </div>
            </>
          )}

          {/* Admin: email-only notice */}
          {!showGoogleLogin && (
            <div className="mb-6 py-3 px-4 bg-[#111]/[0.03] border border-[#E5E5E5] text-center">
              <span className="text-[12px] text-[#6B7280] font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>Admin accounts use email and password only</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-[12px] font-semibold text-[#374151] uppercase tracking-wide">Email</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10 h-12 border-[#E5E5E5] focus:border-[#C8A960] focus:ring-[#C8A960]/20"
                  data-testid="login-email"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-[12px] font-semibold text-[#374151] uppercase tracking-wide">Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10 pr-10 h-12 border-[#E5E5E5] focus:border-[#C8A960] focus:ring-[#C8A960]/20"
                  data-testid="login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="border-[#E5E5E5]" />
                <span className="text-[13px] text-[#6B7280]">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-[13px] text-[#C8A960] hover:underline font-semibold">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-3.5 text-[11px] font-bold bg-[#C8A960] text-[#111] hover:bg-[#B89A4A] disabled:opacity-50 transition-all tracking-[0.1em] uppercase"
              data-testid="login-submit"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center mt-6 text-[13px] text-[#6B7280]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Don't have an account?{' '}
            <Link to={`/register${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`} className="text-[#C8A960] hover:underline font-semibold">
              Sign up
            </Link>
          </p>

          {/* Demo Credentials */}
          <div className="mt-8 p-4 bg-[#111]/[0.03] border border-[#E5E5E5]">
            <p className="text-[11px] font-bold text-[#374151] uppercase tracking-wider mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>Demo Credentials</p>
            <div className="grid grid-cols-1 gap-1 text-[12px] text-[#6B7280]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              <p><span className="font-semibold text-[#374151]">Admin:</span> admin@venulock.in / admin123</p>
              <p><span className="font-semibold text-[#374151]">RM:</span> rm1@venulock.in / rm123</p>
              <p><span className="font-semibold text-[#374151]">Venue:</span> venue@venulock.in / venue123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
