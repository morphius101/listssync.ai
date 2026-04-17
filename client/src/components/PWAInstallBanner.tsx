import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';

export function PWAInstallBanner() {
  const [location] = useLocation();
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isDashboard = location.startsWith('/dashboard') || location.startsWith('/checklist');
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                       || (window.navigator as any).standalone === true;

  useEffect(() => {
    if (isStandalone || !isMobile || !isDashboard) return;
    if (localStorage.getItem('pwa-install-dismissed')) return;

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const timer = setTimeout(() => setShow(true), 30000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timer);
    };
  }, [isDashboard, isMobile, isStandalone]);

  // iOS Safari has no beforeinstallprompt — show instructions banner instead
  useEffect(() => {
    if (!isIOS || !isDashboard || isStandalone) return;
    if (localStorage.getItem('pwa-install-dismissed')) return;
    const timer = setTimeout(() => setShow(true), 30000);
    return () => clearTimeout(timer);
  }, [isIOS, isDashboard, isStandalone]);

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        localStorage.setItem('pwa-install-dismissed', 'true');
      }
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'white', borderTop: '1px solid #e5e7eb',
      padding: '12px 16px', display: 'flex', alignItems: 'center',
      gap: '12px', zIndex: 9999, boxShadow: '0 -4px 12px rgba(0,0,0,0.08)'
    }}>
      <img src="/icon-192x192.svg" alt="ListsSync"
           style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#111827' }}>
          Add ListsSync to your home screen
        </p>
        {isIOS ? (
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>
            Tap the Share button (⬆) then "Add to Home Screen"
          </p>
        ) : (
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>
            Open instantly · Works offline
          </p>
        )}
      </div>
      <button onClick={handleDismiss} style={{
        background: 'none', border: '1px solid #e5e7eb', borderRadius: 8,
        padding: '6px 12px', fontSize: 13, color: '#6b7280', cursor: 'pointer',
        flexShrink: 0
      }}>
        Not now
      </button>
      {!isIOS && (
        <button onClick={handleInstall} style={{
          background: '#4f46e5', border: 'none', borderRadius: 8,
          padding: '6px 12px', fontSize: 13, color: 'white',
          cursor: 'pointer', flexShrink: 0, fontWeight: 500
        }}>
          Install
        </button>
      )}
    </div>
  );
}
