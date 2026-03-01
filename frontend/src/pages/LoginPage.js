import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, Lock, Eye, EyeOff, PartyPopper, Briefcase, Building2, LayoutDashboard } from 'lucide-react';
import Logo from '@/components/Logo';
import { cn } from '@/lib/utils';

const ROLES = [
  { id: 'customer', label: 'Customer', icon: PartyPopper, desc: 'Find & book venues', color: 'text-[#C9A227]', bg: 'bg-[#C9A227]/10', border: 'border-[#C9A227]' },
  { id: 'rm', label: 'RM', icon: Briefcase, desc: 'Manage leads', color: 'text-[#0B1F3B]', bg: 'bg-[#0B1F3B]/10', border: 'border-[#0B1F3B]' },
  { id: 'venue_owner', label: 'Venue', icon: Building2, desc: 'List your venue', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-500' },
  { id: 'admin', label: 'Admin', icon: LayoutDashboard, desc: 'Platform admin', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-500' },
];

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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
      
      // Redirect based on role
      const roleDashboards = {
        admin: '/admin/dashboard',
        rm: '/rm/dashboard',
        venue_owner: '/venue-owner/dashboard',
        event_planner: '/planner/dashboard',
        customer: '/my-enquiries',
      };
      
      navigate(roleDashboards[user.role] || from);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/my-enquiries';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-[#F9F9F7] flex">
      {/* Left - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <Logo size="large" linkTo="/" />
          </div>

          <h1 className="font-serif text-3xl font-bold text-[#0B1F3B] mb-2">Welcome Back</h1>
          <p className="text-[#64748B] mb-8">Sign in to continue to your account</p>

          {/* Google Login */}
          <Button
            variant="outline"
            className="w-full mb-6 py-6"
            onClick={handleGoogleLogin}
            data-testid="google-login-btn"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#F9F9F7] px-2 text-[#64748B]">Or continue with email</span>
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
                  className="pl-10"
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
                  className="pl-10 pr-10"
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
              <Link to="/forgot-password" className="text-sm text-[#C9A227] hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#0B1F3B] hover:bg-[#153055] py-6"
              disabled={loading}
              data-testid="login-submit"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <p className="text-center mt-6 text-[#64748B]">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#C9A227] hover:underline font-medium">
              Sign up
            </Link>
          </p>

          {/* Demo Credentials */}
          <div className="mt-8 p-4 bg-[#F0E6D2] border-l-4 border-[#C9A227]">
            <p className="text-sm font-medium text-[#0B1F3B] mb-2">Demo Credentials:</p>
            <p className="text-xs text-[#64748B]">Admin: admin@bookmyvenue.in / admin123</p>
            <p className="text-xs text-[#64748B]">RM: rm1@bookmyvenue.in / rm123</p>
            <p className="text-xs text-[#64748B]">Venue Owner: venue@bookmyvenue.in / venue123</p>
          </div>
        </div>
      </div>

      {/* Right - Image */}
      <div
        className="hidden lg:block lg:w-1/2 bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1745573673416-66e829644ae9?w=1200)',
        }}
      >
        <div className="h-full w-full bg-[#0B1F3B]/60 flex items-center justify-center p-12">
          <div className="text-center">
            <h2 className="font-serif text-4xl text-white font-bold mb-4">
              Find Your Perfect Venue
            </h2>
            <p className="text-slate-300 text-lg max-w-md mx-auto">
              Discover and book premium venues across Delhi NCR for your special occasions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
