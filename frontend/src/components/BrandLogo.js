import React from 'react';
import { Link } from 'react-router-dom';

/**
 * VenuLoQ Brand Logo
 * 
 * Brand Kit Rules:
 * - "VenuLo" in Cormorant Garamond serif
 * - "Q" in gold (#D4B36A) — the hero letter of the brand
 * - On dark backgrounds: "VenuLo" in cream (#F4F1EC), "Q" in gold
 * - On light backgrounds: "VenuLo" in obsidian (#0B0B0D), "Q" in gold
 * - Optional tagline: "FIND. COMPARE. LOCK." in DM Sans small caps
 * - Optional arch icon above (for large/marketing uses)
 */

// The arch/keyhole icon from the brand kit
const ArchIcon = ({ color = '#D4B36A', size = 24 }) => (
  <svg width={size} height={size * 0.85} viewBox="0 0 48 41" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Arch/building entrance */}
    <path d="M8 40V18C8 9.16 15.16 2 24 2C32.84 2 40 9.16 40 18V40" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    {/* Keyhole circle */}
    <circle cx="24" cy="22" r="6" stroke={color} strokeWidth="2" />
    {/* Keyhole slot */}
    <path d="M24 28V36" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    {/* Pillars base */}
    <path d="M4 40H44" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const SIZES = {
  // Compact — nav headers on inner pages
  sm: { text: '18px', q: '21px', tagline: false, icon: false, gap: '0px' },
  // Standard — main headers, landing nav
  md: { text: '22px', q: '26px', tagline: false, icon: false, gap: '0px' },
  // Large — auth pages, splash screen
  lg: { text: '28px', q: '33px', tagline: true, icon: false, gap: '4px' },
  // Hero — landing page hero, marketing
  xl: { text: '36px', q: '42px', tagline: true, icon: true, gap: '8px' },
};

const BrandLogo = ({
  size = 'md',
  dark = false,       // true = on dark background
  showTagline = null,  // override auto tagline
  showIcon = null,     // override auto icon
  linkTo = '/',
  className = '',
}) => {
  const config = SIZES[size] || SIZES.md;
  const mainColor = dark ? '#F4F1EC' : '#0B0B0D';
  const goldColor = '#D4B36A';
  const shouldShowTagline = showTagline !== null ? showTagline : config.tagline;
  const shouldShowIcon = showIcon !== null ? showIcon : config.icon;

  const LogoContent = () => (
    <div className={`inline-flex flex-col items-start ${className}`} data-testid="brand-logo">
      {/* Arch icon — large/marketing only */}
      {shouldShowIcon && (
        <div style={{ marginBottom: config.gap }}>
          <ArchIcon color={goldColor} size={size === 'xl' ? 32 : 24} />
        </div>
      )}
      
      {/* Wordmark */}
      <div className="flex items-baseline" style={{ lineHeight: 1 }}>
        <span
          style={{
            fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
            fontSize: config.text,
            color: mainColor,
            fontWeight: 600,
            letterSpacing: '-0.01em',
          }}
        >
          VenuLo
        </span>
        <span
          style={{
            fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
            fontSize: config.q,
            color: goldColor,
            fontWeight: 700,
            letterSpacing: '-0.01em',
          }}
        >
          Q
        </span>
      </div>

      {/* Tagline */}
      {shouldShowTagline && (
        <span
          className="mt-1"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: size === 'xl' ? '10px' : '8px',
            color: dark ? 'rgba(244,241,236,0.35)' : 'rgba(11,11,13,0.35)',
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          Find. Compare. Lock.
        </span>
      )}
    </div>
  );

  if (linkTo) {
    return (
      <Link
        to={linkTo}
        className="inline-flex items-center hover:opacity-90 transition-opacity"
        data-testid="logo-link"
      >
        <LogoContent />
      </Link>
    );
  }

  return <LogoContent />;
};

export default BrandLogo;
