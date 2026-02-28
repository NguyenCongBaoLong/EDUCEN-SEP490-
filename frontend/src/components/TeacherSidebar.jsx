import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, GraduationCap, Calendar, ClipboardList, LogOut, ChevronLeft, BarChart2 } from 'lucide-react';
import '../css/components/Sidebar.css';

const TeacherSidebar = ({ isTA = false }) => {
    const location = useLocation();

    const menuItems = [
        { path: isTA ? '/ta/classes' : '/teacher/classes', icon: GraduationCap, label: 'Lớp của tôi' },
        { path: isTA ? '/ta/schedules' : '/teacher/schedules', icon: Calendar, label: 'Lịch dạy' },
        { path: isTA ? '/ta/assignments' : '/teacher/assignments', icon: ClipboardList, label: 'Bài tập' },
        { path: isTA ? '/ta/performance' : '/teacher/performance', icon: BarChart2, label: 'Thống kê' },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <GraduationCap size={24} />
                    <span>TutorCenter</span>
                </div>
                <div className="sidebar-subtitle">{isTA ? 'Trợ giảng' : 'Giáo viên'}</div>
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
                <div className="sidebar-user">
                    <div className="sidebar-user-avatar">{isTA ? 'TG' : 'GV'}</div>
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">{isTA ? 'Trợ giảng' : 'Giáo viên'}</div>
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
