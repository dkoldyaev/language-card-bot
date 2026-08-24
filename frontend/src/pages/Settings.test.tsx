import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Settings from './Settings';
import apiClient from '../api/client';

describe('Settings', () => {
  beforeEach(() => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: { settings: { baseLanguage: 'ru', targetLanguage: 'en', desiredLevel: 'B2' } }
    });
    vi.spyOn(apiClient, 'post').mockResolvedValue({});
  });

  it('loads settings on mount and allows saving', async () => {
    const user = userEvent.setup();
    render(<Settings />);
    
    // Should show loading state initially
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    
    // Wait for form to render after loading
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    // Check if the save button exists
    const saveButton = screen.getByRole('button', { name: /Save Settings/i });
    expect(saveButton).toBeInTheDocument();
    
    // Click save and verify API call
    await user.click(saveButton);
    expect(apiClient.post).toHaveBeenCalledWith('/settings', {
      baseLanguage: 'ru',
      targetLanguage: 'en',
      desiredLevel: 'B2'
    });
  });
});

