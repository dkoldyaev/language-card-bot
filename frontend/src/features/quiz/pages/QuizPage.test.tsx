import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Quiz from './QuizPage';
import apiClient from '../../../shared/api/client';
import useStore from '../../../store/useStore';

describe('Quiz', () => {
  beforeEach(() => {
    useStore.setState({
      quizCard: null,
      quizEvaluation: null,
      quizTranslation: null,
      quizVariants: null,
      dictionary: [
        {
          id: 1,
          text: 'apple',
          definitions: [{ id: 1, text: 'A fruit', translation: null }],
        },
      ],
    });
  });

  it('renders locked/empty state when dictionary is empty', () => {
    useStore.setState({ dictionary: [], quizCard: null });
    render(
      <MemoryRouter>
        <Quiz />
      </MemoryRouter>
    );

    expect(screen.getByText('Quiz is locked')).toBeInTheDocument();
    expect(screen.getByText('Your dictionary is empty')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Go to Dictionary/i })).toBeInTheDocument();
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
    expect(screen.getByRole('textbox', { name: /Your answer/i })).toBeInTheDocument();
  });

  it('submits suggestion and clears input', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, 'post').mockResolvedValue({});

    useStore.setState({
      quizCard: {
        wordId: 1,
        definition: { id: 1, text: 'A fruit', translation: null }
      }
    });

    render(<Quiz />);
    
    const input = screen.getByRole('textbox', { name: /Your answer/i });
    await user.type(input, 'apple');

    const submitBtn = screen.getByRole('button', { name: /Submit/i });
    await user.click(submitBtn);

    expect(apiClient.post).toHaveBeenCalledWith('/quiz/answer', { suggestion: 'apple' });
    
    await waitFor(() => {
      expect(input).toHaveValue('');
    });
  });

  it('displays evaluation result when quizEvaluation is set', () => {
    useStore.setState({
      quizCard: {
        wordId: 1,
        definition: { id: 1, text: 'A fruit', translation: null }
      },
      quizEvaluation: {
        result: 'SUCCESS',
        suggestion: 'apple'
      }
    });

    render(<Quiz />);
    
    expect(screen.getByText('apple')).toBeInTheDocument();
    expect(screen.getByText('Success! 🎉')).toBeInTheDocument();
  });

  it('handles translation request and display', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, 'post').mockResolvedValue({});

    useStore.setState({
      quizCard: { wordId: 1, definition: { id: 1, text: 'A fruit', translation: null } },
      quizTranslation: 'Фрукт'
    });

    render(<Quiz />);
    
    expect(screen.getByText('Translation: Фрукт')).toBeInTheDocument();
    
    const translateBtn = screen.getByRole('button', { name: /Translate definition/i });
    expect(translateBtn).toBeDisabled();

    // Now test without translation
    useStore.setState({ quizTranslation: null });
    render(<Quiz />);

    // Get the second instance of the button (from the second render)
    const activeTranslateBtn = screen.getAllByRole('button', { name: /Translate definition/i })[1];
    expect(activeTranslateBtn).not.toBeDisabled();
    await user.click(activeTranslateBtn);
    expect(apiClient.post).toHaveBeenCalledWith('/quiz/translate_definition');
  });

  it('handles next definition request', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, 'post').mockResolvedValue({});

    useStore.setState({
      quizCard: { wordId: 1, definition: { id: 1, text: 'A fruit', translation: null } }
    });

    render(<Quiz />);
    
    const nextDefBtn = screen.getByRole('button', { name: /Another definition/i });
    await user.click(nextDefBtn);
    expect(apiClient.post).toHaveBeenCalledWith('/quiz/next_definition');
  });

  it('handles variants request and display', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, 'post').mockResolvedValue({});

    useStore.setState({
      quizCard: { wordId: 1, definition: { id: 1, text: 'A fruit', translation: null } },
      quizVariants: ['pear', 'banana', 'orange']
    });

    render(<Quiz />);
    
    expect(screen.getByText('pear')).toBeInTheDocument();
    expect(screen.getByText('banana')).toBeInTheDocument();
    
    const variantBtn = screen.getByRole('button', { name: 'pear' });
    await user.click(variantBtn);
    
    expect(apiClient.post).toHaveBeenCalledWith('/quiz/answer', { suggestion: 'pear' });
  });

  it('handles next card request', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, 'post').mockResolvedValue({});

    useStore.setState({
      quizCard: { wordId: 1, definition: { id: 1, text: 'A fruit', translation: null } }
    });

    render(<Quiz />);
    
    const nextCardBtn = screen.getByRole('button', { name: /Next card/i });
    await user.click(nextCardBtn);
    expect(apiClient.post).toHaveBeenCalledWith('/quiz/next_card');
  });
});
