import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import PropTypes from 'prop-types';
import '../css/components/CreateClassModal.css';

/**
 * AddStaffModal - Admin creates/edits work-related info only
 * 
 * PERMISSION MODEL:
 * - Admin manages: Email, Role, Subject (work-related)
 * - Staff manages: Address, Date of Birth, Notes, Avatar (personal info via User Profile page)
 * - Admin can view all info in StaffDetailModal (read-only)
 */
const AddStaffModal = ({ isOpen, onClose, onSubmit, editingStaff, existingStaff = [] }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'teacher',
        subject: '',
        status: 'active'
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (editingStaff) {
            setFormData({
                name: editingStaff.name || '',
                email: editingStaff.email || '',
                role: editingStaff.role || 'teacher',
                subject: editingStaff.subject || '',
                status: editingStaff.status || 'active'
            });
        } else {
            setFormData({
                name: '', email: '', role: 'teacher', subject: '', status: 'active'
            });
        }
    }, [editingStaff, isOpen]);

    // Validation functions
    const validateName = (name) => {
        if (!name || name.trim().length < 3) {
            return 'Tên phải có ít nhất 3 ký tự';
        }
        if (!/^[a-zA-ZÀ-ỹ\s]+$/.test(name)) {
            return 'Tên chỉ được chứa chữ cái và khoảng trắng';
        }
        return '';
    };

    const validateEmail = (email) => {
        if (!email || !email.includes('@')) {
            return 'Email không hợp lệ';
        }
        // Check duplicate email (exclude current staff when editing)
        const isDuplicate = existingStaff.some(staff =>
            staff.email === email && staff.id !== editingStaff?.id
        );
        if (isDuplicate) {
            return 'Email đã được sử dụng';
        }
        return '';
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validate all fields
        const newErrors = {
            name: validateName(formData.name),
            email: validateEmail(formData.email)
        };

        // Check if there are any errors
        const hasErrors = Object.values(newErrors).some(error => error !== '');

        if (hasErrors) {
            setErrors(newErrors);
            return;
        }

        const staffData = {
            ...formData,
            id: editingStaff?.id
        };

        onSubmit(staffData);
        setErrors({});
        onClose();
    };

    if (!isOpen) return null;

    const title = editingStaff ? 'Chỉnh Sửa Thông Tin Công Việc' : 'Thêm Nhân Viên Mới';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group">
                        <label>Họ và tên *</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="VD: Nguyễn Văn An"
                            required
                            className={errors.name ? 'input-error' : ''}
                        />
                        {errors.name && <span className="error-message">{errors.name}</span>}
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Email *</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="email@example.com"
                                required
                                className={errors.email ? 'input-error' : ''}
                            />
                            {errors.email && <span className="error-message">{errors.email}</span>}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Vai trò *</label>
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                required
                            >
                                <option value="teacher">Giảng Viên</option>
                                <option value="assistant">Trợ Giảng</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Môn học *</label>
                            <select
                                name="subject"
                                value={formData.subject}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Chọn môn học</option>
                                <option value="Toán học">Toán học</option>
                                <option value="Vật lý">Vật lý</option>
                                <option value="Hóa học">Hóa học</option>
                                <option value="Sinh học">Sinh học</option>
                                <option value="Tiếng Anh">Tiếng Anh</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Trạng thái *</label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            required
                        >
                            <option value="active">Hoạt động</option>
                            <option value="inactive">Không hoạt động</option>
                        </select>
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-cancel" onClick={onClose}>
                            Hủy
                        </button>
                        <button type="submit" className="btn-submit">
                            {editingStaff ? 'Cập Nhật' : 'Thêm Mới'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

AddStaffModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired,
    editingStaff: PropTypes.object,
    existingStaff: PropTypes.array
};

export default AddStaffModal;
