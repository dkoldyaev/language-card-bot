import { describe, it, expect } from 'vitest';
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
});
