import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/context/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Upload,
  CheckCircle,
  Clock,
  FileText,
  Trash2,
  Eye,
  UserCheck,
  UserX,
  Phone,
  Mail,
  MapPin,
  Shield,
  AlertCircle,
} from 'lucide-react';

const sans = { fontFamily: "'DM Sans', sans-serif" };

const HREmployeeDetail = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null); // doc_type being uploaded
  const [verifyingDoc, setVerifyingDoc] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const fileInputRef = useRef(null);
  const activeDocType = useRef(null);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      const [staffRes, docsRes] = await Promise.all([
        api.get('/hr/staff'),
        api.get(`/hr/employee/${userId}/documents`),
      ]);
      const emp = staffRes.data?.staff?.find(s => s.user_id === userId);
      setEmployee(emp || { user_id: userId, name: docsRes.data?.employee_name, role: docsRes.data?.employee_role });
      setChecklist(docsRes.data?.checklist || []);
      setSummary({
        total_required: docsRes.data?.total_required,
        total_uploaded: docsRes.data?.total_uploaded,
        total_verified: docsRes.data?.total_verified,
      });
    } catch (err) {
      toast.error('Failed to load employee data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (docType) => {
    activeDocType.current = docType;
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5MB');
      return;
    }

    const docType = activeDocType.current;
    setUploading(docType);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        await api.post(`/hr/employee/${userId}/documents`, {
          doc_type: docType,
          file_name: file.name,
          file_data: ev.target.result,
        });
        toast.success('Document uploaded');
        fetchData();
      } catch (err) {
        toast.error(err.response?.data?.detail || 'Upload failed');
      } finally {
        setUploading(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleVerifyDoc = async (docId, newStatus) => {
    setVerifyingDoc(docId);
    try {
      await api.patch(`/hr/employee/${userId}/documents/${docId}`, { status: newStatus });
      toast.success(`Document marked as ${newStatus}`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update document status');
    } finally {
      setVerifyingDoc(null);
    }
  };

  const handleDeleteDoc = async (docId) => {
    try {
      await api.delete(`/hr/employee/${userId}/documents/${docId}`);
      toast.success('Document deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete document');
    }
  };

  const handleVerifyEmployee = async (action) => {
    setActionLoading(true);
    try {
      await api.patch(`/hr/verify/${userId}`, { action });
      toast.success(`Employee ${action === 'approve' ? 'approved' : 'rejected'}`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Employee Details">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-2 border-[#D4B36A]/30 border-t-[#D4B36A] rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const roleLabel = employee?.role?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '';
  const isPending = employee?.verification_status === 'pending';
  const isVerified = employee?.verification_status === 'verified';
  const isRejected = employee?.verification_status === 'rejected';

  return (
    <DashboardLayout
      title="Employee Details"
      breadcrumbs={[{ label: 'HR Dashboard', href: '/hr/dashboard' }, { label: employee?.name }]}
    >
      <div style={sans}>
        {/* Back button */}
        <button
          onClick={() => navigate('/team/hr/dashboard')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#0B0B0D] mb-4 transition-colors"
          data-testid="hr-back-btn"
        >
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </button>

        {/* Employee Profile Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5" data-testid="hr-employee-profile">
          <div className="flex items-start gap-4">
            {employee?.profile_photo ? (
              <img src={employee.profile_photo} alt={employee.name} className="w-16 h-16 rounded-xl object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-[#0B0B0D] flex items-center justify-center text-[#D4B36A] font-bold text-xl">
                {employee?.name?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-[#0B0B0D]">{employee?.name}</h2>
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-bold",
                  isVerified ? "bg-emerald-100 text-emerald-700" :
                  isRejected ? "bg-red-100 text-red-700" :
                  "bg-amber-100 text-amber-700"
                )}>
                  {employee?.verification_status?.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-[#D4B36A] font-medium">{roleLabel}</p>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                {employee?.email && (
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{employee.email}</span>
                )}
                {employee?.phone && (
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{employee.phone}</span>
                )}
                {employee?.address && (
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{employee.address}</span>
                )}
              </div>
              {employee?.emergency_contact_name && (
                <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                  <Shield className="w-3 h-3" /> Emergency: {employee.emergency_contact_name} ({employee.emergency_contact_phone})
                </div>
              )}
            </div>
          </div>

          {/* Verification actions */}
          {isPending && employee?.profile_completed && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
              <Button
                onClick={() => handleVerifyEmployee('approve')}
                disabled={actionLoading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-10 rounded-lg"
                data-testid="hr-approve-employee"
              >
                <UserCheck className="w-4 h-4 mr-1.5" /> Approve Employee
              </Button>
              <Button
                onClick={() => handleVerifyEmployee('reject')}
                disabled={actionLoading}
                variant="outline"
                className="flex-1 text-red-600 border-red-200 hover:bg-red-50 h-10 rounded-lg"
                data-testid="hr-reject-employee"
              >
                <UserX className="w-4 h-4 mr-1.5" /> Reject
              </Button>
            </div>
          )}
          {isRejected && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <Button
                onClick={() => handleVerifyEmployee('approve')}
                disabled={actionLoading}
                variant="outline"
                className="w-full text-emerald-600 border-emerald-200 hover:bg-emerald-50 h-10 rounded-lg"
              >
                <UserCheck className="w-4 h-4 mr-1.5" /> Re-approve Employee
              </Button>
            </div>
          )}
        </div>

        {/* Document Progress */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[#0B0B0D]">Document Checklist</h3>
            <span className="text-xs text-slate-400">
              {summary.total_verified}/{summary.total_required} verified
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#D4B36A] rounded-full transition-all"
              style={{ width: `${summary.total_required ? (summary.total_verified / summary.total_required * 100) : 0}%` }}
            />
          </div>
        </div>

        {/* Document Checklist Items */}
        <div className="space-y-3" data-testid="hr-document-checklist">
          {checklist.map(item => (
            <div
              key={item.doc_type}
              className={cn(
                "bg-white border rounded-xl p-4 transition-all",
                item.status === 'verified' ? 'border-emerald-200' :
                item.status === 'pending' ? 'border-amber-200' :
                'border-slate-200'
              )}
              data-testid={`hr-doc-${item.doc_type}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {item.status === 'verified' ? (
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    </div>
                  ) : item.status === 'pending' ? (
                    <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-amber-600" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-slate-300" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-[#0B0B0D]">{item.label}</p>
                    {item.document && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {item.document.file_name}
                        {item.document.uploaded_by_name && ` — uploaded by ${item.document.uploaded_by_name}`}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {!item.uploaded ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleFileSelect(item.doc_type)}
                      disabled={uploading === item.doc_type}
                      className="text-xs h-8 rounded-lg"
                      data-testid={`hr-upload-${item.doc_type}`}
                    >
                      <Upload className="w-3 h-3 mr-1" />
                      {uploading === item.doc_type ? 'Uploading...' : 'Upload'}
                    </Button>
                  ) : (
                    <>
                      {item.document?.file_data && (
                        <button
                          onClick={() => setPreviewDoc(previewDoc === item.doc_type ? null : item.doc_type)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#0B0B0D]"
                          title="Preview"
                          data-testid={`hr-preview-${item.doc_type}`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {item.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleVerifyDoc(item.document.doc_id, 'verified')}
                          disabled={verifyingDoc === item.document?.doc_id}
                          className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                          data-testid={`hr-verify-${item.doc_type}`}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" /> Verify
                        </Button>
                      )}
                      {item.status === 'verified' && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">VERIFIED</span>
                      )}
                      <button
                        onClick={() => handleFileSelect(item.doc_type)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#0B0B0D]"
                        title="Re-upload"
                        data-testid={`hr-reupload-${item.doc_type}`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDoc(item.document.doc_id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                        title="Delete"
                        data-testid={`hr-delete-${item.doc_type}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Inline Preview */}
              {previewDoc === item.doc_type && item.document?.file_data && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  {item.document.file_data.startsWith('data:image') ? (
                    <img src={item.document.file_data} alt={item.label} className="max-w-full max-h-64 rounded-lg mx-auto" />
                  ) : item.document.file_data.startsWith('data:application/pdf') ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <FileText className="w-4 h-4" />
                      <span>PDF document: {item.document.file_name}</span>
                      <a
                        href={item.document.file_data}
                        download={item.document.file_name}
                        className="text-[#D4B36A] hover:underline ml-auto"
                      >
                        Download
                      </a>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>{item.document.file_name}</span>
                      <a
                        href={item.document.file_data}
                        download={item.document.file_name}
                        className="text-[#D4B36A] hover:underline ml-auto"
                      >
                        Download
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>
    </DashboardLayout>
  );
};

export default HREmployeeDetail;
