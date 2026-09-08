import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from './App';
import useStore from '../store/useStore';
import apiClient from '../shared/api/client';

describe('App Routing', () => {
  beforeEach(() => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [] });
    vi.spyOn(apiClient, 'post').mockResolvedValue({ data: {} });
    useStore.setState({ token: 'dummy_token', profile: { id: 1, username: 'testuser' } });
  });

  it('renders Dashboard page on default route', () => {
    render(<App />);
    expect(screen.getByText(/Welcome/i)).toBeInTheDocument();
  });
});
