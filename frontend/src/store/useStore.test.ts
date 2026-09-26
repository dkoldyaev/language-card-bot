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
