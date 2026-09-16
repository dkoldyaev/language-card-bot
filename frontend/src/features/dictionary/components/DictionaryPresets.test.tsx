import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../../../shared/api/client';
import type { DictionaryItem } from '../../../store/useStore';
import DictionaryPresets from './DictionaryPresets';

const mockDictionary: DictionaryItem = {
  id: 1,
  name: 'Spanish 101',
  targetLanguage: 'es',
  baseLanguage: 'en',
  wordCount: 5,
  isActive: true,
};

const mockPresets = [
  {
    id: 10,
    title: 'Spanish Essentials',
    description: 'Essential words for daily Spanish conversation',
    for_language: 'es',
    type: 'word-definition',
    body: [
      { word: 'hola', definitions: ['hello', 'greeting'] },
      { word: 'gracias', definitions: ['thank you'] },
      { word: 'por favor', definitions: ['please'] },
      { word: 'adiós', definitions: ['goodbye'] },
      { word: 'amigo', definitions: ['friend'] },
    ],
    createdAt: '2026-09-12T00:00:00.000Z',
    updatedAt: '2026-09-12T00:00:00.000Z',
  },
];

describe('DictionaryPresets', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches presets for the dictionary target language', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: { presets: mockPresets },
    });

    render(<DictionaryPresets dictionary={mockDictionary} />);

    expect(apiClient.get).toHaveBeenCalledWith('/preset', {
      params: { for_language: 'es' },
    });

    await waitFor(() => {
      expect(screen.getByText('Spanish Essentials')).toBeInTheDocument();
      expect(screen.getByText('Essential words for daily Spanish conversation')).toBeInTheDocument();
      expect(screen.getByText('5 words')).toBeInTheDocument();
      expect(screen.getByText('hola')).toBeInTheDocument();
      expect(screen.getByText('+1 more')).toBeInTheDocument();
    });
  });

  it('displays empty message when no presets are found for the language', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: { presets: [] },
    });

    render(<DictionaryPresets dictionary={mockDictionary} />);

    await waitFor(() => {
      expect(screen.getByText(/No presets available for ES yet/i)).toBeInTheDocument();
    });
  });

  it('applies a preset to the dictionary when "Add to Dictionary" is clicked', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: { presets: mockPresets },
    });
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: {
        message: 'Preset applied successfully',
        wordsCount: 5,
        definitionsCount: 6,
      },
    });

    const onApplied = vi.fn();
    render(<DictionaryPresets dictionary={mockDictionary} onPresetApplied={onApplied} />);

    await waitFor(() => {
      expect(screen.getByText('Spanish Essentials')).toBeInTheDocument();
    });

    const applyBtn = screen.getByTestId('apply-preset-btn-10');
    await user.click(applyBtn);

    expect(postSpy).toHaveBeenCalledWith('/preset/apply_preset', {
      presetId: 10,
      dictionaryId: 1,
    });

    await waitFor(() => {
      expect(screen.getByText(/Added "Spanish Essentials" to Spanish 101! \(5 words, 6 definitions\)/i)).toBeInTheDocument();
      expect(onApplied).toHaveBeenCalledWith(mockPresets[0]);
    });
  });

  it('opens and closes the preview dialog with full words list', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: { presets: mockPresets },
    });

    render(<DictionaryPresets dictionary={mockDictionary} />);

    await waitFor(() => {
      expect(screen.getByText('Spanish Essentials')).toBeInTheDocument();
    });

    const previewBtn = screen.getByRole('button', { name: /Preview words/i });
    await user.click(previewBtn);

    // Dialog should show definitions
    expect(screen.getByText('hello; greeting')).toBeInTheDocument();
    expect(screen.getByText('thank you')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /Close/i });
    await user.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText('hello; greeting')).not.toBeInTheDocument();
    });
  });

  it('handles API errors gracefully when applying preset fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: { presets: mockPresets },
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(apiClient, 'post').mockRejectedValue({
      response: { data: { error: 'Failed to apply preset' } },
    });

    render(<DictionaryPresets dictionary={mockDictionary} />);

    await waitFor(() => {
      expect(screen.getByText('Spanish Essentials')).toBeInTheDocument();
    });

    const applyBtn = screen.getByTestId('apply-preset-btn-10');
    await user.click(applyBtn);

    await waitFor(() => {
      expect(screen.getByText('Failed to apply preset')).toBeInTheDocument();
    });
  });
});
