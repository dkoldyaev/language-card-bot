import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DictionaryEdit from './DictionaryEdit';
import apiClient from '../api/client';
import useStore from '../store/useStore';

describe('DictionaryEdit', () => {
  beforeEach(() => {
    useStore.setState({ dictionary: [] });
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        dictionary: [
          {
            id: 1,
            text: 'apple',
            definitions: [
              { id: 1, text: 'A fruit', translation: { id: 1, text: 'яблоко' } }
            ]
          }
        ]
      }
    });
  });

  it('renders dictionary after loading', async () => {
    const user = userEvent.setup();
    render(<DictionaryEdit />);
    
    // Should show loading state initially
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Edit Dictionary')).toBeInTheDocument();
    });

    expect(screen.getByText('apple')).toBeInTheDocument();
    expect(screen.getByText('1 definition(s)')).toBeInTheDocument();

    // The accordion is collapsed by default in MUI, but text might still be in DOM.
    // MUI Accordion uses a button for summary
    const accordionBtn = screen.getByRole('button', { name: /apple 1 definition\(s\)/i });
    expect(accordionBtn).toBeInTheDocument();

    await user.click(accordionBtn);

    expect(screen.getByText('1. A fruit')).toBeInTheDocument();
    expect(screen.getByText('Translation: яблоко')).toBeInTheDocument();
  });

  it('handles word deletion', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(apiClient, 'delete').mockResolvedValue({});

    render(<DictionaryEdit />);
    
    await waitFor(() => {
      expect(screen.getByText('apple')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole('button', { name: /Delete apple/i });
    await user.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete "apple"?');
    expect(apiClient.delete).toHaveBeenCalledWith('/word_delete/1');

    await waitFor(() => {
      expect(screen.getByText('Your dictionary is empty.')).toBeInTheDocument();
    });
  });

  it('handles editing a definition', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, 'put').mockResolvedValue({});

    render(<DictionaryEdit />);
    
    await waitFor(() => {
      expect(screen.getByText('apple')).toBeInTheDocument();
    });

    const accordionBtn = screen.getByRole('button', { name: /apple 1 definition\(s\)/i });
    await user.click(accordionBtn);

    const editBtns = screen.getAllByTestId('EditIcon');
    // First edit icon is for definition
    await user.click(editBtns[0]);

    const input = screen.getByDisplayValue('A fruit');
    await user.clear(input);
    await user.type(input, 'A delicious fruit');

    const saveBtn = screen.getByRole('button', { name: /Save/i });
    await user.click(saveBtn);

    expect(apiClient.put).toHaveBeenCalledWith('/definition_edit/1', { text: 'A delicious fruit' });

    await waitFor(() => {
      expect(screen.getByText('1. A delicious fruit')).toBeInTheDocument();
    });
  });

  it('handles editing a translation', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, 'put').mockResolvedValue({});

    render(<DictionaryEdit />);
    
    await waitFor(() => {
      expect(screen.getByText('apple')).toBeInTheDocument();
    });

    const accordionBtn = screen.getByRole('button', { name: /apple 1 definition\(s\)/i });
    await user.click(accordionBtn);

    const editBtns = screen.getAllByTestId('EditIcon');
    // Second edit icon is for translation
    await user.click(editBtns[1]);

    const input = screen.getByDisplayValue('яблоко');
    await user.clear(input);
    await user.type(input, 'яблочко');

    const saveBtn = screen.getByRole('button', { name: /Save/i });
    await user.click(saveBtn);

    expect(apiClient.put).toHaveBeenCalledWith('/definition_translate_edit/1', { text: 'яблочко' });

    await waitFor(() => {
      expect(screen.getByText('Translation: яблочко')).toBeInTheDocument();
    });
  });
});

