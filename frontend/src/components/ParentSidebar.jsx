import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, Calendar, MessageSquare, LogOut, ChevronDown, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChild } from '../context/ChildContext';
import '../css/components/Sidebar.css';

const ParentSidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { childrenList, selectedChild, setSelectedChild, loading } = useChild();

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

            {/* Child Switcher */}
            {!loading && childrenList.length > 0 && (
                <div style={{
                    margin: '0 12px 8px',
                    padding: '10px 12px',
                    background: '#f0f4ff',
                    borderRadius: '10px',
                    border: '1px solid #c7d2fe'
                }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6366f1', textTransform: 'uppercase', marginBottom: 6 }}>
                        Đang xem thông tin của
                    </div>
                    {childrenList.length === 1 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: '50%', background: '#6366f1',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0
                            }}>
                                {(selectedChild?.fullName || '?').trim().split(' ').pop().charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e1b4b' }}>{selectedChild?.fullName}</div>
                                <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{selectedChild?.grade || 'Chưa có lớp'}</div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ position: 'relative' }}>
                            <select
                                value={selectedChild?.studentId || ''}
                                onChange={e => {
                                    const child = childrenList.find(c => c.studentId === Number(e.target.value));
                                    if (child) setSelectedChild(child);
                                }}
                                style={{
                                    width: '100%', padding: '6px 28px 6px 8px',
                                    border: '1px solid #c7d2fe', borderRadius: 8,
                                    background: 'white', color: '#1e1b4b',
                                    fontWeight: 600, fontSize: '0.85rem',
                                    appearance: 'none', cursor: 'pointer'
                                }}
                            >
                                {childrenList.map(child => (
                                    <option key={child.studentId} value={child.studentId}>
                                        {child.fullName}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={14} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#6366f1', pointerEvents: 'none' }} />
                        </div>
                    )}
                </div>
            )}

            {!loading && childrenList.length === 0 && (
                <div style={{ margin: '0 12px 8px', padding: '10px', background: '#fef9c3', borderRadius: 8, fontSize: '0.75rem', color: '#92400e', textAlign: 'center' }}>
                    <User size={14} style={{ marginBottom: 4 }} /><br />
                    Chưa liên kết học sinh
                </div>
            )}

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
