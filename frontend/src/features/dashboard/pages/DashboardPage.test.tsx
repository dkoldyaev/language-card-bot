import { act, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../../../shared/api/client';
import { I18nProvider } from '../../../shared/i18n/I18nContext';
import useStore from '../../../store/useStore';
import Dashboard from './DashboardPage';

vi.mock('../../../shared/api/client');
const mockedApiClient = vi.mocked(apiClient);

function renderDashboard() {
  return render(
    <BrowserRouter>
      <I18nProvider>
        <Dashboard />
      </I18nProvider>
    </BrowserRouter>
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    act(() => {
      useStore.getState().reset();
      useStore.setState({ token: 'mock-token' });
    });
    mockedApiClient.get.mockImplementation((url) => {
      if (url === '/dashboard/stats') {
        return Promise.resolve({
          data: {
            stats: {
              streak: 0,
              todayCount: 0,
              totalWords: 0,
              totalDefinitions: 0,
              totalAttempts: 0,
              accuracy: 0,
              mastery: { newWords: 0, learningWords: 0, masteredWords: 0 },
              needsAttention: [],
              weeklyActivity: [],
            },
          },
        });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('renders State 1 (Empty dictionary) with onboarding and disabled quiz button', async () => {
    act(() => {
      useStore.setState({
        dictionary: [],
        dictionaries: [{ id: 1, name: 'English', targetLanguage: 'en', baseLanguage: 'ru', wordCount: 0, isActive: true }],
        activeDictionaryId: 1,
        dashboardStats: null,
      });
    });

    renderDashboard();

    // Verification of elements checked by tests
    expect(screen.getByText(/Add words to your dictionary to start practicing/i)).toBeInTheDocument();

    const quizBtn = screen.getByRole('button', { name: /Start a quiz/i });
    expect(quizBtn).toBeDisabled();

    // Quick add input should be present
    expect(screen.getByPlaceholderText(/Type a new word/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenCalledWith('/dashboard/stats', expect.anything());
    });
  });



  it('renders State 2 (Words added, no quizzes) with enabled quiz button and words preview', async () => {
    const stats = {
      streak: 0,
      todayCount: 0,
      totalWords: 1,
      totalDefinitions: 1,
      totalAttempts: 0,
      accuracy: 0,
      mastery: { newWords: 1, learningWords: 0, masteredWords: 0 },
      needsAttention: [],
      weeklyActivity: [],
    };

    mockedApiClient.get.mockImplementation((url) => {
      if (url === '/dashboard/stats') {
        return Promise.resolve({ data: { stats } });
      }
      return Promise.resolve({ data: {} });
    });

    act(() => {
      useStore.setState({
        dictionary: [
          {
            id: 1,
            text: 'serendipity',
            definitions: [{ id: 10, text: 'A fortunate discovery', translation: { id: 100, text: 'счастливая случайность' } }],
          },
        ],
        dictionaries: [{ id: 1, name: 'English', targetLanguage: 'en', baseLanguage: 'ru', wordCount: 1, isActive: true }],
        activeDictionaryId: 1,
        dashboardStats: stats,
      });
    });

    renderDashboard();

    const quizBtn = screen.getByRole('button', { name: /Start a quiz/i });
    expect(quizBtn).not.toBeDisabled();

    expect(screen.getByText('serendipity')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenCalledWith('/dashboard/stats', expect.anything());
    });
  });

  it('renders State 3 (Active quizzing user) with KPI bar, mastery, and needs attention', async () => {
    const stats = {
      streak: 5,
      todayCount: 12,
      totalWords: 1,
      totalDefinitions: 1,
      totalAttempts: 25,
      accuracy: 88,
      mastery: { newWords: 0, learningWords: 0, masteredWords: 1 },
      needsAttention: [
        {
          wordId: 1,
          text: 'ephemeral',
          definition: 'Lasting for a very short time',
          translation: 'эфемерный',
          errorCount: 3,
          successCount: 2,
          lastResult: 'INCORRECT' as const,
        },
      ],
      weeklyActivity: [
        { date: '2026-09-14', dayLabel: 'Пн', count: 12 },
        { date: '2026-09-13', dayLabel: 'Вс', count: 8 },
      ],
    };

    mockedApiClient.get.mockImplementation((url) => {
      if (url === '/dashboard/stats') {
        return Promise.resolve({ data: { stats } });
      }
      return Promise.resolve({ data: {} });
    });

    act(() => {
      useStore.setState({
        dictionary: [
          {
            id: 1,
            text: 'ephemeral',
            definitions: [{ id: 10, text: 'Lasting for a very short time', translation: { id: 100, text: 'эфемерный' } }],
          },
        ],
        dictionaries: [{ id: 1, name: 'English', targetLanguage: 'en', baseLanguage: 'ru', wordCount: 1, isActive: true }],
        activeDictionaryId: 1,
        dashboardStats: stats,
      });
    });

    renderDashboard();

    // Streak KPI
    expect(screen.getByText(/5 day streak/i)).toBeInTheDocument();

    // Needs attention item
    expect(screen.getByText(/Needs Attention/i)).toBeInTheDocument();
    expect(screen.getAllByText('ephemeral').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/эфемерный/i)).toBeInTheDocument();

    // Weekly activity chart
    expect(screen.getByText(/Weekly Rhythm/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenCalledWith('/dashboard/stats', expect.anything());
    });
  });

  it('computes guest dashboard stats locally without API call when guest', async () => {
    act(() => {
      useStore.setState({
        token: null,
        dictionary: [{ id: 1, text: 'guest-word', definitions: [{ id: 1, text: 'def', translation: null }] }],
        dictionaries: [{ id: 1, name: 'Guest Deck', targetLanguage: 'en', baseLanguage: 'ru', wordCount: 1, isActive: true }],
        activeDictionaryId: 1,
        guestQuizAttempts: [{ wordText: 'guest-word', result: 'SUCCESS', createdAt: new Date().toISOString() }],
      });
    });

    renderDashboard();

    expect(screen.getByText('guest-word')).toBeInTheDocument();
    expect(mockedApiClient.get).not.toHaveBeenCalledWith('/dashboard/stats', expect.anything());
  });
});
