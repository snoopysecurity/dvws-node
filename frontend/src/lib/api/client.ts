import axios from 'axios';
import { browser } from '$app/environment';

const API_BASE = import.meta.env.PUBLIC_API_BASE_URL || 'http://localhost:80';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add JWT token to requests and handle FormData content type
apiClient.interceptors.request.use((config) => {
  if (browser) {
    const token = localStorage.getItem('JWTSessionID');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Let axios set multipart/form-data with boundary when sending FormData
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
  }
  return config;
});

export default apiClient;
