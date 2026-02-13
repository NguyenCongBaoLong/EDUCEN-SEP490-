import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import PropTypes from 'prop-types';
import '../css/components/CreateClassModal.css';

const AddStudentModal = ({ isOpen, onClose, onSubmit, editingStudent, existingStudents = [] }) => {
    const [formData, setFormData] = useState({
        name: '',
        avatar: null, // New field for avatar
        grade: '',
        class: '',
        dateOfBirth: '',
        gender: 'male',
        parentName: '',
        parentPhone: '',
        parentEmail: '',
        address: '',
        enrollmentDate: new Date().toISOString().split('T')[0],
        status: 'active',
        notes: ''
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isOpen) {
            if (editingStudent) {
                setFormData({
                    ...editingStudent,
                    avatar: editingStudent.avatar || null,
                    dateOfBirth: editingStudent.dateOfBirth || '',
                    enrollmentDate: editingStudent.enrollmentDate || new Date().toISOString().split('T')[0],
                    status: editingStudent.status || 'active'
                });
            } else {
                setFormData({
                    name: '',
                    avatar: null,
                    grade: '',
                    class: '',
                    dateOfBirth: '',
                    gender: 'male',
                    parentName: '',
                    parentPhone: '',
                    parentEmail: '',
                    address: '',
                    enrollmentDate: new Date().toISOString().split('T')[0],
                    status: 'active',
                    notes: ''
                });
            }
            setErrors({});
        }
    }, [editingStudent, isOpen]);

    const validateName = (name) => {
        if (!name || name.trim().length < 3) return 'Tên phải có ít nhất 3 ký tự';
        const nameRegex = /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵýỷỹ\s]+$/;
        if (!nameRegex.test(name)) return 'Tên chỉ chứa chữ cái và khoảng trắng';
        return '';
    };

    const validatePhone = (phone) => {
        const phoneRegex = /^(0[0-9]{9,10})$/;
        if (!phone || !phoneRegex.test(phone)) return 'Số điện thoại không hợp lệ (10-11 số, bắt đầu bằng 0)';
        return '';
    };

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && !emailRegex.test(email)) return 'Email không hợp lệ';
        return '';
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const newErrors = {
            name: validateName(formData.name),
            parentName: validateName(formData.parentName),
            parentPhone: validatePhone(formData.parentPhone),
            parentEmail: validateEmail(formData.parentEmail),
            grade: !formData.grade ? 'Vui lòng chọn khối' : '',
            class: !formData.class ? 'Vui lòng chọn lớp' : ''
        };

        Object.keys(newErrors).forEach(key => {
            if (!newErrors[key]) delete newErrors[key];
        });

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        const submitData = editingStudent ? { ...formData, id: editingStudent.id } : formData;
        onSubmit(submitData);
        onClose();
    };

    if (!isOpen) return null;

    const title = editingStudent ? 'Chỉnh Sửa Thông Tin Học Sinh' : 'Thêm Học Sinh Mới';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button className="modal-close" onClick={onClose}><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    {/* Student Info Section */}
                    <div className="form-section-title">Thông Tin Cá Nhân</div>

                    <div className="form-group">
                        <label>Họ và Tên *</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="VD: Nguyễn Văn An"
                            className={errors.name ? 'input-error' : ''}
                        />
                        {errors.name && <span className="error-message">{errors.name}</span>}
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Ngày sinh</label>
                            <input
                                type="date"
                                name="dateOfBirth"
                                value={formData.dateOfBirth}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>Giới tính</label>
                            <select name="gender" value={formData.gender} onChange={handleChange}>
                                <option value="male">Nam</option>
                                <option value="female">Nữ</option>
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

                    {/* Academic Info Section */}
                    <div className="form-section-title">Thông Tin Học Tập</div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Khối *</label>
                            <select
                                name="grade"
                                value={formData.grade}
                                onChange={handleChange}
                                className={errors.grade ? 'input-error' : ''}
                            >
                                <option value="">Chọn khối</option>
                                {[6, 7, 8, 9, 10, 11, 12].map(g => (
                                    <option key={g} value={g}>Khối {g}</option>
                                ))}
                            </select>
                            {errors.grade && <span className="error-message">{errors.grade}</span>}
                        </div>
                        <div className="form-group">
                            <label>Lớp *</label>
                            <input
                                type="text"
                                name="class"
                                value={formData.class}
                                onChange={handleChange}
                                placeholder="VD: 6A"
                                className={errors.class ? 'input-error' : ''}
                            />
                            {errors.class && <span className="error-message">{errors.class}</span>}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Ngày nhập học</label>
                            <input
                                type="date"
                                name="enrollmentDate"
                                value={formData.enrollmentDate}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>Trạng thái</label>
                            <select name="status" value={formData.status} onChange={handleChange}>
                                <option value="active">Hoạt động</option>
                                <option value="inactive">Không hoạt động</option>
                            </select>
                        </div>
                    </div>

                    {/* Parent Info Section */}
                    <div className="form-section-title">Thông Tin Phụ Huynh</div>

                    <div className="form-group">
                        <label>Họ Tên Phụ Huynh *</label>
                        <input
                            type="text"
                            name="parentName"
                            value={formData.parentName}
                            onChange={handleChange}
                            placeholder="VD: Nguyễn Văn Ba"
                            className={errors.parentName ? 'input-error' : ''}
                        />
                        {errors.parentName && <span className="error-message">{errors.parentName}</span>}
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Số Điện Thoại *</label>
                            <input
                                type="tel"
                                name="parentPhone"
                                value={formData.parentPhone}
                                onChange={handleChange}
                                placeholder="0912345678"
                                className={errors.parentPhone ? 'input-error' : ''}
                            />
                            {errors.parentPhone && <span className="error-message">{errors.parentPhone}</span>}
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                name="parentEmail"
                                value={formData.parentEmail}
                                onChange={handleChange}
                                placeholder="parent@example.com"
                                className={errors.parentEmail ? 'input-error' : ''}
                            />
                            {errors.parentEmail && <span className="error-message">{errors.parentEmail}</span>}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Ghi chú</label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows="2"
                            placeholder="Ghi chú thêm về học sinh..."
                        />
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-cancel" onClick={onClose}>
                            Hủy
                        </button>
                        <button type="submit" className="btn-submit">
                            {editingStudent ? 'Cập Nhật' : 'Thêm Mới'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

AddStudentModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired,
    editingStudent: PropTypes.object,
    existingStudents: PropTypes.array
};

export default AddStudentModal;
