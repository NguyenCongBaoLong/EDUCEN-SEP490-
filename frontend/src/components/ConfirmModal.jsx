import React from 'react';
import PropTypes from 'prop-types';
import { AlertTriangle, Info, CheckCircle, HelpCircle, X, Mail } from 'lucide-react';
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

    const getIcon = () => {
        switch (type) {
            case 'danger': return <AlertTriangle size={24} />;
            case 'info': return <Info size={24} />;
            case 'mail': return <Mail size={24} />;
            case 'success': return <CheckCircle size={24} />;
            case 'warning': return <AlertTriangle size={24} />;
            default: return <HelpCircle size={24} />;
        }
    };

    return (
        <div className="confirm-modal-overlay" onClick={onClose}>
            <div className={`confirm-modal-container ${type}`} onClick={e => e.stopPropagation()}>
                <div className="confirm-modal-header">
                    <h3>{title}</h3>
                    <button className="confirm-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                
                <div className="confirm-modal-body">
                    <div className="confirm-warning-section">
                        <div className={`confirm-warning-icon ${type}`}>
                            {getIcon()}
                        </div>
                        <div className="confirm-warning-content">
                            <h4>{title}</h4>
                            <div 
                                className="confirm-message-text" 
                                dangerouslySetInnerHTML={{ __html: message.replace(/\n/g, '<br/>') }} 
                            />
                        </div>
                    </div>
                </div>

                <div className="confirm-modal-footer" style={isAlert ? { justifyContent: 'center' } : {}}>
                    <button className="btn-cancel" onClick={onClose}>
                        {cancelText}
                    </button>
                    {!isAlert && (
                        <button className={`btn-confirm ${type}`} onClick={onConfirm}>
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
