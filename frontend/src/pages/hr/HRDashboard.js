import React, { useState, useEffect } from 'react';
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
  MapPin,
  Mail,
  AlertTriangle,
  Shield,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const sans = { fontFamily: "'DM Sans', sans-serif" };

const HRDashboard = () => {
  const [stats, setStats] = useState(null);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedRM, setSelectedRM] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

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

  const handleVerify = async (userId, action, notes = '') => {
    setActionLoading(true);
    try {
      await api.patch(`/hr/verify/${userId}`, { action, notes });
      toast.success(`RM ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      setSelectedRM(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Action failed');
    } finally {
      setActionLoading(false);
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
    { id: 'verified', label: 'Verified', icon: CheckCircle, count: stats?.verified_rms || 0, color: 'text-emerald-600' },
    { id: 'rejected', label: 'Rejected', icon: XCircle, count: stats?.rejected_rms || 0, color: 'text-red-500' },
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

        {/* Staff List */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0B0B0D]">
              {tabs.find(t => t.id === activeTab)?.label} RMs
            </h3>
            <span className="text-xs text-slate-400">{filteredStaff.length} found</span>
          </div>

          {filteredStaff.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Users className="w-10 h-10 text-slate-200 mb-2" />
              <p className="text-sm text-slate-400">No RMs in this category</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredStaff.map(rm => (
                <div
                  key={rm.user_id}
                  className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedRM(selectedRM?.user_id === rm.user_id ? null : rm)}
                  data-testid={`hr-rm-card-${rm.user_id}`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative">
                      {rm.profile_photo ? (
                        <img src={rm.profile_photo} alt={rm.name} className="w-11 h-11 rounded-xl object-cover" />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-[#0B0B0D] flex items-center justify-center text-[#D4B36A] font-bold text-sm">
                          {rm.name?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white",
                        rm.verification_status === 'verified' ? 'bg-emerald-500' :
                        rm.verification_status === 'rejected' ? 'bg-red-500' : 'bg-amber-400'
                      )} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="text-sm font-bold text-[#0B0B0D] truncate">{rm.name}</h4>
                        {!rm.profile_completed && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-full font-medium">INCOMPLETE</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{rm.email}</p>
                    </div>

                    <ChevronRight className={cn(
                      "w-4 h-4 text-slate-300 transition-transform",
                      selectedRM?.user_id === rm.user_id && "rotate-90"
                    )} />
                  </div>

                  {/* Expanded Detail */}
                  {selectedRM?.user_id === rm.user_id && (
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-3" data-testid={`hr-rm-detail-${rm.user_id}`}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {rm.phone && (
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {rm.phone}
                          </div>
                        )}
                        {rm.email && (
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            {rm.email}
                          </div>
                        )}
                        {rm.address && (
                          <div className="flex items-center gap-2 text-xs text-slate-600 sm:col-span-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            {rm.address}
                          </div>
                        )}
                        {rm.emergency_contact_name && (
                          <div className="flex items-center gap-2 text-xs text-slate-600 sm:col-span-2">
                            <Shield className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            Emergency: {rm.emergency_contact_name} ({rm.emergency_contact_phone})
                          </div>
                        )}
                      </div>

                      {rm.created_at && (
                        <p className="text-[10px] text-slate-400">
                          Created: {new Date(rm.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {rm.verified_at && ` | Verified: ${new Date(rm.verified_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                          {rm.verified_by_name && ` by ${rm.verified_by_name}`}
                        </p>
                      )}

                      {rm.rejection_reason && (
                        <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-600">
                          Rejection reason: {rm.rejection_reason}
                        </div>
                      )}

                      {/* Action buttons for pending */}
                      {rm.verification_status === 'pending' && rm.profile_completed && (
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            onClick={(e) => { e.stopPropagation(); handleVerify(rm.user_id, 'approve'); }}
                            disabled={actionLoading}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 rounded-lg"
                            data-testid={`hr-approve-${rm.user_id}`}
                          >
                            <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                            Approve
                          </Button>
                          <Button
                            onClick={(e) => { e.stopPropagation(); handleVerify(rm.user_id, 'reject', 'Documents incomplete'); }}
                            disabled={actionLoading}
                            variant="outline"
                            className="flex-1 text-red-600 border-red-200 hover:bg-red-50 text-xs h-9 rounded-lg"
                            data-testid={`hr-reject-${rm.user_id}`}
                          >
                            <UserX className="w-3.5 h-3.5 mr-1.5" />
                            Reject
                          </Button>
                        </div>
                      )}

                      {/* Re-verify rejected */}
                      {rm.verification_status === 'rejected' && (
                        <Button
                          onClick={(e) => { e.stopPropagation(); handleVerify(rm.user_id, 'approve'); }}
                          disabled={actionLoading}
                          variant="outline"
                          className="w-full text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-xs h-9 rounded-lg"
                          data-testid={`hr-reapprove-${rm.user_id}`}
                        >
                          <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                          Re-approve
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default HRDashboard;
