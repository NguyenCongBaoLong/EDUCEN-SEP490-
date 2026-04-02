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
    // Gửi kèm JWT token nếu có VÀ không phải session giả của SystemAdmin
    // SystemAdmin dùng X-API-KEY để xác thực, không dùng JWT
    // Gửi 'sysadmin-session' sẽ bị JwtBearerHandler backend reject → 401
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
            // Không logout SystemAdmin — họ xác thực bằng X-API-KEY, không dùng JWT
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
