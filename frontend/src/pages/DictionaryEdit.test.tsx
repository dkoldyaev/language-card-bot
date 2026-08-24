import { render, screen, waitFor } from '@testing-library/react';
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
    render(<DictionaryEdit />);
    
    // Should show loading state initially
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Edit Dictionary')).toBeInTheDocument();
    });

    expect(screen.getByText('apple')).toBeInTheDocument();
    expect(screen.getByText('1 definition(s)')).toBeInTheDocument();
  });
});
