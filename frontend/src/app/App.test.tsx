import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../shared/api/client';
import useStore from '../store/useStore';
import App from './App';

describe('App Routing', () => {
  beforeEach(() => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [] });
    vi.spyOn(apiClient, 'post').mockResolvedValue({ data: {} });
    useStore.setState({ token: 'dummy_token', profile: { id: 1, username: 'testuser' } });
  });

  it('renders Dashboard page on default route', async () => {
    render(<App />);
    expect(await screen.findByText(/Welcome/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalled();
    });
  });
});
