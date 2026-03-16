import { useState, useEffect } from 'react';
import { X, User, BookOpen, Users, ChevronDown, ChevronUp, Search } from 'lucide-react';
import PropTypes from 'prop-types';
import '../css/components/CreateClassModal.css';
import '../css/components/AddParentModal.css';

const AddStudentModal = ({ isOpen, onClose, onSubmit, editingStudent, existingStudents = [], parentList = [] }) => {
    const [formData, setFormData] = useState({
        name: '',
        avatar: null,
        email: '',
        grade: '',
        dateOfBirth: '',
        gender: 'male',
        address: '',
        enrollmentDate: new Date().toISOString().split('T')[0],
        status: 'active',
        notes: '',
        // Parent linking
        linkedParentIds: [],
        // Account tracking
        accountSent: false
    });

    const [errors, setErrors] = useState({});
    const [showParentSection, setShowParentSection] = useState(false);
    const [parentSearch, setParentSearch] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (editingStudent) {
                setFormData({
                    ...editingStudent,
                    avatar: editingStudent.avatar || null,
                    dateOfBirth: editingStudent.dateOfBirth || '',
                    enrollmentDate: editingStudent.enrollmentDate || new Date().toISOString().split('T')[0],
                    status: editingStudent.status || 'active',
                    accountSent: editingStudent.accountSent || false,
                    linkedParentIds: editingStudent.linkedParentIds || []
                });
                // Expand parent section if editing student has linked parents
                setShowParentSection(!!(editingStudent.linkedParentIds && editingStudent.linkedParentIds.length > 0));
            } else {
                setFormData({
                    name: '',
                    avatar: null,
                    email: '',
                    grade: '',
                    dateOfBirth: '',
                    gender: 'male',
                    address: '',
                    enrollmentDate: new Date().toISOString().split('T')[0],
                    status: 'active',
                    notes: '',
                    linkedParentIds: [],
                    accountSent: false
                });
                setShowParentSection(false);
            }
            setErrors({});
            setParentSearch('');
        }
    }, [editingStudent, isOpen]);

    /* ─── Validators ─── */
    const validateName = (name) => {
        if (!name || name.trim().length < 3) return 'Tên phải có ít nhất 3 ký tự';
        const nameRegex = /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵýỷỹ\s]+$/;
        if (!nameRegex.test(name)) return 'Tên chỉ chứa chữ cái và khoảng trắng';
        return '';
    };

    const validateEmail = (email) => {
        if (!email) return '';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) return 'Email không hợp lệ';
        // Kiểm tra trùng email trong danh sách học sinh hiện có
        const isDuplicate = existingStudents.some(s => {
            // Nếu đang chỉnh sửa, bỏ qua học sinh hiện tại
            if (editingStudent && s.id === editingStudent.id) return false;
            return s.email?.toLowerCase() === email.toLowerCase();
        });
        if (isDuplicate) return 'Email này đã được sử dụng bởi học sinh khác';
        return '';
    };

    const validatePhone = (phone) => {
        if (!phone) return '';
        const phoneRegex = /^(0[0-9]{9,10})$/;
        if (!phoneRegex.test(phone)) return 'Số điện thoại không hợp lệ (10-11 số, bắt đầu bằng 0)';
        return '';
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Validate email realtime khi user đang nhập
        if (name === 'email') {
            const emailErr = validateEmail(value);
            setErrors(prev => ({ ...prev, email: emailErr }));
        } else if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        if (name === 'email') {
            setErrors(prev => ({ ...prev, email: validateEmail(value) }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const newErrors = {
            name: validateName(formData.name),
            email: validateEmail(formData.email),
            grade: !formData.grade ? 'Vui lòng chọn khối' : ''
        };

        Object.keys(newErrors).forEach(key => {
            if (!newErrors[key]) delete newErrors[key];
        });

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            // Auto-expand parent section if there are parent errors
            if (newErrors.parentName || newErrors.parentPhone || newErrors.parentEmail) {
                setShowParentSection(true);
            }
            return;
        }

        const submitData = editingStudent
            ? { ...formData, id: editingStudent.id }
            : { ...formData };
        onSubmit(submitData);
        onClose();
    };

    if (!isOpen) return null;

    const title = editingStudent ? 'Chỉnh Sửa Thông Tin Học Sinh' : 'Thêm Học Sinh Mới';
    const hasParentInfo = formData.linkedParentIds && formData.linkedParentIds.length > 0;

    const filteredParents = parentList.filter(p =>
        p.name.toLowerCase().includes(parentSearch.toLowerCase()) ||
        p.id?.toLowerCase().includes(parentSearch.toLowerCase()) ||
        p.phone?.includes(parentSearch)
    );

    const toggleParent = (id) => {
        setFormData(prev => ({
            ...prev,
            linkedParentIds: prev.linkedParentIds.includes(id)
                ? prev.linkedParentIds.filter(x => x !== id)
                : [...prev.linkedParentIds, id]
        }));
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button className="modal-close" onClick={onClose}><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">

                    {/* ── Thông Tin Cá Nhân ── */}
                    <div className="form-section-title">
                        <User size={16} style={{ marginRight: 6 }} />
                        Thông Tin Cá Nhân
                    </div>

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

                    <div className="form-group">
                        <label>Email học sinh <span style={{ color: '#94a3b8', fontWeight: 400 }}>(tuỳ chọn — dùng để gửi tài khoản)</span></label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder="student@example.com"
                            className={errors.email ? 'input-error' : ''}
                        />
                        {errors.email && <span className="error-message">{errors.email}</span>}
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

                    {/* ── Thông Tin Học Tập ── */}
                    <div className="form-section-title">
                        <BookOpen size={16} style={{ marginRight: 6 }} />
                        Thông Tin Học Tập
                    </div>

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
                            <label>Ngày nhập học</label>
                            <input
                                type="date"
                                name="enrollmentDate"
                                value={formData.enrollmentDate}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Trạng thái</label>
                        <select name="status" value={formData.status} onChange={handleChange}>
                            <option value="active">Hoạt động</option>
                            <option value="inactive">Không hoạt động</option>
                        </select>
                    </div>

                    {/* ── Thông Tin Phụ Huynh (Optional, collapsible) ── */}
                    <button
                        type="button"
                        className="form-section-title"
                        onClick={() => setShowParentSection(p => !p)}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'none',
                            border: 'none',
                            padding: '10px 0 8px',
                            cursor: 'pointer',
                            fontSize: 'inherit',
                            fontFamily: 'inherit',
                            color: 'inherit',
                            textAlign: 'left'
                        }}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Users size={16} />
                            Thông Tin Phụ Huynh
                            <span style={{
                                fontSize: '0.75rem',
                                color: '#94a3b8',
                                fontWeight: 400,
                                marginLeft: 4
                            }}>
                                (tuỳ chọn{hasParentInfo ? ' — đã có thông tin' : ''})
                            </span>
                        </span>
                        {showParentSection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {showParentSection && (
                        <div style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                            <div className="form-group">
                                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                                    <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                                    <input
                                        type="text"
                                        value={parentSearch}
                                        onChange={e => setParentSearch(e.target.value)}
                                        placeholder="Tìm phụ huynh theo tên, SĐT hoặc ID..."
                                        style={{ paddingLeft: '2.2rem' }}
                                    />
                                </div>
                            </div>

                            <div className="student-link-list">
                                {filteredParents.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem', padding: '1rem 0' }}>
                                        Không tìm thấy phụ huynh
                                    </p>
                                ) : (
                                    filteredParents.map(p => {
                                        const checked = formData.linkedParentIds.includes(p.id);
                                        return (
                                            <label key={p.id} className={`student-link-item ${checked ? 'checked' : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleParent(p.id)}
                                                />
                                                <div className="student-link-avatar" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                                                    {p.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.name}</div>
                                                    <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                                                        {p.id} · {p.phone}
                                                    </div>
                                                </div>
                                            </label>
                                        );
                                    })
                                )}
                            </div>
                            {formData.linkedParentIds.length > 0 && (
                                <p style={{ fontSize: '0.8rem', color: '#3b82f6', textAlign: 'right', margin: '4px 0 0' }}>
                                    Đã chọn {formData.linkedParentIds.length} phụ huynh
                                </p>
                            )}
                        </div>
                    )}

                    {/* ── Ghi chú ── */}
                    <div className="form-group" style={{ marginTop: 8 }}>
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
    existingStudents: PropTypes.array,
    parentList: PropTypes.array
};

export default AddStudentModal;
