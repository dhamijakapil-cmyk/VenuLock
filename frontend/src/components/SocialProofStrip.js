import React, { useState, useEffect, useRef } from 'react';
import { Shield, Star, Calendar, Users } from 'lucide-react';

const STATS = [
  { label: 'Events Hosted', value: 2500, suffix: '+', icon: Calendar },
  { label: 'Verified Venues', value: 150, suffix: '+', icon: Shield },
  { label: 'Avg. Rating', value: 4.8, suffix: '', icon: Star, decimal: true },
  { label: 'Happy Couples', value: 1800, suffix: '+', icon: Users },
];

const AnimatedCounter = ({ target, suffix = '', decimal = false, triggered }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!triggered) return;
    let start = 0;
    const duration = 1800;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(decimal ? Math.round(start * 10) / 10 : Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [triggered, target, decimal]);

  return (
    <span className="tabular-nums">
      {decimal ? count.toFixed(1) : count.toLocaleString()}{suffix}
    </span>
  );
};

const SocialProofStrip = () => {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="bg-[#111111] py-6 md:py-8" data-testid="social-proof-strip">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-2xl md:text-3xl font-bold text-white">
                    <AnimatedCounter
                      target={stat.value}
                      suffix={stat.suffix}
                      decimal={stat.decimal}
                      triggered={visible}
                    />
                  </span>
                </div>
                <p className="text-xs md:text-sm text-white/50 font-medium">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SocialProofStrip;
