import { useState, useRef } from 'react';
import { X, UploadCloud, File, Trash2, FileText, CheckCircle } from 'lucide-react';
import '../css/components/CreateAssignmentModal.css';

const UploadMaterialModal = ({ isOpen, onClose, onUpload }) => {
    if (!isOpen) return null;

    const [formData, setFormData] = useState({
        title: '',
        description: '',
    });

    const [files, setFiles] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [saveToLibrary, setSaveToLibrary] = useState(true);
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
            handleFiles(e.dataTransfer.files);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    };

    const handleFiles = (newFiles) => {
        const fileArray = Array.from(newFiles).map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            file: file,
            name: file.name,
            size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
            type: file.name.split('.').pop().toLowerCase()
        }));
        setFiles(prev => [...prev, ...fileArray]);
    };

    const removeFile = (id) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (files.length === 0) {
            alert("Vui lòng chọn ít nhất 1 file tài liệu để tải lên.");
            return;
        }

        // Tạo cục data để render (mô phỏng)
        const newMaterialItems = files.map(f => ({
            id: f.id,
            name: formData.title || f.name, // Nếu nhập title thì lấy, ko thì lấy tên gốc
            size: f.size,
            uploadDate: new Date().toLocaleDateString('vi-VN'),
            type: f.type === 'pdf' ? 'pdf' : (['doc', 'docx'].includes(f.type) ? 'word' : (['mp4', 'mov'].includes(f.type) ? 'video' : 'other')),
            description: formData.description,
            rawFile: f.file
        }));

        onUpload(newMaterialItems, saveToLibrary);
    };

    return (
        <div className="cam-overlay">
            <div className="cam-modal" style={{ maxWidth: '650px' }}>
                <div className="cam-header">
                    <h2 className="cam-title">Tải lên tài liệu học tập</h2>
                    <button className="cam-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form className="cam-form" onSubmit={handleSubmit}>
                    <div className="cam-form-grid" style={{ gridTemplateColumns: '1fr' }}>

                        {/* File Upload Area */}
                        <div className="cam-field">
                            <label className="cam-label">Chọn File tài liệu <span className="cam-required">*</span></label>

                            <div
                                className={`cam-upload-area ${isDragging ? 'dragging' : ''} ${files.length > 0 ? 'has-files' : ''}`}
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
                                    multiple
                                    style={{ display: 'none' }}
                                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.mp4,.zip,.rar"
                                />
                                <UploadCloud size={40} color={isDragging ? "#3b82f6" : "#9ca3af"} style={{ marginBottom: '1rem' }} />
                                <div style={{ fontSize: '1rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                                    Kéo thả file vào đây hoặc <span style={{ color: '#3b82f6' }}>duyệt qua máy tính</span>
                                </div>
                                <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
                                    Hỗ trợ định dạng: PDF, Word, PowerPoint, MP4, ZIP (Tối đa 50MB)
                                </div>
                            </div>

                            {/* List of picked files */}
                            {files.length > 0 && (
                                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {files.map(file => (
                                        <div key={file.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <FileText size={20} />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        {file.name}
                                                        <CheckCircle size={14} color="#16a34a" />
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: '#16a34a', opacity: 0.8 }}>{file.size} • Đã tải xong</div>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                                                style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem' }}
                                                title="Xóa file"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Metadata */}
                        <div className="cam-field">
                            <label className="cam-label">Tiêu đề hiển thị (Tùy chọn)</label>
                            <input
                                type="text"
                                className="cam-input"
                                name="title"
                                placeholder="Để trống sẽ lấy tên gốc của file"
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
                                rows={2}
                            ></textarea>
                        </div>

                        <div className="cam-field" style={{ marginTop: '0.5rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem', color: '#374151' }}>
                                <input
                                    type="checkbox"
                                    checked={saveToLibrary}
                                    onChange={(e) => setSaveToLibrary(e.target.checked)}
                                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#3b82f6' }}
                                />
                                <span style={{ fontWeight: 500 }}>Lưu vào Thư viện học liệu chung</span> (giúp tái sử dụng cho các lớp khác)
                            </label>
                        </div>
                    </div>

                    <div className="cam-footer">
                        <button type="button" className="cam-btn-cancel" onClick={onClose}>
                            Hủy bỏ
                        </button>
                        <button type="submit" className="cam-btn-submit" disabled={files.length === 0}>
                            Tải lên
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UploadMaterialModal;
