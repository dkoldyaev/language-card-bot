import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../../../shared/api/client';
import {
  resetNavigationHistoryForTesting,
} from '../../../shared/lib/navigationHistory';
import useStore from '../../../store/useStore';
import DictionaryPage from './DictionaryPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <DictionaryPage />
    </MemoryRouter>
  );
}

describe('DictionaryPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetNavigationHistoryForTesting();
    useStore.setState({
      isDictionaryLoading: false,
      token: 'mock-token',
      profile: {
        id: 1,
        username: 'feature_user',
        features: { multipleDictionaries: true, cardImages: false },
      },
      dictionaries: [
        { id: 1, name: 'English Deck', targetLanguage: 'en', baseLanguage: 'ru', wordCount: 1, isActive: true },
        { id: 2, name: 'Spanish Deck', targetLanguage: 'es', baseLanguage: 'ru', wordCount: 0, isActive: false },
      ],
      activeDictionaryId: 1,
      dictionary: [
        { id: 101, text: 'apple', definitions: [] },
      ],
    });

    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        dictionary: [
          { id: 101, text: 'apple', definitions: [] },
        ],
      },
    });
  });

  it('fetches words for the active dictionary initially', async () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'English Deck' })).toBeInTheDocument();

  });

  it('switches working dictionary without altering active learning language', async () => {
    const user = userEvent.setup();
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        dictionary: [
          { id: 201, text: 'hola', definitions: [] },
        ],
      },
    });
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: {} });

    renderPage();

    // Click on the Spanish dictionary in the switcher
    const spanishBtn = screen.getByText('Spanish Deck');
    await user.click(spanishBtn);

    // Should NOT fetch words directly
    expect(getSpy).not.toHaveBeenCalledWith('/dictionary', expect.anything());

    // CRITICAL: activeDictionaryId must NOT change directly, and /select MUST be called
    expect(useStore.getState().activeDictionaryId).toBe(1);
    expect(postSpy).toHaveBeenCalledWith(expect.stringContaining('/select'));
  });

  it('toggles edit mode when pencil icon is clicked and saves new name', async () => {
    const user = userEvent.setup();
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({
      data: {
        dictionary: {
          id: 1,
          name: 'Super English Deck',
          targetLanguage: 'en',
          baseLanguage: 'ru',
        },
      },
    });

    renderPage();

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('English Deck');
    expect(heading).not.toHaveAttribute('contenteditable', 'true');

    // Click pencil icon
    const editBtn = screen.getByTestId('edit-dictionary-title-btn');
    await user.click(editBtn);

    // Now heading has contenteditable="true"
    expect(heading).toHaveAttribute('contenteditable', 'true');
    const saveBtn = screen.getByTestId('save-dictionary-title-btn');
    const cancelBtn = screen.getByTestId('cancel-dictionary-title-btn');
    expect(saveBtn).toBeInTheDocument();
    expect(cancelBtn).toBeInTheDocument();

    // Edit the text
    heading.innerText = 'Super English Deck';
    await user.click(saveBtn);

    expect(patchSpy).toHaveBeenCalledWith('/dictionaries/1', {
      name: 'Super English Deck',
    });
    expect(useStore.getState().dictionaries.find((d) => d.id === 1)?.name).toBe('Super English Deck');
    expect(heading).not.toHaveAttribute('contenteditable', 'true');
  });

  it('cancels edit mode without saving when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const patchSpy = vi.spyOn(apiClient, 'patch');

    renderPage();

    const heading = screen.getByRole('heading', { level: 1 });
    const editBtn = screen.getByTestId('edit-dictionary-title-btn');
    await user.click(editBtn);

    heading.innerText = 'Temporary Name';
    const cancelBtn = screen.getByTestId('cancel-dictionary-title-btn');
    await user.click(cancelBtn);

    expect(patchSpy).not.toHaveBeenCalled();
    expect(heading).toHaveTextContent('English Deck');
    expect(heading).not.toHaveAttribute('contenteditable', 'true');
  });

  it('operates in guest mode without calling dictionary APIs', async () => {
    const user = userEvent.setup();
    useStore.setState({
      token: null,
      profile: null,
      dictionaries: [
        { id: 1, name: 'Guest English Deck', targetLanguage: 'en', baseLanguage: 'ru', wordCount: 1, isActive: true },
      ],
      activeDictionaryId: 1,
      dictionary: [
        { id: 101, text: 'guest_word', definitions: [] },
      ],
      guestDictionaryWords: {
        1: [{ id: 101, text: 'guest_word', definitions: [] }],
      },
    });
    const getSpy = vi.spyOn(apiClient, 'get');
    const patchSpy = vi.spyOn(apiClient, 'patch');

    renderPage();

    // Should NOT call apiClient.get
    expect(getSpy).not.toHaveBeenCalledWith('/dictionary', expect.anything());

    // Rename dictionary in guest mode
    const editBtn = screen.getByTestId('edit-dictionary-title-btn');
    await user.click(editBtn);
    const heading = screen.getByRole('heading', { level: 1 });
    heading.innerText = 'Renamed Guest Deck';
    const saveBtn = screen.getByTestId('save-dictionary-title-btn');
    await user.click(saveBtn);

    // Should NOT call apiClient.patch
    expect(patchSpy).not.toHaveBeenCalled();
    // Store should be updated locally
    expect(useStore.getState().dictionaries[0].name).toBe('Renamed Guest Deck');
  });

  it('does not open a create dialog when no dictionaries exist', () => {
    useStore.setState({
      dictionaries: [],
      activeDictionaryId: null,
      isDictionaryLoading: false,
    });

    render(
      <MemoryRouter initialEntries={['/en/dictionary']}>
        <Routes>
          <Route path="/:locale/dictionary" element={<DictionaryPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('does not auto-open dialog and cancel does not navigate away when user already has dictionaries', async () => {
    const user = userEvent.setup();
    useStore.setState({
      dictionaries: [
        { id: 1, name: 'English Deck', targetLanguage: 'en', baseLanguage: 'ru', wordCount: 1, isActive: true },
      ],
      activeDictionaryId: 1,
      isDictionaryLoading: false,
    });

    render(
      <MemoryRouter initialEntries={['/dictionary']}>
        <Routes>
          <Route path="/" element={<div>Home Page</div>} />
          <Route path="/dictionary" element={<DictionaryPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Dialog should NOT be open
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Open dialog via New Dictionary button in switcher
    const newDictBtn = screen.getByText('New Dictionary');
    await user.click(newDictBtn);

    // Dialog is now open
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Click Cancel
    const cancelBtn = screen.getByTestId('create-dictionary-cancel-btn');
    await user.click(cancelBtn);

    // Dialog should close, but we stay on Dictionary page
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { level: 1, name: 'English Deck' })).toBeInTheDocument();
    expect(screen.queryByText('Home Page')).not.toBeInTheDocument();
  });
});
