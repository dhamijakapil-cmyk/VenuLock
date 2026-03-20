import { useEffect } from 'react';

const SEOHead = ({ title, description, path, image }) => {
  useEffect(() => {
    const base = 'VenuLoQ';
    const fullTitle = title ? `${title} | ${base}` : `${base} - Premium Venue Marketplace`;
    const desc = description || 'Discover and book premium event venues across India. Find the perfect banquet hall, hotel, or wedding venue for your celebration.';
    const url = `https://venuloq.com${path || ''}`;
    const img = image || 'https://venuloq.com/og-image.jpg';

    document.title = fullTitle;

    const setMeta = (attr, key, value) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };

    setMeta('name', 'description', desc);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:image', img);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', 'VenuLoQ');
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', desc);
    setMeta('name', 'twitter:image', img);

    return () => {
      document.title = `${base} - Premium Venue Marketplace`;
    };
  }, [title, description, path, image]);

  return null;
};

export default SEOHead;
