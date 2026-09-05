import { init, track } from '@plausible-analytics/tracker';

const scriptTag = document.querySelector('script[data-domain]') as HTMLScriptElement;
const envDomain = import.meta.env.FRONTEND_BASE_DOMAIN 
  ? import.meta.env.FRONTEND_BASE_DOMAIN.replace(/^https?:\/\//, '')
  : window.location.hostname;

init({
  domain: scriptTag ? (scriptTag.getAttribute('data-domain') || envDomain) : envDomain,
  endpoint: scriptTag ? new URL(scriptTag.src).origin + '/api/event' : undefined,
});

export const trackEvent = (eventName: string, props?: Record<string, string | number | boolean>) => {
  track(eventName, { props: props as Record<string, string> });
};
