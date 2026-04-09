import { useState, useEffect } from 'react';
import { User, Mail, Phone, Briefcase, MapPin, Calendar, FileText, Lock, Upload, Camera, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { showValidationError } from '../../services/toastHelper';
import Sidebar from '../../components/Sidebar';
import TeacherSidebar from '../../components/TeacherSidebar';
import StudentSidebar from '../../components/StudentSidebar';
import ParentSidebar from '../../components/ParentSidebar';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import '../../css/pages/center/UserProfile.css';

// Render đúng sidebar theo role
const SidebarByRole = ({ role }) => {
    if (role === 'Teacher' || role === 'Assistant') return <TeacherSidebar />;
    if (role === 'Student') return <StudentSidebar />;
    if (role === 'Parent') return <ParentSidebar />;
    return <Sidebar />; // Admin / fallback
};

const UserProfile = () => {
    const { user } = useAuth();

    // Profile data from API
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Edit states
    const [isEditingAccount, setIsEditingAccount] = useState(false);
    const [isEditingPersonal, setIsEditingPersonal] = useState(false);
    const [isEditingRoleInfo, setIsEditingRoleInfo] = useState(false);

    // Form data for editing
    const [formData, setFormData] = useState({
        username: '',
        fullName: '',
        email: '',
        phoneNumber: '',
        address: '',
        specialization: '',
        degree: '',
        supportLevel: '',
        dateOfBirth: '',
        gender: ''
    });

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
            const data = res.data;
            setProfile(data);
            
            // Map data to formData
            setFormData({
                username: data.username || '',
                fullName: data.fullName || '',
                email: data.email || '',
                phoneNumber: data.phoneNumber || '',
                address: data.address || '',
                specialization: data.specialization || '',
                degree: data.degree || '',
                supportLevel: data.supportLevel || '',
                dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split('T')[0] : '',
                gender: data.gender || ''
            });
        } catch (err) {
            if (user) {
                const roleMap = { 'Admin': 1, 'Teacher': 2, 'Assistant': 5, 'Student': 3, 'Parent': 4 };
                setProfile({
                    userId: user.userId,
                    username: user.username,
                    fullName: user.fullName || user.username,
                    roleId: roleMap[user.role] || 0,
                    roleName: user.role
                });
                setFormData(prev => ({
                    ...prev,
                    username: user.username,
                    fullName: user.fullName || user.username
                }));
            }
            setError('Không thể kết nối server. Đang hiển thị dữ liệu từ phiên đăng nhập.');
        } finally {
            setLoading(false);
        }
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveProfile = async (section) => {
        try {
            // Xác định các trường cần kiểm tra theo section
            let fieldsToUpdate = [];
            if (section === 'account') fieldsToUpdate = ['username', 'fullName'];
            if (section === 'personal') fieldsToUpdate = ['email', 'phoneNumber', 'address', 'dateOfBirth', 'gender'];
            if (section === 'role') {
                if (profile.roleName === 'Teacher' || profile.roleName === 'Assistant') fieldsToUpdate = ['specialization', 'degree', 'supportLevel'];
                if (profile.roleName === 'Student') fieldsToUpdate = ['dateOfBirth', 'gender'];
            }

            // Chuẩn bị dữ liệu gửi đi: CHỈ gửi các trường thực sự có thay đổi (True Partial Update)
            const updatePayload = {};
            fieldsToUpdate.forEach(key => {
                let oldValue = profile[key];
                let newValue = formData[key];
                
                // Chuẩn hóa so sánh
                let comparisonOldValue = oldValue;
                if (key === 'dateOfBirth' && oldValue) comparisonOldValue = oldValue.split('T')[0];

                if ((comparisonOldValue || '') !== (newValue || '')) {
                    // Đặc biệt xử lý ngày tháng: Nếu rỗng thì gửi null
                    if (key === 'dateOfBirth' && newValue === '') {
                        updatePayload[key] = null;
                    } else {
                        updatePayload[key] = newValue;
                    }
                }
            });

            if (Object.keys(updatePayload).length === 0) {
            showValidationError('Vui lòng chỉnh sửa ít nhất một trường trước khi lưu.');
                return;
            }

            const res = await api.put('/profile/update', updatePayload);
            setProfile(prev => ({ ...prev, ...formData }));
            
            if (section === 'account') setIsEditingAccount(false);
            if (section === 'personal') setIsEditingPersonal(false);
            if (section === 'role') setIsEditingRoleInfo(false);

            toast.success(res.data.message || 'Cập nhật hồ sơ thành công!');
        } catch (err) {
            let errorMsg = 'Lỗi khi cập nhật hồ sơ.';
            
            if (err.response?.data?.errors) {
                const errorData = err.response.data.errors;
                const messages = [];

                // Hàm đệ quy để trích xuất tất cả chuỗi thông báo lỗi
                const extractMessages = (obj) => {
                    if (!obj) return;
                    if (typeof obj === 'string') {
                        messages.push(obj);
                    } else if (Array.isArray(obj)) {
                        obj.forEach(extractMessages);
                    } else if (typeof obj === 'object') {
                        if (obj.message && typeof obj.message === 'string') {
                            messages.push(obj.message);
                        } else if (obj.errorMessage && typeof obj.errorMessage === 'string') {
                            messages.push(obj.errorMessage);
                        } else {
                            Object.values(obj).forEach(extractMessages);
                        }
                    }
                };

                extractMessages(errorData);
                if (messages.length > 0) {
                    errorMsg = messages.join(' | ');
                }
            } else if (err.response?.data?.message) {
                errorMsg = err.response.data.message;
            } else if (typeof err.response?.data === 'string') {
                errorMsg = err.response.data;
            }
            
            showValidationError(err, errorMsg);
        }
    };

    const handleCancelEdit = (section) => {
        // Reset form data for the section
        if (section === 'account') {
            setFormData(prev => ({ ...prev, username: profile.username, fullName: profile.fullName }));
            setIsEditingAccount(false);
        }
        if (section === 'personal') {
            setFormData(prev => ({ 
                ...prev, 
                email: profile.email, 
                phoneNumber: profile.phoneNumber, 
                address: profile.address,
                dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.split('T')[0] : '',
                gender: profile.gender
            }));
            setIsEditingPersonal(false);
        }
        if (section === 'role') {
            setFormData(prev => ({ 
                ...prev, 
                specialization: profile.specialization, 
                degree: profile.degree, 
                supportLevel: profile.supportLevel 
            }));
            setIsEditingRoleInfo(false);
        }
    };

    const getRoleLabel = (roleId) => {
        const roles = { 1: 'Quản trị viên', 2: 'Giáo viên', 3: 'Học sinh', 4: 'Phụ huynh', 5: 'Trợ giảng' };
        return roles[roleId] || 'Không xác định';
    };

    const getRoleBadgeClass = (roleId) => {
        const classes = { 1: 'admin', 2: 'teacher', 3: 'student', 4: 'parent', 5: 'assistant' };
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
            toast.success('Đổi mật khẩu thành công!');
            setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
            setIsChangingPassword(false);
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Lỗi khi đổi mật khẩu.';
            setPasswordError(errorMsg);
            showValidationError(err, errorMsg);
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
                        <div className="header-content">
                            <h1>Hồ Sơ Cá Nhân</h1>
                            <p>Chào mừng quay trở lại, {displayName}</p>
                        </div>
                    </div>

                    {error && (
                        <div className="profile-error-banner" style={{ padding: '10px 16px', marginBottom: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '14px' }}>
                            {error}
                        </div>
                    )}


                    <div className="profile-grid">
                        <div className="profile-left-column">
                            {/* Avatar Section */}
                            <div className="profile-card avatar-card">
                                <div className="avatar-preview">
                                    <div className="avatar-circle">
                                        <div className="avatar-initials">
                                            {getInitials(displayName)}
                                        </div>
                                    </div>
                                    <button className="avatar-edit-btn">
                                        <Camera size={16} />
                                    </button>
                                </div>
                                <div className="avatar-details">
                                    <h2>{displayName}</h2>
                                    <span className={`role-badge ${getRoleBadgeClass(profile?.roleId)}`}>
                                        {profile?.roleName || getRoleLabel(profile?.roleId)}
                                    </span>
                                    <p className="username-tag">@{profile?.username}</p>
                                </div>
                            </div>

                            {/* Relationship Info (Parents/Students) */}
                            {(profile?.parentNames?.length > 0 || profile?.studentNames?.length > 0) && (
                                <div className="profile-card">
                                    <div className="card-header">
                                        <h3>{profile?.roleName === 'Student' ? 'Phụ Huynh Liên Kết' : 'Con Cái'}</h3>
                                    </div>
                                    <div className="relationship-list">
                                        {(profile?.roleName === 'Student' ? profile.parentNames : profile.studentNames).map((name, idx) => (
                                            <div key={idx} className="relationship-item">
                                                <User size={16} />
                                                <span>{name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Security Section */}
                            <div className="profile-card">
                                <div className="card-header">
                                    <h3>Bảo mật</h3>
                                    {!isChangingPassword && (
                                        <button className="text-btn" onClick={() => setIsChangingPassword(true)}>Thay đổi</button>
                                    )}
                                </div>
                                {isChangingPassword ? (
                                    <form className="password-form" onSubmit={handleChangePassword}>
                                        {passwordError && <p className="error-text">{passwordError}</p>}
                                        <div className="form-group">
                                            <label>Mật khẩu cũ</label>
                                            <input type="password" name="oldPassword" value={passwordData.oldPassword} onChange={handlePasswordChange} required />
                                        </div>
                                        <div className="form-group">
                                            <label>Mật khẩu mới</label>
                                            <input type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} required />
                                        </div>
                                        <div className="form-group">
                                            <label>Xác nhận mật khẩu</label>
                                            <input type="password" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} required />
                                        </div>
                                        <div className="form-actions">
                                            <button type="button" className="btn-secondary" onClick={() => setIsChangingPassword(false)}>Hủy</button>
                                            <button type="submit" className="btn-primary">Lưu</button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="security-item">
                                        <Lock size={18} />
                                        <span>Mật khẩu: ••••••••</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="profile-right-column">
                            {/* Account Information */}
                            <div className="profile-card">
                                <div className="card-header">
                                    <h3>Thông Tin Tài Khoản</h3>
                                    {!isEditingAccount ? (
                                        <button className="text-btn" onClick={() => setIsEditingAccount(true)}>Chỉnh sửa</button>
                                    ) : (
                                        <div className="action-buttons">
                                            <button className="btn-secondary" onClick={() => handleCancelEdit('account')}>Hủy</button>
                                            <button className="btn-primary" onClick={() => handleSaveProfile('account')}>Lưu</button>
                                        </div>
                                    )}
                                </div>
                                <div className="card-body">
                                    <div className="info-row">
                                        <div className="info-field">
                                            <label>Tên đăng nhập</label>
                                            {isEditingAccount ? (
                                                <input name="username" value={formData.username} onChange={handleFormChange} />
                                            ) : (
                                                <p>{profile.username}</p>
                                            )}
                                        </div>
                                        <div className="info-field">
                                            <label>Họ và tên</label>
                                            {isEditingAccount ? (
                                                <input name="fullName" value={formData.fullName} onChange={handleFormChange} />
                                            ) : (
                                                <p>{profile.fullName}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Personal Information */}
                            <div className="profile-card">
                                <div className="card-header">
                                    <h3>Thông Tin Cá Nhân</h3>
                                    {!isEditingPersonal ? (
                                        <button className="text-btn" onClick={() => setIsEditingPersonal(true)}>Chỉnh sửa</button>
                                    ) : (
                                        <div className="action-buttons">
                                            <button className="btn-secondary" onClick={() => handleCancelEdit('personal')}>Hủy</button>
                                            <button className="btn-primary" onClick={() => handleSaveProfile('personal')}>Lưu</button>
                                        </div>
                                    )}
                                </div>
                                <div className="card-body">
                                    <div className="info-row">
                                        <div className="info-field">
                                            <label><Mail size={14} /> Email</label>
                                            {isEditingPersonal ? (
                                                <input name="email" value={formData.email} onChange={handleFormChange} />
                                            ) : (
                                                <p>{profile.email || 'Chưa cập nhật'}</p>
                                            )}
                                        </div>
                                        <div className="info-field">
                                            <label><Phone size={14} /> Số điện thoại</label>
                                            {isEditingPersonal ? (
                                                <input name="phoneNumber" value={formData.phoneNumber} onChange={handleFormChange} />
                                            ) : (
                                                <p>{profile.phoneNumber || 'Chưa cập nhật'}</p>
                                            )}
                                        </div>
                                    </div>
                                    {profile.roleName === 'Student' && (
                                        <div className="info-row">
                                            <div className="info-field">
                                                <label><Calendar size={14} /> Ngày sinh</label>
                                                {isEditingPersonal ? (
                                                    <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleFormChange} />
                                                ) : (
                                                    <p>{profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}</p>
                                                )}
                                            </div>
                                            <div className="info-field">
                                                <label><User size={14} /> Giới tính</label>
                                                {isEditingPersonal ? (
                                                    <select name="gender" value={formData.gender} onChange={handleFormChange}>
                                                        <option value="">Chọn giới tính</option>
                                                        <option value="Nam">Nam</option>
                                                        <option value="Nữ">Nữ</option>
                                                        <option value="Khác">Khác</option>
                                                    </select>
                                                ) : (
                                                    <p>{profile.gender || 'Chưa cập nhật'}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    <div className="info-field full-width">
                                        <label><MapPin size={14} /> Địa chỉ</label>
                                        {isEditingPersonal ? (
                                            <textarea name="address" value={formData.address} onChange={handleFormChange} rows="2" />
                                        ) : (
                                            <p>{profile.address || 'Chưa cập nhật'}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Role-specific Information (Teacher / Assistant / Student Grade) */}
                            {(profile.roleName === 'Teacher' || profile.roleName === 'Assistant' || profile.roleName === 'Student') && (
                                <div className="profile-card">
                                    <div className="card-header">
                                        <h3>Thông Tin {profile.roleName === 'Student' ? 'Học Tập' : 'Công Việc'}</h3>
                                        {profile.roleName !== 'Student' && (
                                            !isEditingRoleInfo ? (
                                                <button className="text-btn" onClick={() => setIsEditingRoleInfo(true)}>Chỉnh sửa</button>
                                            ) : (
                                                <div className="action-buttons">
                                                    <button className="btn-secondary" onClick={() => handleCancelEdit('role')}>Hủy</button>
                                                    <button className="btn-primary" onClick={() => handleSaveProfile('role')}>Lưu</button>
                                                </div>
                                            )
                                        )}
                                    </div>
                                    <div className="card-body">
                                        {profile.roleName === 'Teacher' && (
                                            <div className="info-row">
                                                <div className="info-field">
                                                    <label><Briefcase size={14} /> Chuyên môn</label>
                                                    {isEditingRoleInfo ? (
                                                        <input name="specialization" value={formData.specialization} onChange={handleFormChange} />
                                                    ) : (
                                                        <p>{profile.specialization || 'Chưa cập nhật'}</p>
                                                    )}
                                                </div>
                                                <div className="info-field">
                                                    <label><FileText size={14} /> Bằng cấp</label>
                                                    {isEditingRoleInfo ? (
                                                        <input name="degree" value={formData.degree} onChange={handleFormChange} />
                                                    ) : (
                                                        <p>{profile.degree || 'Chưa cập nhật'}</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {profile.roleName === 'Assistant' && (
                                            <div className="info-field">
                                                <label><Briefcase size={14} /> Cấp hỗ trợ</label>
                                                {isEditingRoleInfo ? (
                                                    <input name="supportLevel" value={formData.supportLevel} onChange={handleFormChange} />
                                                ) : (
                                                    <p>{profile.supportLevel || 'Chưa cập nhật'}</p>
                                                )}
                                            </div>
                                        )}
                                        {profile.roleName === 'Student' && (
                                            <div className="info-row">
                                                <div className="info-field">
                                                    <label><Briefcase size={14} /> Khối lớp</label>
                                                    <p>{profile.grade || 'Chưa cập nhật'}</p>
                                                </div>
                                                <div className="info-field">
                                                    <label><CheckCircle size={14} /> Trạng thái</label>
                                                    <p className="status-text">{profile.enrollmentStatus || 'Active'}</p>
                                                </div>
                                            </div>
                                        )}
                                        {(profile.roleName === 'Teacher' || profile.roleName === 'Assistant') && (
                                            <p className="note-text">💡 Thông tin chuyên môn giúp tối ưu việc phân lớp.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default UserProfile;
