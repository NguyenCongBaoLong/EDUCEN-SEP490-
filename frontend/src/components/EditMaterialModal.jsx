import React, { useState, useEffect } from 'react';
import { X, Save, FileText } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const EditMaterialModal = ({ isOpen, onClose, onUpdate, materialData, grades = [] }) => {
    const [formData, setFormData] = useState({
        title: '',
        gradeId: '',
    });
    const [newFile, setNewFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (materialData) {
            setFormData({
                title: materialData.title || '',
                gradeId: materialData.gradeId || materialData.GradeId || '',
            });
            setNewFile(null);
        }
    }, [materialData]);

    if (!isOpen || !materialData) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const maxSize = 20 * 1024 * 1024;
            if (file.size > maxSize) {
                toast.error('Kích thước file vượt quá 20MB.');
                e.target.value = '';
                return;
            }
            setNewFile(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newErrors = {};
        if (!formData.gradeId) newErrors.gradeId = 'Vui lòng chọn khối lớp';
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;
        try {
            setIsSubmitting(true);
            
            const data = new FormData();
            data.append('Title', formData.title);
            if (formData.gradeId) data.append('GradeId', formData.gradeId);
            if (materialData.sessionId) data.append('SessionId', materialData.sessionId);
            if (materialData.classId) data.append('ClassId', materialData.classId);
            
            if (newFile) {
                data.append('File', newFile);
            }

            // materialData.id được map từ materialId trong TeacherClassDetail
            await api.put(`/Materials/${materialData.id}`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success("Cập nhật tài liệu thành công!");
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Error updating material:', error);
            const msg = error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật tài liệu.';
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="cam-overlay">
            <div className="cam-modal" style={{ maxWidth: '500px' }}>
                <div className="cam-header">
                    <h2 className="cam-title">Chỉnh sửa tài liệu</h2>
                    <button className="cam-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form className="cam-form" onSubmit={handleSubmit} style={{ padding: '0 1.5rem 1.5rem' }}>
                    <div className="cam-form-grid" style={{ gridTemplateColumns: '1fr', gap: '1rem' }}>
                        <div className="cam-field">
                            <label className="cam-label">Tiêu đề hiển thị <span className="cam-required">*</span></label>
                            <input
                                type="text"
                                className="cam-input"
                                name="title"
                                required
                                value={formData.title}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="cam-field">
                            <label className="cam-label">Khối lớp <span className="cam-required">*</span></label>
                            <select
                                className={`cam-input${errors.gradeId ? ' error' : ''}`}
                                name="gradeId"
                                value={formData.gradeId}
                                onChange={handleChange}
                            >
                                <option value="">-- Chọn khối lớp --</option>
                                {grades.map(g => (
                                    <option key={g.gradeId} value={g.gradeId}>{g.gradeName}</option>
                                ))}
                            </select>
                            {errors.gradeId && <span style={{ color: '#ef4444', fontSize: '0.8125rem', marginTop: '4px', display: 'block' }}>{errors.gradeId}</span>}
                        </div>

                        <div className="cam-field">
                            <label className="cam-label">File hiện tại</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '8px' }}>
                                <FileText size={18} color="#64748b" />
                                <span style={{ fontSize: '0.875rem', color: '#334155', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {materialData.fileName}
                                </span>
                            </div>
                        </div>

                        <div className="cam-field">
                            <label className="cam-label">Thay thế file mới (Tùy chọn)</label>
                            <div className="custom-file-upload">
                                <input
                                    type="file"
                                    id="edit-material-file"
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.mp4,.zip,.rar"
                                />
                                <label 
                                    htmlFor="edit-material-file" 
                                    style={{ 
                                        display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', 
                                        border: '1px dashed #3b82f6', borderRadius: '8px', cursor: 'pointer',
                                        color: '#3b82f6', background: '#eff6ff', fontSize: '0.875rem', fontWeight: 600
                                    }}
                                >
                                    <Save size={16} />
                                    {newFile ? newFile.name : 'Chọn file thay thế...'}
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="cam-footer" style={{ borderTop: 'none', padding: '1.5rem 0 0' }}>
                        <button type="button" className="cam-btn-cancel" onClick={onClose} disabled={isSubmitting}>
                            Hủy bỏ
                        </button>
                        <button type="submit" className="cam-btn-submit" disabled={isSubmitting || !formData.title.trim()}>
                            {isSubmitting ? 'Đang lưu...' : (
                                <>
                                    <Save size={18} style={{ marginRight: '8px' }} />
                                    Lưu thay đổi
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditMaterialModal;
