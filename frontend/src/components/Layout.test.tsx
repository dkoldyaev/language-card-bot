import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Layout from './Layout';

describe('Layout', () => {
  it('renders sidebar navigation links', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );
    // Sidebar should render navigation items
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Dictionary')).toBeInTheDocument();
    expect(screen.getByText('Quiz')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
});
