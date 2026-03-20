import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/context/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Phone,
  Mail,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const sans = { fontFamily: "'DM Sans', sans-serif" };

const ROLE_COLORS = {
  rm: 'bg-blue-100 text-blue-700',
  hr: 'bg-teal-100 text-teal-700',
  venue_owner: 'bg-green-100 text-green-700',
  event_planner: 'bg-pink-100 text-pink-700',
  finance: 'bg-indigo-100 text-indigo-700',
  operations: 'bg-orange-100 text-orange-700',
  marketing: 'bg-purple-100 text-purple-700',
};

const formatRole = (role) => role?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '';

const HRDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, staffRes] = await Promise.all([
        api.get('/hr/dashboard'),
        api.get('/hr/staff'),
      ]);
      setStats(statsRes.data);
      setStaff(staffRes.data?.staff || []);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredStaff = staff.filter(s => {
    if (activeTab === 'pending') return s.verification_status === 'pending' && s.profile_completed;
    if (activeTab === 'verified') return s.verification_status === 'verified';
    if (activeTab === 'rejected') return s.verification_status === 'rejected';
    if (activeTab === 'incomplete') return !s.profile_completed;
    return true;
  });

  const tabs = [
    { id: 'pending', label: 'Pending', icon: Clock, count: stats?.pending_verifications || 0, color: 'text-amber-600' },
    { id: 'verified', label: 'Verified', icon: CheckCircle, count: stats?.verified || 0, color: 'text-emerald-600' },
    { id: 'rejected', label: 'Rejected', icon: XCircle, count: stats?.rejected || 0, color: 'text-red-500' },
    { id: 'incomplete', label: 'Incomplete', icon: AlertTriangle, count: stats?.profile_incomplete || 0, color: 'text-slate-400' },
  ];

  if (loading) {
    return (
      <DashboardLayout title="HR Dashboard">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Staff Verification"
      breadcrumbs={[{ label: 'HR Dashboard' }]}
    >
      <div style={sans}>
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" data-testid="hr-stats">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "bg-white border rounded-xl p-4 text-left transition-all hover:shadow-sm",
                activeTab === tab.id ? "border-[#D4B36A] shadow-sm" : "border-slate-200"
              )}
              data-testid={`hr-stat-${tab.id}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <tab.icon className={cn("w-4 h-4", tab.color)} />
                <span className="text-xs text-slate-500 font-medium">{tab.label}</span>
              </div>
              <p className="text-2xl font-bold text-[#0B0B0D]">{tab.count}</p>
            </button>
          ))}
        </div>

        {/* Document Stats */}
        {stats && (stats.docs_pending > 0 || stats.docs_verified > 0) && (
          <div className="bg-[#FFF8E7] border border-[#D4B36A]/20 rounded-xl p-3 mb-4 flex items-center gap-3">
            <FileText className="w-4 h-4 text-[#D4B36A]" />
            <span className="text-xs text-[#0B0B0D]">
              <strong>{stats.docs_pending}</strong> documents pending review  ·  <strong>{stats.docs_verified}</strong> verified
            </span>
          </div>
        )}

        {/* Staff List */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0B0B0D]">
              {tabs.find(t => t.id === activeTab)?.label} Employees
            </h3>
            <span className="text-xs text-slate-400">{filteredStaff.length} found</span>
          </div>

          {filteredStaff.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Users className="w-10 h-10 text-slate-200 mb-2" />
              <p className="text-sm text-slate-400">No employees in this category</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredStaff.map(emp => (
                <button
                  key={emp.user_id}
                  className="w-full p-4 hover:bg-slate-50 transition-colors text-left flex items-center gap-3"
                  onClick={() => navigate(`/hr/employee/${emp.user_id}`)}
                  data-testid={`hr-emp-card-${emp.user_id}`}
                >
                  {/* Avatar */}
                  <div className="relative">
                    {emp.profile_photo ? (
                      <img src={emp.profile_photo} alt={emp.name} className="w-11 h-11 rounded-xl object-cover" />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-[#0B0B0D] flex items-center justify-center text-[#D4B36A] font-bold text-sm">
                        {emp.name?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                    <div className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white",
                      emp.verification_status === 'verified' ? 'bg-emerald-500' :
                      emp.verification_status === 'rejected' ? 'bg-red-500' : 'bg-amber-400'
                    )} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="text-sm font-bold text-[#0B0B0D] truncate">{emp.name}</h4>
                      <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-bold", ROLE_COLORS[emp.role] || 'bg-slate-100 text-slate-600')}>
                        {formatRole(emp.role)}
                      </span>
                      {!emp.profile_completed && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-full font-medium">INCOMPLETE</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="truncate">{emp.email}</span>
                      {emp.docs_total_required > 0 && (
                        <span className="flex items-center gap-1 shrink-0">
                          <FileText className="w-3 h-3" />
                          {emp.docs_verified}/{emp.docs_total_required}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default HRDashboard;
