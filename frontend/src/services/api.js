import axios from 'axios';
import toast from 'react-hot-toast';
import { parseValidationErrors } from './toastHelper';

const API_BASE_URL = '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
    },
});

function resolveTenantId() {
    const isValidTenantId = (tenantId) => (
        !!tenantId && tenantId !== 'undefined' && tenantId !== 'null'
    );

    const urlParams = new URLSearchParams(window.location.search);
    const tenantFromUrl = urlParams.get('tenantId') || urlParams.get('tenant');

    if (isValidTenantId(tenantFromUrl)) {
        localStorage.setItem('tenantId', tenantFromUrl);
        return tenantFromUrl;
    }

    const stored = localStorage.getItem('tenantId');
    if (isValidTenantId(stored)) return stored;

    return null;
}

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token && token !== 'sysadmin-session') {
        config.headers.Authorization = `Bearer ${token}`;
    }

    if (token !== 'sysadmin-session') {
        const tenantId = resolveTenantId();
        if (tenantId) {
            config.headers.tenant = tenantId;
        }
    }

    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const token = localStorage.getItem('token');
            if (token === 'sysadmin-session') {
                return Promise.reject(error);
            }

            localStorage.removeItem('token');
            localStorage.removeItem('user');

            const currentPath = window.location.pathname;
            const isPublicPath = currentPath === '/'
                || currentPath === '/login'
                || currentPath === '/signup'
                || currentPath === '/forgot-password'
                || currentPath === '/reset-password'
                || currentPath.startsWith('/sysadmin');

            if (!isPublicPath) {
                window.location.href = '/login';
            }
        }

        if (error.response?.status === 400) {
            const parsed = parseValidationErrors(error.response);
            if (parsed.hasErrors && parsed.formattedMessage && !error.config?._validationHandled) {
                error.config._validationHandled = true;
                toast.error(parsed.formattedMessage, {
                    duration: 5000,
                    style: {
                        maxWidth: '500px',
                        whiteSpace: 'pre-line',
                    },
                });
            }
        }

        if (error.response?.status === 403) {
            const errorData = error.response?.data;
            const message = errorData?.message || 'Tài khoản trung tâm đã bị khóa. Vui lòng liên hệ quản trị viên.';
            
            toast.error(message, {
                duration: 7000,
                style: {
                    maxWidth: '500px',
                    whiteSpace: 'pre-line',
                },
            });
            
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('tenantId');
            
            window.location.href = '/?locked=true';
        }

        return Promise.reject(error);
    }
);

export default api;
export { parseValidationErrors };
