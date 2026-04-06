import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Building2, Package, LogOut, Globe, MessageSquare, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../css/components/SystemAdminSidebar.css';

const SystemAdminSidebar = () => {
    const location = useLocation();
    const { user, logout } = useAuth();

    const menuItems = [
        { path: '/sysadmin/dashboard', icon: LayoutDashboard, label: 'Tổng Quan' },
        { path: '/sysadmin/tenants', icon: Building2, label: 'Trung Tâm' },
        { path: '/sysadmin/plans', icon: Package, label: 'Gói Dịch Vụ' },
        { path: '/sysadmin/zalo-oa', icon: MessageSquare, label: 'Zalo OA' },
        { path: '/sysadmin/refunds', icon: RotateCcw, label: 'Hoàn Tiền' },
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
