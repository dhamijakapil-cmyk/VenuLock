import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertTriangle, Clock, Calendar, CreditCard, Check, ChevronRight, X } from 'lucide-react';

const SEVERITY_STYLES = {
  critical: { bg: 'bg-red-50 border-red-200', dot: 'bg-red-500', text: 'text-red-700', badge: 'bg-red-100 text-red-700' },
  warning: { bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-400', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  default: { bg: 'bg-white border-slate-200', dot: 'bg-blue-400', text: 'text-[#0B1F3B]', badge: 'bg-slate-100 text-slate-700' },
};

const BREACH_ICONS = {
  first_contact: Clock,
  stage_aging: AlertTriangle,
  hold_expiry: Calendar,
  payment_pending: CreditCard,
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications?limit=20');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  }, []);

  // Poll every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (notifId) => {
    try {
      await api.put(`/notifications/${notifId}/read`);
      setNotifications(prev => prev.map(n => n.notification_id === notifId ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) { console.error(e); }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) { console.error(e); }
  };

  const getSeverity = (notif) => notif.data?.severity || 'default';
  const getStyles = (notif) => SEVERITY_STYLES[getSeverity(notif)] || SEVERITY_STYLES.default;
  const getIcon = (notif) => BREACH_ICONS[notif.data?.breach_type] || Bell;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
        data-testid="notification-bell"
      >
        <Bell className="w-5 h-5 text-[#0B1F3B]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1" data-testid="unread-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[480px] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50" data-testid="notification-dropdown">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[#0B1F3B]">Notifications</h3>
              {unreadCount > 0 && (
                <Badge className="bg-red-100 text-red-700 border-0 text-xs">{unreadCount} new</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-[#C9A227] hover:text-[#B8911F] font-medium"
                  data-testid="mark-all-read"
                >
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-slate-200 rounded">
                <X className="w-4 h-4 text-[#64748B]" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[400px] divide-y divide-slate-100" data-testid="notification-list">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-[#64748B]">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const styles = getStyles(notif);
                const Icon = getIcon(notif);
                const leadId = notif.data?.lead_id;
                const isSLA = notif.type === 'sla_breach';

                return (
                  <div
                    key={notif.notification_id}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                      notif.read ? 'bg-white' : styles.bg
                    } hover:bg-slate-50`}
                    data-testid={`notif-item-${notif.notification_id}`}
                  >
                    {/* Severity dot & icon */}
                    <div className="shrink-0 mt-0.5">
                      {isSLA ? (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          getSeverity(notif) === 'critical' ? 'bg-red-100' : getSeverity(notif) === 'warning' ? 'bg-amber-100' : 'bg-slate-100'
                        }`}>
                          <Icon className={`w-4 h-4 ${styles.text}`} />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <Bell className="w-4 h-4 text-blue-600" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium ${notif.read ? 'text-[#64748B]' : 'text-[#0B1F3B]'}`}>
                          {notif.title}
                        </p>
                        {isSLA && (
                          <Badge className={`${styles.badge} text-[10px] border-0 shrink-0`}>
                            {getSeverity(notif) === 'critical' ? 'BREACH' : 'WARN'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-[#64748B] mt-0.5 line-clamp-2">{notif.message}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-slate-400">{timeAgo(notif.created_at)}</span>
                        <div className="flex items-center gap-2">
                          {!notif.read && (
                            <button
                              onClick={(e) => { e.stopPropagation(); markRead(notif.notification_id); }}
                              className="text-[10px] text-[#C9A227] hover:text-[#B8911F] font-medium flex items-center gap-0.5"
                              data-testid={`mark-read-${notif.notification_id}`}
                            >
                              <Check className="w-3 h-3" /> Read
                            </button>
                          )}
                          {leadId && (
                            <Link
                              to={`/rm/leads/${leadId}`}
                              onClick={() => { markRead(notif.notification_id); setOpen(false); }}
                              className="text-[10px] text-[#0B1F3B] hover:text-[#C9A227] font-medium flex items-center gap-0.5"
                            >
                              View <ChevronRight className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
