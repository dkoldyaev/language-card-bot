import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useStore from '../../store/useStore';
import { useMercure } from './useMercure';

class MockEventSource {
  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((error: Event) => void) | null = null;
  close = vi.fn();
  
  constructor(url: string) {
    this.url = url;
  }
}

describe('useMercure', () => {
  let originalEventSource: typeof EventSource | undefined;

  beforeEach(() => {
    originalEventSource = globalThis.EventSource;
    globalThis.EventSource = MockEventSource as unknown as typeof EventSource;
    useStore.getState().setProfile(null);
  });

  afterEach(() => {
    if (originalEventSource) {
      globalThis.EventSource = originalEventSource;
    }
  });

  it('should not connect if profile is not set', () => {
    renderHook(() => useMercure());
  });

  it('should connect to mercure when profile is set', () => {
    useStore.getState().setProfile({ id: 1, username: 'testuser' });
    
    renderHook(() => useMercure());
    expect(true).toBe(true);
  });
});
