import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.venuloq.app',
  appName: 'VenuLoQ',
  webDir: 'build',
  
  // Server configuration — for development, point to your live server
  // For production builds, remove the server block to use local assets
  // server: {
  //   url: 'https://testing.delhi.venuloq.com',
  //   cleartext: true,
  // },

  ios: {
    // Content inset adjustment for iOS WebView
    contentInset: 'automatic',
    // Allow inline media playback
    allowsLinkPreview: false,
    // Smooth scrolling
    scrollEnabled: true,
    // Scheme for local server
    scheme: 'venuloq',
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 500,
      backgroundColor: '#0B0B0D',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0B0B0D',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
