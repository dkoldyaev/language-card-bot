import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AddWordForm from './AddWordForm';
import apiClient from '../../../shared/api/client';
import useStore from '../../../store/useStore';

describe('AddWordForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useStore.setState({
      dictionaries: [
        { id: 1, name: 'English Deck', targetLanguage: 'en', baseLanguage: 'ru', wordCount: 0, isActive: true },
        { id: 2, name: 'Spanish Deck', targetLanguage: 'es', baseLanguage: 'ru', wordCount: 0, isActive: false },
      ],
      activeDictionaryId: 1,
      selectedDictionaryId: 2,
    });
  });

  it('displays the targeted dictionary and language', () => {
    render(<AddWordForm />);

    expect(screen.getByText('Add words to Spanish Deck')).toBeInTheDocument();
    expect(screen.getByText(/Target language: ES/i)).toBeInTheDocument();
  });

  it('submits words with the target dictionaryId', async () => {
    const user = userEvent.setup();
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: {} });

    render(<AddWordForm />);

    const input = screen.getByLabelText(/Words to add/i);
    await user.type(input, 'hola\nadios');

    const submitBtn = screen.getByRole('button', { name: /Submit Words/i });
    await user.click(submitBtn);

    expect(postSpy).toHaveBeenCalledTimes(2);
    expect(postSpy).toHaveBeenNthCalledWith(1, '/add_word', { word: 'hola', dictionaryId: 2 });
    expect(postSpy).toHaveBeenNthCalledWith(2, '/add_word', { word: 'adios', dictionaryId: 2 });
  });
});
