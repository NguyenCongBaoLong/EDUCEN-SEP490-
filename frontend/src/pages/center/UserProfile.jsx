import { useState } from 'react';
import { User, Mail, Phone, Briefcase, MapPin, Calendar, FileText, Lock, Upload, Camera } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import '../../css/pages/center/UserProfile.css';

const UserProfile = () => {
    // Mock current user data - sẽ lấy từ authentication context
    const [userData, setUserData] = useState({
        id: 'T-1024',
        name: 'Nguyễn Văn An',
        email: 'nguyenvanan@trungcam.edu.vn',
        phone: '0901234567',
        role: 'teacher',
        subject: 'Toán học',
        status: 'active',
        // Personal info - editable by user
        avatar: null,
        dateOfBirth: '1985-03-15',
        address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
        notes: 'Giảng viên giỏi, nhiều kinh nghiệm'
    });

    const [personalInfo, setPersonalInfo] = useState({
        dateOfBirth: userData.dateOfBirth || '',
        address: userData.address || '',
        notes: userData.notes || ''
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [isEditingPersonal, setIsEditingPersonal] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    const getRoleLabel = (role) => {
        return role === 'teacher' ? 'Giảng Viên' : 'Trợ Giảng';
    };

    const getStatusLabel = (status) => {
        return status === 'active' ? 'Hoạt động' : 'Không hoạt động';
    };

    const getInitials = (name) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setUserData(prev => ({ ...prev, avatar: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePersonalInfoChange = (e) => {
        const { name, value } = e.target;
        setPersonalInfo(prev => ({ ...prev, [name]: value }));
    };

    const handleSavePersonalInfo = () => {
        setUserData(prev => ({ ...prev, ...personalInfo }));
        setIsEditingPersonal(false);
    };

    const handleCancelPersonalEdit = () => {
        setPersonalInfo({
            dateOfBirth: userData.dateOfBirth || '',
            address: userData.address || '',
            notes: userData.notes || ''
        });
        setIsEditingPersonal(false);
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
    };

    const handleChangePassword = (e) => {
        e.preventDefault();
        // Validate & call API
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            alert('Mật khẩu mới không khớp!');
            return;
        }
        // TODO: Call API to change password
        alert('Đổi mật khẩu thành công!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setIsChangingPassword(false);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Chưa cập nhật';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    };

    return (
        <div className="staff-management">
            <Sidebar />
            <main className="staff-content">
                <div className="profile-container">
                    {/* Header */}
                    <div className="profile-header">
                        <h1>Hồ Sơ Cá Nhân</h1>
                        <p>Quản lý thông tin cá nhân của bạn</p>
                    </div>

                    {/* Avatar Section */}
                    <div className="profile-section avatar-section">
                        <div className="avatar-wrapper">
                            <div className="profile-avatar">
                                {userData.avatar ? (
                                    <img src={userData.avatar} alt={userData.name} />
                                ) : (
                                    <div className="avatar-initials">
                                        {getInitials(userData.name)}
                                    </div>
                                )}
                                <label htmlFor="avatar-upload" className="avatar-upload-btn">
                                    <Camera size={18} />
                                </label>
                                <input
                                    id="avatar-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    style={{ display: 'none' }}
                                />
                            </div>
                            <div className="avatar-info">
                                <h2>{userData.name}</h2>
                                <p className="user-id">ID: {userData.id}</p>
                                <div className="user-badges">
                                    <span className={`role-badge ${userData.role}`}>
                                        {getRoleLabel(userData.role)}
                                    </span>
                                    <span className={`status-badge ${userData.status}`}>
                                        {getStatusLabel(userData.status)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Work Information (Read-only) */}
                    <div className="profile-section">
                        <div className="section-header">
                            <h3>Thông Tin Công Việc</h3>
                            <span className="read-only-badge">Chỉ xem</span>
                        </div>
                        <div className="info-grid read-only">
                            <div className="info-item">
                                <Mail size={18} />
                                <div>
                                    <label>Email</label>
                                    <p>{userData.email}</p>
                                </div>
                            </div>
                            <div className="info-item">
                                <Phone size={18} />
                                <div>
                                    <label>Số điện thoại</label>
                                    <p>{userData.phone}</p>
                                </div>
                            </div>
                            <div className="info-item">
                                <Briefcase size={18} />
                                <div>
                                    <label>Môn học</label>
                                    <p>{userData.subject}</p>
                                </div>
                            </div>
                        </div>
                        <p className="section-note">
                            💡 Thông tin này do quản trị viên quản lý. Vui lòng liên hệ admin để thay đổi.
                        </p>
                    </div>

                    {/* Personal Information (Editable) */}
                    <div className="profile-section">
                        <div className="section-header">
                            <h3>Thông Tin Cá Nhân</h3>
                            {!isEditingPersonal ? (
                                <button className="btn-edit" onClick={() => setIsEditingPersonal(true)}>
                                    Chỉnh sửa
                                </button>
                            ) : (
                                <div className="edit-actions">
                                    <button className="btn-cancel" onClick={handleCancelPersonalEdit}>
                                        Hủy
                                    </button>
                                    <button className="btn-save" onClick={handleSavePersonalInfo}>
                                        Lưu
                                    </button>
                                </div>
                            )}
                        </div>

                        {!isEditingPersonal ? (
                            <div className="info-grid">
                                <div className="info-item">
                                    <Calendar size={18} />
                                    <div>
                                        <label>Ngày sinh</label>
                                        <p>{formatDate(userData.dateOfBirth)}</p>
                                    </div>
                                </div>
                                <div className="info-item full-width">
                                    <MapPin size={18} />
                                    <div>
                                        <label>Địa chỉ</label>
                                        <p>{userData.address || 'Chưa cập nhật'}</p>
                                    </div>
                                </div>
                                <div className="info-item full-width">
                                    <FileText size={18} />
                                    <div>
                                        <label>Ghi chú</label>
                                        <p>{userData.notes || 'Không có ghi chú'}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="edit-form">
                                <div className="form-group">
                                    <label>Ngày sinh</label>
                                    <input
                                        type="date"
                                        name="dateOfBirth"
                                        value={personalInfo.dateOfBirth}
                                        onChange={handlePersonalInfoChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Địa chỉ</label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={personalInfo.address}
                                        onChange={handlePersonalInfoChange}
                                        placeholder="Nhập địa chỉ của bạn"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Ghi chú</label>
                                    <textarea
                                        name="notes"
                                        value={personalInfo.notes}
                                        onChange={handlePersonalInfoChange}
                                        placeholder="Thêm ghi chú..."
                                        rows="4"
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
                                <div className="form-group">
                                    <label>Mật khẩu hiện tại</label>
                                    <input
                                        type="password"
                                        name="currentPassword"
                                        value={passwordData.currentPassword}
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
                                            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
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
