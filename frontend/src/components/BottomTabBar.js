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
      <div className="flex items-center justify-around h-[64px] border-t"
        style={{
          background: 'rgba(244, 241, 236, 0.96)',
          borderColor: 'rgba(11, 11, 13, 0.08)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          boxShadow: '0 -2px 20px rgba(11,11,13,0.06)',
        }}>
        {TABS.map(tab => {
          const isActive = active === tab.key;
          const Icon = tab.icon;
          const showBadge = tab.key === 'messages' && unreadCount > 0;
          const isMyCase = tab.key === 'mycase';
          return (
            <button key={tab.key} onClick={() => handleTap(tab.key)}
              className="relative flex flex-col items-center justify-center w-full h-full active:scale-95 transition-transform"
              data-testid={`tab-${tab.key}`}>
              {/* Active indicator bar — gold, bold, top of tab */}
              {isActive && !isMyCase && (
                <div className="absolute top-0 w-[20px] h-[3px] rounded-full bg-[#D4B36A]" />
              )}
              <div className="relative">
                {isMyCase ? (
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center -mt-4 transition-all duration-200 ${
                    isActive
                      ? 'bg-[#0B0B0D] shadow-[0_6px_20px_rgba(11,11,13,0.3)]'
                      : 'bg-[#0B0B0D]/10'
                  }`}>
                    <Icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.5 : 2}
                      style={{ color: isActive ? '#D4B36A' : 'rgba(11,11,13,0.5)' }} />
                  </div>
                ) : (
                  <Icon className="w-[20px] h-[20px] transition-all duration-200"
                    strokeWidth={isActive ? 2.5 : 1.8}
                    fill={isActive ? 'currentColor' : 'none'}
                    style={{ color: isActive ? '#0B0B0D' : 'rgba(11,11,13,0.5)' }} />
                )}
                {showBadge && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-[4px] flex items-center justify-center rounded-full bg-[#D4B36A] text-[#0B0B0D] text-[8px] font-bold leading-none"
                    data-testid="tab-messages-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </div>
              <span className={`transition-all duration-200 ${
                isMyCase
                  ? `text-[10px] font-bold mt-[3px] ${isActive ? 'text-[#0B0B0D]' : 'text-[#0B0B0D]/50'}`
                  : `text-[10px] mt-[3px] ${isActive ? 'text-[#0B0B0D] font-bold' : 'text-[#0B0B0D]/50 font-semibold'}`
              }`} style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.01em' }}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomTabBar;
