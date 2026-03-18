import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

const InstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Don't show if already installed or dismissed recently
    const dismissed = sessionStorage.getItem('venuloq_install_dismissed');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (dismissed || isStandalone) return;

    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    // For Android/Chrome — capture the beforeinstallprompt event
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShowPrompt(true), 3000);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // For iOS — show instruction after delay
    if (ios) {
      setTimeout(() => setShowPrompt(true), 5000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setShowPrompt(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('venuloq_install_dismissed', '1');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-slideUp" data-testid="install-prompt">
      <div className="bg-[#0B0B0D] border border-[#E2C06E]/20 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-lg">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-white/40 hover:text-white/70 transition-colors"
          data-testid="install-dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#E2C06E]/20 to-[#D4B36A]/10 flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-6 h-6 text-[#E2C06E]" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-white text-[14px] font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Get the VenuLoQ App
            </h4>
            <p className="text-white/50 text-[11px] mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {isIOS
                ? 'Tap the share button, then "Add to Home Screen"'
                : 'Install for faster access & offline browsing'}
            </p>
          </div>
          {!isIOS && deferredPrompt && (
            <button
              onClick={handleInstall}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#E2C06E] text-[#0B0B0D] rounded-xl text-[11px] font-bold uppercase tracking-wider flex-shrink-0 shadow-[0_2px_12px_rgba(226,192,110,0.3)]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
              data-testid="install-button"
            >
              <Download className="w-3.5 h-3.5" />
              Install
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slideUp { animation: slideUp 0.4s ease-out; }
      `}</style>
    </div>
  );
};

export default InstallPrompt;
