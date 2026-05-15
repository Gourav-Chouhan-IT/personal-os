// Axios instance — base URL from env, auto-attaches JWT from localStorage
import axios from 'axios';

// In development the Vite proxy forwards /api → localhost:5000, so '/api' is correct.
// In production set VITE_API_URL=https://your-backend.onrender.com (no trailing slash, no /api).
const _base = import.meta.env.VITE_API_URL;
const baseURL = _base && _base.startsWith('http')
  ? `${_base.replace(/\/$/, '')}/api`
  : '/api';

const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pos_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('pos_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
