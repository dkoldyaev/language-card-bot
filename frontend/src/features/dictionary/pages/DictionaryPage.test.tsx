import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DictionaryPage from './DictionaryPage';
import apiClient from '../../../shared/api/client';
import useStore from '../../../store/useStore';

describe('DictionaryPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useStore.setState({
      dictionaries: [
        { id: 1, name: 'English Deck', targetLanguage: 'en', baseLanguage: 'ru', wordCount: 1, isActive: true },
        { id: 2, name: 'Spanish Deck', targetLanguage: 'es', baseLanguage: 'ru', wordCount: 0, isActive: false },
      ],
      activeDictionaryId: 1,
      selectedDictionaryId: 1,
      dictionary: [
        { id: 101, text: 'apple', definitions: [] },
      ],
    });

    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        dictionary: [
          { id: 101, text: 'apple', definitions: [] },
        ],
      },
    });
  });

  it('fetches words for the active dictionary initially', async () => {
    render(<DictionaryPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'English Deck' })).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith('/dictionary', {
      params: { dictionaryId: 1 },
    });
  });

  it('switches working dictionary without altering active learning language', async () => {
    const user = userEvent.setup();
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        dictionary: [
          { id: 201, text: 'hola', definitions: [] },
        ],
      },
    });
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: {} });

    render(<DictionaryPage />);

    // Click on the Spanish dictionary in the switcher
    const spanishBtn = screen.getByText('Spanish Deck');
    await user.click(spanishBtn);

    // Should fetch words for dictionary 2
    expect(getSpy).toHaveBeenCalledWith('/dictionary', {
      params: { dictionaryId: 2 },
    });

    // CRITICAL: activeDictionaryId must NOT change and /select must NOT be called
    expect(useStore.getState().activeDictionaryId).toBe(1);
    expect(useStore.getState().selectedDictionaryId).toBe(2);
    expect(postSpy).not.toHaveBeenCalledWith(expect.stringContaining('/select'), expect.anything());
  });
});
