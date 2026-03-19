import axios from 'axios';

// API client riêng cho hệ thống tổng (AdminDB)
// Không gửi "tenant" header — truy cập trực tiếp AdminDbContext
const adminApi = axios.create({
    baseURL: 'http://localhost:5106/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

adminApi.interceptors.request.use((config) => {
    // Luôn gửi system api key để truy cập admin resources (nếu có)
    const systemApiKey = localStorage.getItem('systemApiKey');
    if (systemApiKey) {
        config.headers['X-API-KEY'] = systemApiKey;
    }
    // Gửi kèm JWT token nếu có (để xác thực phân quyền bên trong nếu cần)
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
            localStorage.removeItem('systemApiKey');
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

export default adminApi;
