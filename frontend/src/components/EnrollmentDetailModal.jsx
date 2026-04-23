import { X, User, Phone, Mail, MapPin, Calendar, BookOpen, Clock, FileText, Check, AlertCircle } from 'lucide-react';
import PropTypes from 'prop-types';
import '../css/components/StudentDetailModal.css'; // Use new student modal styles

const EnrollmentDetailModal = ({ isOpen, onClose, request }) => {
    if (!isOpen || !request) return null;

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
            case 'pending': return 'Chờ duyệt';
            case 'approved': return 'Đã duyệt';
            case 'rejected': return 'Từ chối';
            default: return status;
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'pending': return 'warning'; // Orange for pending
            case 'approved': return 'active'; // Green for approved
            case 'rejected': return 'inactive'; // Red for rejected
            default: return '';
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="student-detail-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Chi Tiết Yêu Cầu Đăng Ký</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-body">
                    {/* Left Column: Profile Card */}
                    <div className="detail-left-col">
                        <div className="detail-avatar-large">
                            <span className="detail-initials-large">
                                {getInitials(request.studentName)}
                            </span>
                        </div>
                        <h3 className="student-name-large">{request.studentName}</h3>

                        <div className="student-badges">
                            <span className="info-badge grade-badge-large">
                                {request.gradeName || (request.gradeId ? `Khối ${request.gradeId}` : '—')}
                            </span>
                            <span className={`status-badge-large ${getStatusClass(request.status)}`}>
                                {getStatusLabel(request.status)}
                            </span>
                        </div>
                        {request.className && (
                            <div className="requested-class-badge">
                                <BookOpen size={14} />
                                <span>Lớp: {request.className}</span>
                            </div>
                        )}
                        <div className={`request-type-tag ${request.requestType === 'ExistingStudentEnrollment' ? 'student' : 'guest'}`}>
                            {request.requestType === 'ExistingStudentEnrollment' ? 'Học sinh cũ' : 'Khách vãng lai'}
                        </div>
                    </div>

                    {/* Right Column: Details */}
                    <div className="detail-right-col">
                        {/* Status Message Block */}
                        {request.status === 'approved' && (
                            <div className="detail-section" style={{ background: '#ecfdf5', borderColor: '#d1fae5' }}>
                                <div className="section-title" style={{ color: '#047857', borderBottomColor: '#a7f3d0' }}>
                                    <Check size={20} />
                                    Thông tin duyệt
                                </div>
                                <p style={{ color: '#065f46', fontSize: '0.9rem' }}>
                                    Yêu cầu đã được duyệt thành công
                                </p>
                            </div>
                        )}
                        {request.status === 'rejected' && (
                            <div className="detail-section" style={{ background: '#fef2f2', borderColor: '#fee2e2' }}>
                                <div className="section-title" style={{ color: '#b91c1c', borderBottomColor: '#fecaca' }}>
                                    <AlertCircle size={20} />
                                    Yêu cầu bị từ chối
                                </div>
                                <p style={{ color: '#991b1b', fontSize: '0.9rem' }}>
                                    Yêu cầu đăng ký đã bị từ chối
                                </p>
                            </div>
                        )}

                        {/* Request Info - API version TEMP DISABLED */}
                        {/* <div className="detail-section">
                            <div className="section-title">
                                <BookOpen size={20} />
                                Thông Tin Đăng Ký
                            </div>
                            <div className="info-grid">
                                <div className="info-item">
                                    <span className="info-label">Khóa học mong muốn</span>
                                    <span className="info-value">{request.desiredGrade || 'Chưa chọn'}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Ngày gửi yêu cầu</span>
                                    <span className="info-value">
                                        <Clock size={16} className="info-icon" />
                                        {formatDate(request.requestDate)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        Contact Info - API version TEMP DISABLED
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
                                        {request.email}
                                    </span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Số điện thoại</span>
                                    <span className="info-value">
                                        <Phone size={16} className="info-icon" />
                                        {request.phone}
                                    </span>
                                </div>
                                <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                                    <span className="info-label">Địa chỉ</span>
                                    <span className="info-value">
                                        <MapPin size={16} className="info-icon" />
                                        {request.address || 'Chưa cập nhật'}
                                    </span>
                                </div>
                            </div>
                        </div> */}

                        {/* Mock version - Original fields */}
                        <div className="detail-section">
                            <div className="section-title">
                                <BookOpen size={20} />
                                Thông Tin Đăng Ký
                            </div>
                            <div className="info-grid">
                                <div className="info-item">
                                    <span className="info-label">Khối đăng ký</span>
                                    <span className="info-value">{request.gradeName || (request.gradeId ? `Khối ${request.gradeId}` : '—')}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Môn học mong muốn</span>
                                    <span className="info-value">{request.preferredCourse || '—'}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Lớp chỉ định</span>
                                    <span className="info-value">{request.className || 'Chưa chọn lớp cụ thể'}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Ngày gửi yêu cầu</span>
                                    <span className="info-value">
                                        <Clock size={16} className="info-icon" />
                                        {formatDate(request.requestDate)}
                                    </span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Hình thức</span>
                                    <span className="info-value">
                                        {request.requestType === 'ExistingStudentEnrollment' ? 'Đăng ký thêm lớp' : 'Đăng ký mới'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Student Personal Info */}
                        <div className="detail-section">
                            <div className="section-title">
                                <User size={20} />
                                Thông Tin Học Sinh
                            </div>
                            <div className="info-grid">
                                <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                                    <span className="info-label">Email</span>
                                    <span className="info-value">
                                        <Mail size={16} className="info-icon" />
                                        {request.email || 'Chưa cập nhật'}
                                    </span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Số điện thoại</span>
                                    <span className="info-value">
                                        <Phone size={16} className="info-icon" />
                                        {request.phone || 'Chưa cập nhật'}
                                    </span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Ngày sinh</span>
                                    <span className="info-value">
                                        <Calendar size={16} className="info-icon" />
                                        {formatDate(request.dateOfBirth)}
                                    </span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Giới tính</span>
                                    <span className="info-value">
                                        {request.gender === 'male' ? 'Nam' : request.gender === 'female' ? 'Nữ' : 'Chưa cập nhật'}
                                    </span>
                                </div>
                                <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                                    <span className="info-label">Địa chỉ</span>
                                    <span className="info-value">
                                        <MapPin size={16} className="info-icon" />
                                        {request.address || 'Chưa cập nhật'}
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
                                        <span className="info-value">{request.parentName || 'Chưa cập nhật'}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Số điện thoại</span>
                                        <span className="info-value">
                                            <Phone size={16} className="info-icon" />
                                            {request.parentPhone || 'Chưa cập nhật'}
                                        </span>
                                    </div>
                                    <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                                        <span className="info-label">Email liên hệ</span>
                                        <span className="info-value">
                                            <Mail size={16} className="info-icon" />
                                            {request.parentEmail || 'Chưa cập nhật'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        {request.notes && (
                            <div className="detail-section">
                                <div className="section-title">
                                    <FileText size={20} />
                                    Ghi chú từ phụ huynh
                                </div>
                                <p className="notes-text" style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.5' }}>
                                    {request.notes}
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

EnrollmentDetailModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    request: PropTypes.object
};

export default EnrollmentDetailModal;