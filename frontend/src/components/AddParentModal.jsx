import { useState, useEffect } from 'react';
import { X, User, Phone, Mail, MapPin, Users, Search } from 'lucide-react';
import PropTypes from 'prop-types';
import '../css/components/CreateClassModal.css';
import '../css/components/AddParentModal.css';

const AddParentModal = ({ isOpen, onClose, onSubmit, editingParent, studentList = [], existingParents = [], allUsers = [], errors = {}, setErrors }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        gender: 'male',
        address: '',
        linkedStudentIds: []
    });
    const [studentSearch, setStudentSearch] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (editingParent) {
                setFormData({
                    name: editingParent.name || '',
                    email: editingParent.email || '',
                    phone: editingParent.phone || '',
                    gender: editingParent.gender || 'male',
                    address: editingParent.address || '',
                    linkedStudentIds: editingParent.linkedStudentIds || []
                });
            } else {
                setFormData({ name: '', email: '', phone: '', gender: 'male', address: '', linkedStudentIds: [] });
            }
            setErrors({});
            setStudentSearch('');
        }
    }, [editingParent, isOpen]);

    const validateName = (val) => {
        if (!val || val.trim().length < 3) return 'Tên phải có ít nhất 3 ký tự';
        return '';
    };
    const validateEmail = (val, allUsersList = []) => {
        if (!val || val.trim() === '') return 'Email là bắt buộc';

        // Check if it's a valid email format first
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(val)) {
            // More specific error messages
            if (!val.includes('@')) {
                return 'Email phải chứa ký tự @ (vd: parent@example.com)';
            }
            if (!val.includes('.')) {
                return 'Email phải chứa tên miền (vd: parent@example.com)';
            }
            return 'Email không hợp lệ (vd: parent@example.com)';
        }

        // Check duplicate email across ALL users (teachers, students, parents, admins)
        const isDuplicate = allUsersList.some(user => {
            // Skip current user if editing
            if (editingParent && user.userId && user.userId.toString() === editingParent.id) {
                return false;
            }
            return user.email && user.email.toLowerCase() === val.toLowerCase();
        });

        if (isDuplicate) return 'Email này đã được sử dụng bởi người dùng khác trong hệ thống';
        return '';
    };
    const validatePhone = (val, allUsersList = []) => {
        if (!val || val.trim() === '') return 'Số điện thoại bắt buộc';
        if (!/^(0[0-9]{9})$/.test(val)) return 'Số điện thoại phải có đúng 10 chữ số (bắt đầu bằng 0)';
        // Validate uniqueness within SAME ROLE only (Parent)
        const isDuplicate = allUsersList.some(user => {
            if (!user.roleName || !user.roleName.toLowerCase().includes('parent')) return false;
            if (editingParent && user.userId && user.userId.toString() === editingParent.id) return false;
            return user.phoneNumber && user.phoneNumber === val.trim();
        });
        if (isDuplicate) return 'Số điện thoại này đã được sử dụng bởi phụ huynh khác trong hệ thống';
        return '';
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(p => ({ ...p, [name]: value }));
        if (name === 'email') {
            const emailErr = validateEmail(value, allUsers);
            setErrors(p => ({ ...p, email: emailErr }));
        } else if (name === 'phone') {
            const phoneErr = validatePhone(value, allUsers);
            setErrors(p => ({ ...p, phone: phoneErr }));
        } else if (errors[name]) {
            setErrors(p => ({ ...p, [name]: '' }));
        }
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        if (name === 'email') {
            setErrors(p => ({ ...p, email: validateEmail(value, allUsers) }));
        } else if (name === 'phone') {
            setErrors(p => ({ ...p, phone: validatePhone(value, allUsers) }));
        }
    };

    const toggleStudent = (id) => {
        setFormData(p => ({
            ...p,
            linkedStudentIds: p.linkedStudentIds.includes(id)
                ? p.linkedStudentIds.filter(x => x !== id)
                : [...p.linkedStudentIds, id]
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const errs = {
            name: validateName(formData.name),
            email: validateEmail(formData.email, allUsers),
            phone: validatePhone(formData.phone, allUsers)
        };
        Object.keys(errs).forEach(k => { if (!errs[k]) delete errs[k]; });
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }
        const data = editingParent ? { ...formData, id: editingParent.id } : formData;
        onSubmit(data);
    };

    if (!isOpen) return null;

    const filteredStudents = studentList.filter(s =>
        (s.name || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
        (s.id?.toString() || '').toLowerCase().includes(studentSearch.toLowerCase())
    );

    const title = editingParent ? 'Chỉnh Sửa Thông Tin Phụ Huynh' : 'Thêm Phụ Huynh Mới';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button className="modal-close" onClick={onClose}><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    {/* Thông Tin Cá Nhân */}
                    <div className="form-section-title">
                        <User size={16} style={{ marginRight: 6 }} />
                        Thông Tin Phụ Huynh
                    </div>

                    <div className="form-group">
                        <label>Họ và Tên *</label>
                        <input type="text" name="name" value={formData.name}
                            onChange={handleChange} placeholder="VD: Nguyễn Văn Ba"
                            className={errors.name ? 'input-error' : ''} />
                        {errors.name && <span className="error-message">{errors.name}</span>}
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label><Mail size={13} style={{ marginRight: 4 }} />Email *</label>
                            <input type="email" name="email" value={formData.email}
                                onChange={handleChange} onBlur={handleBlur} placeholder="parent@example.com"
                                className={errors.email ? 'input-error' : ''} />
                            {errors.email && <span className="error-message">{errors.email}</span>}
                        </div>
                        <div className="form-group">
                            <label><Phone size={13} style={{ marginRight: 4 }} />Số Điện Thoại *</label>
                            <input type="tel" name="phone" value={formData.phone}
                                onChange={handleChange} placeholder="0912345678"
                                className={errors.phone ? 'input-error' : ''} />
                            {errors.phone && <span className="error-message">{errors.phone}</span>}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Giới tính</label>
                            <select name="gender" value={formData.gender} onChange={handleChange}>
                                <option value="male">Nam</option>
                                <option value="female">Nữ</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label><MapPin size={13} style={{ marginRight: 4 }} />Địa chỉ</label>
                            <input type="text" name="address" value={formData.address}
                                onChange={handleChange} placeholder="Địa chỉ liên hệ" />
                        </div>
                    </div>

                    {/* Liên Kết Học Sinh */}
                    <div className="form-section-title">
                        <Users size={16} style={{ marginRight: 6 }} />
                        Liên Kết Học Sinh
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400, marginLeft: 6 }}>
                            (tuỳ chọn — có thể liên kết nhiều con)
                        </span>
                    </div>

                    <div className="form-group">
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                            <input
                                type="text" value={studentSearch}
                                onChange={e => setStudentSearch(e.target.value)}
                                placeholder="Tìm học sinh theo tên hoặc ID..."
                                style={{ paddingLeft: '2.2rem' }}
                            />
                        </div>
                    </div>

                    <div className="student-link-list">
                        {filteredStudents.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem', padding: '1rem 0' }}>
                                Không tìm thấy học sinh
                            </p>
                        ) : (
                            filteredStudents.map(s => {
                                const checked = formData.linkedStudentIds.includes(s.id);
                                return (
                                    <label key={s.id} className={`student-link-item ${checked ? 'checked' : ''}`}>
                                        <input type="checkbox" checked={checked}
                                            onChange={() => toggleStudent(s.id)} />
                                        <div className="student-link-avatar">
                                            {s.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.name}</div>
                                            <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                                                {s.grade ? `Khối ${s.grade}` : ''} {s.class ? `· Lớp ${s.class}` : ''}
                                            </div>
                                        </div>
                                    </label>
                                );
                            })
                        )}
                    </div>
                    {formData.linkedStudentIds.length > 0 && (
                        <p style={{ fontSize: '0.8rem', color: '#3b82f6', textAlign: 'right', margin: '-8px 0 4px' }}>
                            Đã chọn {formData.linkedStudentIds.length} học sinh
                        </p>
                    )}

                    <div className="modal-actions">
                        <button type="button" className="btn-cancel" onClick={onClose}>Hủy</button>
                        <button type="submit" className="btn-submit">
                            {editingParent ? 'Cập Nhật' : 'Thêm Phụ Huynh'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

AddParentModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired,
    editingParent: PropTypes.object,
    studentList: PropTypes.array
};

export default AddParentModal;