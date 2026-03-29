import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed this session
    if (sessionStorage.getItem('pwa-prompt-dismissed')) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show after a short delay so it doesn't appear immediately on load
      setTimeout(() => setShow(true), 5000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShow(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    sessionStorage.setItem('pwa-prompt-dismissed', '1');
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-4">
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 rounded-lg p-2 shrink-0">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">Install ListsSync.ai</p>
          <p className="text-xs text-gray-500 mt-0.5">Add to your home screen for quick access, even offline.</p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={handleInstall} className="text-xs h-8">
              Install
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss} className="text-xs h-8">
              Not now
            </Button>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
