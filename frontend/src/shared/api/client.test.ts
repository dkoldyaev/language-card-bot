import type { InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it } from 'vitest';
import useStore from '../../store/useStore';
import apiClient from './client';

type RequestInterceptorManager = {
  handlers: Array<{
    fulfilled: (config: InternalAxiosRequestConfig) => Promise<InternalAxiosRequestConfig> | InternalAxiosRequestConfig;
  }>;
};

describe('apiClient interceptor', () => {
  beforeEach(() => {
    useStore.getState().setToken(null);
  });

  it('should not add Authorization header if token is null', async () => {
    const config = { headers: {} } as InternalAxiosRequestConfig;
    const result = await (apiClient.interceptors.request as unknown as RequestInterceptorManager).handlers[0].fulfilled(config);
    expect(result.headers.Authorization).toBeUndefined();
  });

  it('should add Authorization header if token exists', async () => {
    useStore.getState().setToken('fake-jwt-token');
    const config = { headers: {} } as InternalAxiosRequestConfig;
    const result = await (apiClient.interceptors.request as unknown as RequestInterceptorManager).handlers[0].fulfilled(config);
    expect(result.headers.Authorization).toBe('Bearer fake-jwt-token');
  });

});
