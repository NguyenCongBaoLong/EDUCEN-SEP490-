import { X, User, Phone, Mail, MapPin, Briefcase, GraduationCap, FileText } from 'lucide-react';
import PropTypes from 'prop-types';
import '../css/components/StaffDetailModal.css';

const StaffDetailModal = ({ isOpen, onClose, staff }) => {
    if (!isOpen || !staff) return null;

    const getInitials = (name) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getRoleLabel = (role) => {
        return role === 'teacher' ? 'Giảng Viên' : 'Trợ Giảng';
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="staff-detail-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Hồ Sơ Nhân Viên</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-body">
                    {/* Left Column: Profile Card */}
                    <div className="detail-left-col">
                        <div className="detail-avatar-large">
                            {staff.avatar ? (
                                <img src={staff.avatar} alt={staff.name} />
                            ) : (
                                <span className="detail-initials-large">
                                    {getInitials(staff.name)}
                                </span>
                            )}
                        </div>
                        <h3 className="staff-name-large">{staff.name}</h3>

                        <div className="staff-badges">
                            <span className="role-badge-large">
                                {getRoleLabel(staff.role)}
                            </span>
                            <span className={`status-badge-large ${staff.status}`}>
                                {staff.status === 'active' ? 'Hoạt động' : 'Tạm khóa'}
                            </span>
                        </div>
                    </div>

                    {/* Right Column: Details */}
                    <div className="detail-right-col">
                        {/* Professional Info */}
                        <div className="detail-section">
                            <div className="section-title">
                                <Briefcase size={20} />
                                Thông Tin Nghề Nghiệp
                            </div>
                            <div className="info-grid">
                                <div className="info-item">
                                    <span className="info-label">
                                        {staff.role === 'teacher' ? 'Chuyên môn' : 'Cấp độ hỗ trợ'}
                                    </span>
                                    <span className="info-value">
                                        {staff.subject || 'Chưa cập nhật'}
                                    </span>
                                </div>
                                {staff.role === 'teacher' && (
                                    <div className="info-item">
                                        <span className="info-label">Bằng cấp</span>
                                        <span className="info-value">
                                            <GraduationCap size={16} className="info-icon" />
                                            {staff.notes || 'Chưa cập nhật'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Contact Info */}
                        <div className="detail-section">
                            <div className="section-title">
                                <User size={20} />
                                Thông Tin Liên Hệ
                            </div>
                            <div className="info-grid">
                                <div className="info-item">
                                    <span className="info-label">Email</span>
                                    <span className="info-value">
                                        <Mail size={16} className="info-icon" />
                                        {staff.email || 'Chưa cập nhật'}
                                    </span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Số điện thoại</span>
                                    <span className="info-value">
                                        <Phone size={16} className="info-icon" />
                                        {staff.phone || 'Chưa cập nhật'}
                                    </span>
                                </div>
                                <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                                    <span className="info-label">Địa chỉ</span>
                                    <span className="info-value">
                                        <MapPin size={16} className="info-icon" />
                                        {staff.address || 'Chưa cập nhật'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Notes - If any additional info */}
                        {staff.role === 'assistant' && staff.notes && (
                            <div className="detail-section">
                                <div className="section-title">
                                    <FileText size={20} />
                                    Ghi chú
                                </div>
                                <p className="notes-text" style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.4' }}>
                                    {staff.notes}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

StaffDetailModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    staff: PropTypes.object
};

export default StaffDetailModal;
