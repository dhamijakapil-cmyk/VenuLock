import React, { useState, useEffect } from 'react';

const SplashScreen = ({ onComplete }) => {
  const [phase, setPhase] = useState('enter'); // enter -> hold -> exit

  useEffect(() => {
    const holdTimer = setTimeout(() => setPhase('hold'), 100);
    const exitTimer = setTimeout(() => setPhase('exit'), 1600);
    const doneTimer = setTimeout(() => onComplete(), 2200);
    return () => { clearTimeout(holdTimer); clearTimeout(exitTimer); clearTimeout(doneTimer); };
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0B0B0D]"
      style={{
        opacity: phase === 'exit' ? 0 : 1,
        transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: phase === 'exit' ? 'none' : 'all',
      }}
      data-testid="splash-screen"
    >
      {/* Subtle radial glow behind wordmark */}
      <div
        className="absolute w-[300px] h-[300px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(212,179,106,0.06) 0%, transparent 70%)',
          opacity: phase === 'enter' ? 0 : 1,
          transition: 'opacity 1s ease-out 0.2s',
        }}
      />

      {/* Wordmark */}
      <div
        className="relative"
        style={{
          opacity: phase === 'enter' ? 0 : 1,
          transform: phase === 'enter' ? 'translateY(12px)' : 'translateY(0)',
          transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <span
          className="text-[36px] sm:text-[44px] tracking-[-0.01em]"
          style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', serif" }}
        >
          <span style={{ color: '#D4B36A', fontWeight: 700, fontStyle: 'italic', fontSize: '42px' }}>V</span>
          <span className="text-[#F4F1EC] font-semibold">enuLo</span>
          <span style={{ color: '#D4B36A', fontWeight: 700, fontSize: '42px' }}>Q</span>
        </span>
      </div>

      {/* Tagline */}
      <div
        style={{
          opacity: phase === 'enter' ? 0 : 1,
          transform: phase === 'enter' ? 'translateY(8px)' : 'translateY(0)',
          transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
        }}
      >
        <p className="text-[10px] text-[#D4B36A]/40 uppercase tracking-[0.25em] font-medium mt-3">
          Find. Compare. Lock.
        </p>
      </div>

      {/* Subtle gold line accent */}
      <div
        className="mt-6"
        style={{
          width: phase === 'enter' ? '0px' : '40px',
          height: '1.5px',
          background: 'linear-gradient(90deg, transparent, #D4B36A, transparent)',
          transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s',
        }}
      />
    </div>
  );
};

export default SplashScreen;
