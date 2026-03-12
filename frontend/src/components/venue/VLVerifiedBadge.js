import React, { useState } from 'react';
import { Shield, Check } from 'lucide-react';

const VERIFICATION_POINTS = [
  'Physical site inspection completed',
  'Legal documentation verified',
  'Pricing transparency confirmed',
  'Safety & hygiene standards met',
  'Customer reviews authenticated',
];

const VLVerifiedBadge = ({ size = 'default', showTooltip = true }) => {
  const [isOpen, setIsOpen] = useState(false);

  const sizeClasses = {
    small: 'px-2 py-0.5 text-[9px] gap-1',
    default: 'px-3 py-1.5 text-[10px] gap-1.5',
    large: 'px-4 py-2 text-xs gap-2',
  };

  const iconSizes = {
    small: 'w-2.5 h-2.5',
    default: 'w-3 h-3',
    large: 'w-4 h-4',
  };

  return (
    <div className="relative inline-block">
      <button
        className={`inline-flex items-center bg-[#D4B36A] rounded-full font-bold text-[#111111] uppercase tracking-wider cursor-pointer hover:bg-[#C4A030] transition-colors ${sizeClasses[size]}`}
        onMouseEnter={() => showTooltip && setIsOpen(true)}
        onMouseLeave={() => showTooltip && setIsOpen(false)}
        onClick={() => showTooltip && setIsOpen(!isOpen)}
        data-testid="vl-verified-badge"
      >
        <Shield className={iconSizes[size]} />
        VL Verified
      </button>

      {/* Tooltip */}
      {showTooltip && isOpen && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-[#111111] rounded-xl p-4 shadow-2xl z-50 animate-scaleIn"
          data-testid="vl-verified-tooltip"
        >
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
            <Shield className="w-4 h-4 text-[#D4B36A]" />
            <span className="text-white text-sm font-bold">VenuLoQ Verified</span>
          </div>
          <p className="text-white/60 text-xs mb-3">
            This venue has passed our rigorous verification process:
          </p>
          <ul className="space-y-2">
            {VERIFICATION_POINTS.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/80">
                <Check className="w-3.5 h-3.5 text-[#D4B36A] mt-0.5 flex-shrink-0" />
                {point}
              </li>
            ))}
          </ul>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-[#111111]" />
        </div>
      )}
    </div>
  );
};

export default VLVerifiedBadge;
