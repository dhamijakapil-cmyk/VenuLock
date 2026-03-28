/**
 * VenuLoQ — Capacitor Native Bridge
 * Initializes native plugins when running inside Capacitor iOS shell.
 * Safe to import in browser/PWA — all calls are guarded by platform checks.
 */
import { isCapacitor } from './platform';

let StatusBar, Haptics, Keyboard, SplashScreen;

export const initNativeBridge = async () => {
  if (!isCapacitor()) return;

  try {
    // Dynamic imports — only loaded inside Capacitor
    const statusBarModule = await import('@capacitor/status-bar');
    StatusBar = statusBarModule.StatusBar;

    const hapticsModule = await import('@capacitor/haptics');
    Haptics = hapticsModule.Haptics;

    const keyboardModule = await import('@capacitor/keyboard');
    Keyboard = keyboardModule.Keyboard;

    const splashModule = await import('@capacitor/splash-screen');
    SplashScreen = splashModule.SplashScreen;

    // Configure status bar
    await StatusBar.setStyle({ style: 'DARK' });
    await StatusBar.setBackgroundColor({ color: '#0B0B0D' });

    // Hide splash after React renders
    setTimeout(() => {
      SplashScreen.hide({ fadeOutDuration: 500 });
    }, 1500);

    // Keyboard behavior
    Keyboard.setAccessoryBarVisible({ isVisible: false });

    console.log('[VenuLoQ] Native bridge initialized');
  } catch (err) {
    console.warn('[VenuLoQ] Native bridge init error:', err);
  }
};

/** Trigger a light haptic tap — for button presses, tab switches */
export const hapticTap = async () => {
  if (!isCapacitor() || !Haptics) return;
  try {
    await Haptics.impact({ style: 'LIGHT' });
  } catch {}
};

/** Trigger a medium haptic — for successful actions */
export const hapticSuccess = async () => {
  if (!isCapacitor() || !Haptics) return;
  try {
    await Haptics.notification({ type: 'SUCCESS' });
  } catch {}
};

/** Trigger an error haptic — for failed actions */
export const hapticError = async () => {
  if (!isCapacitor() || !Haptics) return;
  try {
    await Haptics.notification({ type: 'ERROR' });
  } catch {}
};
