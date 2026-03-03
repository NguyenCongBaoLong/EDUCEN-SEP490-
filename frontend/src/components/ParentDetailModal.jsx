import { X, User, Phone, Mail, MapPin, Calendar, Clock, BookOpen, ShieldCheck, ShieldAlert } from 'lucide-react';
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
            <div className="detail-modal-content" onClick={e => e.stopPropagation()}>
                {/* Header Section */}
                <div className="detail-header-section">
                    <button className="btn-close-detail" onClick={onClose}>
                        <X size={20} />
                    </button>

                    <div className="detail-profile-main">
                        <div className="detail-avatar large">
                            {getInitials(parent.name)}
                        </div>
                        <div className="detail-title-info">
                            <h2>{parent.name}</h2>
                            <div className="detail-badges">
                                <span className="id-badge">ID: {parent.id}</span>
                                <span className={`status-badge ${parent.status === 'active' ? 'active' : 'inactive'}`}>
                                    {parent.status === 'active' ? 'Hoạt động' : 'Tạm khóa'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Body Content */}
                <div className="detail-body-scroll">
                    <div className="detail-grid-layout">

                        {/* Left Column: Contact & Info */}
                        <div className="detail-info-column">
                            <div className="info-card">
                                <h3 className="card-title">
                                    <User size={16} /> Thông tin liên hệ
                                </h3>
                                <div className="info-list">
                                    <div className="info-row">
                                        <div className="info-label"><Phone size={14} /> Điện thoại</div>
                                        <div className="info-value">{parent.phone || <span className="empty-val">Chưa cập nhật</span>}</div>
                                    </div>
                                    <div className="info-row">
                                        <div className="info-label"><Mail size={14} /> Email</div>
                                        <div className="info-value">{parent.email || <span className="empty-val">Chưa cập nhật</span>}</div>
                                    </div>
                                    <div className="info-row">
                                        <div className="info-label"><MapPin size={14} /> Địa chỉ</div>
                                        <div className="info-value">{parent.address || <span className="empty-val">Chưa cập nhật</span>}</div>
                                    </div>
                                    <div className="info-row">
                                        <div className="info-label"><User size={14} /> Giới tính</div>
                                        <div className="info-value">
                                            {parent.gender === 'male' ? 'Nam' : parent.gender === 'female' ? 'Nữ' : <span className="empty-val">Chưa cập nhật</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="info-card">
                                <h3 className="card-title">
                                    <ShieldCheck size={16} /> Trạng thái tài khoản
                                </h3>
                                <div className="info-list">
                                    <div className="info-row">
                                        <div className="info-label">Trạng thái gửi</div>
                                        <div className="info-value">
                                            {parent.accountSent ? (
                                                <span className="text-green-600 font-medium flex-align" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#047857' }}>
                                                    <ShieldCheck size={14} /> Đã gửi qua Email
                                                </span>
                                            ) : (
                                                <span className="text-orange-600 font-medium flex-align" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#c2410c' }}>
                                                    <ShieldAlert size={14} /> Chưa gửi
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Linked Students */}
                        <div className="detail-info-column">
                            <div className="info-card h-full">
                                <h3 className="card-title">
                                    <BookOpen size={16} /> Học sinh liên kết
                                </h3>

                                <div className="detail-student-list">
                                    {parent.linkedStudentNames && parent.linkedStudentNames.length > 0 ? (
                                        parent.linkedStudentNames.map((studentName, idx) => (
                                            <div key={idx} className="linked-student-card">
                                                <div className="linked-student-avatar">
                                                    {getInitials(studentName)}
                                                </div>
                                                <div className="linked-student-info">
                                                    <div className="linked-student-name">{studentName}</div>
                                                    <div className="linked-student-meta">
                                                        <span><Clock size={12} /> ID: {parent.linkedStudentIds?.[idx] || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="empty-state-box">
                                            <BookOpen size={24} className="text-gray-300 mb-2" />
                                            <p>Chưa có học sinh liên kết</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
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
