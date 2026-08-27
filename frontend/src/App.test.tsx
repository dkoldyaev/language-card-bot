import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from './App';
import useStore from './store/useStore';

describe('App Routing', () => {
  beforeEach(() => {
    useStore.setState({ token: 'dummy_token' });
  });

  it('renders Welcome page on default route', () => {
    render(<App />);
    expect(screen.getByText(/Welcome to English Card Bot/i)).toBeInTheDocument();
  });
});

