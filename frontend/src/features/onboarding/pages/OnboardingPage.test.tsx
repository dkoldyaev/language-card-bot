import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../../../shared/api/client';
import useStore from '../../../store/useStore';
import OnboardingPage from './OnboardingPage';

vi.mock('../../../shared/api/client');

describe('OnboardingPage', () => {
  beforeEach(() => {
    localStorage.clear();
    act(() => {
      useStore.setState({
        token: null,
        dictionaries: [],
        dictionary: [],
        hasSeenOnboarding: false,
        hasCompletedGuestOnboarding: false,
      });
    });
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === '/settings/guest-policy') {
        return Promise.resolve({ data: { allowGuestAi: false, dailyLimit: 0 } });
      }
      if (url === '/preset') {
        return Promise.resolve({
          data: {
            presets: [
              {
                id: 1,
                title: 'Starter Pack',
                description: 'Essential words',
                body: [{ word: 'hello', definitions: ['a greeting'] }],
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('renders onboarding page step 1 with brand header, theme and locale switchers', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/onboarding']}>
          <Routes>
            <Route path="/onboarding" element={<OnboardingPage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(screen.getByText('CardBot')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /switch to dark theme|switch to light theme/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /change language/i })).toBeInTheDocument();
    expect(screen.getByTestId('guest-onboarding-next-btn')).toBeInTheDocument();
  });

  it('redirects to / when user already has existing data in localStorage', async () => {
    localStorage.setItem(
      'english-card-bot-storage',
      JSON.stringify({
        state: {
          token: null,
          hasSeenOnboarding: true,
          dictionaries: [{ id: 10, name: 'My Deck' }],
        },
      })
    );

    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/onboarding']}>
          <Routes>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/" element={<div>Dashboard Home</div>} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(screen.getByText('Dashboard Home')).toBeInTheDocument();
  });

  it('navigates from step 1 to step 2 and finishes with preset', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/onboarding']}>
          <Routes>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/" element={<div>Dashboard Home</div>} />
          </Routes>
        </MemoryRouter>
      );
    });

    // Click Next to load presets
    const nextBtn = screen.getByTestId('guest-onboarding-next-btn');
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByTestId('preset-card-1')).toBeInTheDocument();
    });

    // Finish button
    const finishBtn = screen.getByTestId('guest-onboarding-finish-btn');
    expect(finishBtn).toBeEnabled();
    fireEvent.click(finishBtn);

    // Should navigate to / and populate store
    await waitFor(() => {
      expect(screen.getByText('Dashboard Home')).toBeInTheDocument();
    });

    const state = useStore.getState();
    expect(state.hasSeenOnboarding).toBe(true);
    expect(state.hasCompletedGuestOnboarding).toBe(true);
    expect(state.dictionaries.length).toBe(1);
    expect(state.dictionary.length).toBe(1);
  });
});
