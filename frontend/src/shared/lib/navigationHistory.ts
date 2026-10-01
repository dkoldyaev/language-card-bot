import { useEffect } from 'react';
import { type NavigateFunction, useLocation } from 'react-router-dom';

const STORAGE_KEY = 'app_nav_history_entries';

interface HistoryState {
  entries: Record<number, string>;
}

const state: HistoryState = {
  entries: {},
};

let memoryStack: string[] = [];

// Initialize entries from sessionStorage if available
try {
  const saved = typeof window !== 'undefined' ? window.sessionStorage?.getItem(STORAGE_KEY) : null;
  if (saved) {
    state.entries = JSON.parse(saved);
  }
} catch {
  // Ignore sessionStorage errors
}

export function isDictionaryRoute(path: string | null | undefined): boolean {
  if (!path) return false;
  const clean = path.split('?')[0].split('#')[0];
  return clean === '/dictionary' || clean.startsWith('/dictionary/');
}

export function recordNavigation(pathname: string, search: string = '') {
  const fullPath = pathname + (search ? search : '');
  const historyIdx = typeof window !== 'undefined' ? window.history?.state?.idx : undefined;

  if (typeof historyIdx === 'number') {
    state.entries[historyIdx] = fullPath;
    // Prune forward entries if replacing branch
    for (const key of Object.keys(state.entries)) {
      if (Number(key) > historyIdx) {
        delete state.entries[Number(key)];
      }
    }
    try {
      window.sessionStorage?.setItem(STORAGE_KEY, JSON.stringify(state.entries));
    } catch {
      // Ignore
    }
  }

  if (memoryStack.length === 0 || memoryStack[memoryStack.length - 1] !== fullPath) {
    memoryStack.push(fullPath);
  }
}

export function getPreviousRoute(): string | null {
  const historyIdx = typeof window !== 'undefined' ? window.history?.state?.idx : undefined;

  if (typeof historyIdx === 'number') {
    if (historyIdx > 0) {
      if (state.entries[historyIdx - 1]) {
        return state.entries[historyIdx - 1];
      }
      try {
        const saved = window.sessionStorage?.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed[historyIdx - 1]) {
            state.entries = parsed;
            return parsed[historyIdx - 1];
          }
        }
      } catch {
        // Ignore
      }
    }
    return null;
  }

  if (memoryStack.length >= 2) {
    return memoryStack[memoryStack.length - 2];
  }

  return null;
}

export function handleDictionaryCancelNavigation(navigate: NavigateFunction) {
  const prev = getPreviousRoute();

  if (!prev || isDictionaryRoute(prev)) {
    navigate('/');
  } else {
    navigate(-1);
  }
}

export function resetNavigationHistoryForTesting() {
  state.entries = {};
  memoryStack = [];
  try {
    if (typeof window !== 'undefined') {
      window.sessionStorage?.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore
  }
}

export function useNavigationTracker() {
  const location = useLocation();

  useEffect(() => {
    recordNavigation(location.pathname, location.search);
  }, [location.pathname, location.search]);
}
