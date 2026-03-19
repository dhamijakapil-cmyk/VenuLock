import React, { useState, useEffect, useMemo } from 'react';

const SplashScreen = ({ onComplete }) => {
  const [phase, setPhase] = useState('enter');

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('reveal'), 300),
      setTimeout(() => setPhase('glow'), 1200),
      setTimeout(() => setPhase('shimmer'), 1800),
      setTimeout(() => setPhase('sparkle'), 2400),
      setTimeout(() => setPhase('exit'), 3800),
      setTimeout(() => onComplete(), 4500),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  const past = (p) => {
    const order = ['enter', 'reveal', 'glow', 'shimmer', 'sparkle', 'exit'];
    return order.indexOf(phase) >= order.indexOf(p);
  };

  const particles = useMemo(() =>
    [...Array(30)].map((_, i) => ({
      x: 10 + Math.random() * 80,
      y: 25 + Math.random() * 50,
      size: 1.5 + Math.random() * 2.5,
      delay: 0.2 + Math.random() * 0.8,
      duration: 1.5 + Math.random() * 2,
      drift: -20 + Math.random() * 40,
      rise: 30 + Math.random() * 60,
    })), []);

  const letters = 'VenuLoQ'.split('');

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0B0B0D] overflow-hidden"
      style={{
        opacity: phase === 'exit' ? 0 : 1,
        transition: 'opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      data-testid="splash-screen"
    >
      {/* Expanding ring of light */}
      <div className="absolute" style={{
        width: past('glow') ? '600px' : '0px',
        height: past('glow') ? '600px' : '0px',
        borderRadius: '50%',
        border: '1px solid rgba(226,192,110,0.12)',
        opacity: past('glow') ? (past('shimmer') ? 0.04 : 0.15) : 0,
        transition: 'all 1.5s cubic-bezier(0.16, 1, 0.3, 1)',
      }} />
      <div className="absolute" style={{
        width: past('glow') ? '400px' : '0px',
        height: past('glow') ? '400px' : '0px',
        borderRadius: '50%',
        border: '1px solid rgba(226,192,110,0.15)',
        opacity: past('glow') ? (past('shimmer') ? 0.06 : 0.2) : 0,
        transition: 'all 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.1s',
      }} />

      {/* Pulsing ambient glow */}
      <div className="absolute" style={{
        width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(226,192,110,0.12) 0%, rgba(226,192,110,0.04) 35%, transparent 65%)',
        opacity: past('reveal') ? 1 : 0,
        transform: past('reveal') ? 'scale(1)' : 'scale(0.3)',
        transition: 'all 1.4s cubic-bezier(0.16, 1, 0.3, 1)',
        animation: past('glow') ? 'pulseGlow 2.5s ease-in-out infinite' : 'none',
      }} />

      {/* Inner warm glow */}
      <div className="absolute" style={{
        width: '200px', height: '200px',
        background: 'radial-gradient(circle, rgba(226,192,110,0.18) 0%, transparent 70%)',
        opacity: past('reveal') ? 1 : 0,
        transition: 'opacity 1s ease-out 0.2s',
      }} />

      {/* Letter-by-letter logo reveal */}
      <div className="relative flex items-baseline" style={{
        filter: past('reveal') ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' : 'none',
      }}>
        {/* 3D shadow layer */}
        <div className="absolute inset-0 flex items-baseline pointer-events-none select-none" aria-hidden="true">
          {letters.map((letter, i) => (
            <span
              key={`shadow-${i}`}
              style={{
                fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
                fontSize: (letter === 'V' || letter === 'Q') ? 'clamp(64px, 16vw, 92px)' : 'clamp(56px, 14vw, 82px)',
                fontWeight: (letter === 'V' || letter === 'Q') ? 700 : 600,
                fontStyle: letter === 'V' ? 'italic' : 'normal',
                letterSpacing: '-0.02em',
                color: 'transparent',
                textShadow: '0 10px 30px rgba(226,192,110,0.2), 0 4px 8px rgba(0,0,0,0.6)',
                opacity: past('reveal') ? 1 : 0,
                transition: `opacity 0.5s ease-out ${0.08 * i}s`,
              }}
            >
              {letter}
            </span>
          ))}
        </div>

        {/* Main metallic gold letters */}
        {letters.map((letter, i) => (
          <span
            key={i}
            className="relative inline-block"
            style={{
              fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
              fontSize: (letter === 'V' || letter === 'Q') ? 'clamp(64px, 16vw, 92px)' : 'clamp(56px, 14vw, 82px)',
              fontWeight: (letter === 'V' || letter === 'Q') ? 700 : 600,
              fontStyle: letter === 'V' ? 'italic' : 'normal',
              letterSpacing: '-0.02em',
              background: 'linear-gradient(160deg, #FFF0C0 0%, #F5E6B8 15%, #E2C06E 30%, #D4B36A 50%, #C4A35A 60%, #E2C06E 80%, #FFF0C0 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              opacity: past('reveal') ? 1 : 0,
              transform: past('reveal') ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.9)',
              transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.08 * i}s`,
            }}
          >
            {letter}
          </span>
        ))}

        {/* Shimmer sweep */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ mixBlendMode: 'overlay' }}>
          <div style={{
            position: 'absolute', top: '-30%', width: '35%', height: '160%',
            left: past('shimmer') ? '130%' : '-50%',
            background: 'linear-gradient(105deg, transparent 0%, rgba(255,255,255,0) 25%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0) 75%, transparent 100%)',
            transform: 'skewX(-15deg)',
            transition: 'left 1s cubic-bezier(0.4, 0, 0.2, 1)',
          }} />
        </div>

        {/* Second shimmer (delayed) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ mixBlendMode: 'soft-light' }}>
          <div style={{
            position: 'absolute', top: '-20%', width: '25%', height: '140%',
            left: past('sparkle') ? '140%' : '-40%',
            background: 'linear-gradient(100deg, transparent 0%, rgba(255,240,192,0) 30%, rgba(255,240,192,0.35) 50%, rgba(255,240,192,0) 70%, transparent 100%)',
            transform: 'skewX(-10deg)',
            transition: 'left 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
          }} />
        </div>
      </div>

      {/* Tagline with stagger */}
      <div style={{
        opacity: past('glow') ? 1 : 0,
        transform: past('glow') ? 'translateY(0)' : 'translateY(10px)',
        transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <p
          className="text-[11px] sm:text-[13px] uppercase tracking-[0.35em] font-medium mt-5"
          style={{
            background: 'linear-gradient(90deg, rgba(226,192,110,0.3), rgba(226,192,110,0.7), rgba(226,192,110,0.3))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Find. Compare. Lock.
        </p>
      </div>

      {/* Gold accent line — expanding */}
      <div className="mt-6 overflow-hidden" style={{
        width: past('glow') ? '70px' : '0px',
        height: '2px',
        transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <div style={{
          width: '100%', height: '100%',
          background: 'linear-gradient(90deg, transparent, #E2C06E, transparent)',
          animation: past('shimmer') ? 'lineShimmer 1.5s ease-in-out infinite' : 'none',
        }} />
      </div>

      {/* Floating gold particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            left: `${p.x}%`,
            top: `${p.y}%`,
            background: `radial-gradient(circle, rgba(226,192,110,${0.6 + Math.random() * 0.4}) 0%, rgba(226,192,110,0) 70%)`,
            opacity: past('sparkle') ? 0 : (past('shimmer') ? 0.7 : 0),
            transform: past('sparkle')
              ? `translate(${p.drift}px, -${p.rise}px) scale(0)`
              : past('shimmer') ? 'translate(0, 0) scale(1)' : 'translate(0, 0) scale(0)',
            transition: `all ${p.duration}s ease-out ${p.delay}s`,
          }}
        />
      ))}

      <style>{`
        @keyframes pulseGlow {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes lineShimmer {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
