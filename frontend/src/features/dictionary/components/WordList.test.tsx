import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WordList from './WordList';
import useStore from '../../../store/useStore';

vi.mock('../../../shared/components/StatusChip', () => ({
  default: () => <div data-testid="status-chip" />,
}));

vi.mock('../../../shared/lib/analytics', () => ({
  trackEvent: vi.fn(),
}));

describe('WordList Search and Select All', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useStore.setState({
      dictionary: [
        { id: 1, text: 'apple', definitions: [] },
        { id: 2, text: 'apricot', definitions: [] },
        { id: 3, text: 'banana', definitions: [] },
      ],
    });
  });

  it('selects only filtered words when "All" checkbox is checked', async () => {
    const user = userEvent.setup();
    render(<WordList loading={false} />);

    // Initially all 3 words are shown
    expect(screen.getByText('apple')).toBeInTheDocument();
    expect(screen.getByText('apricot')).toBeInTheDocument();
    expect(screen.getByText('banana')).toBeInTheDocument();

    // Type "ap" into Search words input
    const searchInput = screen.getByPlaceholderText('Search words...');
    await user.type(searchInput, 'ap');

    // Only "apple" and "apricot" should remain visible in list
    expect(screen.getByText('apple')).toBeInTheDocument();
    expect(screen.getByText('apricot')).toBeInTheDocument();
    expect(screen.queryByText('banana')).not.toBeInTheDocument();

    // Check "All"
    const allCheckbox = screen.getByRole('checkbox', { name: 'All' });
    await user.click(allCheckbox);

    // Delete button should show (2) selected words, not all 3
    expect(screen.getByRole('button', { name: /Delete \(2\)/i })).toBeInTheDocument();

    // Clear the search
    await user.clear(searchInput);

    // "banana" is visible again, but should not be selected
    expect(screen.getByText('banana')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete \(2\)/i })).toBeInTheDocument();

    // The "All" checkbox is indeterminate because 2 of 3 words are selected
    expect(allCheckbox).toHaveAttribute('data-indeterminate', 'true');
    expect(allCheckbox).not.toBeChecked();

    // Filter "banana" and check "All"
    await user.type(searchInput, 'banana');
    expect(allCheckbox).not.toBeChecked();
    await user.click(allCheckbox);

    // Now all 3 words are selected
    expect(screen.getByRole('button', { name: /Delete \(3\)/i })).toBeInTheDocument();

    // Uncheck "All" while filtered by "banana"
    await user.click(allCheckbox);

    // Only banana is deselected, 2 words ("apple", "apricot") remain selected
    expect(screen.getByRole('button', { name: /Delete \(2\)/i })).toBeInTheDocument();
  });

  it('renders mini chips for presets on words and definitions', () => {
    useStore.setState({
      dictionary: [
        {
          id: 10,
          text: 'hola',
          presets: [{ id: 101, title: 'Spanish A1' }],
          definitions: [
            {
              id: 201,
              text: 'an informal greeting',
              translation: { id: 301, text: 'привет' },
              presets: [{ id: 101, title: 'Spanish A1' }],
            },
          ],
        },
      ],
    });

    render(<WordList loading={false} />);

    // Word preset chip
    const wordPresetChip = screen.getByTestId('word-preset-chip-101');
    expect(wordPresetChip).toBeInTheDocument();
    expect(wordPresetChip).toHaveTextContent('Spanish A1');

    // Definition preset chip
    const defPresetChip = screen.getByTestId('def-preset-chip-101');
    expect(defPresetChip).toBeInTheDocument();
    expect(defPresetChip).toHaveTextContent('Spanish A1');
  });
});
