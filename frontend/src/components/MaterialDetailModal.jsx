import React from 'react';
import { X, FileText, PlayCircle, Download } from 'lucide-react';

const MaterialDetailModal = ({ isOpen, onClose, material, onDownload }) => {
    if (!isOpen || !material) return null;

    const getFileIcon = (type) => {
        switch (type) {
            case 'pdf': return <FileText size={48} color="#ef4444" />;
            case 'word': return <FileText size={48} color="#2563eb" />;
            case 'video': return <PlayCircle size={48} color="#8b5cf6" />;
            default: return <FileText size={48} color="#64748b" />;
        }
    };

    return (
        <div className="cam-overlay">
            <div className="cam-modal" style={{ maxWidth: '500px' }}>
                <div className="cam-header">
                    <h2 className="cam-title">Chi tiết tài liệu</h2>
                    <button className="cam-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="cam-form" style={{ paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem' }}>
                    <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '16px', display: 'inline-flex' }}>
                        {getFileIcon(material.type)}
                    </div>

                    <div style={{ width: '100%' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.5rem', wordBreak: 'break-word' }}>
                            {material.name}
                        </h3>

                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>
                            <span>Kích thước: <strong>{material.size}</strong></span>
                            <span className="dot">•</span>
                            <span>Ngày đăng: <strong>{material.uploadDate}</strong></span>
                        </div>

                        {material.description && (
                            <div style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '8px', textAlign: 'left', marginTop: '1rem' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Mô tả</div>
                                <p style={{ color: '#334155', fontSize: '0.9375rem', margin: '0', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                                    {material.description}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="cam-footer">
                    <button type="button" className="cam-btn-cancel" onClick={onClose}>
                        Đóng
                    </button>
                    <button
                        type="button"
                        className="cam-btn-submit"
                        onClick={() => onDownload(material)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <Download size={18} /> Tải xuống ngay
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MaterialDetailModal;
