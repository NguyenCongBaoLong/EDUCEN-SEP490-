import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5106/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Tự động gắn JWT token vào mỗi request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Xử lý lỗi 401 (token hết hạn) → redirect về login
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            // Tránh infinite loop nếu đã ở trang login hoặc center hoặc sysadmin
            const currentPath = window.location.pathname;
            if (currentPath !== '/center' && currentPath !== '/login' && currentPath !== '/' && !currentPath.startsWith('/sysadmin')) {
                window.location.href = '/center';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
