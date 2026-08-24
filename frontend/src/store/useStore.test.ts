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
});
