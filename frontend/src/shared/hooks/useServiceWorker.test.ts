import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as statePersistence from '../lib/statePersistence';
import { useServiceWorker } from './useServiceWorker';

let mockNeedRefresh = false;
let mockOfflineReady = false;
let mockUpdateServiceWorker = vi.fn();

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [mockNeedRefresh, vi.fn()],
    offlineReady: [mockOfflineReady, vi.fn()],
    updateServiceWorker: mockUpdateServiceWorker,
  }),
}));

describe('useServiceWorker', () => {
  beforeEach(() => {
    mockNeedRefresh = false;
    mockOfflineReady = false;
    mockUpdateServiceWorker = vi.fn();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reflects when no update is available', () => {
    mockNeedRefresh = false;
    const { result } = renderHook(() => useServiceWorker());

    expect(result.current.isUpdateAvailable).toBe(false);
  });

  it('detects when an update is available', () => {
    mockNeedRefresh = true;
    const { result } = renderHook(() => useServiceWorker());

    expect(result.current.isUpdateAvailable).toBe(true);
  });

  it('calls saveAppState and triggers updateServiceWorker when updateApp is invoked', () => {
    const saveStateSpy = vi.spyOn(statePersistence, 'saveAppState');
    const { result } = renderHook(() => useServiceWorker());

    act(() => {
      result.current.updateApp();
    });

    expect(saveStateSpy).toHaveBeenCalledTimes(1);
    expect(mockUpdateServiceWorker).toHaveBeenCalledWith(true);
  });
});
