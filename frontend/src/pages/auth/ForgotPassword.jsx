import { useState } from 'react';
import { ArrowLeft, BookOpen, AlertCircle, CheckCircle, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../../css/pages/auth/ForgotPassword.css';

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
        <div className="fp-bg">
            {/* Stars */}
            <div className="fp-stars" />

            {/* Scenery */}
            <div className="fp-scenery">
                <svg viewBox="0 0 1440 320" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#2d1b69" d="M0,224L60,213.3C120,203,240,181,360,181.3C480,181,600,203,720,213.3C840,224,960,224,1080,208C1200,192,1320,160,1380,144L1440,128L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z" />
                    <path fill="#1a0f3d" d="M0,288L80,272C160,256,320,224,480,218.7C640,213,800,235,960,240C1120,245,1280,235,1360,229.3L1440,224L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z" />
                    {[30, 80, 140, 220, 310, 420, 530, 650, 780, 900, 1020, 1140, 1260, 1350, 1410].map((x, i) => (
                        <polygon key={i} fill="#0f0926" points={`${x},${270 - (i % 3) * 20} ${x - 18},300 ${x + 18},300`} />
                    ))}
                </svg>
            </div>

            {/* Card */}
            <div className="fp-card">
                <h1 className="fp-title">Quên mật khẩu?</h1>

                {!submitted ? (
                    <>
                        <p className="fp-subtitle">
                            Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu của bạn.
                        </p>
                        <form onSubmit={handleSubmit} className="fp-form">
                            <div className="fp-input-wrap">
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Địa chỉ Email"
                                    className="fp-input"
                                    required
                                />
                                <Mail size={18} className="fp-input-icon" />
                            </div>

                            {error && (
                                <div className="fp-error">
                                    <AlertCircle size={16} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <button type="submit" className="fp-submit">
                                Gửi liên kết đặt lại
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="fp-success">
                        <div className="fp-success-icon">
                            <CheckCircle size={32} />
                        </div>
                        <h3 style={{ color: 'white', marginBottom: '0.5rem', fontWeight: '700' }}>Kiểm tra email</h3>
                        <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
                            Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến <strong>{email}</strong>
                        </p>

                        <Link to="/reset-password" style={{
                            textDecoration: 'none',
                            background: 'white',
                            color: '#4c1d95',
                            padding: '0.875rem',
                            borderRadius: '99px',
                            display: 'block',
                            fontWeight: '700',
                            marginBottom: '1rem'
                        }}>
                            Đi đến trang đặt lại
                        </Link>
                    </div>
                )}

                <div className="fp-footer">
                    <Link to="/login">
                        <ArrowLeft size={16} /> Quay lại Đăng nhập
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
