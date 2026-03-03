import { useState } from 'react';
import { ArrowLeft, BookOpen, AlertCircle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../../css/pages/auth/Login.css';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (!email) {
            setError('Vui lòng nhập địa chỉ email.');
            return;
        }

        // Simulate API call
        console.log('Reset link sent to:', email);
        setSubmitted(true);
    };

    return (
        <div className="login-container">
            {/* Left Side - Branding (Reused) */}
            <div className="login-left">
                <div className="login-branding">
                    <Link to="/" className="logo">
                        <BookOpen size={40} strokeWidth={2.5} />
                        <span className="logo-text-white">Hệ thống EduCen</span>
                    </Link>

                    <h1 className="tagline">
                        Khôi phục quyền truy cập<br />tài khoản của bạn.
                    </h1>

                    <p className="subtitle">
                        Đừng lo lắng, chúng tôi sẽ giúp bạn lấy lại mật khẩu<br />
                        và quay trở lại quản lý lớp học ngay lập tức.
                    </p>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="login-right">
                <div className="login-form-container">
                    <div className="login-header">
                        <h1>Quên Mật Khẩu?</h1>
                        <p>Nhập địa chỉ email đã đăng ký để nhận liên kết đặt lại mật khẩu</p>
                    </div>

                    {!submitted ? (
                        <form onSubmit={handleSubmit} className="login-form">
                            <div className="form-group">
                                <label htmlFor="email">Địa chỉ Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="tutor@example.com"
                                    className="form-input"
                                    required
                                />
                            </div>

                            {error && (
                                <div className="alert alert-error">
                                    <AlertCircle size={16} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <button type="submit" className="submit-btn" style={{ justifyContent: 'center' }}>
                                Gửi liên kết đặt lại
                            </button>

                            <div className="signup-link">
                                <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                    <ArrowLeft size={16} /> Quay lại Đăng nhập
                                </Link>
                            </div>
                        </form>
                    ) : (
                        <div className="success-state" style={{ textAlign: 'center' }}>
                            <div style={{
                                background: '#DEF7EC',
                                color: '#03543F',
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 1.5rem auto'
                            }}>
                                <CheckCircle size={32} />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Kiểm tra email của bạn</h3>
                            <p style={{ color: '#6B7280', marginBottom: '2rem' }}>
                                Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến <strong>{email}</strong>
                            </p>

                            {/* For Checkpoint simulation only - normally this would be in the email */}
                            <div className="alert alert-warning" style={{ marginBottom: '2rem' }}>
                                <strong>Môi trường thử nghiệm:</strong>
                                <p>Nhấp vào bên dưới để tiếp tục đến trang đặt lại mật khẩu</p>
                            </div>

                            <Link to="/reset-password" className="submit-btn" style={{ textDecoration: 'none', marginBottom: '1rem' }}>
                                Đi đến trang Đặt lại mật khẩu
                            </Link>

                            <div className="signup-link">
                                <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                    <ArrowLeft size={16} /> Quay lại Đăng nhập
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
