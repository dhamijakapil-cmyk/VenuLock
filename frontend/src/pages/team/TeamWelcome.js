import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '@/context/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Building2, FileText, Users, Clock, Activity, CheckCircle,
  AlertCircle, Trophy, Edit, ArrowRight, ChevronRight,
  Info, AlertTriangle, Pin, Megaphone,
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
  finance: [
    { label: 'Finance Dashboard', href: '/team/finance/dashboard', icon: FileText, color: '#D4B36A' },
  ],
  operations: [
    { label: 'Operations Dashboard', href: '/team/operations/dashboard', icon: Activity, color: '#D4B36A' },
  ],
  marketing: [
    { label: 'Marketing Dashboard', href: '/team/marketing/dashboard', icon: Activity, color: '#D4B36A' },
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

        {/* Announcements */}
        {!loading && data?.announcements?.length > 0 && (
          <div className="mb-8 space-y-2" data-testid="announcements-section">
            {data.announcements.map((ann, i) => {
              const typeStyles = {
                info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: Info },
                success: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', icon: CheckCircle },
                warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: AlertTriangle },
                urgent: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: AlertCircle },
              };
              const style = typeStyles[ann.type] || typeStyles.info;
              const Icon = style.icon;
              return (
                <div
                  key={ann.announcement_id || i}
                  className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${style.bg} ${style.border}`}
                  data-testid={`welcome-announcement-${i}`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {ann.pinned ? <Pin className={`w-4 h-4 ${style.text}`} /> : <Icon className={`w-4 h-4 ${style.text}`} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${style.text}`}>{ann.title}</p>
                    {ann.body && <p className={`text-xs mt-0.5 ${style.text} opacity-80`}>{ann.body}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
