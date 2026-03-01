import { useState } from 'react';
import { ArrowRight, BookOpen, AlertCircle, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, getRedirectPath } from '../../context/AuthContext';
import '../../css/pages/auth/Login.css';

const Login = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        rememberMe: false,
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const user = await login(formData.username, formData.password);
            const redirectPath = getRedirectPath(user.role);
            navigate(redirectPath);
        } catch (err) {
            // Lấy message lỗi từ backend
            const data = err.response?.data;
            const message = data?.message || (typeof data === 'string' ? data : null) || 'Đã xảy ra lỗi. Vui lòng thử lại.';
            setError(message);
        } finally {
            setIsLoading(false);
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
                        {/* Username Input */}
                        <div className="form-group">
                            <label htmlFor="username">Tên đăng nhập</label>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                placeholder="Nhập tên đăng nhập"
                                className="form-input"
                                required
                                disabled={isLoading}
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
                                disabled={isLoading}
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
                        <button type="submit" className="submit-btn" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 size={18} className="spin-icon" />
                                    <span>Đang đăng nhập...</span>
                                </>
                            ) : (
                                <>
                                    <span>Đăng nhập</span>
                                    <ArrowRight size={18} />
                                </>
                            )}
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
