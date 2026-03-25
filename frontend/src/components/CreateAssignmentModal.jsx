import { useState, useEffect } from 'react';
import { X, Calendar, FileText, Link as LinkIcon, AlertCircle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const CreateAssignmentModal = ({ isOpen, onClose, onSave, sessionId, initialData, classes, isTemplate = false, currentClassId, grades = [] }) => {
    const [formData, setFormData] = useState({
        title: '',
        dueDate: '',
        classId: currentClassId || '',
        gradeId: '',
        description: '',
        status: 'active',
        file: null,
        sessionId: sessionId || '',
        startTime: '',
        saveToLibrary: true
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    const formatForDateTimeLocal = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    // Cập nhật formData nếu đang edit
    useEffect(() => {
        if (initialData) {
            setFormData({
                title: initialData.title || '',
                dueDate: formatForDateTimeLocal(initialData.endTime),
                classId: initialData.classId || currentClassId || '',
                gradeId: initialData.gradeId || initialData.GradeId || '',
                description: initialData.description || '',
                status: initialData.status || 'active',
                saveToLibrary: initialData.saveToLibrary ?? true,
                sessionId: initialData.sessionId || initialData.SessionId || sessionId || '',
                startTime: initialData.startTime || initialData.StartTime || '',
                file: (initialData.fileUrl || (initialData.file && initialData.file.name)) ? { name: initialData.originalFileName || (initialData.file && initialData.file.name) || 'Tệp hiện tại', isExisting: true } : null
            });
        } else if (currentClassId) {
            setFormData(prev => ({ ...prev, classId: currentClassId }));
        }
    }, [initialData, currentClassId]);

    if (!isOpen) return null;

    const validate = () => {
        const newErrors = {};
        if (!formData.title.trim()) newErrors.title = 'Tên bài tập không được để trống';

        // validate dueDate có thể trống nếu là draft, nhưng active thì nên có
        if (!isTemplate) {
            if (formData.status === 'active' && !formData.dueDate) {
                newErrors.dueDate = 'Vui lòng chọn hạn nộp bài (hoặc lưu nháp)';
            } else if (formData.dueDate) {
                // Kiểm tra xem hạn nộp có nhỏ hơn thời gian hiện tại không
                const selectedDate = new Date(formData.dueDate);
                const now = new Date();
                if (selectedDate <= now) {
                    newErrors.dueDate = 'Hạn nộp bài phải là thời gian trong tương lai';
                }
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData({ ...formData, file });
        }
    };

    const removeFile = () => {
        setFormData({ ...formData, file: null });
        // Reset file input value
        const fileInput = document.getElementById('assignment-file');
        if (fileInput) fileInput.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            setIsSubmitting(true);
            const data = new FormData();

            if (formData.sessionId) {
                data.append('SessionId', formData.sessionId);
            }
            if (formData.classId) {
                data.append('ClassId', formData.classId);
            }
            if (formData.gradeId) {
                data.append('GradeId', formData.gradeId);
            }

            data.append('Title', formData.title);
            data.append('Description', formData.description || '');

            if (formData.dueDate) {
                // Send as local datetime string to avoid UTC shift unless server handles it
                data.append('EndTime', formData.dueDate);
            }
            // Always set StartTime to now for new assignments
            if (!initialData) {
                // For new, we can use ISO but a local-compatible format is better for consistency
                const now = new Date();
                const offset = now.getTimezoneOffset() * 60000;
                const localISOTime = new Date(now - offset).toISOString().slice(0, 19);
                data.append('StartTime', localISOTime);
            } else if (formData.startTime) {
                data.append('StartTime', formData.startTime);
            }
            if (formData.file && !formData.file.isExisting) {
                data.append('File', formData.file);
            }
            data.append('SaveToLibrary', formData.saveToLibrary);

            // Instead of call api here, pass data to parent
            await onSave(data);
            onClose();
        } catch (error) {
            console.error('Error creating assignment:', error);
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi tạo bài tập.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="cam-modal-content">
                <div className="cam-modal-header">
                    <h2>{initialData ? 'Chỉnh sửa bài tập' : 'Tạo bài tập mới'}</h2>
                    <button className="btn-close" onClick={onClose} title="Đóng modal">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="cam-modal-body">
                    {/* Hàng 1: Tiêu đề */}
                    <div className="cam-form-group">
                        <label>Tên bài tập <span className="req">*</span></label>
                        <input
                            type="text"
                            placeholder="Nhập tên bài tập..."
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className={errors.title ? 'error' : ''}
                        />
                        {errors.title && <span className="error-text">{errors.title}</span>}
                    </div>

                    {/* Hàng 2: Khối lớp & Hạn nộp */}
                    <div className="cam-form-row">
                        <div className="cam-form-group">
                            <label>Khối lớp <span className="req">*</span></label>
                            <select
                                value={formData.gradeId}
                                onChange={(e) => setFormData({ ...formData, gradeId: e.target.value })}
                            >
                                <option value="">-- Chọn khối lớp --</option>
                                {grades.map(g => (
                                    <option key={g.gradeId} value={g.gradeId}>{g.gradeName}</option>
                                ))}
                            </select>
                        </div>

                        {(!isTemplate && !currentClassId) && (
                            <div className="cam-form-group">
                                <label>Chọn Lớp <span className="req">*</span></label>
                                <select
                                    value={formData.classId}
                                    onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                                    className={errors.classId ? 'error' : ''}
                                >
                                    <option value="">-- Chọn một lớp --</option>
                                    {classes.map(cls => (
                                        <option key={cls.classId} value={cls.classId}>{cls.className}</option>
                                    ))}
                                </select>
                                {errors.classId && <span className="error-text">{errors.classId}</span>}
                            </div>
                        )}
                    </div>

                    {!isTemplate && (
                        <div className="cam-form-row">
                            <div className="cam-form-group">
                                <label>Hạn nộp bài</label>
                                <div className="cam-input-icon">
                                    <Calendar size={16} />
                                    <input
                                        type="datetime-local"
                                        value={formData.dueDate}
                                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                        className={errors.dueDate ? 'error' : ''}
                                    />
                                </div>
                                {errors.dueDate && <span className="error-text">{errors.dueDate}</span>}
                            </div>
                        </div>
                    )}

                    {/* Hàng 3: Mô tả */}
                    <div className="cam-form-group">
                        <label>Mô tả chi tiết</label>
                        <textarea
                            placeholder="Nhập mô tả, hướng dẫn làm bài..."
                            rows={4}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        ></textarea>
                    </div>

                    {/* Hàng 4: Trạng thái */}
                    {!isTemplate && (
                        <div className="cam-form-group">
                            <label>Trạng thái</label>
                            <div className="cam-status-options">
                                <label className="cam-radio-label">
                                    <input
                                        type="radio"
                                        name="status"
                                        value="active"
                                        checked={formData.status === 'active'}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    />
                                    <span>Đang mở (Giao ngay)</span>
                                </label>
                                <label className="cam-radio-label">
                                    <input
                                        type="radio"
                                        name="status"
                                        value="draft"
                                        checked={formData.status === 'draft'}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    />
                                    <span>Lưu nháp</span>
                                </label>
                            </div>
                            {formData.status === 'draft' && (
                                <div className="cam-helper-text">Học sinh sẽ không nhìn thấy bài tập nháp.</div>
                            )}
                        </div>
                    )}

                    {/* Tệp đính kèm */}
                    <div className="cam-form-group">
                        <label>Tệp đính kèm</label>
                        <div className={`cam-attachment-box ${formData.file ? 'has-file' : ''}`}>
                            <input
                                type="file"
                                id="assignment-file"
                                className="cam-file-input"
                                onChange={handleFileChange}
                                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.mp4,.zip,.rar"
                            />

                            {!formData.file ? (
                                <label htmlFor="assignment-file" className="cam-file-trigger">
                                    <LinkIcon size={18} />
                                    <span>Chọn tệp hoặc kéo thả vào đây</span>
                                    <span className="file-hints">(Hỗ trợ PDF, DOCX, XLSX, ZIP. Tối đa 20MB)</span>
                                </label>
                            ) : (
                                <div className="cam-file-selected">
                                    <FileText size={20} className="file-icon" />
                                    <div className="file-info">
                                        <span className="file-name">{formData.file.name || 'Tệp đính kèm'}</span>
                                        {formData.file.size && (
                                            <span className="file-size">{(formData.file.size / 1024 / 1024).toFixed(2)} MB</span>
                                        )}
                                    </div>
                                    <button type="button" className="btn-remove-file" onClick={removeFile} title="Xóa tệp">
                                        <X size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Lưu vào thư viện option */}
                    {!initialData && (
                        <div className="cam-form-group" style={{ marginTop: '0.5rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem', color: '#374151' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.saveToLibrary}
                                    onChange={(e) => setFormData({ ...formData, saveToLibrary: e.target.checked })}
                                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#3b82f6' }}
                                />
                                <span style={{ fontWeight: 500 }}>Lưu vào Thư viện bài tập chung</span> (giúp tái sử dụng cho các lớp khác)
                            </label>
                        </div>
                    )}

                    <div className="cam-modal-footer">
                        <button type="button" className="btn-cancel" onClick={onClose}>Hủy</button>
                        <button type="submit" className="btn-save" disabled={isSubmitting}>
                            {isSubmitting ? 'Đang lưu...' : (initialData ? 'Cập nhật' : 'Tạo bài tập')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateAssignmentModal;
