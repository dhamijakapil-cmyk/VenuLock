import React from 'react';
import { Link } from 'react-router-dom';

// BookMyVenue Logo Component
// To replace the logo: put your logo file at /public/assets/logo.png
// Supports: PNG with transparent background recommended

// Size configuration
const SIZES = {
  header: { maxHeight: '30px', containerHeight: '32px' },   // 28-32px for header
  sidebar: { maxHeight: '38px', containerHeight: '40px' },  // 36-40px for sidebar/dashboard
  large: { maxHeight: '48px', containerHeight: '52px' },    // For login/register pages
};

// Default fallback: SVG-based text logo when no image is provided
const FallbackLogo = ({ size, darkBg }) => {
  const config = SIZES[size] || SIZES.header;
  const textColor = darkBg ? 'text-white' : 'text-[#0B1F3B]';
  const accentColor = 'text-[#C9A227]';
  
  const textSizes = {
    header: 'text-lg',
    sidebar: 'text-xl',
    large: 'text-2xl',
  };
  
  const iconSizes = {
    header: { width: 24, height: 28 },
    sidebar: { width: 28, height: 34 },
    large: { width: 34, height: 40 },
  };
  
  const iconSize = iconSizes[size] || iconSizes.header;
  
  return (
    <div 
      className="flex items-center gap-2"
      style={{ height: config.containerHeight }}
    >
      {/* Location Pin Icon */}
      <svg 
        width={iconSize.width} 
        height={iconSize.height} 
        viewBox="0 0 40 48" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <path 
          d="M20 0C11.716 0 5 6.716 5 15C5 26.25 20 42 20 42C20 42 35 26.25 35 15C35 6.716 28.284 0 20 0Z" 
          fill="#C9A227"
        />
        <circle cx="20" cy="15" r="6" fill={darkBg ? "#0B1F3B" : "#0B1F3B"} />
        <ellipse cx="20" cy="46" rx="10" ry="2" fill="#C9A227" opacity="0.3" />
      </svg>
      
      {/* Text */}
      <span className={`font-semibold ${textSizes[size] || textSizes.header} tracking-tight whitespace-nowrap`}>
        <span className={textColor}>Book</span>
        <span className={accentColor}>My</span>
        <span className={textColor}>Venue</span>
      </span>
    </div>
  );
};

const Logo = ({ 
  size = 'header',           // 'header', 'sidebar', 'large'
  linkTo = '/',              // URL to navigate to, null to disable link
  darkBg = false,            // Set true for dark backgrounds
  className = '',
  useImage = true,           // Set false to force text logo
  imageSrc = '/assets/logo.png',  // Custom image source
}) => {
  const config = SIZES[size] || SIZES.header;
  const [imageError, setImageError] = React.useState(false);
  
  const handleImageError = () => {
    setImageError(true);
  };
  
  const LogoContent = () => {
    // If useImage is false or image failed to load, show fallback
    if (!useImage || imageError) {
      return <FallbackLogo size={size} darkBg={darkBg} />;
    }
    
    return (
      <div 
        className={`flex items-center justify-center ${className}`}
        style={{ height: config.containerHeight }}
      >
        <img 
          src={imageSrc}
          alt="BookMyVenue"
          className="w-auto object-contain"
          style={{ 
            maxHeight: config.maxHeight,
            height: 'auto',
          }}
          onError={handleImageError}
        />
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

// Export named variants for convenience
export const HeaderLogo = (props) => <Logo size="header" {...props} />;
export const SidebarLogo = (props) => <Logo size="sidebar" {...props} />;
export const AuthLogo = (props) => <Logo size="large" {...props} />;

// Also export the dark bg variants for footer, etc.
export const LogoDark = (props) => <Logo darkBg={true} useImage={false} {...props} />;

export default Logo;
