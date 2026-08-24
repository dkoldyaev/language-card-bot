import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from './client';
import useStore from '../store/useStore';

describe('apiClient interceptor', () => {
  beforeEach(() => {
    useStore.getState().setToken(null);
  });

  it('should not add Authorization header if token is null', async () => {
    // We mock axios request conceptually by testing the interceptor logic directly
    const config = { headers: {} } as any;
    const result = await (apiClient.interceptors.request as any).handlers[0].fulfilled(config);
    expect(result.headers.Authorization).toBeUndefined();
  });

  it('should add Authorization header if token exists', async () => {
    useStore.getState().setToken('fake-jwt-token');
    const config = { headers: {} } as any;
    const result = await (apiClient.interceptors.request as any).handlers[0].fulfilled(config);
    expect(result.headers.Authorization).toBe('Bearer fake-jwt-token');
  });
});
