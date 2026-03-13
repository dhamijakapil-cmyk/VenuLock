import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Mail, Lock, Eye, EyeOff, Briefcase, Building2, LayoutDashboard, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLES = [
  { id: 'rm', label: 'RM', icon: Briefcase, desc: 'Relationship Manager' },
  { id: 'venue_owner', label: 'Venue', icon: Building2, desc: 'Venue Owner' },
  { id: 'admin', label: 'Admin', icon: LayoutDashboard, desc: 'Platform Admin' },
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
      rm: { email: 'rm1@venuloq.in', password: 'rm123' },
      venue_owner: { email: 'venue@venuloq.in', password: 'venue123' },
      admin: { email: 'admin@venuloq.in', password: 'admin123' },
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
    <div className="min-h-screen bg-[#F4F1EC] flex flex-col lg:flex-row">
      {/* Left - Full bleed image with overlay */}
      <div className="lg:w-[52%] relative overflow-hidden min-h-[220px] lg:min-h-screen">
        <img
          src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&q=80"
          alt="Luxury venue"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0D]/90 via-[#0B0B0D]/50 to-[#0B0B0D]/20" />
        
        <div className="relative z-10 h-full flex flex-col justify-between p-6 lg:p-10">
          {/* Top - Logo */}
          <Link to="/" className="flex items-center gap-1.5">
            <span className="text-[13px] font-semibold tracking-[0.35em] text-[#F4F1EC]" style={{ fontFamily: "'DM Sans', sans-serif" }}>VENU</span>
            <span className="w-px h-3.5 bg-[#D4B36A]/60 mx-0.5" />
            <span className="text-[13px] font-semibold tracking-[0.35em] text-[#D4B36A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>LOQ</span>
          </Link>
          
          {/* Bottom - Headline */}
          <div className="hidden lg:block pb-8">
            <p className="text-[10px] font-bold tracking-[0.3em] text-[#D4B36A] uppercase mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              We negotiate. You celebrate.
            </p>
            <h2 className="text-4xl xl:text-5xl text-white leading-[1.15]" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 500 }}>
              Welcome Back
            </h2>
            <p className="text-white/50 text-sm mt-4 max-w-sm leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Access your dashboard, manage enquiries, and discover premium venues across India.
            </p>
          </div>

          {/* Mobile headline */}
          <div className="lg:hidden pb-2">
            <h2 className="text-2xl text-white" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 500 }}>
              Welcome Back
            </h2>
          </div>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-8 lg:px-12 lg:py-0">
        <div className="w-full max-w-[400px]">
          <h1 className="text-3xl lg:text-4xl text-[#0B0B0D] mb-1" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600 }}>
            Sign In
          </h1>
          <p className="text-[#6E6E6E] text-[13px] mb-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Continue to your account
          </p>

          {/* Role Selector */}
          <div className="grid grid-cols-3 gap-3 mb-8" data-testid="role-selector">
            {ROLES.map((role) => {
              const Icon = role.icon;
              const isSelected = selectedRole === role.id;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => handleRoleSelect(role.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 py-4 px-2 border transition-all duration-200",
                    isSelected
                      ? "bg-[#0B0B0D] border-[#0B0B0D] text-white"
                      : "border-[#E5E0D8] hover:border-[#D4B36A] bg-white/60 text-[#6E6E6E]"
                  )}
                  data-testid={`role-${role.id}`}
                >
                  <Icon className={cn("w-5 h-5", isSelected ? "text-[#D4B36A]" : "text-[#9CA3AF]")} strokeWidth={1.5} />
                  <span className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {role.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Google Login */}
          {showGoogleLogin && (
            <>
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 py-3.5 border border-[#E5E0D8] bg-white hover:border-[#D4B36A] transition-all text-[13px] font-medium text-[#1A1A1A]"
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

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#E5E0D8]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[#F4F1EC] px-4 text-[10px] uppercase tracking-[0.2em] text-[#9CA3AF] font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Or continue with email
                  </span>
                </div>
              </div>
            </>
          )}

          {!showGoogleLogin && (
            <div className="mb-8 py-3 px-4 border border-[#E5E0D8] bg-white/60 text-center">
              <span className="text-[11px] text-[#6E6E6E] tracking-wide" style={{ fontFamily: "'DM Sans', sans-serif" }}>Admin accounts use email and password only</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-[10px] font-bold tracking-[0.2em] text-[#6E6E6E] uppercase block mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" strokeWidth={1.5} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border-0 border-b border-[#E5E0D8] bg-transparent pl-7 pb-3 pt-1 text-[14px] text-[#1A1A1A] placeholder:text-[#B0B0B0] focus:border-[#D4B36A] focus:ring-0 focus:outline-none transition-colors"
                  data-testid="login-email"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold tracking-[0.2em] text-[#6E6E6E] uppercase block mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" strokeWidth={1.5} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full border-0 border-b border-[#E5E0D8] bg-transparent pl-7 pr-8 pb-3 pt-1 text-[14px] text-[#1A1A1A] placeholder:text-[#B0B0B0] focus:border-[#D4B36A] focus:ring-0 focus:outline-none transition-colors"
                  data-testid="login-password"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6E6E6E] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="w-4 h-4 border border-[#E5E0D8] bg-white flex items-center justify-center group-hover:border-[#D4B36A] transition-colors">
                  <input type="checkbox" className="sr-only peer" />
                </div>
                <span className="text-[12px] text-[#6E6E6E]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-[12px] text-[#D4B36A] hover:underline underline-offset-2 font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-4 text-[11px] font-bold bg-[#0B0B0D] text-[#F4F1EC] hover:bg-[#1A1A1A] disabled:opacity-50 transition-all tracking-[0.15em] uppercase group"
              data-testid="login-submit"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {loading ? 'Signing in...' : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
                </>
              )}
            </button>
          </form>

          <p className="text-center mt-8 text-[13px] text-[#6E6E6E]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Don't have an account?{' '}
            <Link to={`/register${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`} className="text-[#0B0B0D] font-semibold hover:text-[#D4B36A] transition-colors">
              Create one
            </Link>
          </p>

          {/* Demo Credentials - subtle */}
          <div className="mt-10 pt-6 border-t border-[#E5E0D8]">
            <p className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.2em] mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>Demo Access</p>
            <div className="grid grid-cols-1 gap-1.5 text-[11px] text-[#9CA3AF]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              <p><span className="text-[#6E6E6E]">admin</span> admin@venuloq.in / admin123</p>
              <p><span className="text-[#6E6E6E]">rm</span> rm1@venuloq.in / rm123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
