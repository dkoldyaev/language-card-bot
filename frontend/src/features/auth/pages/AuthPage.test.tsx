import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Auth from './AuthPage';
import apiClient from '../../../shared/api/client';
import useStore from '../../../store/useStore';

vi.mock('@react-oauth/google', () => ({
  GoogleLogin: () => <div data-testid="google-login-button">Google Login</div>,
  GoogleOAuthProvider: ({ children }: any) => <div>{children}</div>,
}));

describe('AuthPage with test-username provider', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_AUTH_PROVIDER', 'test-username');
    useStore.setState({ token: null, profile: null });
    vi.restoreAllMocks();
  });

  it('renders login form with username field and submit button', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Auth />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Log in/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sign up/i })).toBeInTheDocument();
  });

  it('renders registration form when on /register path', () => {
    render(
      <MemoryRouter initialEntries={['/register']}>
        <Auth />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create account/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Log in instead/i })).toBeInTheDocument();
  });

  it('submits login request when login button is clicked', async () => {
    const user = userEvent.setup();
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: {
        token: 'test_token',
        mercureToken: 'test_mercure',
        user: { id: 1, username: 'alice', email: 'alice@test.local' },
      },
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Auth />
      </MemoryRouter>
    );

    const input = screen.getByLabelText(/Username/i);
    await user.type(input, 'alice');

    const submitBtn = screen.getByRole('button', { name: /Log in/i });
    await user.click(submitBtn);

    expect(postSpy).toHaveBeenCalledWith('/auth/login', { username: 'alice' });
  });
});

describe('AuthPage with google provider', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_AUTH_PROVIDER', 'google');
    useStore.setState({ token: null, profile: null });
    vi.restoreAllMocks();
  });

  it('renders Google Login button by default', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Auth />
      </MemoryRouter>
    );

    expect(screen.getByTestId('google-login-button')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Username/i)).not.toBeInTheDocument();
  });
});
