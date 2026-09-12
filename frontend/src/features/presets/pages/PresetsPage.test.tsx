import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PresetsPage from './PresetsPage';
import apiClient from '../../../shared/api/client';
import useStore from '../../../store/useStore';

vi.mock('../../../shared/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('PresetsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({
      profile: { id: 1, username: 'admin_user', isAdmin: true, is_admin: true },
      dictionaries: [
        {
          id: 10,
          name: 'ES (EN)',
          targetLanguage: 'es',
          baseLanguage: 'en',
          wordCount: 5,
          isActive: true,
        },
      ],
    });
  });

  it('renders presets page and loads presets from API', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        presets: [
          {
            id: 1,
            title: 'Spanish Essentials',
            for_language: 'es',
            type: 'word-definition',
            body: [
              { word: 'hola', definitions: ['hello'] },
              { word: 'adios', definitions: ['goodbye'] },
            ],
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
          },
        ],
      },
    });

    render(<PresetsPage />);

    expect(screen.getByText('Presets Catalog')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Spanish Essentials')).toBeInTheDocument();
    });

    expect(screen.getByText(/Contains/)).toHaveTextContent('2');
  });

  it('opens Create Preset dialog and submits new preset', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { presets: [] },
    });

    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        preset: {
          id: 2,
          title: 'French 101',
          for_language: 'fr',
          type: 'word-definition',
          body: [{ word: 'bonjour', definitions: ['hello'] }],
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      },
    });

    render(<PresetsPage />);

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    const createButton = screen.getAllByRole('button', { name: /Create Preset/i })[0];
    fireEvent.click(createButton);

    expect(screen.getByText('Create New Preset')).toBeInTheDocument();

    const titleInput = screen.getByPlaceholderText('e.g. 50 Essential Spanish Verbs');
    fireEvent.change(titleInput, { target: { value: 'French 101' } });

    const submitBtns = screen.getAllByRole('button', { name: /Create Preset/i });
    fireEvent.click(submitBtns[submitBtns.length - 1]);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/preset', expect.objectContaining({
        title: 'French 101',
        type: 'word-definition',
      }));
    });
  });

  it('opens apply dialog and calls apply preset API', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        presets: [
          {
            id: 1,
            title: 'Spanish Essentials',
            for_language: 'es',
            type: 'word-definition',
            body: [{ word: 'hola', definitions: ['hello'] }],
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
          },
        ],
      },
    });

    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        message: 'Preset applied successfully',
        wordsCount: 1,
        definitionsCount: 1,
      },
    });

    render(<PresetsPage />);

    await waitFor(() => {
      expect(screen.getByText('Spanish Essentials')).toBeInTheDocument();
    });

    const applyButton = screen.getByRole('button', { name: /Apply to Dict/i });
    fireEvent.click(applyButton);

    expect(screen.getByText('Apply Preset to Dictionary')).toBeInTheDocument();

    const confirmApplyBtn = screen.getByRole('button', { name: 'Apply Preset' });
    fireEvent.click(confirmApplyBtn);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/preset/apply_preset', {
        presetId: 1,
        dictionaryId: 10,
      });
    });
  });
});
