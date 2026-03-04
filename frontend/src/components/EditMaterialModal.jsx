import { useState, useEffect, useRef } from 'react';
import { X, UploadCloud, CheckCircle, FileText, Trash2 } from 'lucide-react';

const EditMaterialModal = ({ isOpen, onClose, onUpdate, materialData }) => {
    if (!isOpen || !materialData) return null;

    const [formData, setFormData] = useState({
        title: '',
        description: '',
    });

    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    // Xử lý kéo thả
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleSingleFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleSingleFile(e.target.files[0]);
        }
    };

    const handleSingleFile = (pickedFile) => {
        setFile({
            file: pickedFile,
            name: pickedFile.name,
            size: (pickedFile.size / (1024 * 1024)).toFixed(2) + ' MB',
            type: pickedFile.name.split('.').pop().toLowerCase()
        });

        // Cập nhật tên theo file nếu người dùng chưa đổi tên
        if (!formData.title || formData.title === materialData.name) {
            setFormData(prev => ({ ...prev, title: pickedFile.name }));
        }
    };

    const removeFile = () => {
        setFile(null);
    };

    useEffect(() => {
        if (materialData) {
            setFormData({
                title: materialData.name || '',
                description: materialData.description || ''
            });
        }
    }, [materialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.title.trim()) {
            alert("Tiêu đề không được để trống.");
            return;
        }

        const updatePayload = {
            id: materialData.id,
            name: formData.title,
            description: formData.description
        };

        if (file) {
            updatePayload.rawFile = file.file;
            updatePayload.size = file.size;
            updatePayload.type = file.type === 'pdf' ? 'pdf' : (['doc', 'docx'].includes(file.type) ? 'word' : (['mp4', 'mov'].includes(file.type) ? 'video' : 'other'));
            updatePayload.uploadDate = new Date().toLocaleDateString('vi-VN');
        }

        onUpdate(updatePayload);
    };

    return (
        <div className="cam-overlay">
            <div className="cam-modal" style={{ maxWidth: '500px' }}>
                <div className="cam-header">
                    <h2 className="cam-title">Chỉnh sửa thông tin tài liệu</h2>
                    <button className="cam-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form className="cam-form" onSubmit={handleSubmit}>
                    <div className="cam-field">
                        <label className="cam-label">Thay đổi file tài liệu (Tùy chọn)</label>
                        {!file ? (
                            <div
                                className={`cam-upload-area ${isDragging ? 'dragging' : ''}`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current.click()}
                                style={{ padding: '2rem', textAlign: 'center', border: '2px dashed #d1d5db', borderRadius: '12px', cursor: 'pointer', background: isDragging ? '#eff6ff' : '#f9fafb', borderColor: isDragging ? '#3b82f6' : '#d1d5db', transition: 'all 0.2s' }}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="cam-file-input"
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.mp4,.zip,.rar"
                                />
                                <UploadCloud size={40} color={isDragging ? "#3b82f6" : "#9ca3af"} style={{ marginBottom: '1rem' }} />
                                <div style={{ fontSize: '0.9375rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>
                                    Kéo thả hoặc click để chọn file thay thế
                                </div>
                                <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
                                    File hiện tại: <strong>{materialData.name}</strong>
                                </div>
                            </div>
                        ) : (
                            <div style={{ padding: '0.75rem 1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {file.name}
                                            <CheckCircle size={14} color="#16a34a" />
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#16a34a', opacity: 0.8 }}>{file.size} • Sẽ thay thế file cũ</div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={removeFile}
                                    style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem' }}
                                    title="Hủy chọn file này"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="cam-field">
                        <label className="cam-label">Tiêu đề hiển thị <span className="cam-required">*</span></label>
                        <input
                            type="text"
                            className="cam-input"
                            name="title"
                            placeholder="Ví dụ: Slide Bài 1"
                            value={formData.title}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="cam-field">
                        <label className="cam-label">Mô tả ngắn (Tùy chọn)</label>
                        <textarea
                            className="cam-input cam-textarea"
                            name="description"
                            placeholder="Ghi chú thêm về bộ tài liệu này cho học sinh..."
                            value={formData.description}
                            onChange={handleChange}
                            rows={3}
                        ></textarea>
                    </div>

                    <div className="cam-footer" style={{ marginTop: '1rem' }}>
                        <button type="button" className="cam-btn-cancel" onClick={onClose}>
                            Hủy bỏ
                        </button>
                        <button type="submit" className="cam-btn-submit">
                            Lưu thay đổi
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditMaterialModal;
