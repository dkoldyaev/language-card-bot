import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../../../shared/api/client';
import useStore from '../../../store/useStore';
import PresetsPage from './PresetsPage';

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
      presets: [],
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

    const descInput = screen.getByPlaceholderText('Brief description of this vocabulary pack (optional)');
    fireEvent.change(descInput, { target: { value: 'Basic French words' } });

    const submitBtns = screen.getAllByRole('button', { name: /Create Preset/i });
    fireEvent.click(submitBtns[submitBtns.length - 1]);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/preset', expect.objectContaining({
        title: 'French 101',
        description: 'Basic French words',
        type: 'word-definition',
      }));
    });

    // DictionaryPresets reads this shared catalogue, not PresetsPage local state.
    // Keep the assertion here so a refactor cannot make a new preset disappear
    // as soon as the administrator navigates away.
    expect(useStore.getState().presets).toEqual([
      expect.objectContaining({ id: 2, title: 'French 101' }),
    ]);
  });

  it('renders preset card with edit and delete actions and no apply button', async () => {
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

    render(<PresetsPage />);

    await waitFor(() => {
      expect(screen.getByText('Spanish Essentials')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /Apply to Dict/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit Preset/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete Preset/i })).toBeInTheDocument();
  });
});
