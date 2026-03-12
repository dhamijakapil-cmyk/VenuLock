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
  const accentColor = '#D4B36A';
  const mainColor = darkBg ? '#F4F1EC' : '#0B0B0D';

  const fontSizes = {
    header: { base: '18px', accent: '21px' },
    sidebar: { base: '20px', accent: '24px' },
    large: { base: '26px', accent: '30px' },
  };
  const fs = fontSizes[size] || fontSizes.header;

  return (
    <div
      className="flex items-center"
      style={{ height: config.containerHeight }}
    >
      <span className="tracking-[-0.01em]" style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', serif", fontSize: fs.base }}>
        <span style={{ color: accentColor, fontWeight: 700, fontStyle: 'italic', fontSize: fs.accent }}>V</span>
        <span style={{ color: mainColor, fontWeight: 600 }}>enuLo</span>
        <span style={{ color: accentColor, fontWeight: 700, fontSize: fs.accent }}>Q</span>
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
