import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import useStore from '../../store/useStore';
import Layout from './Layout';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

describe('Layout', () => {
  const renderLayout = async (initialEntry = '/en') => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/:locale/*" element={<Layout />} />
          </Routes>
        </MemoryRouter>
      );
    });
    return result;
  };

  beforeEach(() => {
    act(() => {
      useStore.setState({
        token: 'fake-token',
        dictionaries: [{ id: 1, name: 'Default', targetLanguage: 'en', baseLanguage: 'ru', wordCount: 0, isActive: true }],
        dictionary: [],
        profile: { id: 1, username: 'test_user', isAdmin: false, is_admin: false },
      });
    });
  });

  it('renders sidebar navigation links', async () => {
    await renderLayout();
    // Sidebar should render navigation items
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Dictionary')).toBeInTheDocument();
    expect(screen.getByText('Quiz')).toBeInTheDocument();
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });

  it('does not redirect to /onboarding when unauthenticated with empty localStorage', async () => {
    localStorage.clear();
    act(() => {
      useStore.setState({
        token: null,
        dictionaries: [],
        dictionary: [],
        hasSeenOnboarding: false,
      });
    });
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/en']}>
          <Routes>
            <Route path="/:locale/*" element={<Layout />} />
            <Route path="/:locale/onboarding" element={<div>Onboarding Page Content</div>} />
          </Routes>
        </MemoryRouter>
      );
    });
    expect(screen.queryByText('Onboarding Page Content')).not.toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('does not redirect to /onboarding when localStorage already has data', async () => {
    localStorage.setItem(
      'english-card-bot-storage',
      JSON.stringify({
        state: {
          token: null,
          hasSeenOnboarding: true,
          dictionaries: [],
        },
      })
    );
    act(() => {
      useStore.setState({
        token: null,
        dictionaries: [],
        dictionary: [],
        hasSeenOnboarding: true,
      });
    });
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/en']}>
          <Routes>
            <Route path="/:locale/*" element={<Layout />} />
            <Route path="/:locale/onboarding" element={<div>Onboarding Page Content</div>} />
          </Routes>
        </MemoryRouter>
      );
    });
    expect(screen.queryByText('Onboarding Page Content')).not.toBeInTheDocument();
    expect(screen.getByText('Dictionary')).toBeInTheDocument();
  });

  it('disables Quiz navigation when dictionary is empty', async () => {
    act(() => { useStore.setState({ dictionary: [] }); });
    await renderLayout();

    const quizButtons = screen.getAllByRole('button', { name: /Quiz/i });
    quizButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('enables Quiz navigation when dictionary has words', async () => {
    act(() => {
      useStore.setState({
        dictionary: [
          {
            id: 1,
            text: 'apple',
            definitions: [{ id: 1, text: 'A fruit', translation: null }],
          },
        ],
      });
    });
    await renderLayout();

    const quizLinks = screen.getAllByRole('link', { name: /Quiz/i });
    expect(quizLinks.length).toBeGreaterThan(0);
  });

  it('renders Presets link only for admin users', async () => {
    act(() => { useStore.setState({ profile: { id: 1, username: 'normal_user', isAdmin: false, is_admin: false } }); });
    const { unmount } = await renderLayout();
    expect(screen.queryByText('Presets')).not.toBeInTheDocument();
    unmount();

    act(() => { useStore.setState({ profile: { id: 1, username: 'admin_user', isAdmin: true, is_admin: true } }); });
    await renderLayout();
    expect(screen.getAllByText('Presets').length).toBeGreaterThan(0);
  });
});
