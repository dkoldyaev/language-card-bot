import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSavedAppState, getSavedAppState, saveAppState } from './statePersistence';

describe('statePersistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('saves and retrieves app state with route and timestamp', () => {
    saveAppState({ formDraft: 'hello' });

    const saved = getSavedAppState();
    expect(saved).not.toBeNull();
    expect(saved?.route).toBe('/');
    expect(typeof saved?.timestamp).toBe('number');
    expect(saved?.metadata).toEqual({ formDraft: 'hello' });
  });

  it('clears saved app state', () => {
    saveAppState();
    expect(getSavedAppState()).not.toBeNull();

    clearSavedAppState();
    expect(getSavedAppState()).toBeNull();
  });

  it('handles invalid JSON in localStorage gracefully', () => {
    localStorage.setItem('pwa_saved_app_state', 'invalid-json{');
    expect(getSavedAppState()).toBeNull();
  });
});
