import { useEffect } from 'react';

/**
 * Set SEO meta tags dynamically. Works without react-helmet.
 */
export function useSEO({ title, description, ogImage, ogType, canonical, jsonLd }) {
  useEffect(() => {
    if (title) document.title = title;

    const setMeta = (property, content) => {
      if (!content) return;
      const attr = property.startsWith('og:') ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${property}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, property);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('description', description);
    setMeta('og:title', title);
    setMeta('og:description', description);
    if (ogImage) setMeta('og:image', ogImage);
    if (ogType) setMeta('og:type', ogType);
    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canonical);
    }

    // JSON-LD
    if (jsonLd) {
      let script = document.getElementById('seo-jsonld');
      if (!script) {
        script = document.createElement('script');
        script.id = 'seo-jsonld';
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = typeof jsonLd === 'string' ? jsonLd : JSON.stringify(jsonLd);
    }

    return () => {
      const script = document.getElementById('seo-jsonld');
      if (script) script.remove();
    };
  }, [title, description, ogImage, ogType, canonical, jsonLd]);
}
