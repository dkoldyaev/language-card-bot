import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { DictionaryItem } from '../../../store/useStore';
import DictionarySwitcher from './DictionarySwitcher';

const mockDictionaries: DictionaryItem[] = [
  { id: 1, name: 'English', targetLanguage: 'en', baseLanguage: 'ru', wordCount: 5, isActive: true },
  { id: 2, name: 'Spanish', targetLanguage: 'es', baseLanguage: 'ru', wordCount: 10, isActive: false },
];

describe('DictionarySwitcher', () => {
  it('renders all dictionaries with language pairs and ACTIVE badge', () => {
    render(
      <DictionarySwitcher
        dictionaries={mockDictionaries}
        activeDictionaryId={1}
        onSelectDictionary={vi.fn()}
        onOpenCreateDialog={vi.fn()}
      />
    );

    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('EN → RU')).toBeInTheDocument();
    expect(screen.getByText('Spanish')).toBeInTheDocument();
    expect(screen.getByText('ES → RU')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New Dictionary/i })).toBeInTheDocument();
  });

  it('calls onSelectDictionary when a dictionary is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <DictionarySwitcher
        dictionaries={mockDictionaries}
        activeDictionaryId={1}
        onSelectDictionary={onSelect}
        onOpenCreateDialog={vi.fn()}
      />
    );

    await user.click(screen.getByText('Spanish'));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('calls onOpenCreateDialog when New Dictionary is clicked', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();

    render(
      <DictionarySwitcher
        dictionaries={mockDictionaries}
        activeDictionaryId={1}
        onSelectDictionary={vi.fn()}
        onOpenCreateDialog={onOpen}
      />
    );

    await user.click(screen.getByRole('button', { name: /New Dictionary/i }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('renders delete buttons when multiple dictionaries exist and triggers onDeleteDictionary', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(
      <DictionarySwitcher
        dictionaries={mockDictionaries}
        activeDictionaryId={1}
        onSelectDictionary={vi.fn()}
        onOpenCreateDialog={vi.fn()}
        onDeleteDictionary={onDelete}
      />
    );

    const deleteButtons = screen.getAllByRole('button', { name: /Delete dictionary/i });
    expect(deleteButtons.length).toBe(2);

    await user.click(deleteButtons[1]);
    expect(onDelete).toHaveBeenCalledWith(2, 'Spanish');
  });

  it('offers deletion when there is only one dictionary', () => {
    render(
      <DictionarySwitcher
        dictionaries={[mockDictionaries[0]]}
        activeDictionaryId={1}
        onSelectDictionary={vi.fn()}
        onOpenCreateDialog={vi.fn()}
        onDeleteDictionary={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /Delete dictionary/i })).toBeInTheDocument();
  });
});
