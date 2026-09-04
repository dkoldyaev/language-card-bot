import { useEffect, useCallback } from 'react';
import useStore from '../../store/useStore';
import api from '../api/axios';

export function useOfflineSync() {
  const setIsOffline = useStore(state => state.setIsOffline);
  const syncQueue = useStore(state => state.syncQueue);
  const clearSyncQueue = useStore(state => state.clearSyncQueue);

  const syncData = useCallback(async () => {
    if (syncQueue.length === 0) return;

    // Process actions sequentially
    for (const action of syncQueue) {
      try {
        if (action.type === 'DELETE_WORD') {
          await api.delete(`/api/dictionary/words/${action.wordId}`);
        } else if (action.type === 'DELETE_DEFINITION') {
          await api.delete(`/api/dictionary/words/${action.wordId}/definitions/${action.definitionId}`);
        } else if (action.type === 'EDIT_TRANSLATION') {
          await api.put(`/api/dictionary/words/${action.wordId}/definitions/${action.definitionId}/translation`, {
            text: action.text
          });
        }
      } catch (error: any) {
        // Handle collisions and non-existent entities gracefully
        // 404 (Not Found) or 409 (Conflict) means we can ignore the offline action
        if (error.response && [404, 409].includes(error.response.status)) {
          console.warn(`Collision or entity not found for action ${action.type}, discarding action.`);
        } else {
          // In a real robust system, we might want to retry later, but for now we will just log it.
          console.error(`Failed to sync action ${action.type}`, error);
        }
      }
    }
    
    // Clear the queue after processing
    clearSyncQueue();
  }, [syncQueue, clearSyncQueue]);

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
