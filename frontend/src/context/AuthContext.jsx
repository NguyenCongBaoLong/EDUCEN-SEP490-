import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

// Decode JWT payload (không cần thư viện bên ngoài)
function decodeToken(token) {
    try {
        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        return {
            username: decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'],
            role: decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'],
            userId: decoded['UserId'],
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
            return '/'; // TODO: thêm route student sau
        case 'Parent':
            return '/'; // TODO: thêm route parent sau
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
                setUser(decoded);
            } else {
                // Token không hợp lệ → xóa
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        const response = await api.post('/Auth/login', {
            username,
            password,
        });

        // Backend trả về token dạng string trực tiếp
        const token = response.data;
        localStorage.setItem('token', token);

        const decoded = decodeToken(token);
        localStorage.setItem('user', JSON.stringify(decoded));
        setUser(decoded);

        return decoded;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, getRedirectPath }}>
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
