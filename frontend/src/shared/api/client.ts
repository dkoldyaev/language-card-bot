import axios from 'axios';
import useStore from '../../store/useStore';
import { trackEvent } from '../lib/analytics';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
if (!apiBaseUrl) {
  throw new Error('VITE_API_BASE_URL is required');
}

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const state = useStore.getState();
    const token = state.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (useStore.getState().token) {
        useStore.getState().reset();
      }
    }
    
    // Ignore aborted requests from error tracking.
    if (
      !axios.isCancel(error)
    ) {
      trackEvent('API Error', { 
        status: error.response?.status || 'network_error', 
        url: error.config?.url || 'unknown_url' 
      });
    }

    return Promise.reject(error);
  }
);

export default apiClient;
