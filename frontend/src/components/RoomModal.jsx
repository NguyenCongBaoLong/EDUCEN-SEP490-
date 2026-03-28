import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import PropTypes from 'prop-types';
import api from '../services/api';
import toast from 'react-hot-toast';
import '../css/components/CreateClassModal.css';

const RoomModal = ({ isOpen, onClose, onSuccess, editingRoom }) => {
    const [formData, setFormData] = useState({
        roomName: '',
        status: true
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (editingRoom) {
            setFormData({
                roomName: editingRoom.roomName || '',
                status: editingRoom.status !== false
            });
        } else {
            setFormData({
                roomName: '',
                status: true
            });
        }
    }, [editingRoom, isOpen]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (editingRoom) {
                await api.put(`/Rooms/${editingRoom.roomId}`, formData);
                toast.success('Cập nhật phòng học thành công!');
            } else {
                await api.post('/Rooms', formData);
                toast.success('Thêm phòng học thành công!');
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi lưu phòng học');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{editingRoom ? 'Chỉnh sửa phòng học' : 'Thêm phòng học mới'}</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group">
                        <label>Tên phòng học *</label>
                        <input
                            type="text"
                            name="roomName"
                            value={formData.roomName}
                            onChange={handleChange}
                            placeholder="VD: Phòng 101, Lab A"
                            required
                        />
                    </div>

                    <div className="form-group checkbox-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                name="status"
                                checked={formData.status}
                                onChange={handleChange}
                            />
                            Đang hoạt động
                        </label>
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
                            Hủy
                        </button>
                        <button type="submit" className="btn-submit" disabled={loading}>
                            {loading ? 'Đang lưu...' : (editingRoom ? 'Cập nhật' : 'Thêm mới')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

RoomModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSuccess: PropTypes.func.isRequired,
    editingRoom: PropTypes.object
};

export default RoomModal;
