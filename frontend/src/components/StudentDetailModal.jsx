import { X, User, Phone, Mail, MapPin, Calendar, BookOpen, Clock, FileText } from 'lucide-react';
import PropTypes from 'prop-types';
import '../css/components/StudentDetailModal.css';

const StudentDetailModal = ({ isOpen, onClose, student }) => {
    if (!isOpen || !student) return null;

    const getInitials = (name) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Chưa cập nhật';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'active': return 'Đang học';
            case 'inactive': return 'Tạm nghỉ';
            case 'graduated': return 'Đã tốt nghiệp';
            default: return status;
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="student-detail-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Hồ Sơ Học Sinh</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-body">
                    {/* Left Column: Profile Card */}
                    <div className="detail-left-col">
                        <div className="detail-avatar-large">
                            {student.avatar ? (
                                <img src={student.avatar} alt={student.name} />
                            ) : (
                                <span className="detail-initials-large">
                                    {getInitials(student.name)}
                                </span>
                            )}
                        </div>
                        <h3 className="student-name-large">{student.name}</h3>
                        <span className="student-id-large">ID: {student.id}</span>

                        <div className="student-badges">
                            <span className="info-badge grade-badge-large">
                                Khối {student.grade}
                            </span>
                            <span className={`status-badge-large ${student.status}`}>
                                {getStatusLabel(student.status)}
                            </span>
                        </div>
                    </div>

                    {/* Right Column: Details */}
                    <div className="detail-right-col">
                        {/* Learning Info */}
                        <div className="detail-section">
                            <div className="section-title">
                                <BookOpen size={20} />
                                Thông Tin Học Tập
                            </div>
                            <div className="info-grid">
                                <div className="info-item">
                                    <span className="info-label">Lớp học</span>
                                    <span className="info-value">{student.class}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Ngày nhập học</span>
                                    <span className="info-value">
                                        <Clock size={16} className="info-icon" />
                                        {formatDate(student.enrollmentDate)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Personal Info */}
                        <div className="detail-section">
                            <div className="section-title">
                                <User size={20} />
                                Thông Tin Cá Nhân
                            </div>
                            <div className="info-grid">
                                <div className="info-item">
                                    <span className="info-label">Ngày sinh</span>
                                    <span className="info-value">
                                        <Calendar size={16} className="info-icon" />
                                        {formatDate(student.dateOfBirth)}
                                    </span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Giới tính</span>
                                    <span className="info-value">
                                        {student.gender === 'male' ? 'Nam' : 'Nữ'}
                                    </span>
                                </div>
                                <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                                    <span className="info-label">Địa chỉ</span>
                                    <span className="info-value">
                                        <MapPin size={16} className="info-icon" />
                                        {student.address}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Parent Info */}
                        <div className="detail-section">
                            <div className="section-title">
                                <User size={20} />
                                Thông Tin Phụ Huynh
                            </div>
                            <div className="parent-card">
                                <div className="info-grid">
                                    <div className="info-item">
                                        <span className="info-label">Họ tên phụ huynh</span>
                                        <span className="info-value">{student.parentName}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Số điện thoại</span>
                                        <span className="info-value">
                                            <Phone size={16} className="info-icon" />
                                            {student.parentPhone}
                                        </span>
                                    </div>
                                    <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                                        <span className="info-label">Email liên hệ</span>
                                        <span className="info-value">
                                            <Mail size={16} className="info-icon" />
                                            {student.parentEmail}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        {student.notes && (
                            <div className="detail-section">
                                <div className="section-title">
                                    <FileText size={20} />
                                    Ghi chú
                                </div>
                                <p className="notes-text" style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.5' }}>
                                    {student.notes}
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

StudentDetailModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    student: PropTypes.object
};

export default StudentDetailModal;
