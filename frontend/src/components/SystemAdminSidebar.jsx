import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Building2, Package, LogOut, Globe, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import adminApi from '../services/adminApi';
import '../css/components/SystemAdminSidebar.css';

const SystemAdminSidebar = () => {
    const location = useLocation();
    const { user, logout } = useAuth();
    const [counts, setCounts] = useState({
        tenants: 0,
        plans: 0,
        zaloOA: 0,
        packageRequests: 0
    });

    const fetchCounts = useCallback(async (reason = 'manual') => {
        try {
            // Use adminApi so SystemAdmin requests always include X-API-KEY
            const [regRes, packageRes] = await Promise.all([
                adminApi.get('/registrations'),
                adminApi.get('/admin/tenants/subscription-change-requests', {
                    params: { status: 'Pending' }
                })
            ]);

            const pendingRegistrations = (regRes.data || []).filter(r => r.status === 'Pending').length;
            const pendingPackages = (packageRes.data || []).filter(p => p.status === 'Pending').length;

            // Fetch pending Zalo OA requests count
            // const zaloRes = await api.get('/admin/zalo-requests');
            // const pendingZalo = zaloRes.data.filter(z => z.status === 'Pending').length;

            const nextCounts = {
                tenants: pendingRegistrations,
                plans: 0,
                zaloOA: 0,
                packageRequests: pendingPackages
            };

            setCounts(nextCounts);
            console.debug('[SystemAdminSidebar] badge counts updated', {
                reason,
                ...nextCounts
            });
        } catch (error) {
            console.warn('[SystemAdminSidebar] failed to refresh badge counts', {
                reason,
                error: error?.response?.data || error?.message || error
            });
        }
    }, []);

    useEffect(() => {
        fetchCounts('mount');

        const intervalId = window.setInterval(() => {
            fetchCounts('interval-30s');
        }, 30000);

        const handleFocus = () => fetchCounts('window-focus');
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                fetchCounts('tab-visible');
            }
        };
        const handleManualRefresh = () => fetchCounts('custom-event');

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('sysadmin-badge-refresh', handleManualRefresh);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('sysadmin-badge-refresh', handleManualRefresh);
        };
    }, [fetchCounts]);

    useEffect(() => {
        fetchCounts('route-change');
    }, [location.pathname, fetchCounts]);

    const menuItems = [
        { path: '/sysadmin/dashboard', icon: LayoutDashboard, label: 'Tổng Quan', count: 0 },
        { path: '/sysadmin/tenants', icon: Building2, label: 'Trung Tâm', count: counts.tenants + counts.packageRequests },
        { path: '/sysadmin/plans', icon: Package, label: 'Gói Dịch Vụ', count: counts.plans },
        { path: '/sysadmin/zalo-oa', icon: MessageSquare, label: 'Zalo OA', count: counts.zaloOA },
    ];

    const handleLogout = () => {
        logout('/sysadmin/login');
    };

    return (
        <aside className="sa-sidebar">
            <div className="sa-sidebar-header">
                <div className="sa-sidebar-logo">
                    <Globe size={24} />
                    <span>EduCen System</span>
                </div>
                <div className="sa-sidebar-subtitle">Quản trị hệ thống tổng</div>
            </div>

            <nav className="sa-sidebar-nav">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname.startsWith(item.path);
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`sa-sidebar-nav-item ${isActive ? 'active' : ''}`}
                        >
                            <Icon size={20} />
                            <span>{item.label}</span>
                            {item.count > 0 && (
                                <span className="sa-sidebar-badge">{item.count}</span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="sa-sidebar-footer">
                <div className="sa-sidebar-user">
                    <div className="sa-sidebar-user-avatar">
                        {(user?.username || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div className="sa-sidebar-user-info">
                        <div className="sa-sidebar-user-name">{user?.username || 'System Admin'}</div>
                        <div className="sa-sidebar-user-role">Quản trị viên tổng</div>
                    </div>
                </div>
                <button className="sa-sidebar-logout" onClick={handleLogout} title="Đăng xuất">
                    <LogOut size={20} />
                </button>
            </div>
        </aside>
    );
};

export default SystemAdminSidebar;
