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
const AddStaffModal = ({ isOpen, onClose, onSubmit, editingStaff, existingStaff = [], allUsers = [] }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        role: 'teacher',
        status: 'active',
        address: ''
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (editingStaff) {
            setFormData({
                name: editingStaff.name || '',
                email: editingStaff.email || '',
                phone: editingStaff.phone || '',
                role: editingStaff.role || 'teacher',
                status: editingStaff.status || 'active',
                address: editingStaff.address || ''
            });
        } else {
            setFormData({
                name: '', email: '', phone: '', role: 'teacher', status: 'active', address: ''
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

    const validatePhone = (phone, allUsersList = []) => {
        if (!phone || phone.trim() === '') return ''; // optional
        if (!/^(0[0-9]{9,10})$/.test(phone)) return 'Số điện thoại không hợp lệ (10-11 số, bắt đầu bằng 0)';
        // Validate uniqueness within SAME ROLE only (Teacher / Assistant)
        const currentRoleName = formData.role === 'assistant' ? 'assistant' : 'teacher';
        const isDuplicate = allUsersList.some(user => {
            if (!user.roleName || !user.roleName.toLowerCase().includes(currentRoleName)) return false;
            if (editingStaff && user.userId && user.userId.toString() === editingStaff.id) return false;
            return user.phoneNumber && user.phoneNumber === phone.trim();
        });
        if (isDuplicate) return `Số điện thoại này đã được sử dụng bởi nhân viên khác cùng vai trò`;
        return '';
    };

    const validateEmail = (email, allUsersList = []) => {
        if (!email || email.trim() === '') return 'Email là bắt buộc';
        
        // Check if it's a valid email format first
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            // More specific error messages
            if (!email.includes('@')) {
                return 'Email phải chứa ký tự @ (vd: staff@example.com)';
            }
            if (!email.includes('.')) {
                return 'Email phải chứa tên miền (vd: staff@example.com)';
            }
            return 'Email không hợp lệ (vd: staff@example.com)';
        }
        
        // Check duplicate email across ALL users (teachers, students, parents, admins)
        const isDuplicate = allUsersList.some(user => {
            // Skip current user if editing
            if (editingStaff && user.userId && user.userId.toString() === editingStaff.id) {
                return false;
            }
            return user.email && user.email.toLowerCase() === email.toLowerCase();
        });
        
        if (isDuplicate) return 'Email này đã được sử dụng bởi người dùng khác trong hệ thống';
        return '';
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === 'email') {
            const emailErr = validateEmail(value, allUsers);
            setErrors(prev => ({ ...prev, email: emailErr }));
        } else if (name === 'phone') {
            const phoneErr = validatePhone(value, allUsers);
            setErrors(prev => ({ ...prev, phone: phoneErr }));
        } else if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        if (name === 'email') {
            setErrors(prev => ({ ...prev, email: validateEmail(value, allUsers) }));
        } else if (name === 'phone') {
            setErrors(prev => ({ ...prev, phone: validatePhone(value, allUsers) }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validate all fields
        const newErrors = {
            name: validateName(formData.name),
            email: validateEmail(formData.email, allUsers),
            phone: validatePhone(formData.phone, allUsers)
        };

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
                                onBlur={handleBlur}
                                placeholder="email@example.com"
                                className={errors.email ? 'input-error' : ''}
                            />
                            {errors.email && <span className="error-message">{errors.email}</span>}
                        </div>

                        <div className="form-group">
                            <label>Số điện thoại</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                placeholder="VD: 0912345678"
                                className={errors.phone ? 'input-error' : ''}
                            />
                            {errors.phone && <span className="error-message">{errors.phone}</span>}
                        </div>
                    </div>

                    <div className="form-row">
                        {!editingStaff && (
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
                        )}

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
                    </div>

                    <div className="form-group">
                        <label>Địa chỉ</label>
                        <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            placeholder="Địa chỉ thường trú"
                        />
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
    existingStaff: PropTypes.array,
    errors: PropTypes.object,
    setErrors: PropTypes.func
};

export default AddStaffModal;
