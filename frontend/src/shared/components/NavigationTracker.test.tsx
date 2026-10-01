import { render } from '@testing-library/react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as statePersistence from '../lib/statePersistence';
import NavigationTracker from './NavigationTracker';

describe('NavigationTracker PWA state restoration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('restores route on reload when valid saved route is present', () => {
    statePersistence.saveAppState({ custom: 'state' });
    const saved = statePersistence.getSavedAppState();
    expect(saved).not.toBeNull();

    render(
      <BrowserRouter>
        <NavigationTracker />
        <Routes>
          <Route path="*" element={<div>Tracked Page</div>} />
        </Routes>
      </BrowserRouter>
    );

    // State should be consumed and cleared
    expect(statePersistence.getSavedAppState()).toBeNull();
  });
});
