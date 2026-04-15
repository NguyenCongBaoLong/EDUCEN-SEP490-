import React from 'react';
import { X, FileText, PlayCircle, Download, BookOpen, Presentation, FileArchive, Image as ImageIcon } from 'lucide-react';

const MaterialDetailModal = ({ isOpen, onClose, material, onDownload }) => {
    if (!isOpen || !material) return null;

    const getFileStyles = (type) => {
        const t = type?.toLowerCase() || '';
        if (t.includes('pdf')) return { icon: <FileText size={32} />, className: 'icon-pdf', color: '#ef4444' };
        if (t.includes('word') || t.includes('doc')) return { icon: <FileText size={32} />, className: 'icon-word', color: '#2563eb' };
        if (t.includes('excel') || t.includes('xls')) return { icon: <BookOpen size={32} />, className: 'icon-excel', color: '#16a34a' };
        if (t.includes('video') || t.includes('mp4')) return { icon: <PlayCircle size={32} />, className: 'icon-video', color: '#8b5cf6' };
        if (t.includes('powerpoint') || t.includes('ppt')) return { icon: <Presentation size={32} />, className: 'icon-ppt', color: '#f97316' };
        if (t.includes('zip') || t.includes('rar') || t.includes('7z')) return { icon: <FileArchive size={32} />, className: 'icon-zip', color: '#ca8a04' };
        if (t.includes('image') || t.includes('png') || t.includes('jpg') || t.includes('jpeg')) return { icon: <ImageIcon size={32} />, className: 'icon-image', color: '#d946ef' };
        return { icon: <FileText size={32} />, className: 'icon-other', color: '#64748b' };
    };

    return (
        <div className="cam-overlay">
            <div className="cam-modal" style={{ maxWidth: material.url ? '800px' : '500px', width: '100%' }}>
                <div className="cam-header">
                    <h2 className="cam-title">Chi tiết tài liệu</h2>
                    <button className="cam-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="cam-form" style={{ paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        <div className={`file-icon-container ${getFileStyles(material.type).className}`} style={{ width: '64px', height: '64px' }}>
                            {React.cloneElement(getFileStyles(material.type).icon, { size: 32 })}
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.5rem', wordBreak: 'break-word' }}>
                                {material.title}
                            </h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', color: '#64748b', fontSize: '0.875rem' }}>
                                <span>Loại: <strong>{material.contentType || 'Tài liệu'}</strong></span>
                                <span className="dot">•</span>
                                <span>Tệp đính kèm: <strong>{material.fileName || 'Chưa có file'}</strong></span>
                            </div>
                        </div>
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
