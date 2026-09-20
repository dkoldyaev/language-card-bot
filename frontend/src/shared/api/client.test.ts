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

  it('should intercept /dictionary in guest mode and return local words', async () => {
    useStore.getState().setToken(null);
    useStore.getState().setDictionary([
      { id: 1, text: 'guest_word', definitions: [] },
    ]);

    const res = await apiClient.get('/dictionary', { params: { dictionaryId: 1789669625762 } });
    expect(res.data.dictionary).toBeDefined();
    expect(res.data.dictionary).toHaveLength(1);
    expect(res.data.dictionary[0].text).toBe('guest_word');
  });

  it('should intercept /dictionaries in guest mode and return local dictionaries', async () => {
    useStore.getState().setToken(null);
    useStore.getState().setDictionaries([
      { id: 1789669625762, name: 'Guest Deck', targetLanguage: 'en', baseLanguage: 'ru', wordCount: 0, isActive: true },
    ]);

    const res = await apiClient.get('/dictionaries');
    expect(res.data.dictionaries).toHaveLength(1);
    expect(res.data.dictionaries[0].name).toBe('Guest Deck');
  });
});
