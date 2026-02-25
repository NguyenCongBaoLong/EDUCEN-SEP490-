import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, GraduationCap, Calendar, ClipboardList, LogOut, ChevronLeft } from 'lucide-react';
import '../css/components/Sidebar.css';

const TeacherSidebar = () => {
    const location = useLocation();

    const menuItems = [
        { path: '/teacher/classes', icon: GraduationCap, label: 'Lớp của tôi' },
        { path: '/teacher/schedules', icon: Calendar, label: 'Lịch dạy' },
        { path: '/teacher/assignments', icon: ClipboardList, label: 'Bài tập' },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <GraduationCap size={24} />
                    <span>TutorCenter</span>
                </div>
                <div className="sidebar-subtitle">Giáo viên</div>
            </div>

            <nav className="sidebar-nav">
                <Link to="/center" className="sidebar-back-link">
                    <ChevronLeft size={16} />
                    <span>Trang chủ trung tâm</span>
                </Link>
                <div className="sidebar-divider" />

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
                <div className="sidebar-user">
                    <div className="sidebar-user-avatar">GV</div>
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">Giáo viên</div>
                        <div className="sidebar-user-role">Đã đăng nhập</div>
                    </div>
                </div>
                <button className="sidebar-logout" onClick={() => console.log('Logout')}>
                    <LogOut size={20} />
                </button>
            </div>
        </aside>
    );
};

export default TeacherSidebar;
