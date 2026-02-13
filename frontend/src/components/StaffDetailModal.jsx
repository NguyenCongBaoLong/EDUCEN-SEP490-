import { X } from 'lucide-react';
import PropTypes from 'prop-types';
import '../css/components/StaffDetailModal.css';

const StaffDetailModal = ({ isOpen, onClose, staff }) => {
    if (!isOpen || !staff) return null;

    const formatDate = (dateString) => {
        if (!dateString) return 'Chưa cập nhật';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    };

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

    return (
        <div className="staff-detail-overlay" onClick={onClose}>
            <div className="staff-detail-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="staff-detail-header">
                    <h3>Thông Tin Nhân Viên</h3>
                    <button className="staff-detail-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="staff-detail-body">
                    {/* Avatar & Basic Info */}
                    <div className="staff-detail-profile">
                        <div className="staff-detail-avatar">
                            {staff.avatar ? (
                                <img src={staff.avatar} alt={staff.name} />
                            ) : (
                                <div className="staff-detail-avatar-initials">
                                    {getInitials(staff.name)}
                                </div>
                            )}
                        </div>
                        <div className="staff-detail-profile-info">
                            <h2>{staff.name}</h2>
                            <p className="staff-detail-id">ID: {staff.id}</p>
                            <div className="staff-detail-badges">
                                <span className={`role-badge ${staff.role}`}>
                                    {getRoleLabel(staff.role)}
                                </span>
                                <span className={`status-badge ${staff.status}`}>
                                    {getStatusLabel(staff.status)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Information Grid */}
                    <div className="staff-detail-grid">
                        <div className="detail-item">
                            <label>Email</label>
                            <p>{staff.email}</p>
                        </div>

                        <div className="detail-item">
                            <label>Số điện thoại</label>
                            <p>{staff.phone}</p>
                        </div>

                        <div className="detail-item">
                            <label>Môn học</label>
                            <p>{staff.subject}</p>
                        </div>

                        <div className="detail-item">
                            <label>Ngày sinh</label>
                            <p>{formatDate(staff.dateOfBirth)}</p>
                        </div>

                        <div className="detail-item full-width">
                            <label>Địa chỉ</label>
                            <p>{staff.address || 'Chưa cập nhật'}</p>
                        </div>

                        <div className="detail-item full-width">
                            <label>Ghi chú</label>
                            <p className="notes-text">{staff.notes || 'Không có ghi chú'}</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="staff-detail-footer">
                    <button className="btn-detail-close" onClick={onClose}>
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
