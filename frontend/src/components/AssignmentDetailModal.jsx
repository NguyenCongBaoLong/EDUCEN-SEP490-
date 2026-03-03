import React from 'react';
import { X, FileText, Download, Clock, BookOpen, AlertCircle, CheckCircle } from 'lucide-react';

const AssignmentDetailModal = ({ isOpen, onClose, assignment, onDownload }) => {
    if (!isOpen || !assignment) return null;

    const getStatusBadge = (status) => {
        switch (status) {
            case 'active':
                return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600', backgroundColor: '#eff6ff', color: '#2563eb' }}><AlertCircle size={14} /> Đang mở</span>;
            case 'closed':
                return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600', backgroundColor: '#f3f4f6', color: '#6b7280' }}><CheckCircle size={14} /> Đã đóng</span>;
            case 'draft':
                return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600', backgroundColor: '#fef3c7', color: '#d97706' }}><FileText size={14} /> Bản nháp</span>;
            default:
                return null;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Chưa thiết lập';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="cam-overlay">
            <div className="cam-modal" style={{ maxWidth: '600px' }}>
                <div className="cam-header">
                    <h2 className="cam-title">Chi tiết bài tập</h2>
                    <button className="cam-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="cam-form" style={{ paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Header: Icon & Title & Status */}
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        <div style={{ padding: '1rem', background: '#eff6ff', borderRadius: '12px', color: '#2563eb', flexShrink: 0 }}>
                            <BookOpen size={32} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                                    {assignment.title}
                                </h3>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                {getStatusBadge(assignment.status)}
                                <span style={{ fontSize: '0.875rem', color: '#475569', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    Lớp: {assignment.className}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Metadata */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#334155' }}>
                            <Clock size={16} color="#64748b" />
                            <span>Hạn nộp: <strong>{formatDate(assignment.dueDate)}</strong></span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#334155' }}>
                            <CheckCircle size={16} color="#64748b" />
                            <span>Đã nhận: <strong>{assignment.submittedCount} / {assignment.totalStudents}</strong> học sinh nộp bài</span>
                        </div>
                    </div>

                    {/* Description */}
                    {assignment.description && (
                        <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Hướng dẫn làm bài</div>
                            <p style={{ color: '#334155', fontSize: '0.9375rem', margin: '0', lineHeight: '1.5', whiteSpace: 'pre-wrap', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                                {assignment.description}
                            </p>
                        </div>
                    )}

                    {/* Attached Template File (if any exists in mock logic for this feature) */}
                    {(assignment.file || assignment.fileUrl) && (
                        <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Tệp đính kèm</div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155' }}>
                                            {assignment.file ? assignment.file.name : (assignment.fileName || "Tệp bài tập tải về")}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onDownload(assignment); }}
                                    style={{ border: 'none', background: '#f8fafc', color: '#2563eb', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'all 0.15s' }}
                                >
                                    <Download size={14} /> Tải tệp
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="cam-footer">
                    <button type="button" className="cam-btn-cancel" onClick={onClose}>
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssignmentDetailModal;
