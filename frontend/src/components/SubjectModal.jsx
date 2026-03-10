import { useState, useEffect } from 'react';
import { X, BookOpen } from 'lucide-react';
import PropTypes from 'prop-types';
import '../css/components/SubjectModal.css';

const API_BASE = 'http://localhost:5062/api/tenantadmin';
const authHeader = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
});

const SubjectModal = ({ isOpen, onClose, onSuccess, editingSubject }) => {
    const [formData, setFormData] = useState({ subjectName: '', description: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (editingSubject) {
            setFormData({
                subjectName: editingSubject.subjectName || '',
                description: editingSubject.description || ''
            });
        } else {
            setFormData({ subjectName: '', description: '' });
        }
        setError('');
    }, [editingSubject, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.subjectName.trim()) {
            setError('Vui lòng nhập tên môn học!');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const payload = {
                subjectName: formData.subjectName.trim(),
                description: formData.description.trim() || null
            };

            let response;
            if (editingSubject) {
                response = await fetch(`${API_BASE}/Subjects/${editingSubject.subjectId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', ...authHeader() },
                    body: JSON.stringify(payload)
                });
            } else {
                response = await fetch(`${API_BASE}/Subjects`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...authHeader() },
                    body: JSON.stringify(payload)
                });
            }

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || 'Có lỗi xảy ra');
            }

            onSuccess();
            onClose();
        } catch (err) {
            setError(err.message || 'Không thể kết nối đến server!');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="subject-modal-overlay" onClick={onClose}>
            <div className="subject-modal" onClick={(e) => e.stopPropagation()}>
                <div className="subject-modal-header">
                    <div className="subject-modal-title">
                        <BookOpen size={20} />
                        <h2>{editingSubject ? 'Chỉnh sửa môn học' : 'Thêm môn học mới'}</h2>
                    </div>
                    <button className="subject-modal-close" onClick={onClose}>
                        <X size={22} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="subject-modal-form">
                    {error && (
                        <div className="subject-modal-error">
                            {error}
                        </div>
                    )}

                    <div className="subject-form-group">
                        <label>Tên môn học <span className="required">*</span></label>
                        <input
                            type="text"
                            name="subjectName"
                            value={formData.subjectName}
                            onChange={handleChange}
                            placeholder="VD: Toán học, Vật lý, Tiếng Anh..."
                            autoFocus
                            required
                        />
                    </div>

                    <div className="subject-form-group">
                        <label>Mô tả <span className="optional">(tùy chọn)</span></label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Mô tả ngắn về môn học..."
                            rows={3}
                        />
                    </div>

                    <div className="subject-modal-footer">
                        <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
                            Hủy
                        </button>
                        <button type="submit" className="btn-save" disabled={loading}>
                            {loading ? 'Đang lưu...' : (editingSubject ? 'Cập nhật' : 'Thêm môn học')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

SubjectModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSuccess: PropTypes.func.isRequired,
    editingSubject: PropTypes.object
};

export default SubjectModal;
