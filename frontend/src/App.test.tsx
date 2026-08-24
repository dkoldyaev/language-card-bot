import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App Routing', () => {
  it('renders Welcome page on default route', () => {
    render(<App />);
    expect(screen.getByText(/Welcome to English Card Bot/i)).toBeInTheDocument();
  });
});

