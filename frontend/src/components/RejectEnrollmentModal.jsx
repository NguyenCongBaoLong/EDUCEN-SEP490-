import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import PropTypes from 'prop-types';
import '../css/components/DeleteModal.css'; // Use shared modal styles

const RejectEnrollmentModal = ({ isOpen, onClose, onConfirm, request }) => {
    if (!isOpen || !request) return null;

    const handleConfirm = () => {
        onConfirm(request.id);
        onClose();
    };

    const handleClose = () => {
        onClose();
    };

    return (
        <div className="delete-modal-overlay" onClick={handleClose}>
            <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="delete-modal-header">
                    <h3>Từ chối yêu cầu</h3>
                    <button className="delete-modal-close" onClick={handleClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="delete-modal-body">
                    <div className="delete-modal-warning">
                        <div className="delete-modal-warning-icon">
                            <AlertTriangle size={20} />
                        </div>
                        <div className="delete-modal-warning-content">
                            <h4>Bạn có chắc muốn từ chối yêu cầu này?</h4>
                            <p>
                                Yêu cầu đăng ký của học sinh <strong>{request.studentName}</strong> sẽ bị từ chối.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="delete-modal-footer">
                    <button className="btn-delete-cancel" onClick={handleClose}>
                        Hủy
                    </button>
                    <button className="btn-delete-confirm" onClick={handleConfirm}>
                        Xác Nhận Từ Chối
                    </button>
                </div>
            </div>
        </div>
    );
};

RejectEnrollmentModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
    request: PropTypes.object
};

export default RejectEnrollmentModal;
