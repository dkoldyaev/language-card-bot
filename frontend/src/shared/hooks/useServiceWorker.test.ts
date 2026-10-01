import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as statePersistence from '../lib/statePersistence';
import { useServiceWorker } from './useServiceWorker';

describe('useServiceWorker', () => {
  let postMessageMock: ReturnType<typeof vi.fn>;
  let mockWaitingWorker: {
    postMessage: ReturnType<typeof vi.fn>;
    state: string;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
  };
  let mockRegistration: {
    waiting: typeof mockWaitingWorker | null;
    installing: typeof mockWaitingWorker | null;
    active: typeof mockWaitingWorker | null;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
  };
  let serviceWorkerListeners: Record<string, EventListener>;
  let reloadMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    postMessageMock = vi.fn();
    mockWaitingWorker = {
      postMessage: postMessageMock,
      state: 'installed',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    mockRegistration = {
      waiting: null,
      installing: null,
      active: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    serviceWorkerListeners = {};

    reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        ...window.location,
        reload: reloadMock,
        pathname: '/test-route',
        search: '',
        hash: '',
      },
    });

    Object.defineProperty(navigator, 'serviceWorker', {
      writable: true,
      value: {
        register: vi.fn().mockResolvedValue(mockRegistration),
        addEventListener: vi.fn((event: string, callback: EventListener) => {
          serviceWorkerListeners[event] = callback;
        }),
        removeEventListener: vi.fn((event: string) => {
          delete serviceWorkerListeners[event];
        }),
        controller: {},
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with update unavailable when no worker waiting', async () => {
    const { result } = renderHook(() => useServiceWorker());

    expect(result.current.isUpdateAvailable).toBe(false);
  });

  it('detects waiting service worker on registration', async () => {
    mockRegistration.waiting = mockWaitingWorker;

    const { result } = renderHook(() => useServiceWorker());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isUpdateAvailable).toBe(true);
  });

  it('calls saveAppState and sends SKIP_WAITING message when updateApp is called', async () => {
    mockRegistration.waiting = mockWaitingWorker;
    const saveStateSpy = vi.spyOn(statePersistence, 'saveAppState');

    const { result } = renderHook(() => useServiceWorker());

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.updateApp();
    });

    expect(saveStateSpy).toHaveBeenCalledTimes(1);
    expect(postMessageMock).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });

  it('reloads page on controllerchange and guards against infinite loops', async () => {
    renderHook(() => useServiceWorker());

    expect(serviceWorkerListeners.controllerchange).toBeDefined();

    // Trigger controllerchange once
    act(() => {
      serviceWorkerListeners.controllerchange(new Event('controllerchange'));
    });

    expect(reloadMock).toHaveBeenCalledTimes(1);

    // Trigger controllerchange again (should be guarded by refreshing flag)
    act(() => {
      serviceWorkerListeners.controllerchange(new Event('controllerchange'));
    });

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});
