import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Settings from './SettingsPage';
import apiClient from '../../../shared/api/client';
import useStore from '../../../store/useStore';

describe('Settings', () => {
  beforeEach(() => {
    // Reset store and add some initial state
    useStore.setState({
      settings: { baseLanguage: 'ru', targetLanguage: 'en' }
    });
    
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: {} });
    vi.spyOn(apiClient, 'post').mockResolvedValue({});
  });

  it('loads settings from store and allows saving without fetching on mount', async () => {
    const user = userEvent.setup();
    render(<Settings />);
    
    // Form should render immediately (synchronously from store)
    expect(screen.getByRole('heading', { name: /Settings/i })).toBeInTheDocument();
    
    // apiClient.get should NOT be called on mount
    expect(apiClient.get).not.toHaveBeenCalled();

    // Check if the save button exists
    const saveButton = screen.getByRole('button', { name: /Save Settings/i });
    expect(saveButton).toBeInTheDocument();
    
    // Click save and verify API call
    await user.click(saveButton);
    expect(apiClient.post).toHaveBeenCalledWith('/settings', {
      baseLanguage: 'ru',
      targetLanguage: 'en'
    });
  });
});
