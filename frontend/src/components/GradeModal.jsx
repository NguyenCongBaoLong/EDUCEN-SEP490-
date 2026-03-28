import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import PropTypes from 'prop-types';
import api from '../services/api';
import toast from 'react-hot-toast';
import '../css/components/CreateClassModal.css';

const GradeModal = ({ isOpen, onClose, onSuccess, editingGrade }) => {
    const [formData, setFormData] = useState({
        gradeName: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (editingGrade) {
            setFormData({
                gradeName: editingGrade.gradeName || ''
            });
        } else {
            setFormData({
                gradeName: ''
            });
        }
    }, [editingGrade, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (editingGrade) {
                await api.put(`/Grades/${editingGrade.gradeId}`, formData);
                toast.success('Cập nhật khối lớp thành công!');
            } else {
                await api.post('/Grades', formData);
                toast.success('Thêm khối lớp thành công!');
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi lưu khối lớp');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{editingGrade ? 'Chỉnh sửa khối lớp' : 'Thêm khối lớp mới'}</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group">
                        <label>Tên khối lớp *</label>
                        <input
                            type="text"
                            name="gradeName"
                            value={formData.gradeName}
                            onChange={handleChange}
                            placeholder="VD: Khối 1, Khối 2, IELTS"
                            required
                        />
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
                            Hủy
                        </button>
                        <button type="submit" className="btn-submit" disabled={loading}>
                            {loading ? 'Đang lưu...' : (editingGrade ? 'Cập nhật' : 'Thêm mới')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

GradeModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSuccess: PropTypes.func.isRequired,
    editingGrade: PropTypes.object
};

export default GradeModal;
