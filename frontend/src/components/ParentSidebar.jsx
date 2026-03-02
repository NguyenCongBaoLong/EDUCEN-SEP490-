import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, Calendar, MessageSquare, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../css/components/Sidebar.css';

const ParentSidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const menuItems = [
        { path: '/parent/classes', icon: GraduationCap, label: 'Lớp học của con' },
        { path: '/parent/schedule', icon: Calendar, label: 'Lịch học của con' },
        { path: '/parent/feedback', icon: MessageSquare, label: 'Gửi phản hồi' },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <GraduationCap size={24} />
                    <span>TutorCenter</span>
                </div>
                <div className="sidebar-subtitle">Phụ huynh</div>
            </div>

            <nav className="sidebar-nav">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname.startsWith(item.path);
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
                    <div className="sidebar-user-avatar">
                        {(user?.fullName || user?.username || 'P').charAt(0).toUpperCase()}
                    </div>
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">{user?.fullName || user?.username || 'Phụ huynh'}</div>
                        <div className="sidebar-user-role">Phụ huynh</div>
                    </div>
                </Link>
                <button className="sidebar-logout" onClick={handleLogout}>
                    <LogOut size={20} />
                </button>
            </div>
        </aside>
    );
};

export default ParentSidebar;
