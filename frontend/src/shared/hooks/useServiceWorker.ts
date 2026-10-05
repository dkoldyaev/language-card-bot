import { useRegisterSW } from 'virtual:pwa-register/react';
import { useCallback } from 'react';
import { saveAppState } from '../lib/statePersistence';

export interface UseServiceWorkerReturn {
  isUpdateAvailable: boolean;
  updateApp: () => void;
  needRefresh: boolean;
  offlineReady: boolean;
}

export function useServiceWorker(): UseServiceWorkerReturn {
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW();

  const updateApp = useCallback(() => {
    saveAppState();
    updateServiceWorker(true);
  }, [updateServiceWorker]);

  return {
    isUpdateAvailable: needRefresh,
    updateApp,
    needRefresh,
    offlineReady,
  };
}

export default useServiceWorker;
