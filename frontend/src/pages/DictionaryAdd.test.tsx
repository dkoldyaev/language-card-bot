import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import DictionaryAdd from './DictionaryAdd';

describe('DictionaryAdd', () => {
  it('renders input area and disabled submit button', () => {
    render(<DictionaryAdd />);
    
    expect(screen.getByText('Add Words')).toBeInTheDocument();
    
    const input = screen.getByRole('textbox', { name: /Words list/i });
    expect(input).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Submit Words/i });
    expect(submitBtn).toBeDisabled();
  });

  it('enables submit button when text is entered', async () => {
    const user = userEvent.setup();
    render(<DictionaryAdd />);
    
    const input = screen.getByRole('textbox', { name: /Words list/i });
    const submitBtn = screen.getByRole('button', { name: /Submit Words/i });

    await user.type(input, 'apple');
    expect(submitBtn).toBeEnabled();
  });
});
