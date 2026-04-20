import { useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import adminApi from '../../services/adminApi';
import '../../css/pages/auth/Signup.css';

const Signup = () => {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        centerName: '',
        taxCode: '',
        businessLicenseFile: null,
        message: ''
    });

    const [isSuccess, setIsSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    const normalizeTaxCode = (value) => (value || '').replace(/\D/g, '');
    const normalizePhone = (value) => (value || '').replace(/\D/g, '');

    const isValidTaxCode = (value) => {
        const digits = normalizeTaxCode(value);
        return digits.length === 10 || digits.length === 13;
    };

    const validateField = (name, value) => {
        switch (name) {
            case 'fullName': {
                if (!value?.trim()) return 'Vui lòng nhập họ và tên.';
                if (value.trim().length < 2) return 'Họ và tên phải có ít nhất 2 ký tự.';
                return '';
            }
            case 'email': {
                if (!value?.trim()) return 'Vui lòng nhập email.';
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value.trim())) return 'Email không đúng định dạng.';
                return '';
            }
            case 'phone': {
                if (!value?.trim()) return 'Vui lòng nhập số điện thoại.';
                const digits = normalizePhone(value);
                const isValid = /^(0\d{9}|84\d{9})$/.test(digits);
                if (!isValid) return 'Số điện thoại không hợp lệ (10 số hoặc 84 + 9 số).';
                return '';
            }
            case 'centerName': {
                if (!value?.trim()) return 'Vui lòng nhập tên trung tâm.';
                if (value.trim().length < 2) return 'Tên trung tâm phải có ít nhất 2 ký tự.';
                return '';
            }
            case 'taxCode': {
                if (!value?.trim()) return 'Vui lòng nhập mã số thuế.';
                if (!isValidTaxCode(value)) return 'Mã số thuế phải có 10 hoặc 13 chữ số.';
                return '';
            }
            case 'businessLicenseFile': {
                if (!value) return 'Vui lòng tải lên giấy phép kinh doanh.';
                const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
                if (!allowedTypes.includes(value.type)) return 'Chỉ chấp nhận file PDF, JPG hoặc PNG.';
                if (value.size > 10 * 1024 * 1024) return 'Kích thước file tối đa là 10MB.';
                return '';
            }
            case 'message': {
                if (value && value.length > 500) return 'Tin nhắn tối đa 500 ký tự.';
                return '';
            }
            default:
                return '';
        }
    };

    const validateAll = (data) => ({
        fullName: validateField('fullName', data.fullName),
        email: validateField('email', data.email),
        phone: validateField('phone', data.phone),
        centerName: validateField('centerName', data.centerName),
        taxCode: validateField('taxCode', data.taxCode),
        businessLicenseFile: validateField('businessLicenseFile', data.businessLicenseFile),
        message: validateField('message', data.message),
    });

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        const nextValue = name === 'businessLicenseFile' ? (files?.[0] || null) : value;

        setFormData((prev) => ({
            ...prev,
            [name]: nextValue,
        }));

        if (touched[name]) {
            setErrors((prev) => ({
                ...prev,
                [name]: validateField(name, nextValue),
            }));
        }
    };

    const handleBlur = (e) => {
        const { name } = e.target;
        setTouched((prev) => ({ ...prev, [name]: true }));
        setErrors((prev) => ({
            ...prev,
            [name]: validateField(name, formData[name]),
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const nextErrors = validateAll(formData);
            setErrors(nextErrors);
            setTouched({
                fullName: true,
                email: true,
                phone: true,
                centerName: true,
                taxCode: true,
                businessLicenseFile: true,
                message: true,
            });

            if (Object.values(nextErrors).some(Boolean)) {
                toast.error('Vui lòng kiểm tra lại thông tin đã nhập.');
                return;
            }

            const payload = new FormData();
            payload.append('CenterName', formData.centerName.trim());
            payload.append('ContactPerson', formData.fullName.trim());
            payload.append('Email', formData.email.trim());
            payload.append('PhoneNumber', normalizePhone(formData.phone));
            payload.append('TaxCode', normalizeTaxCode(formData.taxCode));
            payload.append('BusinessLicenseFile', formData.businessLicenseFile);
            payload.append('Message', formData.message || '');

            await adminApi.post('/registrations', payload);

            setIsSuccess(true);
            setFormData({
                fullName: '',
                email: '',
                phone: '',
                centerName: '',
                taxCode: '',
                businessLicenseFile: null,
                message: '',
            });
            setErrors({});
            setTouched({});
        } catch (error) {
            console.error('Lỗi khi gửi đăng ký:', error);
            toast.error('Có lỗi xảy ra khi gửi đăng ký. Vui lòng thử lại sau.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="signup-container">
            <div className="signup-left">
                <div className="signup-branding">
                    <Link to="/" className="logo">
                        <BookOpen size={40} strokeWidth={2.5} />
                        <span className="logo-text-white">EduCen</span>
                    </Link>

                    <h1 className="signup-tagline">
                        Mở Rộng Doanh Nghiệp<br />
                        Trung tâm Của Bạn
                    </h1>

                    <p className="signup-subtitle">
                        Nói chuyện với chuyên gia EduCen để xem hệ thống quản lý của chúng tôi có thể đơn giản hóa vận hành,
                        tăng tỷ lệ giữ chân học viên và tăng doanh thu như thế nào.
                    </p>

                    <div className="signup-trust">
                        <div className="trust-avatars">
                            <div className="avatar"></div>
                            <div className="avatar"></div>
                            <div className="avatar"></div>
                        </div>
                        <p>Được tin cậy bởi 500+ trung tâm trên toàn quốc</p>
                    </div>
                </div>
            </div>

            <div className="signup-right">
                <div className="signup-form-container">
                    {isSuccess ? (
                        <div className="signup-success-message" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '3rem 1rem', gap: '1.5rem' }}>
                            <CheckCircle2 size={64} color="#10B981" />
                            <h2 style={{ color: '#1f2937', fontSize: '1.75rem', margin: 0 }}>Gửi yêu cầu thành công!</h2>
                            <p style={{ color: '#6b7280', lineHeight: 1.6, marginBottom: '1rem' }}>
                                Cảm ơn bạn đã quan tâm đến hệ thống EduCen. Chúng tôi đã nhận được yêu cầu của bạn và bộ phận tư vấn
                                sẽ liên hệ lại trong thời gian sớm nhất để hỗ trợ thiết lập hệ thống.
                            </p>
                            <button className="submit-btn" onClick={() => { window.location.href = '/'; }}>
                                <span>Về trang chủ chính</span>
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="signup-header">
                                <h1>Yêu cầu tư vấn</h1>
                                <p>Điền vào form bên dưới và chúng tôi sẽ liên hệ sớm</p>
                            </div>

                            <form onSubmit={handleSubmit} className="signup-form">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="fullName">Họ và tên</label>
                                        <input
                                            type="text"
                                            id="fullName"
                                            name="fullName"
                                            value={formData.fullName}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            placeholder="Nguyễn Văn A"
                                            className="form-input"
                                            required
                                        />
                                        {touched.fullName && errors.fullName && <small style={{ color: '#dc2626' }}>{errors.fullName}</small>}
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="email">Email công việc</label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            placeholder="email@congty.com"
                                            className="form-input"
                                            required
                                        />
                                        {touched.email && errors.email && <small style={{ color: '#dc2626' }}>{errors.email}</small>}
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="phone">Số điện thoại</label>
                                        <input
                                            type="tel"
                                            id="phone"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            placeholder="+84 (555) 000-0000"
                                            className="form-input"
                                            required
                                        />
                                        {touched.phone && errors.phone && <small style={{ color: '#dc2626' }}>{errors.phone}</small>}
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="centerName">Tên trung tâm gia sư</label>
                                        <input
                                            type="text"
                                            id="centerName"
                                            name="centerName"
                                            value={formData.centerName}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            placeholder="VD: Elite Academy"
                                            className="form-input"
                                            required
                                        />
                                        {touched.centerName && errors.centerName && <small style={{ color: '#dc2626' }}>{errors.centerName}</small>}
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="taxCode">Mã số thuế</label>
                                        <input
                                            type="text"
                                            id="taxCode"
                                            name="taxCode"
                                            value={formData.taxCode}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            placeholder="Nhập mã số thuế"
                                            className="form-input"
                                            required
                                        />
                                        {touched.taxCode && errors.taxCode && <small style={{ color: '#dc2626' }}>{errors.taxCode}</small>}
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="businessLicenseFile">Giấy phép kinh doanh</label>
                                        <input
                                            type="file"
                                            id="businessLicenseFile"
                                            name="businessLicenseFile"
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            className="form-input"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            required
                                        />
                                        {touched.businessLicenseFile && errors.businessLicenseFile && <small style={{ color: '#dc2626' }}>{errors.businessLicenseFile}</small>}
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="message">Tin nhắn/Yêu cầu</label>
                                    <textarea
                                        id="message"
                                        name="message"
                                        value={formData.message}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        placeholder="Cho chúng tôi biết về yêu cầu của bạn..."
                                        className="form-textarea"
                                        rows="4"
                                    />
                                    {touched.message && errors.message && <small style={{ color: '#dc2626' }}>{errors.message}</small>}
                                </div>

                                <button type="submit" className="submit-btn" disabled={isSubmitting}>
                                    <span>{isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}</span>
                                    <ArrowRight size={18} />
                                </button>

                                <div className="form-footer">
                                    Bằng việc nhấn "Gửi yêu cầu", bạn đồng ý với{' '}
                                    <a href="/#privacy">Chính sách bảo mật</a> và{' '}
                                    <a href="/#terms">Điều khoản dịch vụ</a>
                                </div>
                            </form>
                        </>
                    )}

                    <div className="login-link">
                        Đã có tài khoản?{' '}
                        <Link to="/login">Đăng nhập ngay</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Signup;
