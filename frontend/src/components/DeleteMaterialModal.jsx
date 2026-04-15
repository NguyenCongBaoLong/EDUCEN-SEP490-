import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

const DeleteMaterialModal = ({ isOpen, onClose, onDelete, itemName = 'tài liệu' }) => {
    if (!isOpen) return null;

    return (
        <div className="cam-overlay">
            <div className="cam-modal" style={{ maxWidth: '450px' }}>
                <div className="cam-header" style={{ borderBottom: 'none', paddingBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '50%',
                            background: '#fee2e2', color: '#ef4444',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <AlertTriangle size={24} />
                        </div>
                        <h2 className="cam-title">Xóa {itemName}</h2>
                    </div>
                    <button className="cam-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="cam-form" style={{ paddingTop: '0' }}>
                    <p style={{ color: '#475569', fontSize: '0.9375rem', lineHeight: '1.5' }}>
                        Bạn có chắc chắn muốn xóa {itemName} này không? <br />
                        Hành động này <strong style={{ color: '#1e293b' }}>không thể hoàn tác</strong>.
                    </p>
                </div>

                <div className="cam-footer">
                    <button type="button" className="cam-btn-cancel" onClick={onClose}>
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={onDelete}
                        style={{
                            padding: '0.625rem 1.25rem',
                            border: 'none',
                            background: '#ef4444',
                            color: 'white',
                            borderRadius: '8px',
                            fontWeight: '600',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Xóa {itemName}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteMaterialModal;
