import { useState } from 'react';
import { ArrowRight, BookOpen, Mail, Phone, MapPin, CheckCircle2 } from 'lucide-react';
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

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'businessLicenseFile' ? (files?.[0] || null) : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (!formData.businessLicenseFile) {
                toast.error('Vui lòng tải lên giấy phép kinh doanh.');
                return;
            }

            const payload = new FormData();
            payload.append('CenterName', formData.centerName);
            payload.append('ContactPerson', formData.fullName);
            payload.append('Email', formData.email);
            payload.append('PhoneNumber', formData.phone);
            payload.append('TaxCode', formData.taxCode);
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
                message: ''
            });
        } catch (error) {
            console.error('Lỗi khi gửi đăng ký:', error);
            toast.error('Có lỗi xảy ra khi gửi đăng ký. Vui lòng thử lại sau.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="signup-container">
            {/* Left Side - Branding */}
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
                        Nói chuyện với chuyên gia EduCen để xem hệ thống quản lý của chúng tôi có thể đơn giản hóa vận hành, tăng tỷ lệ giữ chân học viên và tăng doanh thu như thế nào.
                    </p>

                    {/* Contact Info Cards */}
                    {/* <div className="contact-info">
                        <div className="contact-card">
                            <div className="contact-icon">
                                <Mail size={20} />
                            </div>
                            <div className="contact-details">
                                <div className="contact-label">EMAIL</div>
                                <div className="contact-value">sales@educen.com</div>
                            </div>
                        </div>

                        <div className="contact-card">
                            <div className="contact-icon">
                                <Phone size={20} />
                            </div>
                            <div className="contact-details">
                                <div className="contact-label">LIÊN HỆ</div>
                                <div className="contact-value">+84 (888) 000-1234</div>
                            </div>
                        </div>

                        <div className="contact-card">
                            <div className="contact-icon">
                                <MapPin size={20} />
                            </div>
                            <div className="contact-details">
                                <div className="contact-label">TRỤ SỞ</div>
                                <div className="contact-value">123 Tech Plaza, TP. HCM</div>
                            </div>
                        </div>
                    </div> */}

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

            {/* Right Side - Signup Form */}
            <div className="signup-right">
                <div className="signup-form-container">
                    {isSuccess ? (
                        <div className="signup-success-message" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '3rem 1rem', gap: '1.5rem' }}>
                            <CheckCircle2 size={64} color="#10B981" />
                            <h2 style={{ color: '#1f2937', fontSize: '1.75rem', margin: 0 }}>Gửi yêu cầu thành công!</h2>
                            <p style={{ color: '#6b7280', lineHeight: 1.6, marginBottom: '1rem' }}>
                                Cảm ơn bạn đã quan tâm đến hệ thống EduCen. Chúng tôi đã nhận được yêu cầu của bạn và Bộ phận tư vấn của chúng tôi sẽ liên hệ lại với bạn trong thời gian sớm nhất để tư vấn và hỗ trợ thiết lập hệ thống.
                            </p>
                            <button className="submit-btn" onClick={() => window.location.href = '/'}>
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
                                            placeholder="Nguyễn Văn A"
                                            className="form-input"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="email">Email công việc</label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="email@congty.com"
                                            className="form-input"
                                            required
                                        />
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
                                            placeholder="+84 (555) 000-0000"
                                            className="form-input"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="centerName">Tên trung tâm gia sư</label>
                                        <input
                                            type="text"
                                            id="centerName"
                                            name="centerName"
                                            value={formData.centerName}
                                            onChange={handleChange}
                                            placeholder="VD: Elite Academy"
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="taxCode">Ma so thue</label>
                                        <input
                                            type="text"
                                            id="taxCode"
                                            name="taxCode"
                                            value={formData.taxCode}
                                            onChange={handleChange}
                                            placeholder="Nhap ma so thue"
                                            className="form-input"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="businessLicenseFile">Giay phep kinh doanh</label>
                                        <input
                                            type="file"
                                            id="businessLicenseFile"
                                            name="businessLicenseFile"
                                            onChange={handleChange}
                                            className="form-input"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            required
                                        />
                                    </div>
                                </div>


                                <div className="form-group">
                                    <label htmlFor="message">Tin nhắn/Yêu cầu</label>
                                    <textarea
                                        id="message"
                                        name="message"
                                        value={formData.message}
                                        onChange={handleChange}
                                        placeholder="Cho chúng tôi biết về yêu cầu của bạn..."
                                        className="form-textarea"
                                        rows="4"
                                    />
                                </div>

                                {/* Submit Button */}
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

                    {/* Login Link */}
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

