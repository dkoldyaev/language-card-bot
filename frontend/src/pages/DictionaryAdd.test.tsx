import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DictionaryAdd from './DictionaryAdd';
import apiClient from '../api/client';

describe('DictionaryAdd', () => {
  beforeEach(() => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({});
  });

  it('renders input area and disabled submit button', () => {
    render(<DictionaryAdd />);
    
    expect(screen.getByText('Add Words')).toBeInTheDocument();
    
    const input = screen.getByRole('textbox', { name: /Words list/i });
    expect(input).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Submit Words/i });
    expect(submitBtn).toBeDisabled();
  });

  it('submits words and calls api', async () => {
    const user = userEvent.setup();
    render(<DictionaryAdd />);
    
    const input = screen.getByRole('textbox', { name: /Words list/i });
    const submitBtn = screen.getByRole('button', { name: /Submit Words/i });

    await user.type(input, 'apple\nbanana');
    expect(submitBtn).toBeEnabled();

    await user.click(submitBtn);

    expect(apiClient.post).toHaveBeenCalledWith('/state/mode', { mode: 'DICTIONARY_ADD' });
    
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/add_word', { word: 'apple' });
      expect(apiClient.post).toHaveBeenCalledWith('/add_word', { word: 'banana' });
    });
    
    // Check if input is cleared
    expect(input).toHaveValue('');
  });
});

