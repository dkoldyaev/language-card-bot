import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../shared/api/client';
import useStore from '../store/useStore';
import App from './App';

describe('App Routing', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [] });
    vi.spyOn(apiClient, 'post').mockResolvedValue({ data: {} });
    useStore.setState({ token: 'dummy_token', profile: { id: 1, username: 'testuser' } });
  });

  it('renders Dashboard page on default route', async () => {
    render(<App />);
    expect(await screen.findByText(/Welcome/i, {}, { timeout: 5000 })).toBeInTheDocument();
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalled();
    });
  });

  it('renders the dictionary selected by its canonical URL', async () => {
    window.history.pushState({}, '', '/en/dictionary/7');
    useStore.setState({
      dictionaries: [{ id: 7, name: 'Spanish deck', targetLanguage: 'es', baseLanguage: 'en', wordCount: 1, isActive: true }],
      activeDictionaryId: 7,
      dictionary: [{ id: 101, text: 'hola', definitions: [] }],
    });

    render(<App />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Spanish deck' })).toBeInTheDocument();
    expect(screen.getByText('hola')).toBeInTheDocument();
  });

  it('redirects /dictionary/new to the dashboard and opens the first dictionary dialog', async () => {
    window.history.pushState({}, '', '/en/dictionary/new');

    render(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/en');
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
