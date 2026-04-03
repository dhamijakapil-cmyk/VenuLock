import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Briefcase, MessageCircle, User } from 'lucide-react';
import { hapticTap } from '@/utils/nativeBridge';
import { useAuth, api } from '@/context/AuthContext';

const BottomTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeCaseId, setActiveCaseId] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) { setDataLoaded(true); return; }
    try {
      const [notifRes, casesRes] = await Promise.all([
        api.get('/notifications?limit=1&unread_only=true').catch(() => ({ data: {} })),
        api.get('/case-portal/my-cases').catch(() => ({ data: { cases: [] } })),
      ]);
      setUnreadCount(notifRes.data?.unread_count || 0);
      const cases = casesRes.data?.cases || [];
      const active = cases.find(c => c.stage !== 'lost' && c.stage !== 'closed_not_proceeding');
      setActiveCaseId(active?.lead_id || cases[0]?.lead_id || null);
    } catch {}
    finally { setDataLoaded(true); }
  }, [isAuthenticated]);

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 30000); return () => clearInterval(i); }, [fetchData]);

  const p = location.pathname;
  const s = location.search;
  const getActive = () => {
    if (p === '/home') return 'home';
    if (p.startsWith('/venues')) return 'explore';
    if (p.startsWith('/my-cases')) return s?.includes('tab=messages') ? 'messages' : 'mycase';
    if (p === '/profile' || p === '/favorites') return 'profile';
    if (p === '/' || p === '') return 'home';
    return 'home';
  };
  const active = getActive();

  const handleTap = (key) => {
    hapticTap();
    switch (key) {
      case 'home':
        navigate(isAuthenticated ? '/home' : '/');
        break;
      case 'explore':
        navigate('/venues/search');
        break;
      case 'mycase':
        if (!isAuthenticated) { navigate('/auth'); break; }
        if (activeCaseId) navigate(`/my-cases/${activeCaseId}`);
        else navigate('/my-cases');
        break;
      case 'messages':
        if (!isAuthenticated) { navigate('/auth'); break; }
        if (activeCaseId) navigate(`/my-cases/${activeCaseId}?tab=messages`);
        else navigate('/my-cases');
        break;
      case 'profile':
        if (!isAuthenticated) { navigate('/auth'); break; }
        navigate('/profile');
        break;
      default: break;
    }
  };

  const TABS = [
    { key: 'home', label: 'Home', icon: Home },
    { key: 'explore', label: 'Explore', icon: Search },
    { key: 'mycase', label: 'My Case', icon: Briefcase },
    { key: 'messages', label: 'Messages', icon: MessageCircle },
    { key: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      data-testid="bottom-tab-bar">
      <div className="flex items-center justify-around h-[56px] border-t"
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderColor: 'rgba(0, 0, 0, 0.06)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}>
        {TABS.map(tab => {
          const isActive = active === tab.key;
          const Icon = tab.icon;
          const showBadge = tab.key === 'messages' && unreadCount > 0;
          return (
            <button key={tab.key} onClick={() => handleTap(tab.key)}
              className={`relative flex flex-col items-center justify-center w-full h-full transition-colors active:scale-95 ${
                isActive ? 'text-[#0B0B0D]' : 'text-[#0B0B0D]/30'
              }`}
              data-testid={`tab-${tab.key}`}>
              <div className="relative">
                <Icon className="w-[20px] h-[20px]" strokeWidth={isActive ? 2 : 1.5} />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-[4px] flex items-center justify-center rounded-full bg-[#D4B36A] text-[#0B0B0D] text-[8px] font-bold leading-none"
                    data-testid="tab-messages-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </div>
              <span className="text-[9px] mt-[3px] font-medium"
                style={{ fontFamily: "'DM Sans', sans-serif" }}>{tab.label}</span>
              {isActive && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-[#D4B36A]" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomTabBar;
