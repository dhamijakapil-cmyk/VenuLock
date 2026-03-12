import React from 'react';
import { Link } from 'react-router-dom';

// VenuLoQ Logo Component
// Brand: "VenuLo" in white/dark, "Q" in muted gold (#D4B36A)
// Tagline: FIND. COMPARE. LOCK.

const SIZES = {
  header: { maxHeight: '30px', containerHeight: '32px' },
  sidebar: { maxHeight: '38px', containerHeight: '40px' },
  large: { maxHeight: '48px', containerHeight: '52px' },
};

const FallbackLogo = ({ size, darkBg }) => {
  const config = SIZES[size] || SIZES.header;
  const mainColor = darkBg ? 'text-[#F4F1EC]' : 'text-[#0B0B0D]';
  const accentColor = 'text-[#D4B36A]';

  const textSizes = {
    header: 'text-lg',
    sidebar: 'text-xl',
    large: 'text-2xl',
  };

  return (
    <div
      className="flex items-center gap-1.5"
      style={{ height: config.containerHeight }}
    >
      <span className={`font-semibold ${textSizes[size] || textSizes.header} tracking-tight whitespace-nowrap`} style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
        <span className={mainColor}>VenuLo</span>
        <span className={accentColor}>Q</span>
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
          alt="VenuLoQ"
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
