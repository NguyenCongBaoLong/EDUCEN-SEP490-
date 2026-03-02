import { useState, useEffect } from 'react';
import { User, Mail, Phone, Briefcase, MapPin, Calendar, FileText, Lock, Upload, Camera, AlertCircle, CheckCircle } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import TeacherSidebar from '../../components/TeacherSidebar';
import StudentSidebar from '../../components/StudentSidebar';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import '../../css/pages/center/UserProfile.css';

// Render đúng sidebar theo role
const SidebarByRole = ({ role }) => {
    if (role === 'Teacher' || role === 'Assistant') return <TeacherSidebar />;
    if (role === 'Student') return <StudentSidebar />;
    return <Sidebar />; // Admin / fallback
};

const UserProfile = () => {
    const { user } = useAuth();

    // Profile data from API
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Edit state
    const [isEditingName, setIsEditingName] = useState(false);
    const [editFullName, setEditFullName] = useState('');

    // Password state
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordData, setPasswordData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordError, setPasswordError] = useState('');

    // Fetch profile on mount
    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const res = await api.get('/profile/me');
            setProfile(res.data);
            setEditFullName(res.data.fullName || '');
        } catch (err) {
            // API fail → dùng data từ JWT token (AuthContext) làm fallback
            if (user) {
                const roleMap = { 'Admin': 1, 'Teacher': 2, 'Assistant': 3, 'Student': 4, 'Parent': 5 };
                setProfile({
                    userId: user.userId,
                    username: user.username,
                    fullName: user.fullName || user.username,
                    roleId: roleMap[user.role] || 0
                });
                setEditFullName(user.fullName || user.username || '');
            }
            setError('Không thể kết nối server. Đang hiển thị dữ liệu từ phiên đăng nhập.');
        } finally {
            setLoading(false);
        }
    };

    const getRoleLabel = (roleId) => {
        const roles = { 1: 'Quản trị viên', 2: 'Giáo viên', 3: 'Trợ giảng', 4: 'Học sinh', 5: 'Phụ huynh' };
        return roles[roleId] || 'Không xác định';
    };

    const getRoleBadgeClass = (roleId) => {
        const classes = { 1: 'admin', 2: 'teacher', 3: 'assistant', 4: 'student', 5: 'parent' };
        return classes[roleId] || '';
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    // Save fullName
    const handleSaveFullName = async () => {
        try {
            setError('');
            await api.put('/profile/update', { fullName: editFullName });
            setProfile(prev => ({ ...prev, fullName: editFullName }));
            setIsEditingName(false);
            setSuccessMsg('Cập nhật họ tên thành công!');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Lỗi khi cập nhật.');
        }
    };

    const handleCancelEdit = () => {
        setEditFullName(profile?.fullName || '');
        setIsEditingName(false);
    };

    // Change password
    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
        setPasswordError('');
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordError('');

        if (passwordData.newPassword.length < 6) {
            setPasswordError('Mật khẩu mới phải có ít nhất 6 ký tự.');
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordError('Mật khẩu mới không khớp!');
            return;
        }

        try {
            await api.put('/profile/change-password', {
                oldPassword: passwordData.oldPassword,
                newPassword: passwordData.newPassword
            });
            setSuccessMsg('Đổi mật khẩu thành công!');
            setTimeout(() => setSuccessMsg(''), 3000);
            setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
            setIsChangingPassword(false);
        } catch (err) {
            setPasswordError(err.response?.data?.message || 'Lỗi khi đổi mật khẩu.');
        }
    };

    if (loading) {
        return (
            <div className="staff-management">
                <SidebarByRole role={user?.role} />
                <main className="staff-content">
                    <div className="profile-container">
                        <div className="profile-loading">Đang tải hồ sơ...</div>
                    </div>
                </main>
            </div>
        );
    }

    const displayName = profile?.fullName || profile?.username || 'Người dùng';

    return (
        <div className="staff-management">
            <SidebarByRole role={user?.role} />
            <main className="staff-content">
                <div className="profile-container">
                    {/* Header */}
                    <div className="profile-header">
                        <h1>Hồ Sơ Cá Nhân</h1>
                        <p>Quản lý thông tin cá nhân của bạn</p>
                    </div>

                    {/* Success Message */}
                    {successMsg && (
                        <div className="profile-alert success">
                            <CheckCircle size={18} />
                            <span>{successMsg}</span>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="profile-alert error">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Avatar Section */}
                    <div className="profile-section avatar-section">
                        <div className="avatar-wrapper">
                            <div className="profile-avatar">
                                <div className="avatar-initials">
                                    {getInitials(displayName)}
                                </div>
                            </div>
                            <div className="avatar-info">
                                <h2>{displayName}</h2>
                                <p className="user-id">@{profile?.username}</p>
                                <div className="user-badges">
                                    <span className={`role-badge ${getRoleBadgeClass(profile?.roleId)}`}>
                                        {getRoleLabel(profile?.roleId)}
                                    </span>
                                    <span className="status-badge active">Hoạt động</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Account Information (Read-only) */}
                    <div className="profile-section">
                        <div className="section-header">
                            <h3>Thông Tin Tài Khoản</h3>
                            <span className="read-only-badge">Chỉ xem</span>
                        </div>
                        <div className="info-grid read-only">
                            <div className="info-item">
                                <User size={18} />
                                <div>
                                    <label>Tên đăng nhập</label>
                                    <p>{profile?.username}</p>
                                </div>
                            </div>
                            <div className="info-item">
                                <Briefcase size={18} />
                                <div>
                                    <label>Vai trò</label>
                                    <p>{profile?.roleName || getRoleLabel(profile?.roleId)}</p>
                                </div>
                            </div>
                            <div className="info-item">
                                <User size={18} />
                                <div>
                                    <label>ID người dùng</label>
                                    <p>{profile?.userId}</p>
                                </div>
                            </div>
                            <div className="info-item">
                                <User size={18} />
                                <div>
                                    <label>Trạng thái</label>
                                    <p>{profile?.accountStatus === 'active' ? 'Hoạt động' : (profile?.accountStatus || 'Hoạt động')}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Personal / Role-specific Info */}
                    {(profile?.email || profile?.phoneNumber || profile?.address || profile?.specialization || profile?.degree || profile?.supportLevel) && (
                        <div className="profile-section">
                            <div className="section-header">
                                <h3>Thông Tin Cá Nhân</h3>
                                <span className="read-only-badge">Chỉ xem</span>
                            </div>
                            <div className="info-grid read-only">
                                {profile?.email && (
                                    <div className="info-item">
                                        <Mail size={18} />
                                        <div>
                                            <label>Email</label>
                                            <p>{profile.email}</p>
                                        </div>
                                    </div>
                                )}
                                {profile?.phoneNumber && (
                                    <div className="info-item">
                                        <Phone size={18} />
                                        <div>
                                            <label>Số điện thoại</label>
                                            <p>{profile.phoneNumber}</p>
                                        </div>
                                    </div>
                                )}
                                {profile?.address && (
                                    <div className="info-item full-width">
                                        <MapPin size={18} />
                                        <div>
                                            <label>Địa chỉ</label>
                                            <p>{profile.address}</p>
                                        </div>
                                    </div>
                                )}
                                {profile?.specialization && (
                                    <div className="info-item">
                                        <Briefcase size={18} />
                                        <div>
                                            <label>Chuyên môn</label>
                                            <p>{profile.specialization}</p>
                                        </div>
                                    </div>
                                )}
                                {profile?.degree && (
                                    <div className="info-item">
                                        <FileText size={18} />
                                        <div>
                                            <label>Bằng cấp</label>
                                            <p>{profile.degree}</p>
                                        </div>
                                    </div>
                                )}
                                {profile?.supportLevel && (
                                    <div className="info-item">
                                        <Briefcase size={18} />
                                        <div>
                                            <label>Cấp hỗ trợ</label>
                                            <p>{profile.supportLevel}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <p className="section-note">
                                💡 Thông tin này do quản trị viên quản lý. Liên hệ admin để thay đổi.
                            </p>
                        </div>
                    )}

                    {/* Full Name (Editable) */}
                    <div className="profile-section">
                        <div className="section-header">
                            <h3>Họ và Tên</h3>
                            {!isEditingName ? (
                                <button className="btn-edit" onClick={() => setIsEditingName(true)}>
                                    Chỉnh sửa
                                </button>
                            ) : (
                                <div className="edit-actions">
                                    <button className="btn-cancel" onClick={handleCancelEdit}>
                                        Hủy
                                    </button>
                                    <button className="btn-save" onClick={handleSaveFullName}>
                                        Lưu
                                    </button>
                                </div>
                            )}
                        </div>

                        {!isEditingName ? (
                            <div className="info-grid">
                                <div className="info-item full-width">
                                    <User size={18} />
                                    <div>
                                        <label>Họ và tên hiển thị</label>
                                        <p>{profile?.fullName || 'Chưa cập nhật'}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="edit-form">
                                <div className="form-group">
                                    <label>Họ và tên</label>
                                    <input
                                        type="text"
                                        value={editFullName}
                                        onChange={(e) => setEditFullName(e.target.value)}
                                        placeholder="Nhập họ và tên của bạn"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Change Password Section */}
                    <div className="profile-section">
                        <div className="section-header">
                            <h3>Bảo mật</h3>
                            {!isChangingPassword && (
                                <button className="btn-edit" onClick={() => setIsChangingPassword(true)}>
                                    Đổi mật khẩu
                                </button>
                            )}
                        </div>

                        {isChangingPassword ? (
                            <form className="password-form" onSubmit={handleChangePassword}>
                                {passwordError && (
                                    <div className="profile-alert error" style={{ marginBottom: '1rem' }}>
                                        <AlertCircle size={18} />
                                        <span>{passwordError}</span>
                                    </div>
                                )}
                                <div className="form-group">
                                    <label>Mật khẩu hiện tại</label>
                                    <input
                                        type="password"
                                        name="oldPassword"
                                        value={passwordData.oldPassword}
                                        onChange={handlePasswordChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Mật khẩu mới</label>
                                    <input
                                        type="password"
                                        name="newPassword"
                                        value={passwordData.newPassword}
                                        onChange={handlePasswordChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Xác nhận mật khẩu mới</label>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={passwordData.confirmPassword}
                                        onChange={handlePasswordChange}
                                        required
                                    />
                                </div>
                                <div className="password-actions">
                                    <button
                                        type="button"
                                        className="btn-cancel"
                                        onClick={() => {
                                            setIsChangingPassword(false);
                                            setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
                                            setPasswordError('');
                                        }}
                                    >
                                        Hủy
                                    </button>
                                    <button type="submit" className="btn-save">
                                        Đổi mật khẩu
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="info-item">
                                <Lock size={18} />
                                <div>
                                    <label>Mật khẩu</label>
                                    <p>••••••••</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default UserProfile;
