import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../../../shared/api/client';
import useStore from '../../../store/useStore';
import AddWordForm from './AddWordForm';

describe('AddWordForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useStore.setState({
      token: 'mock-token',
      dictionaries: [
        { id: 1, name: 'English Deck', targetLanguage: 'en', baseLanguage: 'ru', wordCount: 0, isActive: true },
        { id: 2, name: 'Spanish Deck', targetLanguage: 'es', baseLanguage: 'ru', wordCount: 0, isActive: false },
      ],
      activeDictionaryId: 1,
    });
  });

  it('displays the targeted dictionary and language', () => {
    render(
      <MemoryRouter>
        <AddWordForm />
      </MemoryRouter>
    );

    expect(screen.getByText('Add words to English Deck')).toBeInTheDocument();
    expect(screen.getByText(/Target language: EN/i)).toBeInTheDocument();
  });

  it('submits words with the target dictionaryId when authenticated', async () => {
    const user = userEvent.setup();
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: {} });

    render(
      <MemoryRouter>
        <AddWordForm />
      </MemoryRouter>
    );

    const input = screen.getByLabelText(/Words to add/i);
    await user.type(input, 'hola\nadios');

    const submitBtn = screen.getByRole('button', { name: /Submit Words/i });
    await user.click(submitBtn);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledWith('/add_word/batch', {
      words: ['hola', 'adios'],
      dictionaryId: 1,
    });
  });

  it('submits words locally when not logged in', async () => {
    useStore.setState({ token: null });
    const user = userEvent.setup();
    const postSpy = vi.spyOn(apiClient, 'post');

    render(
      <MemoryRouter>
        <AddWordForm />
      </MemoryRouter>
    );

    const input = screen.getByLabelText(/Words to add/i);
    await user.type(input, 'guestword');
    
    const submitBtn = screen.getByRole('button', { name: /Submit Words/i });
    await user.click(submitBtn);

    expect(postSpy).not.toHaveBeenCalled();
  });
});
