import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/context/AuthContext';

const POLL_INTERVAL = 30000; // 30 seconds

const NotificationBell = ({ variant = 'light' }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const isDark = variant === 'dark';

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.get('/notifications?limit=10');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch {
      // silently fail
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const markAllRead = async () => {
    setLoading(true);
    try {
      await api.put('/notifications/read-all');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // silently fail
    }
    setLoading(false);
  };

  const markRead = async (notif) => {
    if (!notif.read) {
      try {
        await api.put(`/notifications/${notif.notification_id}/read`);
        setUnreadCount((c) => Math.max(0, c - 1));
        setNotifications((prev) =>
          prev.map((n) => (n.notification_id === notif.notification_id ? { ...n, read: true } : n))
        );
      } catch {
        // silently fail
      }
    }
    if (notif.data?.lead_id) {
      navigate('/home');
    }
    setOpen(false);
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`relative w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
          isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'
        }`}
        data-testid="notification-bell"
        aria-label="Notifications"
      >
        <Bell
          className={`w-[18px] h-[18px] ${isDark ? 'text-white/70' : 'text-[#64748B]'}`}
          strokeWidth={1.8}
        />
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-[#E2C06E] text-[#0B0B0D] text-[9px] font-bold leading-none shadow-[0_0_8px_rgba(226,192,110,0.5)]"
            data-testid="notification-badge"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setOpen(false)} />
          <div
            className={`absolute right-0 top-full mt-2 w-[320px] max-h-[400px] rounded-xl shadow-2xl border overflow-hidden z-50 ${
              isDark ? 'bg-[#1A1A1D] border-white/10' : 'bg-white border-slate-200'
            }`}
            data-testid="notification-dropdown"
          >
            <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
              <span className={`text-[13px] font-bold ${isDark ? 'text-white' : 'text-[#111]'}`}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={loading}
                  className={`text-[11px] font-medium flex items-center gap-1 transition-colors ${
                    isDark ? 'text-[#E2C06E] hover:text-[#D4B36A]' : 'text-[#D4B36A] hover:text-[#B59550]'
                  } disabled:opacity-50`}
                  data-testid="mark-all-read-btn"
                >
                  <CheckCheck className="w-3 h-3" /> Mark all read
                </button>
              )}
            </div>

            <div className="overflow-y-auto max-h-[320px]">
              {notifications.length === 0 ? (
                <div className={`px-4 py-10 text-center ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-[13px]">No notifications yet</p>
                  <p className="text-[11px] mt-1 opacity-60">We'll notify you about your enquiry updates</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <button
                    key={notif.notification_id}
                    onClick={() => markRead(notif)}
                    className={`w-full text-left px-4 py-3 flex gap-3 transition-colors border-b ${
                      isDark
                        ? `border-white/[0.04] ${notif.read ? 'hover:bg-white/[0.03]' : 'bg-white/[0.03] hover:bg-white/[0.06]'}`
                        : `border-slate-50 ${notif.read ? 'hover:bg-slate-50' : 'bg-[#FEFCE8] hover:bg-[#FEF9C3]'}`
                    }`}
                    data-testid={`notification-item-${notif.notification_id}`}
                  >
                    <div className="flex-shrink-0 pt-1.5">
                      {!notif.read ? (
                        <div className="w-2 h-2 rounded-full bg-[#E2C06E] shadow-[0_0_6px_rgba(226,192,110,0.6)]" />
                      ) : (
                        <Check className={`w-3 h-3 ${isDark ? 'text-white/15' : 'text-slate-300'}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[12px] font-semibold truncate ${isDark ? 'text-white/90' : 'text-[#111]'}`}>
                        {notif.title}
                      </p>
                      <p className={`text-[11px] mt-0.5 leading-relaxed line-clamp-2 ${isDark ? 'text-white/50' : 'text-[#64748B]'}`}>
                        {notif.message}
                      </p>
                      <p className={`text-[10px] mt-1 ${isDark ? 'text-white/25' : 'text-slate-400'}`}>
                        {timeAgo(notif.created_at)}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
