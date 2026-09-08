import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Layout from './Layout';
import useStore from '../../store/useStore';

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

  it('disables Quiz navigation when dictionary is empty', () => {
    useStore.setState({ dictionary: [] });
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );

    const quizButtons = screen.getAllByRole('button', { name: /Quiz/i });
    quizButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('enables Quiz navigation when dictionary has words', () => {
    useStore.setState({
      dictionary: [
        {
          id: 1,
          text: 'apple',
          definitions: [{ id: 1, text: 'A fruit', translation: null }],
        },
      ],
    });
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );

    const quizLinks = screen.getAllByRole('link', { name: /Quiz/i });
    expect(quizLinks.length).toBeGreaterThan(0);
  });
});
