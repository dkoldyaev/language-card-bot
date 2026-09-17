import { describe, expect, it } from 'vitest';
import useStore from './useStore';

describe('useStore', () => {
  it('should set token', () => {
    useStore.getState().setToken('test-token');
    expect(useStore.getState().token).toBe('test-token');
  });

  it('should set profile', () => {
    const profile = { id: 1, username: 'testuser' };
    useStore.getState().setProfile(profile);
    expect(useStore.getState().profile).toEqual(profile);
  });

  it('should set selectedDictionaryId without affecting activeDictionaryId', () => {
    useStore.setState({ activeDictionaryId: 10, selectedDictionaryId: null });
    useStore.getState().setSelectedDictionaryId(20);

    expect(useStore.getState().selectedDictionaryId).toBe(20);
    expect(useStore.getState().activeDictionaryId).toBe(10);
  });

  it('should reset selectedDictionaryId when the selected dictionary is removed', () => {
    useStore.setState({
      dictionaries: [
        { id: 1, name: 'English', targetLanguage: 'en', baseLanguage: 'ru', wordCount: 0, isActive: true },
        { id: 2, name: 'Spanish', targetLanguage: 'es', baseLanguage: 'ru', wordCount: 0, isActive: false },
      ],
      activeDictionaryId: 1,
      selectedDictionaryId: 2,
    });

    useStore.getState().removeDictionary(2);

    expect(useStore.getState().selectedDictionaryId).toBeNull();
    expect(useStore.getState().activeDictionaryId).toBe(1);
    expect(useStore.getState().dictionaries).toHaveLength(1);
  });

  it('should toggle and set themeMode', () => {
    useStore.setState({ themeMode: 'light' });
    expect(useStore.getState().themeMode).toBe('light');

    useStore.getState().toggleThemeMode();
    expect(useStore.getState().themeMode).toBe('dark');

    useStore.getState().toggleThemeMode();
    expect(useStore.getState().themeMode).toBe('light');

    useStore.getState().setThemeMode('dark');
    expect(useStore.getState().themeMode).toBe('dark');
  });

  it('should preserve themeMode on reset', () => {
    useStore.setState({ themeMode: 'dark', token: 'some-token' });
    useStore.getState().reset();
    expect(useStore.getState().token).toBeNull();
    expect(useStore.getState().themeMode).toBe('dark');
  });

  it('should record guest quiz attempts', () => {
    useStore.setState({ guestQuizAttempts: [] });
    useStore.getState().recordGuestQuizAttempt('apple', 'SUCCESS');
    expect(useStore.getState().guestQuizAttempts).toHaveLength(1);
    expect(useStore.getState().guestQuizAttempts[0].wordText).toBe('apple');
    expect(useStore.getState().guestQuizAttempts[0].result).toBe('SUCCESS');
  });

  it('should clear guest data', () => {
    useStore.setState({
      guestQuizAttempts: [{ wordText: 'apple', result: 'SUCCESS', createdAt: new Date().toISOString() }],
      dictionaries: [{ id: 1, name: 'EN', targetLanguage: 'en', baseLanguage: 'ru', wordCount: 1, isActive: true }],
    });
    useStore.getState().clearGuestData();
    expect(useStore.getState().guestQuizAttempts).toHaveLength(0);
    expect(useStore.getState().dictionaries).toHaveLength(0);
  });
});
