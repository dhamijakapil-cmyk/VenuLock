import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Heart, FileText, User } from 'lucide-react';

const TABS = [
  { key: 'home', label: 'Home', icon: Home, path: '/' },
  { key: 'explore', label: 'Explore', icon: Search, path: '/venues/search' },
  { key: 'favourites', label: 'Saved', icon: Heart, path: '/favorites' },
  { key: 'requests', label: 'Requests', icon: FileText, path: '/my-enquiries' },
  { key: 'profile', label: 'Profile', icon: User, path: '/profile' },
];

const BottomTabBar = () => {
  const location = useLocation();

  const isActive = (tab) => {
    const p = location.pathname;
    if (tab.key === 'home') return p === '/';
    if (tab.key === 'explore') return p.startsWith('/venues');
    if (tab.key === 'favourites') return p === '/favorites';
    if (tab.key === 'requests') return p === '/my-enquiries' || p === '/my-bookings' || p === '/my-reviews' || p === '/payments' || p === '/invoices';
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
        className="flex items-center justify-around h-14 border-t"
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
          return (
            <Link
              key={tab.key}
              to={tab.path}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors active:scale-95 ${
                active ? 'text-[#D4B36A]' : 'text-[#F4F1EC]/40'
              }`}
              data-testid={`tab-${tab.key}`}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2 : 1.5} />
              <span
                className="text-[9px] mt-0.5 uppercase tracking-[0.08em]"
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
