import axios from 'axios';

// const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5106/api';
const API_BASE_URL = '/api';

// Admin API client (no tenant header)
const adminApi = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'ngrok-skip-browser-warning': 'true',
    },
});

adminApi.interceptors.request.use((config) => {
    if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
    } else {
        config.headers['Content-Type'] = 'application/json';
    }

    const systemApiKey = localStorage.getItem('systemApiKey');
    if (systemApiKey) {
        config.headers['X-API-KEY'] = systemApiKey;
    }

    const token = localStorage.getItem('token');
    if (token && token !== 'sysadmin-session') {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

adminApi.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const token = localStorage.getItem('token');
            if (token === 'sysadmin-session') {
                return Promise.reject(error);
            }
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('systemApiKey');
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

export default adminApi;
