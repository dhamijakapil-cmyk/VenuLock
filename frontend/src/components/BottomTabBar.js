import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Heart, FileText, User } from 'lucide-react';
import { hapticTap } from '@/utils/nativeBridge';
import { useAuth, api } from '@/context/AuthContext';

const TABS = [
  { key: 'home', label: 'Home', icon: Home, path: '/' },
  { key: 'explore', label: 'Explore', icon: Search, path: '/venues/search' },
  { key: 'favourites', label: 'Saved', icon: Heart, path: '/favorites' },
  { key: 'requests', label: 'Requests', icon: FileText, path: '/my-enquiries' },
  { key: 'profile', label: 'Profile', icon: User, path: '/profile' },
];

const BottomTabBar = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.get('/notifications?limit=1&unread_only=true');
      setUnreadCount(res.data.unread_count || 0);
    } catch { /* silent */ }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  const isActive = (tab) => {
    const p = location.pathname;
    if (tab.key === 'home') return p === '/';
    if (tab.key === 'explore') return p.startsWith('/venues');
    if (tab.key === 'favourites') return p === '/favorites';
    if (tab.key === 'requests') return p === '/my-enquiries' || p === '/my-bookings' || p === '/my-reviews' || p === '/payments' || p === '/invoices' || p.startsWith('/my-cases');
    if (tab.key === 'profile') return p === '/profile';
    return false;
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      data-testid="bottom-tab-bar"
    >
      <div
        className="flex items-center justify-around h-[50px] border-t"
        style={{
          background: 'rgba(11, 11, 13, 0.98)',
          borderColor: 'rgba(244, 241, 236, 0.08)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {TABS.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;
          const showBadge = tab.key === 'requests' && unreadCount > 0;
          return (
            <Link
              key={tab.key}
              to={tab.path}
              onClick={() => hapticTap()}
              className={`relative flex flex-col items-center justify-center w-full h-full transition-colors active:scale-95 ${
                active ? 'text-[#D4B36A]' : 'text-[#F4F1EC]/40'
              }`}
              data-testid={`tab-${tab.key}`}
            >
              <div className="relative">
                <Icon className="w-[18px] h-[18px]" strokeWidth={active ? 2 : 1.5} />
                {showBadge && (
                  <span
                    className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] px-[3px] flex items-center justify-center rounded-full bg-[#D4B36A] text-[#0B0B0D] text-[8px] font-bold leading-none"
                    data-testid="tab-requests-badge"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span
                className="text-[8px] mt-[2px] uppercase tracking-[0.06em]"
                style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: active ? 600 : 400 }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomTabBar;
