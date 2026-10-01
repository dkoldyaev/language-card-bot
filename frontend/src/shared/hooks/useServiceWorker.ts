import { useCallback, useEffect, useRef, useState } from 'react';
import { saveAppState } from '../lib/statePersistence';

export interface UseServiceWorkerReturn {
  isUpdateAvailable: boolean;
  updateApp: () => void;
  registration: ServiceWorkerRegistration | null;
}

export function useServiceWorker(scriptUrl = '/sw.js'): UseServiceWorkerReturn {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState<boolean>(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const refreshingRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!('serviceWorker' in navigator)) {
      return;
    }

    // Step 3: Listen for controllerchange event with a boolean flag to prevent infinite reload loops
    const handleControllerChange = () => {
      if (refreshingRef.current) {
        return;
      }
      refreshingRef.current = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    let isMounted = true;

    const registerWorker = async () => {
      try {
        const reg = await navigator.serviceWorker.register(scriptUrl);
        if (!isMounted) {
          return;
        }
        setRegistration(reg);

        // Case 1: A service worker is already in waiting state
        if (reg.waiting) {
          waitingWorkerRef.current = reg.waiting;
          setIsUpdateAvailable(true);
        }

        // Case 2: A service worker is found and starts installing
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) {
            return;
          }

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              waitingWorkerRef.current = newWorker;
              if (isMounted) {
                setIsUpdateAvailable(true);
              }
            }
          });
        });
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    };

    registerWorker();

    return () => {
      isMounted = false;
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [scriptUrl]);

  // Step 2 & 4: Save state, then send SKIP_WAITING to waiting worker
  const updateApp = useCallback(() => {
    saveAppState();

    let targetWorker = waitingWorkerRef.current;
    if (!targetWorker && registration && registration.waiting) {
      targetWorker = registration.waiting;
    }

    if (targetWorker) {
      targetWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      if (!refreshingRef.current) {
        refreshingRef.current = true;
        window.location.reload();
      }
    }
  }, [registration]);

  return {
    isUpdateAvailable,
    updateApp,
    registration,
  };
}

export default useServiceWorker;
