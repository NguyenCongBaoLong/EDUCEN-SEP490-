import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, GraduationCap, Calendar, ClipboardList, LogOut, ChevronLeft, ChevronRight, BarChart2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../css/components/Sidebar.css';

const TeacherSidebar = ({ isTA = false, onCollapseChange }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const saved = localStorage.getItem('teacher-sidebar-collapsed');
        return saved === 'true';
    });

    useEffect(() => {
        localStorage.setItem('teacher-sidebar-collapsed', isCollapsed);
        if (onCollapseChange) {
            onCollapseChange(isCollapsed);
        }
        
        // Add class to body to allow global styles to react
        if (isCollapsed) {
            document.body.classList.add('sidebar-collapsed');
        } else {
            document.body.classList.remove('sidebar-collapsed');
        }
    }, [isCollapsed, onCollapseChange]);

    const handleLogout = () => {
        logout();
        navigate('/center');
    };

    const toggleSidebar = () => {
        setIsCollapsed(!isCollapsed);
    };

    const menuItems = [
        { path: isTA ? '/ta/classes' : '/teacher/classes', icon: GraduationCap, label: 'Lớp của tôi' },
        { path: isTA ? '/ta/schedules' : '/teacher/schedules', icon: Calendar, label: 'Lịch dạy' },
        { path: isTA ? '/ta/assignments' : '/teacher/assignments', icon: ClipboardList, label: 'Thư viện' },
        { path: isTA ? '/ta/performance' : '/teacher/performance', icon: BarChart2, label: 'Thống kê' },
    ].filter(item => !(isTA && item.label === 'Thư viện'));

    return (
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <button className="sidebar-toggle" onClick={toggleSidebar}>
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <GraduationCap size={24} />
                    <span>TutorCenter</span>
                </div>
                {!isCollapsed && <div className="sidebar-subtitle">{isTA ? 'Trợ giảng' : 'Giáo viên'}</div>}
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
                            title={isCollapsed ? item.label : ''}
                        >
                            <Icon size={20} />
                            {!isCollapsed && <span>{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            <div className="sidebar-footer">
                <Link to="/profile" className="sidebar-user" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="sidebar-user-avatar">{(user?.fullName || user?.username || (isTA ? 'T' : 'G')).charAt(0).toUpperCase()}</div>
                    {!isCollapsed && (
                        <div className="sidebar-user-info">
                            <div className="sidebar-user-name">{user?.fullName || user?.username || (isTA ? 'Trợ giảng' : 'Giáo viên')}</div>
                            <div className="sidebar-user-role">{isTA ? 'Trợ giảng' : 'Giáo viên'}</div>
                        </div>
                    )}
                </Link>
                <button className="sidebar-logout" onClick={handleLogout} title="Đăng xuất">
                    <LogOut size={20} />
                </button>
            </div>
        </aside>
    );
};

export default TeacherSidebar;
