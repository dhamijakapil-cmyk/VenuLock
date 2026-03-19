import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL;
const VAPID_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const { isAuthenticated, token } = useAuth();
  const subscribedRef = useRef(false);

  const subscribe = useCallback(async () => {
    if (!VAPID_KEY || !token) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
        });
      }

      const subJson = sub.toJSON();
      await fetch(`${API}/api/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        }),
      });

      subscribedRef.current = true;
    } catch (err) {
      // User denied or push not supported — fail silently
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated && !subscribedRef.current) {
      // Small delay so it doesn't block page load
      const timer = setTimeout(subscribe, 3000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, subscribe]);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'unsupported';
    const result = await Notification.requestPermission();
    if (result === 'granted') await subscribe();
    return result;
  }, [subscribe]);

  return {
    isSupported: 'PushManager' in window,
    permission: typeof Notification !== 'undefined' ? Notification.permission : 'denied',
    requestPermission,
  };
}
