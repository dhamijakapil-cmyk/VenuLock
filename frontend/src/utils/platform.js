/**
 * Platform detection utility for VenuLoQ
 * Detects if running inside Capacitor native shell vs. PWA vs. browser
 */

export const isCapacitor = () => {
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
};

export const isPWA = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
};

export const isNativeApp = () => isCapacitor() || isPWA();

export const getPlatform = () => {
  if (isCapacitor()) return 'capacitor';
  if (isPWA()) return 'pwa';
  return 'browser';
};
