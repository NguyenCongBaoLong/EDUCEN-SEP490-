import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

// Kiểm tra tenantId hợp lệ (không phải giá trị fallback sai)
function isValidTenantId(tenantId) {
    return tenantId && tenantId !== 'default-tenant' && tenantId !== 'undefined' && tenantId !== 'null';
}

// Decode JWT payload (không cần thư viện bên ngoài)
function decodeToken(token) {
    try {
        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        const tenantId = decoded['TenantId'];
        return {
            username: decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'],
            role: decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'],
            userId: decoded['UserId'],
            tenantId: isValidTenantId(tenantId) ? tenantId : null,
        };
    } catch {
        return null;
    }
}

// Map role từ JWT → đường dẫn redirect
function getRedirectPath(role) {
    switch (role) {
        case 'Admin':
            return '/center';
        case 'Teacher':
            return '/teacher/classes';
        case 'Assistant':
            return '/ta/classes';
        case 'Student':
            return '/student/classes';
        case 'Parent':
            return '/parent/classes';
        case 'SystemAdmin':
            return '/sysadmin/dashboard';
        default:
            return '/';
    }
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Khởi tạo: đọc token từ localStorage khi app load
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            const decoded = decodeToken(token);
            if (decoded) {
                // Xóa tenantId sai khỏi localStorage nếu có
                const storedTenantId = localStorage.getItem('tenantId');
                if (!isValidTenantId(storedTenantId)) {
                    localStorage.removeItem('tenantId');
                }
                setUser(decoded);
            } else if (token === 'sysadmin-session') {
                // Hỗ trợ login System Admin bằng case đặc biệt (không dùng JWT)
                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }
            } else {
                // Token không hợp lệ → xóa
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('tenantId');
            }
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        // Gửi tenantId trong URL query param để TenantResolver middleware resolve đúng
        // (quan trọng cho lần đăng nhập đầu tiên khi localStorage chưa có tenantId)
        const urlParams = new URLSearchParams(window.location.search);
        const tenantFromUrl = urlParams.get('tenant');
        const storedTenantId = localStorage.getItem('tenantId');
        const effectiveTenantId = isValidTenantId(storedTenantId)
            ? storedTenantId
            : (isValidTenantId(tenantFromUrl) ? tenantFromUrl : null);

        if (isValidTenantId(effectiveTenantId)) {
            localStorage.setItem('tenantId', effectiveTenantId);
        }

        const loginUrl = isValidTenantId(effectiveTenantId)
            ? `/Auth/login?tenant=${encodeURIComponent(effectiveTenantId)}`
            : '/Auth/login';

        const response = await api.post(loginUrl, {
            username,
            password,
        });

        // Backend trả về ApiResponse<string> nên cần lấy token từ response.data.data
        const token = response.data.data;
        localStorage.setItem('token', token);

        const decoded = decodeToken(token);
        localStorage.setItem('user', JSON.stringify(decoded));

        // Fallback: nếu JWT không có tenantId hợp lệ, thử dùng giá trị hiện có trong localStorage
        if (!isValidTenantId(decoded.tenantId) && isValidTenantId(effectiveTenantId)) {
            decoded.tenantId = effectiveTenantId;
        }

        // Lưu tenantId vào localStorage chỉ nếu hợp lệ
        if (isValidTenantId(decoded.tenantId)) {
            localStorage.setItem('tenantId', decoded.tenantId);
        } else if (!isValidTenantId(effectiveTenantId)) {
            // Xóa tenantId sai (default-tenant, undefined, null)
            localStorage.removeItem('tenantId');
        }
        
        setUser(decoded);

        return decoded;
    };

    const logout = (redirectPath) => {
        const isSysAdmin = user?.role === 'SystemAdmin';
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('systemApiKey');
        localStorage.removeItem('tenantId'); // Xóa cả tenantId
        setUser(null);

        // Nếu là SystemAdmin thì mặc định về trang chủ tổng (/)
        const finalPath = redirectPath || (isSysAdmin ? '/sysadmin/login' : null);
        if (finalPath) {
            window.location.href = finalPath;
        }
    };

    const sysadminLogin = (apiKey) => {
        const adminUser = { username: 'System Admin', role: 'SystemAdmin' };
        localStorage.setItem('systemApiKey', apiKey);
        localStorage.setItem('token', 'sysadmin-session');
        localStorage.setItem('user', JSON.stringify(adminUser));
        setUser(adminUser);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, sysadminLogin, loading, getRedirectPath }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export { getRedirectPath };
export default AuthContext;
