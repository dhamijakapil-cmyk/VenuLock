import React, { useState, useEffect } from 'react';
import { api } from '@/context/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Plus, Edit, Trash2, Pin, PinOff, Eye, EyeOff,
  Info, AlertTriangle, CheckCircle, AlertCircle,
  X, Megaphone,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const TYPE_CONFIG = {
  info: { label: 'Info', icon: Info, bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
  success: { label: 'Success', icon: CheckCircle, bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  warning: { label: 'Warning', icon: AlertTriangle, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
  urgent: { label: 'Urgent', icon: AlertCircle, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500' },
};

const AnnouncementForm = ({ initial, onSave, onCancel }) => {
  const [title, setTitle] = useState(initial?.title || '');
  const [body, setBody] = useState(initial?.body || '');
  const [type, setType] = useState(initial?.type || 'info');
  const [pinned, setPinned] = useState(initial?.pinned || false);
  const [expiresAt, setExpiresAt] = useState(initial?.expires_at?.split('T')[0] || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        body: body.trim(),
        type,
        pinned,
        expires_at: expiresAt ? new Date(expiresAt + 'T23:59:59Z').toISOString() : null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5" data-testid="announcement-form">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1 block">Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Q1 Targets Released"
            className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#D4B36A]/50"
            data-testid="announcement-title-input"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1 block">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your announcement message..."
            rows={3}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#D4B36A]/50 resize-none"
            data-testid="announcement-body-input"
          />
        </div>
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1 block">Type</label>
            <div className="flex gap-2">
              {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setType(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    type === key ? `${cfg.bg} ${cfg.border} ${cfg.text}` : 'border-slate-200 text-[#64748B] hover:border-slate-300'
                  }`}
                  data-testid={`type-${key}`}
                >
                  <cfg.icon className="w-3 h-3" />
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1 block">Expires</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="h-8 border border-slate-200 rounded-lg px-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#D4B36A]/50"
              data-testid="announcement-expires-input"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setPinned(!pinned)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                pinned ? 'bg-[#F0E6D2] border-[#D4B36A] text-[#111111]' : 'border-slate-200 text-[#64748B] hover:border-slate-300'
              }`}
              data-testid="announcement-pin-toggle"
            >
              {pinned ? <Pin className="w-3 h-3" /> : <PinOff className="w-3 h-3" />}
              {pinned ? 'Pinned' : 'Not Pinned'}
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel} data-testid="announcement-cancel-btn">
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={saving} data-testid="announcement-save-btn"
            className="bg-[#111111] hover:bg-[#333333] text-white">
            {saving ? 'Saving...' : (initial ? 'Update' : 'Publish')}
          </Button>
        </div>
      </form>
    </div>
  );
};

const AdminAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetchAll = async () => {
    try {
      const res = await api.get('/team/announcements/all');
      setAnnouncements(res.data);
    } catch {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreate = async (data) => {
    try {
      await api.post('/team/announcements', data);
      toast.success('Announcement published');
      setShowForm(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create');
    }
  };

  const handleUpdate = async (data) => {
    try {
      await api.put(`/team/announcements/${editing.announcement_id}`, data);
      toast.success('Announcement updated');
      setEditing(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update');
    }
  };

  const handleToggleActive = async (ann) => {
    try {
      await api.put(`/team/announcements/${ann.announcement_id}`, { active: !ann.active });
      toast.success(ann.active ? 'Announcement hidden' : 'Announcement restored');
      fetchAll();
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleTogglePin = async (ann) => {
    try {
      await api.put(`/team/announcements/${ann.announcement_id}`, { pinned: !ann.pinned });
      toast.success(ann.pinned ? 'Unpinned' : 'Pinned to top');
      fetchAll();
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async (ann) => {
    if (!window.confirm(`Delete "${ann.title}" permanently?`)) return;
    try {
      await api.delete(`/team/announcements/${ann.announcement_id}`);
      toast.success('Announcement deleted');
      fetchAll();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <DashboardLayout
      title="Team Announcements"
      breadcrumbs={[{ label: 'Home', href: '/team/dashboard' }, { label: 'Announcements' }]}
    >
      <div className="max-w-3xl mx-auto" data-testid="admin-announcements-page">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-[#64748B]">
              Post updates visible to all team members on the welcome dashboard.
            </p>
          </div>
          {!showForm && !editing && (
            <Button
              onClick={() => setShowForm(true)}
              className="bg-[#111111] hover:bg-[#333333] text-white"
              data-testid="new-announcement-btn"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Announcement
            </Button>
          )}
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="mb-6">
            <AnnouncementForm onSave={handleCreate} onCancel={() => setShowForm(false)} />
          </div>
        )}

        {/* Edit Form */}
        {editing && (
          <div className="mb-6">
            <AnnouncementForm initial={editing} onSave={handleUpdate} onCancel={() => setEditing(null)} />
          </div>
        )}

        {/* Announcements List */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 h-24 animate-pulse" />
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-xl">
            <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-[#111111] mb-1">No announcements yet</h3>
            <p className="text-sm text-[#64748B] mb-4">Create your first announcement to communicate with the team.</p>
            <Button onClick={() => setShowForm(true)} className="bg-[#111111] hover:bg-[#333333] text-white">
              <Plus className="w-4 h-4 mr-1.5" />
              Create First Announcement
            </Button>
          </div>
        ) : (
          <div className="space-y-3" data-testid="announcements-list">
            {announcements.map((ann) => {
              const cfg = TYPE_CONFIG[ann.type] || TYPE_CONFIG.info;
              const isExpired = ann.expires_at && new Date(ann.expires_at) < new Date();
              return (
                <div
                  key={ann.announcement_id}
                  className={`bg-white border rounded-xl p-4 transition-all ${
                    !ann.active ? 'opacity-50 border-slate-200' : isExpired ? 'opacity-60 border-dashed border-slate-300' : `${cfg.border}`
                  }`}
                  data-testid={`announcement-${ann.announcement_id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {ann.pinned && <Pin className="w-3 h-3 text-[#D4B36A] flex-shrink-0" />}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${cfg.bg} ${cfg.text}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                        {!ann.active && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">Hidden</span>
                        )}
                        {isExpired && ann.active && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-500">Expired</span>
                        )}
                      </div>
                      <h4 className="text-sm font-semibold text-[#111111] mb-0.5">{ann.title}</h4>
                      {ann.body && <p className="text-xs text-[#64748B] line-clamp-2">{ann.body}</p>}
                      <p className="text-[10px] text-[#94A3B8] mt-1.5">
                        By {ann.created_by_name} &middot; {ann.created_at ? formatDistanceToNow(new Date(ann.created_at), { addSuffix: true }) : ''}
                        {ann.expires_at && ` &middot; Expires ${new Date(ann.expires_at).toLocaleDateString()}`}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleTogglePin(ann)}
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 transition-colors"
                        title={ann.pinned ? 'Unpin' : 'Pin to top'}
                        data-testid={`pin-${ann.announcement_id}`}
                      >
                        {ann.pinned ? <PinOff className="w-3.5 h-3.5 text-[#D4B36A]" /> : <Pin className="w-3.5 h-3.5 text-slate-400" />}
                      </button>
                      <button
                        onClick={() => handleToggleActive(ann)}
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 transition-colors"
                        title={ann.active ? 'Hide' : 'Show'}
                        data-testid={`toggle-active-${ann.announcement_id}`}
                      >
                        {ann.active ? <EyeOff className="w-3.5 h-3.5 text-slate-400" /> : <Eye className="w-3.5 h-3.5 text-emerald-500" />}
                      </button>
                      <button
                        onClick={() => { setEditing(ann); setShowForm(false); }}
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 transition-colors"
                        title="Edit"
                        data-testid={`edit-${ann.announcement_id}`}
                      >
                        <Edit className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                      <button
                        onClick={() => handleDelete(ann)}
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-50 transition-colors"
                        title="Delete"
                        data-testid={`delete-${ann.announcement_id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminAnnouncements;
