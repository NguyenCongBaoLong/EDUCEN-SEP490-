import axios from 'axios';

// API client riêng cho hệ thống tổng (AdminDB)
// Không gửi "tenant" header — truy cập trực tiếp AdminDbContext
const adminApi = axios.create({
    baseURL: 'http://localhost:5062/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

adminApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

adminApi.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/sysadmin/login';
        }
        return Promise.reject(error);
    }
);

export default adminApi;
