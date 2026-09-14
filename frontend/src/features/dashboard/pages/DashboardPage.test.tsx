import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from './DashboardPage';
import useStore from '../../../store/useStore';
import apiClient from '../../../shared/api/client';
import { I18nProvider } from '../../../shared/i18n/I18nContext';

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
    useStore.getState().reset();
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
      if (url === '/preset') {
        return Promise.resolve({ data: { presets: [] } });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('renders State 1 (Empty dictionary) with onboarding and disabled quiz button', async () => {
    useStore.setState({
      dictionary: [],
      dictionaries: [{ id: 1, name: 'English', targetLanguage: 'en', baseLanguage: 'ru', wordCount: 0, isActive: true }],
      activeDictionaryId: 1,
      dashboardStats: null,
    });

    renderDashboard();

    // Verification of elements checked by tests
    expect(screen.getByText(/Welcome/i)).toBeInTheDocument();
    expect(screen.getByText(/Add words to your dictionary to unlock quiz practice/i)).toBeInTheDocument();

    const quizBtn = screen.getByRole('button', { name: /Start a quiz/i });
    expect(quizBtn).toBeDisabled();

    // Quick add input should be present
    expect(screen.getByPlaceholderText(/Type a new word/i)).toBeInTheDocument();

    // Onboarding step indicator
    expect(screen.getByText(/Get started in 3 simple steps/i)).toBeInTheDocument();
  });

  it('renders State 2 (Words added, no quizzes) with enabled quiz button and words preview', async () => {
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
      dashboardStats: {
        streak: 0,
        todayCount: 0,
        totalWords: 1,
        totalDefinitions: 1,
        totalAttempts: 0,
        accuracy: 0,
        mastery: { newWords: 1, learningWords: 0, masteredWords: 0 },
        needsAttention: [],
        weeklyActivity: [],
      },
    });

    renderDashboard();

    const quizBtn = screen.getByRole('button', { name: /Start a quiz/i });
    expect(quizBtn).not.toBeDisabled();

    expect(screen.getByText('serendipity')).toBeInTheDocument();
  });

  it('renders State 3 (Active quizzing user) with KPI bar, mastery, and needs attention', async () => {
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
      dashboardStats: {
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
            lastResult: 'INCORRECT',
          },
        ],
        weeklyActivity: [
          { date: '2026-09-14', dayLabel: 'Пн', count: 12 },
          { date: '2026-09-13', dayLabel: 'Вс', count: 8 },
        ],
      },
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
  });
});
