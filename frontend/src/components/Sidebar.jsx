import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, GraduationCap, Users, BookOpen, Calendar, Settings, LogOut } from 'lucide-react';
import '../css/components/Sidebar.css';

const Sidebar = () => {
    const location = useLocation();

    const menuItems = [
        { path: '/center/dashboard', icon: LayoutDashboard, label: 'Tổng quan' },
        { path: '/center/classes', icon: GraduationCap, label: 'Lớp học' },
        { path: '/center/teachers', icon: Users, label: 'Giáo viên' },
        { path: '/center/students', icon: BookOpen, label: 'Học sinh' },
        { path: '/center/schedules', icon: Calendar, label: 'Lịch học' },
        { path: '/center/settings', icon: Settings, label: 'Cài đặt' },
    ];

    const handleLogout = () => {
        // TODO: Implement logout logic
        console.log('Logout clicked');
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
                <div className="sidebar-user">
                    <div className="sidebar-user-avatar">SJ</div>
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">Sarah Jenkins</div>
                        <div className="sidebar-user-role">Đã đăng nhập</div>
                    </div>
                </div>
                <button className="sidebar-logout" onClick={handleLogout}>
                    <LogOut size={20} />
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
