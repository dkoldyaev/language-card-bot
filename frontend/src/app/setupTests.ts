import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

vi.mock('@react-oauth/google', () => ({
  GoogleLogin: ({ onSuccess }: any) =>
    React.createElement(
      'button',
      {
        'data-testid': 'google-login-btn',
        onClick: () => onSuccess?.({ credential: 'mock-credential' }),
      },
      'Google Login'
    ),
  GoogleOAuthProvider: ({ children }: any) => React.createElement('div', null, children),
  useGoogleLogin: () => vi.fn(),
}));

