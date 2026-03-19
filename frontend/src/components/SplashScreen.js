import React, { useState, useEffect } from 'react';

const SplashScreen = ({ onComplete }) => {
  const [phase, setPhase] = useState('enter');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('reveal'), 200);
    const t2 = setTimeout(() => setPhase('shimmer'), 1000);
    const t3 = setTimeout(() => setPhase('exit'), 2600);
    const t4 = setTimeout(() => onComplete(), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onComplete]);

  const isVisible = phase !== 'enter';
  const isShimmer = phase === 'shimmer' || phase === 'exit';

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0B0B0D] overflow-hidden"
      style={{
        opacity: phase === 'exit' ? 0 : 1,
        transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      data-testid="splash-screen"
    >
      {/* Ambient glow rings */}
      <div className="absolute" style={{
        width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(226,192,110,0.10) 0%, rgba(226,192,110,0.03) 40%, transparent 70%)',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : 'scale(0.5)',
        transition: 'all 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }} />
      <div className="absolute" style={{
        width: '300px', height: '300px',
        background: 'radial-gradient(circle, rgba(226,192,110,0.15) 0%, transparent 60%)',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : 'scale(0.3)',
        transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1) 0.1s',
      }} />

      {/* Main Logo */}
      <div
        className="relative"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.85)',
          transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* 3D shadow layers */}
        <span
          className="absolute inset-0 select-none pointer-events-none"
          aria-hidden="true"
          style={{
            fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
            fontSize: 'clamp(56px, 14vw, 82px)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'transparent',
            textShadow: '0 8px 24px rgba(226,192,110,0.15), 0 2px 4px rgba(0,0,0,0.6)',
            WebkitTextStroke: '0.5px rgba(226,192,110,0.08)',
          }}
        >
          VenuLoQ
        </span>

        {/* Main metallic gold text */}
        <span
          className="relative block select-none"
          style={{
            fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
            fontSize: 'clamp(56px, 14vw, 82px)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            background: 'linear-gradient(170deg, #F5E6B8 0%, #E2C06E 25%, #D4B36A 45%, #C4A35A 55%, #E2C06E 75%, #F5E6B8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: 'none',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
          }}
        >
          VenuLoQ
        </span>

        {/* Shimmer sweep overlay */}
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{ mixBlendMode: 'overlay' }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-20%',
              left: isShimmer ? '120%' : '-60%',
              width: '40%',
              height: '140%',
              background: 'linear-gradient(105deg, transparent 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 70%, transparent 100%)',
              transform: 'skewX(-15deg)',
              transition: 'left 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </div>
      </div>

      {/* Tagline */}
      <div style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.3s',
      }}>
        <p
          className="text-[11px] sm:text-[12px] uppercase tracking-[0.3em] font-medium mt-4"
          style={{
            background: 'linear-gradient(90deg, rgba(226,192,110,0.35), rgba(226,192,110,0.6), rgba(226,192,110,0.35))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Find. Compare. Lock.
        </p>
      </div>

      {/* Gold accent line */}
      <div className="mt-6 overflow-hidden" style={{
        width: isVisible ? '60px' : '0px',
        height: '2px',
        transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.5s',
      }}>
        <div style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, #E2C06E, transparent)',
        }} />
      </div>

      {/* Subtle sparkle dots */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${2 + Math.random() * 2}px`,
            height: `${2 + Math.random() * 2}px`,
            background: '#E2C06E',
            top: `${30 + Math.random() * 40}%`,
            left: `${15 + Math.random() * 70}%`,
            opacity: isShimmer ? (0.15 + Math.random() * 0.25) : 0,
            transform: isShimmer ? 'scale(1)' : 'scale(0)',
            transition: `all ${0.4 + Math.random() * 0.4}s ease-out ${0.8 + i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
};

export default SplashScreen;
