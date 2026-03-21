import React, { useState, useEffect, useMemo } from 'react';

const SplashScreen = ({ onComplete }) => {
  const [phase, setPhase] = useState('enter');

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('reveal'), 200),
      setTimeout(() => setPhase('glow'), 900),
      setTimeout(() => setPhase('shimmer'), 1600),
      setTimeout(() => setPhase('exit'), 3000),
      setTimeout(() => onComplete(), 3700),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  const past = (p) => {
    const order = ['enter', 'reveal', 'glow', 'shimmer', 'exit'];
    return order.indexOf(phase) >= order.indexOf(p);
  };

  const particles = useMemo(() =>
    [...Array(24)].map((_, i) => ({
      x: 15 + Math.random() * 70,
      y: 30 + Math.random() * 40,
      size: 1.5 + Math.random() * 2.5,
      delay: 0.1 + Math.random() * 0.6,
      duration: 1.2 + Math.random() * 1.8,
      drift: -25 + Math.random() * 50,
      rise: 30 + Math.random() * 60,
    })), []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: '#1a101b',
        opacity: phase === 'exit' ? 0 : 1,
        transition: 'opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      data-testid="splash-screen"
    >
      {/* Expanding rings */}
      <div className="absolute" style={{
        width: past('glow') ? '500px' : '0px',
        height: past('glow') ? '500px' : '0px',
        borderRadius: '50%',
        border: '1px solid rgba(226,192,110,0.08)',
        opacity: past('glow') ? 0.15 : 0,
        transition: 'all 1.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }} />

      {/* Subtle ambient glow */}
      <div className="absolute" style={{
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(226,192,110,0.05) 0%, transparent 60%)',
        opacity: past('glow') ? 1 : 0,
        transition: 'opacity 1.2s ease-out',
        animation: past('glow') ? 'splashPulse 2.5s ease-in-out infinite' : 'none',
      }} />

      {/* Logo image */}
      <div className="relative" style={{
        opacity: past('reveal') ? 1 : 0,
        transform: past('reveal') ? 'translateY(0) scale(1)' : 'translateY(15px) scale(0.92)',
        transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <img
          src="/venuloq-logo-transparent.png"
          alt="VenuLoQ"
          className="w-[280px] sm:w-[340px] h-auto"
          style={{
            transition: 'filter 1s ease-out',
          }}
          data-testid="splash-logo"
        />

        {/* Shimmer sweep over logo */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div style={{
            position: 'absolute',
            top: '-20%',
            width: '40%',
            height: '140%',
            left: past('shimmer') ? '130%' : '-50%',
            background: 'linear-gradient(105deg, transparent 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0) 70%, transparent 100%)',
            transform: 'skewX(-15deg)',
            transition: 'left 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
          }} />
        </div>
      </div>

      {/* Gold accent line */}
      <div className="mt-6 overflow-hidden" style={{
        width: past('glow') ? '60px' : '0px',
        height: '1.5px',
        transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <div style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, #E2C06E, transparent)',
          animation: past('shimmer') ? 'splashLine 1.5s ease-in-out infinite' : 'none',
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
            background: `radial-gradient(circle, rgba(226,192,110,0.7) 0%, rgba(226,192,110,0) 70%)`,
            opacity: past('shimmer') ? 0 : (past('glow') ? 0.6 : 0),
            transform: past('shimmer')
              ? `translate(${p.drift}px, -${p.rise}px) scale(0)`
              : past('glow') ? 'translate(0, 0) scale(1)' : 'translate(0, 0) scale(0)',
            transition: `all ${p.duration}s ease-out ${p.delay}s`,
          }}
        />
      ))}

      <style>{`
        @keyframes splashPulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.06); opacity: 1; }
        }
        @keyframes splashLine {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
