import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, MockInstance } from 'vitest';
import { useSyncState } from './useSyncState';
import useStore from '../store/useStore';
import apiClient from './client';

describe('useSyncState', () => {
  let postMock: MockInstance;

  beforeEach(() => {
    useStore.getState().setProfile(null);
    useStore.getState().setAppState(null);
    postMock = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { mode: 'DEFAULT' } });
  });

  it('should not call api if profile is not set', () => {
    renderHook(() => useSyncState());
    expect(postMock).not.toHaveBeenCalled();
  });

  it('should call api and update state if profile is set', async () => {
    useStore.getState().setProfile({ id: 1, username: 'testuser' });
    renderHook(() => useSyncState());
    
    expect(postMock).toHaveBeenCalledWith('/state/sync');
    
    await waitFor(() => {
      expect(useStore.getState().appState).toEqual({ mode: 'DEFAULT' });
    });
  });
});
