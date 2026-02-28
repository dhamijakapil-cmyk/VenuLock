import React from 'react';
import { Link } from 'react-router-dom';

// BookMyVenue Logo Component - Consistent branding across all pages
// Using official logo image as placeholder

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_event-hub-india/artifacts/41ppf3i6_C1B29F13-17B9-4D9D-BB55-992C818B5B5B.png';

const Logo = ({ 
  size = 'default', // 'small', 'default', 'large'
  variant = 'full', // 'full' (with tagline area), 'compact' (logo only)
  linkTo = '/',
  className = '',
  darkBg = false, // For footer/dark backgrounds
}) => {
  // Height configurations for different sizes
  const heights = {
    small: 'h-8',      // 32px - for dashboard headers
    default: 'h-10',   // 40px - for main header
    large: 'h-14',     // 56px - for login/register pages
  };

  const heightClass = heights[size] || heights.default;

  const LogoImage = () => (
    <img 
      src={LOGO_URL}
      alt="BookMyVenue - Built for Better Events"
      className={`${heightClass} w-auto object-contain ${className}`}
      style={{ 
        maxWidth: size === 'small' ? '140px' : size === 'large' ? '220px' : '180px',
      }}
    />
  );

  // For light backgrounds, we need to invert or use a different approach
  // Since the logo has dark bg, we'll show it as-is on dark backgrounds
  // and add a subtle background on light backgrounds
  const LogoWrapper = ({ children }) => {
    if (darkBg) {
      return <div className="flex items-center">{children}</div>;
    }
    // On light backgrounds, show logo with slight styling adjustment
    return (
      <div className="flex items-center">
        {children}
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
        <LogoWrapper>
          <LogoImage />
        </LogoWrapper>
      </Link>
    );
  }

  return (
    <LogoWrapper>
      <LogoImage />
    </LogoWrapper>
  );
};

// Separate component for light background contexts (header, login pages)
// This creates a text-based logo that works on white backgrounds
export const LogoLight = ({ 
  size = 'default',
  linkTo = '/',
  showTagline = false,
}) => {
  const sizes = {
    small: { icon: 28, text: 'text-lg', tagline: 'text-[10px]' },
    default: { icon: 32, text: 'text-xl', tagline: 'text-xs' },
    large: { icon: 40, text: 'text-2xl', tagline: 'text-sm' },
  };

  const config = sizes[size] || sizes.default;

  const Content = () => (
    <div className="flex items-center gap-2">
      {/* Location Pin Icon */}
      <svg 
        width={config.icon} 
        height={config.icon * 1.2} 
        viewBox="0 0 40 48" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Pin shape */}
        <path 
          d="M20 0C11.716 0 5 6.716 5 15C5 26.25 20 42 20 42C20 42 35 26.25 35 15C35 6.716 28.284 0 20 0Z" 
          fill="#C9A227"
        />
        {/* Inner circle */}
        <circle cx="20" cy="15" r="6" fill="#0B1F3B" />
        {/* Ellipse shadow */}
        <ellipse cx="20" cy="46" rx="10" ry="2" fill="#C9A227" opacity="0.3" />
      </svg>
      
      {/* Text */}
      <div className="flex flex-col leading-tight">
        <span className={`font-semibold ${config.text} tracking-tight`}>
          <span className="text-[#0B1F3B]">Book</span>
          <span className="text-[#C9A227]">My</span>
          <span className="text-[#0B1F3B]">Venue</span>
        </span>
        {showTagline && (
          <span className={`text-[#C9A227] ${config.tagline} font-medium tracking-wide`}>
            Built for Better Events.
          </span>
        )}
      </div>
    </div>
  );

  if (linkTo) {
    return (
      <Link 
        to={linkTo} 
        className="inline-flex items-center hover:opacity-90 transition-opacity"
        data-testid="logo-link"
      >
        <Content />
      </Link>
    );
  }

  return <Content />;
};

// For dark backgrounds (footer, hero sections)
export const LogoDark = ({ 
  size = 'default',
  linkTo = '/',
  showTagline = false,
}) => {
  const sizes = {
    small: { icon: 28, text: 'text-lg', tagline: 'text-[10px]' },
    default: { icon: 32, text: 'text-xl', tagline: 'text-xs' },
    large: { icon: 40, text: 'text-2xl', tagline: 'text-sm' },
  };

  const config = sizes[size] || sizes.default;

  const Content = () => (
    <div className="flex items-center gap-2">
      {/* Location Pin Icon */}
      <svg 
        width={config.icon} 
        height={config.icon * 1.2} 
        viewBox="0 0 40 48" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Pin shape */}
        <path 
          d="M20 0C11.716 0 5 6.716 5 15C5 26.25 20 42 20 42C20 42 35 26.25 35 15C35 6.716 28.284 0 20 0Z" 
          fill="#C9A227"
        />
        {/* Inner circle */}
        <circle cx="20" cy="15" r="6" fill="#0B1F3B" />
        {/* Ellipse shadow */}
        <ellipse cx="20" cy="46" rx="10" ry="2" fill="#C9A227" opacity="0.5" />
      </svg>
      
      {/* Text */}
      <div className="flex flex-col leading-tight">
        <span className={`font-semibold ${config.text} tracking-tight`}>
          <span className="text-white">Book</span>
          <span className="text-[#C9A227]">My</span>
          <span className="text-white">Venue</span>
        </span>
        {showTagline && (
          <span className={`text-[#C9A227] ${config.tagline} font-medium tracking-wide`}>
            Built for Better Events.
          </span>
        )}
      </div>
    </div>
  );

  if (linkTo) {
    return (
      <Link 
        to={linkTo} 
        className="inline-flex items-center hover:opacity-90 transition-opacity"
        data-testid="logo-link"
      >
        <Content />
      </Link>
    );
  }

  return <Content />;
};

export default Logo;
