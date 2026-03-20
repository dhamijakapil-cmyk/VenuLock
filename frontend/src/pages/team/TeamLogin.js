import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeOff, ArrowRight, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

const sans = { fontFamily: "'DM Sans', sans-serif" };
const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" };

const ROLE_DASHBOARDS = {
  admin: '/team/admin/dashboard',
  rm: '/team/rm/dashboard',
  hr: '/team/hr/dashboard',
  venue_specialist: '/team/specialist/dashboard',
  vam: '/team/vam/dashboard',
  venue_owner: '/team/venue-owner/dashboard',
  event_planner: '/team/planner/dashboard',
  finance: '/team/hr/dashboard',
  operations: '/team/hr/dashboard',
  marketing: '/team/hr/dashboard',
};

const TeamLogin = () => {
  const { user, isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.role) {
      const dash = ROLE_DASHBOARDS[user.role];
      if (dash) navigate(dash, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      // Use the login function from AuthContext which handles API call and state
      const userData = await login(email.trim(), password);
      const dash = ROLE_DASHBOARDS[userData.role];
      if (dash) {
        navigate(dash, { replace: true });
      } else {
        toast.error('This account does not have team portal access');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0D] flex items-center justify-center p-4" style={sans}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-4xl text-white tracking-tight" style={{ ...serif, fontWeight: 600 }}>
            Venu<span className="text-[#D4B36A]">Lo</span>Q
          </h1>
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="h-px w-8 bg-[#D4B36A]/30" />
            <p className="text-xs text-[#D4B36A] tracking-[0.2em] uppercase font-medium">Team Portal</p>
            <div className="h-px w-8 bg-[#D4B36A]/30" />
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-[#141416] border border-[#2A2A2E] rounded-2xl p-6" data-testid="team-login-card">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-[#D4B36A]/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-[#D4B36A]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Staff Sign In</h2>
              <p className="text-[10px] text-slate-500">Admin, HR, RM, Specialist, Manager</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-[10px] font-medium text-slate-400 mb-1 block uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@venuloq.in"
                className="w-full h-11 bg-[#0B0B0D] border border-[#2A2A2E] rounded-xl px-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#D4B36A]/50 focus:border-[#D4B36A]/50"
                required
                autoFocus
                data-testid="team-login-email"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 mb-1 block uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full h-11 bg-[#0B0B0D] border border-[#2A2A2E] rounded-xl px-4 pr-10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#D4B36A]/50 focus:border-[#D4B36A]/50"
                  required
                  data-testid="team-login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#D4B36A] hover:bg-[#C4A030] text-[#0B0B0D] font-bold rounded-xl mt-1"
              data-testid="team-login-submit"
            >
              {loading ? 'Signing in...' : 'Sign In'}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-slate-600 mt-6">
          Internal access only. Contact admin for credentials.
        </p>
      </div>
    </div>
  );
};

export default TeamLogin;
