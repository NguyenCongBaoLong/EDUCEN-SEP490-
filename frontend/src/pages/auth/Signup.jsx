import { useState } from 'react';
import { ArrowRight, BookOpen, Mail, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../../css/pages/auth/Signup.css';

const Signup = () => {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        centerName: '',
        message: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Form submitted:', formData);
        // TODO: Send to backend API
        alert('Cảm ơn bạn đã đăng ký! Chúng tôi sẽ liên hệ sớm.');
        // Reset form
        setFormData({
            fullName: '',
            email: '',
            phone: '',
            centerName: '',
            message: ''
        });
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
                        Gia Sư Của Bạn
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
                        <button type="submit" className="submit-btn">
                            <span>Gửi yêu cầu</span>
                            <ArrowRight size={18} />
                        </button>

                        <div className="form-footer">
                            Bằng việc nhấn "Gửi yêu cầu", bạn đồng ý với{' '}
                            <a href="/#privacy">Chính sách bảo mật</a> và{' '}
                            <a href="/#terms">Điều khoản dịch vụ</a>
                        </div>
                    </form>

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
