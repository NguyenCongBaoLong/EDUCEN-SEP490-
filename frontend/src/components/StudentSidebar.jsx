import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, Calendar, FileText, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../css/components/Sidebar.css';

const StudentSidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, centerBranding } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const menuItems = [
        { path: '/student/classes', icon: GraduationCap, label: 'Lớp của tôi' },
        { path: '/student/schedules', icon: Calendar, label: 'Lịch học' },
        { path: '/student/invoices', icon: FileText, label: 'Hóa đơn học phí' },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <div className="logo-wrapper">
                        {centerBranding.logoUrl ? (
                            <img src={centerBranding.logoUrl} alt="Logo" />
                        ) : (
                            <GraduationCap size={24} />
                        )}
                    </div>
                    <div className="logo-content">
                        <span className="center-name">{centerBranding.name}</span>
                        <div className="sidebar-subtitle">Học sinh</div>
                    </div>
                </div>
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
                        {(user?.fullName || user?.username || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">{user?.fullName || user?.username || 'Học sinh'}</div>
                        <div className="sidebar-user-role">Học sinh</div>
                    </div>
                </Link>
                <button className="sidebar-logout" onClick={handleLogout}>
                    <LogOut size={20} />
                </button>
            </div>
        </aside>
    );
};

export default StudentSidebar;
