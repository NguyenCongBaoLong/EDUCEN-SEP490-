import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * PrivateRoute — Bảo vệ route theo role
 *
 * @param {React.ReactNode} children - Component cần render
 * @param {string[]} allowedRoles - Danh sách role được phép truy cập
 *
 * Ví dụ: <PrivateRoute allowedRoles={['Admin']}><CenterHome /></PrivateRoute>
 *
 * Logic:
 * - Chưa login → redirect về /login (giữ tenant query param)
 * - Đã login nhưng sai role → redirect về trang của role đó
 * - Đúng role → render component
 */
const PrivateRoute = ({ children, allowedRoles }) => {
    const { user, loading, getRedirectPath } = useAuth();

    // Đang load auth state từ localStorage
    if (loading) {
        return null;
    }

    // Chưa đăng nhập → về đúng trang login tương ứng
    if (!user) {
        const isSysAdminPath = window.location.pathname.startsWith('/sysadmin');
        const loginPath = isSysAdminPath ? '/sysadmin/login' : '/login';
        
        // Giữ lại tenant query param khi redirect để login biết tenant nào
        const tenantId = localStorage.getItem('tenantId');
        const redirectUrl = tenantId
            ? `${loginPath}?tenant=${encodeURIComponent(tenantId)}`
            : loginPath;
        
        return <Navigate to={redirectUrl} replace />;
    }

    // Đã login nhưng role không được phép → redirect về trang đúng role
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        const correctPath = getRedirectPath(user.role);
        return <Navigate to={correctPath} replace />;
    }

    // OK → render
    return children;
};

export default PrivateRoute;