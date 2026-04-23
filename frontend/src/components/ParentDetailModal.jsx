import { X, User, Phone, Mail, MapPin, ShieldCheck, GraduationCap, Briefcase, BookOpen } from 'lucide-react';
import PropTypes from 'prop-types';
import '../css/components/ParentDetailModal.css';

const ParentDetailModal = ({ isOpen, onClose, parent }) => {
    if (!isOpen || !parent) return null;

    const getInitials = (name) => {
        if (!name) return 'PR';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="parent-detail-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Hồ Sơ Phụ Huynh</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-body">
                    {/* Left Column: Profile Card */}
                    <div className="detail-left-col">
                        <div className="detail-avatar-large" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' }}>
                            <span className="detail-initials-large" style={{ color: 'white' }}>
                                {getInitials(parent.name)}
                            </span>
                        </div>
                        <h3 className="parent-name-large">{parent.name}</h3>

                        <div className="parent-badges">
                            <span className="role-badge-large">
                                <Briefcase size={16} style={{ marginRight: 6 }} />
                                Phụ Huynh
                            </span>
                            <span className={`status-badge-large ${parent.status === 'active' ? 'active' : 'inactive'}`}>
                                {parent.status === 'active' ? 'Hoạt động' : 'Tạm khóa'}
                            </span>
                        </div>
                    </div>

                    {/* Right Column: Details */}
                    <div className="detail-right-col">
                        {/* Personal Info */}
                        <div className="detail-section">
                            <div className="section-title">
                                <User size={20} />
                                Thông Tin Cá Nhân
                            </div>
                            <div className="info-grid">
                                <div className="info-item">
                                    <span className="info-label">Email</span>
                                    <span className="info-value">
                                        <Mail size={16} className="info-icon" />
                                        {parent.email || 'Chưa cập nhật'}
                                    </span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Số điện thoại</span>
                                    <span className="info-value">
                                        <Phone size={16} className="info-icon" />
                                        {parent.phone || 'Chưa cập nhật'}
                                    </span>
                                </div>
                                <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                                    <span className="info-label">Địa chỉ</span>
                                    <span className="info-value">
                                        <MapPin size={16} className="info-icon" />
                                        {parent.address || 'Chưa cập nhật'}
                                    </span>
                                </div>
                            </div>
                        </div>


                        {/* Linked Students */}
                        <div className="detail-section">
                            <div className="section-title">
                                <BookOpen size={20} />
                                Học sinh liên kết
                            </div>
                            <div className="student-list-container">
                                {parent.linkedStudentNames && parent.linkedStudentNames.length > 0 ? (
                                    parent.linkedStudentNames.map((studentName, idx) => (
                                        <div key={idx} className="student-small-card">
                                            <div className="student-small-avatar">
                                                {getInitials(studentName)}
                                            </div>
                                            <div className="student-small-name">
                                                {studentName}
                                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>
                                                    Khối: {parent.studentGradeNames?.[idx] || 'Chưa cập nhật'}
                                                    {parent.studentClassNames?.[idx] && parent.studentClassNames[idx] !== 'N/A' && ` • ${parent.studentClassNames[idx]}`}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ color: '#94a3b8', fontSize: '0.875rem', fontStyle: 'italic' }}>
                                        Chưa có học sinh liên kết
                                    </div>
                                )}
                            </div>
                        </div>
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

ParentDetailModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    parent: PropTypes.object
};

export default ParentDetailModal;
