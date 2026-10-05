/**
 * Utility for persisting user application state prior to Service Worker reloads.
 */

export interface SavedAppState {
  route: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

const STORAGE_KEY = 'pwa_saved_app_state';

/**
 * Saves current application state (route, timestamp, and optional metadata)
 * to localStorage so it can be safely restored upon Service Worker reload.
 */
export function saveAppState(metadata?: Record<string, unknown>): void {
  try {
    let route = '/';
    if (typeof window !== 'undefined') {
      route = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    }

    const state: SavedAppState = {
      route,
      timestamp: Date.now(),
      metadata,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save app state before SW update:', error);
  }
}

/**
 * Retrieves the previously saved application state, if any.
 */
export function getSavedAppState(): SavedAppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as SavedAppState;
  } catch (error) {
    console.error('Failed to read saved app state:', error);
    return null;
  }
}

/**
 * Clears the saved application state.
 */
export function clearSavedAppState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear saved app state:', error);
  }
}
