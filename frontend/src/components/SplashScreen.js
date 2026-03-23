import React, { useState, useEffect, useMemo } from 'react';

const SplashScreen = ({ onComplete }) => {
  const [phase, setPhase] = useState('black');

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('rays'), 150),
      setTimeout(() => setPhase('logo'), 500),
      setTimeout(() => setPhase('text'), 1000),
      setTimeout(() => setPhase('flare'), 1500),
      setTimeout(() => setPhase('settle'), 2000),
      setTimeout(() => setPhase('exit'), 2500),
      setTimeout(() => onComplete(), 3000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  const past = (p) => {
    const order = ['black', 'rays', 'logo', 'text', 'flare', 'settle', 'exit'];
    return order.indexOf(phase) >= order.indexOf(p);
  };

  const sparks = useMemo(() =>
    [...Array(60)].map((_, i) => {
      const angle = (Math.PI * 2 * i) / 60 + (Math.random() - 0.5) * 0.3;
      const dist = 80 + Math.random() * 200;
      return {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        size: 1 + Math.random() * 3,
        delay: Math.random() * 0.5,
        duration: 0.8 + Math.random() * 1.2,
        opacity: 0.4 + Math.random() * 0.6,
      };
    }), []);

  const floaters = useMemo(() =>
    [...Array(20)].map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 2,
      delay: Math.random() * 3,
      duration: 3 + Math.random() * 4,
    })), []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{
        background: '#0a0a0c',
        opacity: phase === 'exit' ? 0 : 1,
        transition: 'opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      data-testid="splash-screen"
    >
      {/* Deep ambient background gradient */}
      <div className="absolute inset-0" style={{
        background: `
          radial-gradient(ellipse 120% 80% at 50% 50%, rgba(30,20,10,0.6) 0%, transparent 70%),
          radial-gradient(ellipse 60% 40% at 50% 45%, rgba(212,179,106,0.04) 0%, transparent 60%)
        `,
        opacity: past('rays') ? 1 : 0,
        transition: 'opacity 1.5s ease-out',
      }} />

      {/* Cinematic light rays from center */}
      <div className="absolute" style={{
        width: '100vmax',
        height: '100vmax',
        opacity: past('rays') ? (past('settle') ? 0.03 : 0.12) : 0,
        transition: past('settle') ? 'opacity 1.5s ease-out' : 'opacity 1.5s ease-out',
      }}>
        {[...Array(12)].map((_, i) => (
          <div key={i} className="absolute left-1/2 top-1/2" style={{
            width: '2px',
            height: past('logo') ? '50vmax' : '0px',
            background: `linear-gradient(to top, rgba(226,192,110,0.5) 0%, rgba(226,192,110,0.1) 40%, transparent 100%)`,
            transformOrigin: 'bottom center',
            transform: `translate(-50%, -100%) rotate(${i * 30}deg)`,
            transition: `height 1.4s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.04}s`,
          }} />
        ))}
      </div>

      {/* Expanding golden ring - outer */}
      <div className="absolute" style={{
        width: past('text') ? '320px' : '0px',
        height: past('text') ? '320px' : '0px',
        borderRadius: '50%',
        border: '1px solid rgba(212,179,106,0.15)',
        opacity: past('text') ? (past('settle') ? 0.05 : 0.3) : 0,
        transition: 'all 1.5s cubic-bezier(0.16, 1, 0.3, 1)',
      }} />

      {/* Expanding golden ring - inner */}
      <div className="absolute" style={{
        width: past('logo') ? '200px' : '0px',
        height: past('logo') ? '200px' : '0px',
        borderRadius: '50%',
        border: '1px solid rgba(212,179,106,0.2)',
        opacity: past('logo') ? (past('settle') ? 0.06 : 0.35) : 0,
        transition: 'all 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }} />

      {/* Pulsing warm core glow */}
      <div className="absolute" style={{
        width: '250px',
        height: '250px',
        background: 'radial-gradient(circle, rgba(212,179,106,0.15) 0%, rgba(212,179,106,0.04) 40%, transparent 70%)',
        opacity: past('logo') ? 1 : 0,
        transform: past('logo') ? 'scale(1)' : 'scale(0.2)',
        transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1)',
        animation: past('text') ? 'splashCoreBreath 3s ease-in-out infinite' : 'none',
      }} />

      {/* Spark burst on logo reveal */}
      {sparks.map((s, i) => (
        <div key={`spark-${i}`} className="absolute rounded-full" style={{
          width: `${s.size}px`,
          height: `${s.size}px`,
          background: `radial-gradient(circle, rgba(226,192,110,${s.opacity}) 0%, rgba(226,192,110,0) 70%)`,
          left: '50%',
          top: '50%',
          opacity: past('flare') ? 0 : (past('text') ? 0.8 : 0),
          transform: past('text')
            ? `translate(calc(-50% + ${s.x}px), calc(-50% + ${s.y}px)) scale(${past('flare') ? 0 : 1})`
            : 'translate(-50%, -50%) scale(0)',
          transition: `all ${s.duration}s cubic-bezier(0.16, 1, 0.3, 1) ${s.delay}s`,
        }} />
      ))}

      {/* Main content container */}
      <div className="relative flex flex-col items-center">
        {/* Logo image with dramatic reveal */}
        <div style={{
          opacity: past('logo') ? 1 : 0,
          transform: past('logo')
            ? 'translateY(0) scale(1)'
            : 'translateY(30px) scale(0.7)',
          filter: past('flare')
            ? 'brightness(1) drop-shadow(0 0 30px rgba(212,179,106,0.2))'
            : past('text')
              ? 'brightness(1.15) drop-shadow(0 0 60px rgba(212,179,106,0.35))'
              : 'brightness(0.8)',
          transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <img
            src="/venuloq-logo-transparent.png"
            alt="VenuLoQ"
            className="w-[300px] sm:w-[380px] md:w-[420px] h-auto"
            data-testid="splash-logo"
          />
        </div>

        {/* Horizontal gold line — cinematic divider */}
        <div className="relative mt-6 h-[1px] overflow-hidden" style={{
          width: past('text') ? '160px' : '0px',
          transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(90deg, transparent 0%, #D4B36A 30%, #F5E6B8 50%, #D4B36A 70%, transparent 100%)',
          }} />
          {/* Shimmer traveling along the line */}
          <div style={{
            position: 'absolute',
            top: '-2px',
            width: '30%',
            height: '5px',
            background: 'radial-gradient(ellipse, rgba(255,240,192,0.9) 0%, transparent 70%)',
            left: past('flare') ? '100%' : '-30%',
            transition: 'left 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }} />
        </div>

        {/* Tagline with staggered letter reveal */}
        <div className="mt-5 flex items-center gap-[2px]" style={{
          opacity: past('text') ? 1 : 0,
          transition: 'opacity 0.5s ease-out',
        }}>
          {'FIND.  COMPARE.  LOCK.'.split('').map((char, i) => (
            <span
              key={i}
              className="inline-block"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '11px',
                letterSpacing: '0.3em',
                fontWeight: 400,
                color: char === ' ' ? 'transparent' : undefined,
                background: char !== ' ' ? 'linear-gradient(180deg, rgba(212,179,106,0.9) 0%, rgba(212,179,106,0.5) 100%)' : undefined,
                WebkitBackgroundClip: char !== ' ' ? 'text' : undefined,
                WebkitTextFillColor: char !== ' ' ? 'transparent' : undefined,
                backgroundClip: char !== ' ' ? 'text' : undefined,
                opacity: past('text') ? 1 : 0,
                transform: past('text') ? 'translateY(0)' : 'translateY(8px)',
                transition: `all 0.4s ease-out ${0.03 * i + 0.2}s`,
              }}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
        </div>
      </div>

      {/* Lens flare sweep across entire screen */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div style={{
          position: 'absolute',
          top: '30%',
          width: '8%',
          height: '40%',
          left: past('flare') ? '120%' : '-20%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), rgba(255,240,192,0.08), rgba(255,255,255,0.03), transparent)',
          transform: 'skewX(-15deg)',
          transition: 'left 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        }} />
      </div>

      {/* Ambient floating particles (ongoing) */}
      {floaters.map((f, i) => (
        <div
          key={`float-${i}`}
          className="absolute rounded-full"
          style={{
            width: `${f.size}px`,
            height: `${f.size}px`,
            left: `${f.x}%`,
            top: `${f.y}%`,
            background: 'rgba(212,179,106,0.3)',
            opacity: past('settle') ? 0.4 : 0,
            transition: 'opacity 1s ease-out',
            animation: past('settle') ? `splashFloat ${f.duration}s ease-in-out ${f.delay}s infinite` : 'none',
          }}
        />
      ))}

      {/* Bottom gradient fade — cinematic letterbox feel */}
      <div className="absolute bottom-0 left-0 right-0 h-32" style={{
        background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 100%)',
        opacity: past('logo') ? 1 : 0,
        transition: 'opacity 1s ease-out',
      }} />
      <div className="absolute top-0 left-0 right-0 h-32" style={{
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)',
        opacity: past('logo') ? 1 : 0,
        transition: 'opacity 1s ease-out',
      }} />

      <style>{`
        @keyframes splashCoreBreath {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes splashFloat {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.3; }
          50% { transform: translateY(-15px) scale(1.3); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
