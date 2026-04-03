import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Briefcase, MessageCircle, User } from 'lucide-react';
import { hapticTap } from '@/utils/nativeBridge';
import { useAuth, api } from '@/context/AuthContext';

const TABS = [
  { key: 'home', label: 'Home', icon: Home, path: '/', authPath: '/home' },
  { key: 'explore', label: 'Explore', icon: Search, path: '/venues/search' },
  { key: 'mycase', label: 'My Case', icon: Briefcase, path: '/my-cases' },
  { key: 'messages', label: 'Messages', icon: MessageCircle, path: '/my-cases' },
  { key: 'profile', label: 'Profile', icon: User, path: '/profile' },
];

const BottomTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeCaseId, setActiveCaseId] = useState(null);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [notifRes, casesRes] = await Promise.all([
        api.get('/notifications?limit=1&unread_only=true').catch(() => ({ data: {} })),
        api.get('/case-portal/my-cases').catch(() => ({ data: { cases: [] } })),
      ]);
      setUnreadCount(notifRes.data?.unread_count || 0);
      const cases = casesRes.data?.cases || [];
      const active = cases.find(c => c.stage !== 'lost' && c.stage !== 'closed_not_proceeding');
      setActiveCaseId(active?.lead_id || cases[0]?.lead_id || null);
    } catch { /* silent */ }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const isActive = (tab) => {
    const p = location.pathname;
    if (tab.key === 'home') return p === '/' || p === '/home';
    if (tab.key === 'explore') return p.startsWith('/venues');
    if (tab.key === 'mycase') return p.startsWith('/my-cases') && !location.search?.includes('tab=messages');
    if (tab.key === 'messages') return p.startsWith('/my-cases') && location.search?.includes('tab=messages');
    if (tab.key === 'profile') return p === '/profile' || p === '/favorites';
    return false;
  };

  const handleTabClick = (tab) => {
    hapticTap();
    if (tab.key === 'home') {
      navigate(isAuthenticated ? '/home' : '/');
      return;
    }
    if (tab.key === 'mycase') {
      if (activeCaseId) {
        navigate(`/my-cases/${activeCaseId}`);
      } else {
        navigate('/my-cases');
      }
      return;
    }
    if (tab.key === 'messages') {
      if (activeCaseId) {
        navigate(`/my-cases/${activeCaseId}?tab=messages`);
      } else {
        navigate('/my-cases');
      }
      return;
    }
    if (tab.key === 'profile' && !isAuthenticated) {
      navigate('/auth');
      return;
    }
    navigate(tab.path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      data-testid="bottom-tab-bar"
    >
      <div
        className="flex items-center justify-around h-[56px] border-t"
        style={{
          background: 'rgba(255, 255, 255, 0.92)',
          borderColor: 'rgba(0, 0, 0, 0.05)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        {TABS.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;
          const showBadge = tab.key === 'messages' && unreadCount > 0;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabClick(tab)}
              className={`relative flex flex-col items-center justify-center w-full h-full transition-colors active:scale-95 ${
                active ? 'text-[#0B0B0D]' : 'text-[#0B0B0D]/35'
              }`}
              data-testid={`tab-${tab.key}`}
            >
              <div className="relative">
                <Icon className="w-[20px] h-[20px]" strokeWidth={active ? 2 : 1.5} />
                {showBadge && (
                  <span
                    className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-[4px] flex items-center justify-center rounded-full bg-[#D4B36A] text-[#0B0B0D] text-[8px] font-bold leading-none"
                    data-testid="tab-messages-badge"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span
                className="text-[9px] mt-[3px] font-medium"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {tab.label}
              </span>
              {/* Gold dot indicator for active */}
              {active && (
                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-[#D4B36A]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomTabBar;
