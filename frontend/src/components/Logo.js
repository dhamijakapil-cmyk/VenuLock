import React from 'react';
import { Link } from 'react-router-dom';

// VenuLock Logo Component
// Brand: "Venu" in white/silver, "Lock" in gold (#C8A960)
// Tagline: WE TALK. YOU LOCK.

const SIZES = {
  header: { maxHeight: '30px', containerHeight: '32px' },
  sidebar: { maxHeight: '38px', containerHeight: '40px' },
  large: { maxHeight: '48px', containerHeight: '52px' },
};

const FallbackLogo = ({ size, darkBg }) => {
  const config = SIZES[size] || SIZES.header;
  const venuColor = darkBg ? 'text-white' : 'text-[#111111]';
  const lockColor = 'text-[#C8A960]';

  const textSizes = {
    header: 'text-lg',
    sidebar: 'text-xl',
    large: 'text-2xl',
  };

  const iconSizes = {
    header: { width: 22, height: 26 },
    sidebar: { width: 26, height: 32 },
    large: { width: 32, height: 38 },
  };

  const iconSize = iconSizes[size] || iconSizes.header;

  return (
    <div
      className="flex items-center gap-2"
      style={{ height: config.containerHeight }}
    >
      {/* VL Shield/Pin Icon */}
      <svg
        width={iconSize.width}
        height={iconSize.height}
        viewBox="0 0 36 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <path
          d="M18 0C9.716 0 3 6.716 3 15C3 26.25 18 42 18 42C18 42 33 26.25 33 15C33 6.716 26.284 0 18 0Z"
          fill="#C8A960"
        />
        <path
          d="M12 12L18 22L24 12"
          stroke={darkBg ? "#111" : "#111"}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M18 22V12"
          stroke={darkBg ? "#111" : "#111"}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>

      {/* Text */}
      <span className={`font-semibold ${textSizes[size] || textSizes.header} tracking-tight whitespace-nowrap`} style={{ fontFamily: "'Poppins', 'Montserrat', sans-serif" }}>
        <span className={venuColor}>Venu</span>
        <span className={lockColor}>Lock</span>
      </span>
    </div>
  );
};

const Logo = ({
  size = 'header',
  linkTo = '/',
  darkBg = false,
  className = '',
  useImage = true,
  imageSrc = '/assets/logo.png',
}) => {
  const config = SIZES[size] || SIZES.header;
  const [imageError, setImageError] = React.useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const LogoContent = () => {
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
          alt="VenuLock"
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

export const HeaderLogo = (props) => <Logo size="header" {...props} />;
export const SidebarLogo = (props) => <Logo size="sidebar" {...props} />;
export const AuthLogo = (props) => <Logo size="large" {...props} />;
export const LogoDark = (props) => <Logo darkBg={true} useImage={false} {...props} />;

export default Logo;
