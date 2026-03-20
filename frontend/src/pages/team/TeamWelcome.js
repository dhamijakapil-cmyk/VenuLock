import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '@/context/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Building2, FileText, Users, Clock, Activity, CheckCircle,
  AlertCircle, Trophy, Edit, ArrowRight, ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const ICON_MAP = {
  building: Building2,
  'file-text': FileText,
  users: Users,
  clock: Clock,
  activity: Activity,
  'check-circle': CheckCircle,
  'alert-circle': AlertCircle,
  trophy: Trophy,
  edit: Edit,
};

const ROLE_QUICK_ACTIONS = {
  admin: [
    { label: 'Operations Dashboard', href: '/team/admin/dashboard', icon: Activity, color: '#D4B36A' },
    { label: 'Control Room', href: '/team/admin/control-room', icon: Activity, color: '#6366F1' },
    { label: 'Manage Team', href: '/team/admin/users', icon: Users, color: '#10B981' },
    { label: 'Venue Management', href: '/team/admin/venues', icon: Building2, color: '#F59E0B' },
    { label: 'Client Cases', href: '/team/admin/leads', icon: FileText, color: '#8B5CF6' },
    { label: 'Payments', href: '/team/admin/payments', icon: FileText, color: '#EC4899' },
  ],
  rm: [
    { label: 'My Pipeline', href: '/team/rm/dashboard', icon: FileText, color: '#D4B36A' },
    { label: 'Performance', href: '/team/rm/my-performance', icon: Trophy, color: '#10B981' },
  ],
  hr: [
    { label: 'Staff Verification', href: '/team/hr/dashboard', icon: Users, color: '#D4B36A' },
  ],
  venue_specialist: [
    { label: 'My Venues', href: '/team/specialist/dashboard', icon: Building2, color: '#D4B36A' },
    { label: 'Add New Venue', href: '/team/specialist/venue/new', icon: Edit, color: '#10B981' },
  ],
  vam: [
    { label: 'Review Queue', href: '/team/vam/dashboard', icon: FileText, color: '#D4B36A' },
  ],
  venue_owner: [
    { label: 'My Venues', href: '/team/venue-owner/dashboard', icon: Building2, color: '#D4B36A' },
    { label: 'Add Venue', href: '/team/venue-owner/create', icon: Edit, color: '#10B981' },
  ],
  event_planner: [
    { label: 'Dashboard', href: '/team/planner/dashboard', icon: Activity, color: '#D4B36A' },
  ],
};

const ROLE_LABELS = {
  admin: 'Administrator',
  rm: 'Relationship Manager',
  hr: 'Human Resources',
  venue_specialist: 'Venue Specialist',
  vam: 'Acquisition Manager',
  venue_owner: 'Venue Partner',
  event_planner: 'Event Planner',
  finance: 'Finance',
  operations: 'Operations',
  marketing: 'Marketing',
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  try {
    return formatDistanceToNow(new Date(timeStr), { addSuffix: true });
  } catch {
    return '';
  }
};

const TeamWelcome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/team/dashboard');
        setData(res.data);
      } catch {
        // Graceful fallback
        setData({ user_name: user?.name || 'Team Member', role: user?.role || '', quick_stats: [], recent_activity: [], announcements: [] });
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [user]);

  const role = data?.role || user?.role || '';
  const quickActions = ROLE_QUICK_ACTIONS[role] || ROLE_QUICK_ACTIONS[role] || [];

  return (
    <DashboardLayout title="Welcome" breadcrumbs={[]}>
      <div className="max-w-5xl mx-auto" data-testid="team-welcome-page">
        {/* Greeting */}
        <div className="mb-8" data-testid="welcome-greeting">
          <h2 className="text-3xl font-serif font-bold text-[#111111] mb-1">
            {getGreeting()}, {loading ? '...' : (data?.user_name || user?.name || 'Team Member')}
          </h2>
          <p className="text-[#64748B] text-sm">
            {ROLE_LABELS[role] || role} &middot; VenuLoQ Team Portal
          </p>
        </div>

        {/* Quick Stats */}
        {!loading && data?.quick_stats?.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8" data-testid="quick-stats-grid">
            {data.quick_stats.map((stat, i) => {
              const Icon = ICON_MAP[stat.icon] || Activity;
              return (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow" data-testid={`stat-${stat.label.toLowerCase().replace(/\s/g, '-')}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#F0E6D2] flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-[#111111]" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#111111] leading-none">{stat.value}</p>
                      <p className="text-[11px] text-[#64748B] mt-0.5">{stat.label}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Actions */}
        {quickActions.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3" data-testid="quick-actions-grid">
              {quickActions.map((action, i) => {
                const Icon = action.icon;
                return (
                  <button
                    key={i}
                    onClick={() => navigate(action.href)}
                    className="group bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-[#D4B36A]/50 hover:shadow-sm transition-all"
                    data-testid={`quick-action-${action.label.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${action.color}15` }}
                        >
                          <Icon className="w-4 h-4" style={{ color: action.color }} />
                        </div>
                        <span className="text-sm font-medium text-[#111111]">{action.label}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#D4B36A] transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {!loading && data?.recent_activity?.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">Recent Activity</h3>
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100" data-testid="recent-activity-list">
              {data.recent_activity.map((item, i) => {
                const typeIcon = item.type === 'lead' ? FileText
                  : item.type === 'venue' ? Building2
                  : item.type === 'review' ? Clock
                  : item.type === 'verification' ? Users
                  : Activity;
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-3" data-testid={`activity-item-${i}`}>
                    <div className="w-8 h-8 rounded-full bg-[#F0E6D2] flex items-center justify-center flex-shrink-0">
                      {React.createElement(typeIcon, { className: 'w-4 h-4 text-[#111111]' })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#111111] truncate">{item.title}</p>
                      <p className="text-xs text-[#64748B] truncate">{item.subtitle}</p>
                    </div>
                    <span className="text-[10px] text-[#94A3B8] whitespace-nowrap">{formatTime(item.time)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 h-20 animate-pulse">
                  <div className="h-4 bg-slate-100 rounded w-1/2 mb-2" />
                  <div className="h-6 bg-slate-100 rounded w-1/3" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[1,2,3].map(i => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 h-14 animate-pulse" />
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeamWelcome;
