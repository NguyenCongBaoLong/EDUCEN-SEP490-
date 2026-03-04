import { useState, useEffect } from 'react';
import { X, Calendar, FileText, Link as LinkIcon, AlertCircle } from 'lucide-react';
import '../css/components/CreateAssignmentModal.css';

const CreateAssignmentModal = ({ isOpen, onClose, onSave, initialData, classes }) => {
    const [formData, setFormData] = useState({
        title: '',
        classId: '',
        dueDate: '',
        description: '',
        status: 'active',
        file: null
    });

    const [errors, setErrors] = useState({});

    // Cập nhật formData nếu đang edit
    useEffect(() => {
        if (initialData) {
            setFormData({
                title: initialData.title || '',
                classId: initialData.classId || '',
                dueDate: initialData.dueDate || '',
                description: initialData.description || '',
                status: initialData.status || 'active',
                file: initialData.file || null
            });
        }
    }, [initialData]);

    if (!isOpen) return null;

    const validate = () => {
        const newErrors = {};
        if (!formData.title.trim()) newErrors.title = 'Tên bài tập không được để trống';
        if (!formData.classId) newErrors.classId = 'Vui lòng chọn lớp học';

        // validate dueDate có thể trống nếu là draft, nhưng active thì nên có
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

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            onSave(formData);
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

                    {/* Hàng 2: Lớp học & Hạn nộp */}
                    <div className="cam-form-row">
                        <div className="cam-form-group">
                            <label>Chọn Lớp <span className="req">*</span></label>
                            <select
                                value={formData.classId}
                                onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                                className={errors.classId ? 'error' : ''}
                            >
                                <option value="">-- Chọn một lớp --</option>
                                {classes.map(cls => (
                                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                                ))}
                            </select>
                            {errors.classId && <span className="error-text">{errors.classId}</span>}
                        </div>

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

                    {/* Tệp đính kèm */}
                    <div className="cam-form-group">
                        <label>Tệp đính kèm</label>
                        <div className={`cam-attachment-box ${formData.file ? 'has-file' : ''}`}>
                            <input
                                type="file"
                                id="assignment-file"
                                className="cam-file-input"
                                onChange={handleFileChange}
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
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

                    <div className="cam-modal-footer">
                        <button type="button" className="btn-cancel" onClick={onClose}>Hủy</button>
                        <button type="submit" className="btn-save">
                            {initialData ? 'Cập nhật' : 'Tạo bài tập'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateAssignmentModal;
