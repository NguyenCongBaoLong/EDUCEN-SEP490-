import { useState } from 'react';
import { ArrowRight, BookOpen, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../../css/pages/auth/Login.css';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false,
    });
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError(''); // Clear previous error

        // TODO: Replace this with actual API call to backend
        // For now, simulate validation for testing
        const validEmail = 'admin@educen.com';
        const validPassword = 'admin123';

        if (formData.email === validEmail && formData.password === validPassword) {
            console.log('Login successful!', formData);
            // TODO: Redirect to dashboard
            alert('Đăng nhập thành công! (Chỉ để kiểm tra)');
        } else {
            // Show error message
            setError('Thông tin đăng nhập không hợp lệ. Vui lòng thử lại.');
        }
    };

    return (
        <div className="login-container">
            {/* Left Side - Branding */}
            <div className="login-left">
                <div className="login-branding">
                    <Link to="/" className="logo">
                        <BookOpen size={40} strokeWidth={2.5} />
                        <span className="logo-text-white">Hệ thống EduCen</span>
                    </Link>

                    <h1 className="tagline">
                        Tạo sức mạnh cho giáo dục<br />ở mọi nơi.
                    </h1>

                    <p className="subtitle">
                        Quản lý lịch giảng dạy, tiến độ học<br />
                        viên, và tài nguyên giáo dục của bạn<br />
                        trong một nền tảng liền mạch
                    </p>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="login-right">
                <div className="login-form-container">
                    <div className="login-header">
                        <h1>Chào mừng trở lại</h1>
                        <p>Vui lòng nhập thông tin đăng nhập của bạn</p>
                    </div>


                    <form onSubmit={handleSubmit} className="login-form">
                        {/* Email Input */}
                        <div className="form-group">
                            <label htmlFor="email">Email hoặc Tên đăng nhập</label>
                            <input
                                type="text"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="tutor@example.com"
                                className="form-input"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Mật khẩu</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className="form-input"
                                required
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="alert alert-error">
                                <AlertCircle size={16} />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Remember Me & Forgot Password */}
                        <div className="form-options">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    name="rememberMe"
                                    checked={formData.rememberMe}
                                    onChange={handleChange}
                                    className="checkbox-input"
                                />
                                <span>Ghi nhớ tôi</span>
                            </label>
                            <a href="/forgot-password" className="forgot-link">
                                Quên mật khẩu?
                            </a>
                        </div>

                        {/* Submit Button */}
                        <button type="submit" className="submit-btn">
                            <span>Đăng nhập</span>
                            <ArrowRight size={18} />
                        </button>
                    </form>

                    {/* Sign Up Link */}
                    <div className="signup-link">
                        Chưa có tài khoản?{' '}
                        <a href="/signup">Đăng ký miễn phí</a>
                    </div>


                </div>
            </div>
        </div>
    );
};

export default Login;
