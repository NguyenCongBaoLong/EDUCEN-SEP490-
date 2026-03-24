import React from 'react';
import PropTypes from 'prop-types';
import { AlertTriangle, X } from 'lucide-react';
import '../css/components/ConfirmModal.css';

const ConfirmModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    confirmText = 'Tiếp tục', 
    cancelText = 'Hủy',
    type = 'warning',
    isAlert = false
}) => {
    if (!isOpen) return null;

    return (
        <div className="confirm-modal-overlay">
            <div className={`confirm-modal-container ${type}`}>
                <div className="confirm-modal-header">
                    <div className="confirm-icon">
                        <AlertTriangle size={24} />
                    </div>
                    <h3>{title}</h3>
                    <button className="confirm-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className="confirm-modal-body">
                    <div className="confirm-message-content" dangerouslySetInnerHTML={{ __html: message.replace(/\n/g, '<br/>') }} />
                </div>
                <div className="confirm-modal-footer" style={isAlert ? { justifyContent: 'center' } : {}}>
                    <button className="btn-cancel" onClick={onClose}>
                        {cancelText}
                    </button>
                    {!isAlert && (
                        <button className="btn-confirm" onClick={onConfirm}>
                            {confirmText}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

ConfirmModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
    title: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    confirmText: PropTypes.string,
    cancelText: PropTypes.string,
    type: PropTypes.oneOf(['warning', 'danger', 'info']),
    isAlert: PropTypes.bool
};

export default ConfirmModal;
