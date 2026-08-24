import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Quiz from './Quiz';
import apiClient from '../api/client';
import useStore from '../store/useStore';

describe('Quiz', () => {
  beforeEach(() => {
    useStore.setState({ quizCard: null });
  });

  it('renders start quiz button when no card is set', () => {
    render(<Quiz />);
    expect(screen.getByText('Ready to test your vocabulary?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start Quiz/i })).toBeInTheDocument();
  });

  it('starts quiz and sets loading state', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, 'post').mockResolvedValue({});

    render(<Quiz />);
    
    const startBtn = screen.getByRole('button', { name: /Start Quiz/i });
    await user.click(startBtn);

    expect(apiClient.post).toHaveBeenCalledWith('/quiz/start');
  });

  it('renders card when quizCard is set', () => {
    useStore.setState({
      quizCard: {
        wordId: 1,
        definition: { id: 1, text: 'A fruit', translation: null }
      }
    });

    render(<Quiz />);
    
    expect(screen.getByText('Quiz')).toBeInTheDocument();
    expect(screen.getByText('A fruit')).toBeInTheDocument();
  });
});
