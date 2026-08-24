import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Settings from './Settings';

describe('Settings', () => {
  it('renders settings form elements', () => {
    render(<Settings />);
    
    expect(screen.getByText('Settings')).toBeInTheDocument();
    
    // Check if the labels for selects exist
    expect(screen.getByLabelText('Base Language')).toBeInTheDocument();
    expect(screen.getByLabelText('Learned Language')).toBeInTheDocument();
    expect(screen.getByLabelText('Level')).toBeInTheDocument();

    // Check if the save button exists
    expect(screen.getByRole('button', { name: /Save Settings/i })).toBeInTheDocument();
  });
});
