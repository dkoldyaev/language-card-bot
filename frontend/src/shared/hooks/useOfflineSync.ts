import { isAxiosError } from 'axios';
import { useCallback, useEffect, useRef } from 'react';
import useStore from '../../store/useStore';
import api from '../api/client';

export function useOfflineSync() {
  const setIsOffline = useStore((state) => state.setIsOffline);
  const removeSyncAction = useStore((state) => state.removeSyncAction);
  const isSyncingRef = useRef<boolean>(false);

  const syncData = useCallback(async () => {
    if (isSyncingRef.current) {
      return;
    }
    const currentQueue = useStore.getState().syncQueue;
    if (currentQueue.length === 0) {
      return;
    }

    isSyncingRef.current = true;

    try {
      // Process actions sequentially
      for (const action of currentQueue) {
        let shouldRemove = false;
        try {
          if (action.type === 'DELETE_WORD') {
            await api.delete(`/word_delete/${action.wordId}`);
          } else if (action.type === 'DELETE_DEFINITION') {
            await api.delete(`/definition_delete/${action.definitionId}`);
          } else if (action.type === 'EDIT_TRANSLATION') {
            await api.put(`/definition_translate_edit/${action.definitionId}`, {
              text: action.text,
            });
          }
          shouldRemove = true;
        } catch (error: unknown) {
          if (isAxiosError(error) && error.response) {
            const status = error.response.status;
            if (status === 404 || status === 409) {
              console.warn(`Collision or entity not found for action ${action.type}, discarding action.`);
              shouldRemove = true;
            } else {
              console.error(`Failed to sync action ${action.type}, halting sync.`, error);
              break;
            }
          } else {
            console.error(`Network or unexpected error while syncing action ${action.type}, halting sync.`, error);
            break;
          }
        }

        if (shouldRemove) {
          removeSyncAction(action.id);
        }
      }
    } finally {
      isSyncingRef.current = false;
    }
  }, [removeSyncAction]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      syncData();
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (navigator.onLine) {
      syncData();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOffline, syncData]);
}
