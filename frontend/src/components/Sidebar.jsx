import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, GraduationCap, Users, BookOpen, Calendar,
    LogOut, ChevronLeft, Heart, DollarSign, ChevronDown, ChevronRight,
    MapPin, Layers, ClipboardCheck, TrendingUp, CreditCard, UserPlus, Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import '../css/components/Sidebar.css';

const Sidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, centerBranding } = useAuth();

    // State to track which groups are expanded - Restore from sessionStorage or default to all true
    const [expandedGroups, setExpandedGroups] = useState(() => {
        const saved = sessionStorage.getItem('sidebar_expanded_groups');
        return saved ? JSON.parse(saved) : {
            'Tổng quan': true,
            'Học tập': true,
            'Người dùng': true,
            'Tài chính': true
        };
    });

    // Badge states
    const [pendingEnrollmentCount, setPendingEnrollmentCount] = useState(0);
    const [pendingAttendanceModCount, setPendingAttendanceModCount] = useState(0);
    const [pendingScheduleRequestsCount, setPendingScheduleRequestsCount] = useState(0);
    const isScheduleChangeRequest = (req) => {
        const title = (req?.title || req?.Title || '').toLowerCase();
        const content = (req?.content || req?.Content || '').toLowerCase();
        return title.includes('[schedule_change]')
            || content.includes('type: schedule_change')
            || title.includes('đổi lịch dạy')
            || content.includes('requestedslot:')
            || content.includes('slot đề xuất');
    };

    const fetchCounts = useCallback(async (reason = 'manual') => {
        try {
            const [enrollmentRes, attendanceRes, scheduleRes] = await Promise.all([
                api.get('/enrollment-requests/pending'),
                api.get('/attendance/modification-requests/pending'),
                api.get('/admin/support-requests')
            ]);

            const enrollmentCount = Array.isArray(enrollmentRes.data) ? enrollmentRes.data.length : 0;
            const attendanceCount = Array.isArray(attendanceRes.data) ? attendanceRes.data.length : 0;
            
            // Filter schedule change requests that are pending
            let scheduleData = scheduleRes.data;
            if (!Array.isArray(scheduleData)) {
                scheduleData = scheduleData?.data || scheduleData?.notifications || scheduleData?.items || [];
            }
            const scheduleChangeRequests = scheduleData.filter(req =>
                !req.adminResponse && isScheduleChangeRequest(req)
            );
            const scheduleCount = scheduleChangeRequests.length;

            setPendingEnrollmentCount(enrollmentCount);
            setPendingAttendanceModCount(attendanceCount);
            setPendingScheduleRequestsCount(scheduleCount);
            console.debug('[Sidebar] badge counts updated', {
                reason,
                enrollmentCount,
                attendanceCount,
                scheduleCount
            });
        } catch (error) {
            console.warn('[Sidebar] failed to refresh badge counts', {
                error: error.message,
                reason
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
        window.addEventListener('center-sidebar-badge-refresh', handleManualRefresh);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('center-sidebar-badge-refresh', handleManualRefresh);
        };
    }, [fetchCounts]);

    useEffect(() => {
        fetchCounts('route-change');
    }, [location.pathname, fetchCounts]);

    const toggleGroup = (groupName) => {
        setExpandedGroups(prev => {
            const newState = {
                ...prev,
                [groupName]: !prev[groupName]
            };
            sessionStorage.setItem('sidebar_expanded_groups', JSON.stringify(newState));
            return newState;
        });
    };

    // Scroll restoration logic
    useEffect(() => {
        const sidebarNav = document.querySelector('.sidebar-nav');
        if (!sidebarNav) return;

        // Restore scroll position
        const savedScroll = sessionStorage.getItem('sidebar_scroll_pos');
        if (savedScroll) {
            sidebarNav.scrollTop = parseInt(savedScroll, 10);
        }

        // Save scroll position on scroll
        const handleScroll = () => {
            sessionStorage.setItem('sidebar_scroll_pos', sidebarNav.scrollTop.toString());
        };

        sidebarNav.addEventListener('scroll', handleScroll);
        return () => sidebarNav.removeEventListener('scroll', handleScroll);
    }, []);

    const groupedMenuItems = [
        {
            group: 'Tổng quan',
            items: [
                { path: '/center/dashboard', icon: LayoutDashboard, label: 'Thống kê chung ' }
            ]
        },
        {
            group: 'Học tập',
            items: [
                { path: '/center/classes', icon: GraduationCap, label: 'Lớp học' },
                { path: '/center/schedules', icon: Calendar, label: 'Lịch dạy' },
                {
                    path: '/center/attendance-modifications',
                    icon: ClipboardCheck,
                    label: 'Sửa điểm danh',
                    badge: pendingAttendanceModCount
                },
                {
                    path: '/center/schedule-requests',
                    icon: Clock,
                    label: 'Yêu cầu đổi lịch',
                    badge: pendingScheduleRequestsCount
                },
                { path: '/center/subjects', icon: BookOpen, label: 'Môn học' },
                { path: '/center/rooms', icon: MapPin, label: 'Phòng học' },
                { path: '/center/grades', icon: Layers, label: 'Khối lớp' },
            ]
        },
        {
            group: 'Người dùng',
            items: [
                { path: '/center/staff', icon: Users, label: 'Giáo viên' },
                { path: '/center/students', icon: BookOpen, label: 'Học sinh' },
                { path: '/center/parents', icon: Heart, label: 'Phụ huynh' },
                {
                    path: '/center/enrollment-requests',
                    icon: UserPlus,
                    label: 'Yêu cầu đăng ký',
                    badge: pendingEnrollmentCount
                },
            ]
        },
        {
            group: 'Tài chính',
            items: [
                { path: '/center/tuition', icon: DollarSign, label: 'Quản lý học phí' },
                { path: '/center/teacher-statistics', icon: TrendingUp, label: 'Thống kê dạy học' },
                { path: '/center/revenue', icon: TrendingUp, label: 'Doanh thu' },
                { path: '/center/subscription', icon: CreditCard, label: 'Gói dịch vụ' },
            ]
        }
    ];

    const handleLogout = () => {
        logout();
        navigate('/center');
    };

    // Helper to check if a group has any active badges
    const getGroupBadgeCount = (group) => {
        return group.items.reduce((sum, item) => sum + (item.badge || 0), 0);
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <div className="logo-wrapper">
                        {centerBranding.logoUrl ? (
                            <img src={centerBranding.logoUrl} alt="Logo" />
                        ) : (
                            <GraduationCap size={20} />
                        )}
                    </div>
                    <div className="logo-content">
                        <span className="center-name">{centerBranding.name}</span>
                        <div className="sidebar-subtitle">Quản trị viên</div>
                    </div>
                </div>
            </div>

            <nav className="sidebar-nav">
                <Link to="/center" className="sidebar-back-link">
                    <ChevronLeft size={14} />
                    <span>Trang chủ trung tâm</span>
                </Link>

                <div className="sidebar-divider" />

                {groupedMenuItems.map((group) => {
                    const groupBadgeCount = getGroupBadgeCount(group);

                    return (
                        <div key={group.group} className="sidebar-group">
                            <div
                                className="sidebar-group-header"
                                onClick={() => toggleGroup(group.group)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>{group.group}</span>
                                    {!expandedGroups[group.group] && groupBadgeCount > 0 && (
                                        <span className="sidebar-group-badge">{groupBadgeCount}</span>
                                    )}
                                </div>
                                {expandedGroups[group.group] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </div>

                            {expandedGroups[group.group] && (
                                <div className="sidebar-group-items">
                                    {group.items.map((item) => {
                                        const Icon = item.icon;
                                        const isActive = location.pathname === item.path;

                                        return (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                                            >
                                                <Icon size={18} />
                                                <span>{item.label}</span>
                                                {item.badge > 0 && (
                                                    <span className="sidebar-item-badge">{item.badge}</span>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
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
                <button className="sidebar-logout" onClick={handleLogout} title="Đăng xuất">
                    <LogOut size={20} />
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;

