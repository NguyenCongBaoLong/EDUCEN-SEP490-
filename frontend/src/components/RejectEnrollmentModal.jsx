import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import PropTypes from 'prop-types';
import '../css/components/DeleteModal.css'; // Use shared modal styles

const RejectEnrollmentModal = ({ isOpen, onClose, onConfirm, request }) => {
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');

    if (!isOpen || !request) return null;

    const handleConfirm = () => {
        if (!reason.trim()) {
            setError('Vui lòng nhập lý do từ chối.');
            return;
        }
        onConfirm(request.id, reason);
        onClose();
        setReason(''); // Reset
        setError('');
    };

    const handleClose = () => {
        setReason('');
        setError('');
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
                                Vui lòng nhập lý do để thông báo cho phụ huynh.
                            </p>
                        </div>
                    </div>

                    <div className="form-group" style={{ marginTop: '1rem' }}>
                        <label style={{ fontSize: '0.9rem', fontWeight: 500, color: '#374151', marginBottom: '0.4rem', display: 'block' }}>
                            Lý do từ chối *
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value);
                                setError('');
                            }}
                            rows="3"
                            placeholder="Nhập lý do từ chối..."
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '6px',
                                border: error ? '1px solid #dc2626' : '1px solid #d1d5db',
                                fontSize: '0.9rem',
                                resize: 'vertical'
                            }}
                        />
                        {error && <span style={{ color: '#dc2626', fontSize: '0.8125rem', marginTop: '0.4rem', display: 'block' }}>{error}</span>}
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
