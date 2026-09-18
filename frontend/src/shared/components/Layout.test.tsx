import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import useStore from '../../store/useStore';
import Layout from './Layout';

describe('Layout', () => {
  beforeEach(() => {
    useStore.setState({
      token: 'fake-token',
      dictionaries: [{ id: 1, name: 'Default', targetLanguage: 'en', baseLanguage: 'ru', wordCount: 0, isActive: true }],
      dictionary: [],
      profile: { id: 1, username: 'test_user', isAdmin: false, is_admin: false },
    });
  });

  it('renders sidebar navigation links', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );
    // Sidebar should render navigation items
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Dictionary')).toBeInTheDocument();
    expect(screen.getByText('Quiz')).toBeInTheDocument();
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });

  it('redirects to /onboarding when unauthenticated with no dictionaries and empty localStorage', () => {
    localStorage.clear();
    useStore.setState({
      token: null,
      dictionaries: [],
      dictionary: [],
      hasSeenOnboarding: false,
    });
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Layout />} />
          <Route path="/onboarding" element={<div>Onboarding Page Content</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Onboarding Page Content')).toBeInTheDocument();
  });

  it('does not redirect to /onboarding when localStorage already has data', () => {
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
    useStore.setState({
      token: null,
      dictionaries: [],
      dictionary: [],
      hasSeenOnboarding: true,
    });
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Layout />} />
          <Route path="/onboarding" element={<div>Onboarding Page Content</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.queryByText('Onboarding Page Content')).not.toBeInTheDocument();
    expect(screen.getByText('Dictionary')).toBeInTheDocument();
  });

  it('disables Quiz navigation when dictionary is empty', () => {
    useStore.setState({ dictionary: [] });
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );

    const quizButtons = screen.getAllByRole('button', { name: /Quiz/i });
    quizButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('enables Quiz navigation when dictionary has words', () => {
    useStore.setState({
      dictionary: [
        {
          id: 1,
          text: 'apple',
          definitions: [{ id: 1, text: 'A fruit', translation: null }],
        },
      ],
    });
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );

    const quizLinks = screen.getAllByRole('link', { name: /Quiz/i });
    expect(quizLinks.length).toBeGreaterThan(0);
  });

  it('renders Presets link only for admin users', () => {
    useStore.setState({ profile: { id: 1, username: 'normal_user', isAdmin: false, is_admin: false } });
    const { unmount } = render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );
    expect(screen.queryByText('Presets')).not.toBeInTheDocument();
    unmount();

    useStore.setState({ profile: { id: 1, username: 'admin_user', isAdmin: true, is_admin: true } });
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );
    expect(screen.getAllByText('Presets').length).toBeGreaterThan(0);
  });
});
