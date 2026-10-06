import { isAxiosError } from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '../api/client';
import { migrateLegacyData } from '../../features/auth/api/migrateLegacyData';
import { hasLegacyLocalData } from '../lib/storage';
import useStore from '../../store/useStore';

export type AnonymousSessionState = 'loading' | 'migrating-legacy-data' | 'ready' | 'recover-legacy-data' | 'error';

export function useAnonymousSession(): {
  state: AnonymousSessionState;
  createAnonymousSession: () => Promise<void>;
  completeLegacyRecovery: () => void;
} {
  const token = useStore((state) => state.token);
  const setToken = useStore((state) => state.setToken);
  const setMercureToken = useStore((state) => state.setMercureToken);
  const setProfile = useStore((state) => state.setProfile);
  const [state, setState] = useState<AnonymousSessionState>('loading');
  const bootstrapStarted = useRef(false);

  const createAnonymousSession = useCallback(async () => {
    const response = await apiClient.post('/auth/anonymous');
    const { token: anonymousToken, mercureToken, user } = response.data;
    setToken(anonymousToken);
    setMercureToken(mercureToken);
    setProfile(user);
  }, [setMercureToken, setProfile, setToken]);

  const completeLegacyRecovery = useCallback(() => setState('ready'), []);

  useEffect(() => {
    if (bootstrapStarted.current) return;
    bootstrapStarted.current = true;

    const initialize = async () => {
      if (token) {
        try {
          const response = await apiClient.get('/auth/me');
          setProfile(response.data.user);
          setState('ready');
          return;
        } catch (error) {
          if (!isAxiosError(error) || error.response?.status !== 401) {
            setState('error');
            return;
          }
        }
      }

      if (hasLegacyLocalData()) {
        setState('migrating-legacy-data');
        try {
          await createAnonymousSession();
          await migrateLegacyData();
          setState('ready');
        } catch (error) {
          console.error('Automatic legacy data migration failed:', error);
          setState('recover-legacy-data');
        }
        return;
      }

      try {
        await createAnonymousSession();
        setState('ready');
      } catch (error) {
        console.error('Failed to create anonymous session:', error);
        setState('error');
      }
    };
    void initialize();

  }, [createAnonymousSession, setProfile, token]);

  return { state, createAnonymousSession, completeLegacyRecovery };
}
