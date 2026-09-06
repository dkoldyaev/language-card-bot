import { init, track } from '@plausible-analytics/tracker';

const scriptTag = document.querySelector('script[data-domain]') as HTMLScriptElement | null;
const envDomain = import.meta.env.FRONTEND_BASE_DOMAIN
  ? import.meta.env.FRONTEND_BASE_DOMAIN.replace(/^https?:\/\//, '')
  : window.location.hostname;
const domain = scriptTag?.getAttribute('data-domain') || envDomain;
const endpoint = scriptTag ? new URL('/api/event', scriptTag.src).toString() : undefined;

const canTrack = typeof ResizeObserver !== 'undefined';

if (canTrack) {
  init({ domain, endpoint });
}

export const plausible = {
  trackEvent: (eventName: string, props?: Record<string, string | number | boolean>) => {
    if (!canTrack) return;
    track(eventName, {
      props: props ? Object.fromEntries(Object.entries(props).map(([key, value]) => [key, String(value)])) : undefined,
    });
  },
};

export const trackEvent = plausible.trackEvent;
