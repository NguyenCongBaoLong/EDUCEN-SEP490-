import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5106/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
    },
});

// Helper: lấy tenantId từ nhiều nguồn (ưu tiên localStorage → URL query param)
function resolveTenantId() {
    const isValidTenantId = (tenantId) => (
        !!tenantId && tenantId !== 'undefined' && tenantId !== 'null'
    );

    // 1. Ưu tiên localStorage
    const stored = localStorage.getItem('tenantId');
    if (isValidTenantId(stored)) return stored;

    // 2. Nếu localStorage trống, thử lấy từ URL query param (?tenant=xxx hoặc ?tenantId=xxx)
    const urlParams = new URLSearchParams(window.location.search);
    const tenantFromUrl = urlParams.get('tenantId') || urlParams.get('tenant');
    if (isValidTenantId(tenantFromUrl)) {
        localStorage.setItem('tenantId', tenantFromUrl);
        return tenantFromUrl;
    }

    return null;
}

// Tự động gắn JWT token vào mỗi request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Tự động gửi tenantId nếu có (từ localStorage hoặc URL query param)
    const tenantId = resolveTenantId();
    if (tenantId) {
        config.headers['tenant'] = tenantId;
    }

    return config;
});

// Xử lý lỗi 401 (token hết hạn) → redirect về đúng trang login theo role
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            // Tránh infinite loop nếu đã ở trang login/public
            const currentPath = window.location.pathname;
            const isPublicPath = currentPath === '/' || currentPath === '/login' || currentPath === '/signup'
                || currentPath === '/forgot-password' || currentPath === '/reset-password'
                || currentPath.startsWith('/sysadmin');

            if (!isPublicPath) {
                // Redirect về đúng trang login theo role hiện tại
                if (currentPath.startsWith('/student')) {
                    window.location.href = '/login';
                } else if (currentPath.startsWith('/teacher') || currentPath.startsWith('/ta')) {
                    window.location.href = '/login';
                } else if (currentPath.startsWith('/parent')) {
                    window.location.href = '/login';
                } else if (currentPath.startsWith('/center')) {
                    window.location.href = '/login';
                } else {
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;
