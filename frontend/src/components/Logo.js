import React from 'react';
import { Link } from 'react-router-dom';

// BookMyVenue Logo Component - Consistent branding across all pages
const Logo = ({ 
  size = 'default', // 'small', 'default', 'large'
  variant = 'full', // 'full', 'icon', 'text'
  linkTo = '/',
  className = '',
  showTagline = false,
}) => {
  const sizes = {
    small: { icon: 28, text: 'text-lg', tagline: 'text-[10px]' },
    default: { icon: 36, text: 'text-xl md:text-2xl', tagline: 'text-xs' },
    large: { icon: 48, text: 'text-3xl md:text-4xl', tagline: 'text-sm' },
  };

  const config = sizes[size] || sizes.default;

  // BMV Icon - Stylized venue/building mark
  const IconMark = () => (
    <svg 
      width={config.icon} 
      height={config.icon} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      {/* Background shape */}
      <rect width="48" height="48" fill="#0B1F3B" />
      
      {/* Gold accent bar */}
      <rect x="0" y="40" width="48" height="8" fill="#C9A227" />
      
      {/* Building silhouette */}
      <path 
        d="M12 36V20L24 12L36 20V36H30V28H18V36H12Z" 
        fill="white"
      />
      
      {/* Door */}
      <rect x="21" y="28" width="6" height="8" fill="#0B1F3B" />
      
      {/* Windows */}
      <rect x="15" y="22" width="4" height="4" fill="#C9A227" />
      <rect x="29" y="22" width="4" height="4" fill="#C9A227" />
    </svg>
  );

  // Text Logo
  const TextLogo = () => (
    <div className="flex flex-col">
      <span className={`font-serif font-bold leading-tight ${config.text}`}>
        <span className="text-[#0B1F3B]">Book</span>
        <span className="text-[#C9A227]">My</span>
        <span className="text-[#0B1F3B]">Venue</span>
      </span>
      {showTagline && (
        <span className={`text-[#64748B] font-sans ${config.tagline} tracking-wide`}>
          India's Premium Venue Marketplace
        </span>
      )}
    </div>
  );

  const LogoContent = () => {
    if (variant === 'icon') {
      return <IconMark />;
    }
    if (variant === 'text') {
      return <TextLogo />;
    }
    // Full logo - icon + text
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <IconMark />
        <TextLogo />
      </div>
    );
  };

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

export default Logo;
