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

    // 1. Ưu tiên URL query param (?tenant=xxx hoặc ?tenantId=xxx) 
    // Nếu người dùng gõ trực tiếp URL, họ muốn truy cập chính xác trung tâm đó
    const urlParams = new URLSearchParams(window.location.search);
    const tenantFromUrl = urlParams.get('tenantId') || urlParams.get('tenant');
    
    if (isValidTenantId(tenantFromUrl)) {
        localStorage.setItem('tenantId', tenantFromUrl);
        return tenantFromUrl;
    }

    // 2. Nếu URL không có, mới lấy từ localStorage (giá trị đã "ghi nhớ" trước đó)
    const stored = localStorage.getItem('tenantId');
    if (isValidTenantId(stored)) return stored;

    return null;
}

// Tự động gắn JWT token vào mỗi request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    // Không gửi session giả của SystemAdmin (không phải JWT hợp lệ)
    if (token && token !== 'sysadmin-session') {
        config.headers.Authorization = `Bearer ${token}`;
    }
    
    // SystemAdmin không cần tenant header
    if (token !== 'sysadmin-session') {
        const tenantId = resolveTenantId();
        if (tenantId) {
            console.log(`[API Interceptor] Using TenantId: ${tenantId}`);
            config.headers['tenant'] = tenantId;
        } else {
            console.log('[API Interceptor] No TenantId found');
        }
    }

    return config;
});

// Xử lý lỗi 401 (token hết hạn) → redirect về đúng trang login theo role
api.interceptors.response.use(
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
