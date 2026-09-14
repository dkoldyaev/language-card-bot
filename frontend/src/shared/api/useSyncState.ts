import { useEffect } from 'react';
import useStore from '../../store/useStore';
import apiClient from './client';

export function useSyncState() {
  const profile = useStore((state) => state.profile);
  const setAppState = useStore((state) => state.setAppState);

  useEffect(() => {
    if (!profile) return;

    apiClient.post('/state/sync')
      .then((response) => {
        setAppState(response.data);
      })
      .catch((error) => {
        console.error('Failed to sync state:', error);
      });
  }, [profile, setAppState]);
}
