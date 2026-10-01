import type { NavigateFunction } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getPreviousRoute,
  handleDictionaryCancelNavigation,
  isDictionaryRoute,
  recordNavigation,
  resetNavigationHistoryForTesting,
} from './navigationHistory';

describe('navigationHistory', () => {
  beforeEach(() => {
    resetNavigationHistoryForTesting();
    vi.restoreAllMocks();
  });

  describe('isDictionaryRoute', () => {
    it('identifies dictionary routes correctly', () => {
      expect(isDictionaryRoute('/dictionary')).toBe(true);
      expect(isDictionaryRoute('/dictionary/')).toBe(true);
      expect(isDictionaryRoute('/dictionary/add')).toBe(true);
      expect(isDictionaryRoute('/dictionary/edit')).toBe(true);
      expect(isDictionaryRoute('/dictionary?tab=words')).toBe(true);
      expect(isDictionaryRoute('/dictionary#section')).toBe(true);
    });

    it('identifies non-dictionary routes correctly', () => {
      expect(isDictionaryRoute('/')).toBe(false);
      expect(isDictionaryRoute('/quiz')).toBe(false);
      expect(isDictionaryRoute('/presets')).toBe(false);
      expect(isDictionaryRoute('/login')).toBe(false);
      expect(isDictionaryRoute(null)).toBe(false);
      expect(isDictionaryRoute(undefined)).toBe(false);
      expect(isDictionaryRoute('')).toBe(false);
    });
  });

  describe('recordNavigation and getPreviousRoute (in-memory fallback)', () => {
    it('returns null when only one page has been visited', () => {
      recordNavigation('/dictionary');
      expect(getPreviousRoute()).toBeNull();
    });

    it('returns previous route when multiple pages have been visited', () => {
      recordNavigation('/quiz');
      recordNavigation('/dictionary');
      expect(getPreviousRoute()).toBe('/quiz');
    });

    it('returns previous route when navigating from another dictionary path', () => {
      recordNavigation('/dictionary?tab=1');
      recordNavigation('/dictionary');
      expect(getPreviousRoute()).toBe('/dictionary?tab=1');
    });
  });

  describe('handleDictionaryCancelNavigation', () => {
    it('navigates to / when there is no previous route', () => {
      const navigate = vi.fn() as unknown as NavigateFunction;
      recordNavigation('/dictionary');

      handleDictionaryCancelNavigation(navigate);

      expect(navigate).toHaveBeenCalledWith('/');
    });

    it('navigates to / when previous route is also a dictionary route', () => {
      const navigate = vi.fn() as unknown as NavigateFunction;
      recordNavigation('/dictionary/add');
      recordNavigation('/dictionary');

      handleDictionaryCancelNavigation(navigate);

      expect(navigate).toHaveBeenCalledWith('/');
    });

    it('navigates back (-1) when previous route is a non-dictionary route', () => {
      const navigate = vi.fn() as unknown as NavigateFunction;
      recordNavigation('/quiz');
      recordNavigation('/dictionary');

      handleDictionaryCancelNavigation(navigate);

      expect(navigate).toHaveBeenCalledWith(-1);
    });

    it('navigates back (-1) when previous route was the home page /', () => {
      const navigate = vi.fn() as unknown as NavigateFunction;
      recordNavigation('/');
      recordNavigation('/dictionary');

      handleDictionaryCancelNavigation(navigate);

      expect(navigate).toHaveBeenCalledWith(-1);
    });
  });

  describe('history index and sessionStorage support', () => {
    it('uses window.history.state.idx when available', () => {
      const originalHistory = window.history;
      try {
        const mockHistory = {
          state: { idx: 1 },
        };
        Object.defineProperty(window, 'history', {
          value: mockHistory,
          writable: true,
          configurable: true,
        });

        // Record entry 0
        mockHistory.state = { idx: 0 };
        recordNavigation('/presets');

        // Record entry 1
        mockHistory.state = { idx: 1 };
        recordNavigation('/dictionary');

        expect(getPreviousRoute()).toBe('/presets');

        const navigate = vi.fn() as unknown as NavigateFunction;
        handleDictionaryCancelNavigation(navigate);
        expect(navigate).toHaveBeenCalledWith(-1);
      } finally {
        Object.defineProperty(window, 'history', {
          value: originalHistory,
          writable: true,
          configurable: true,
        });
      }
    });

    it('navigates to / when window.history.state.idx is 0 (direct entry)', () => {
      const originalHistory = window.history;
      try {
        const mockHistory = {
          state: { idx: 0 },
        };
        Object.defineProperty(window, 'history', {
          value: mockHistory,
          writable: true,
          configurable: true,
        });

        recordNavigation('/dictionary');
        expect(getPreviousRoute()).toBeNull();

        const navigate = vi.fn() as unknown as NavigateFunction;
        handleDictionaryCancelNavigation(navigate);
        expect(navigate).toHaveBeenCalledWith('/');
      } finally {
        Object.defineProperty(window, 'history', {
          value: originalHistory,
          writable: true,
          configurable: true,
        });
      }
    });
  });
});
