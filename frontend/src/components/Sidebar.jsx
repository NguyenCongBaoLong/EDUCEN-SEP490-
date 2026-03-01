import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, GraduationCap, Users, BookOpen, Calendar, LogOut, Home, ChevronLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../css/components/Sidebar.css';

const Sidebar = () => {
    const location = useLocation();

    const menuItems = [
        { path: '/center/dashboard', icon: LayoutDashboard, label: 'Tổng quan' },
        { path: '/center/classes', icon: GraduationCap, label: 'Lớp học' },
        { path: '/center/staff', icon: Users, label: 'Nhân viên' },
        { path: '/center/students', icon: BookOpen, label: 'Học sinh' },
        { path: '/center/schedules', icon: Calendar, label: 'Lịch học' },

    ];

    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/center');
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <GraduationCap size={24} />
                    <span>TutorCenter</span>
                </div>
                <div className="sidebar-subtitle">Quản trị viên</div>
            </div>

            <nav className="sidebar-nav">
                {/* Back to Center Home */}
                <Link to="/center" className="sidebar-back-link">
                    <ChevronLeft size={16} />
                    <span>Trang chủ trung tâm</span>
                </Link>
                <div className="sidebar-divider" />

                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                        >
                            <Icon size={20} />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="sidebar-footer">
                <Link to="/profile" className="sidebar-user" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="sidebar-user-avatar">{(user?.fullName || user?.username || 'A').charAt(0).toUpperCase()}</div>
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">{user?.fullName || user?.username || 'Admin'}</div>
                        <div className="sidebar-user-role">Quản trị viên</div>
                    </div>
                </Link>
                <button className="sidebar-logout" onClick={handleLogout}>
                    <LogOut size={20} />
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
