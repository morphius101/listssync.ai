declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

const DNT = typeof navigator !== 'undefined' && navigator.doNotTrack === '1';

const ATTRIBUTION_KEY = 'lss_attribution';
const ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Capture UTM params from the current URL on first touch.
// Stores to localStorage under ATTRIBUTION_KEY. Never overwrites existing entry.
export const captureUTM = (): void => {
  if (DNT) return;
  const params = new URLSearchParams(window.location.search);
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const captured: Record<string, string> = {};
  utmKeys.forEach(k => { const v = params.get(k); if (v) captured[k] = v; });
  if (!Object.keys(captured).length) return; // no UTM params — leave storage untouched

  if (localStorage.getItem(ATTRIBUTION_KEY)) return; // first-touch: never overwrite

  localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify({
    ...captured,
    captured_at: Date.now(),
    expires_at: Date.now() + ATTRIBUTION_TTL_MS,
  }));
};

// Initialize Google Analytics (skipped if DNT is set).
export const initGA = () => {
  if (DNT) return;

  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!measurementId) {
    console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    return;
  }

  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script1);

  const script2 = document.createElement('script');
  script2.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}');
  `;
  document.head.appendChild(script2);
};

export const trackPageView = (url: string) => {
  if (DNT || typeof window === 'undefined' || !window.gtag) return;
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!measurementId) return;
  window.gtag('config', measurementId, { page_path: url });
};

export interface DebugEvent {
  timestamp: Date;
  name: string;
  params: Record<string, unknown>;
}

// Populated only in dev builds — capped at 20 entries, newest first.
const debugBuffer: DebugEvent[] = [];

export const getDebugEvents = (): DebugEvent[] => [...debugBuffer];

export const trackEvent = (
  name: string,
  params: Record<string, unknown> = {}
) => {
  if (DNT || typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', name, params);

  if (import.meta.env.DEV) {
    debugBuffer.unshift({ timestamp: new Date(), name, params });
    if (debugBuffer.length > 20) debugBuffer.pop();
  }
};

// Attach userId and UTM attribution as GA4 user properties.
// Call once after a successful signup or sign-in.
export const identifyUser = (userId: string, traits?: Record<string, unknown>): void => {
  if (DNT || typeof window === 'undefined' || !window.gtag) return;

  const raw = localStorage.getItem(ATTRIBUTION_KEY);
  let attribution: Record<string, unknown> = {};
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.expires_at && Date.now() > parsed.expires_at) {
        localStorage.removeItem(ATTRIBUTION_KEY);
      } else {
        attribution = parsed;
      }
    } catch {
      localStorage.removeItem(ATTRIBUTION_KEY);
    }
  }

  window.gtag('set', 'user_properties', {
    user_id: userId,
    ...traits,
    ...(attribution.utm_source ? { utm_source: attribution.utm_source } : {}),
    ...(attribution.utm_medium ? { utm_medium: attribution.utm_medium } : {}),
    ...(attribution.utm_campaign ? { utm_campaign: attribution.utm_campaign } : {}),
    ...(attribution.utm_content ? { utm_content: attribution.utm_content } : {}),
    ...(attribution.utm_term ? { utm_term: attribution.utm_term } : {}),
  });
};

export const trackStripeEvent = (event: string, amount?: number, currency?: string) => {
  const params: Record<string, unknown> = { event_category: 'stripe' };
  if (currency !== undefined) params.currency = currency;
  if (amount !== undefined) params.value = amount;
  trackEvent(event, params);
};

export const trackUserAction = (action: string, details?: string) => {
  const params: Record<string, unknown> = { event_category: 'user_action' };
  if (details !== undefined) params.details = details;
  trackEvent(action, params);
};
