import { useState } from 'react';
import { ArrowLeft, AlertCircle, Eye, EyeOff, Lock, Key, Mail, Loader2 } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import '../../css/pages/auth/ResetPassword.css';

const ResetPassword = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const [formData, setFormData] = useState({
        email: location.state?.email || '',
        resetToken: '',
        password: '',
        confirmPassword: ''
    });
    
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Mật khẩu nhập lại không khớp.');
            return;
        }

        if (formData.password.length < 6) {
            setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
            return;
        }

        setIsLoading(true);
        try {
            await api.post('/auth/reset-password/confirm', {
                email: formData.email,
                resetToken: formData.resetToken,
                newPassword: formData.password
            });
            toast.success('Mật khẩu đã được đặt lại thành công!');
            navigate('/login');
        } catch (err) {
            const msg = err.response?.data?.message || 'Mã xác thực không hợp lệ hoặc đã hết hạn.';
            setError(msg);
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="rp-bg">
            {/* Stars */}
            <div className="rp-stars" />

            {/* Scenery */}
            <div className="rp-scenery">
                <svg viewBox="0 0 1440 320" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#2d1b69" d="M0,224L60,213.3C120,203,240,181,360,181.3C480,181,600,203,720,213.3C840,224,960,224,1080,208C1200,192,1320,160,1380,144L1440,128L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z" />
                    <path fill="#1a0f3d" d="M0,288L80,272C160,256,320,224,480,218.7C640,213,800,235,960,240C1120,245,1280,235,1360,229.3L1440,224L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z" />
                    {[30, 80, 140, 220, 310, 420, 530, 650, 780, 900, 1020, 1140, 1260, 1350, 1410].map((x, i) => (
                        <polygon key={i} fill="#0f0926" points={`${x},${270 - (i % 3) * 20} ${x - 18},300 ${x + 18},300`} />
                    ))}
                </svg>
            </div>

            {/* Card */}
            <div className="rp-card">
                <h1 className="rp-title">Đặt lại mật khẩu</h1>
                <p className="rp-subtitle">
                    Tạo mật khẩu mới mạnh mẽ để bảo vệ tài khoản của bạn.
                </p>

                <form onSubmit={handleSubmit} className="rp-form">
                    <div className="rp-input-wrap">
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Địa chỉ Email"
                            className="rp-input"
                            required
                            disabled={!!location.state?.email || isLoading}
                        />
                        <Mail size={18} className="rp-input-icon" />
                    </div>

                    <div className="rp-input-wrap">
                        <input
                            type="text"
                            name="resetToken"
                            value={formData.resetToken}
                            onChange={handleChange}
                            placeholder="Mã xác thực (6 chữ số)"
                            className="rp-input"
                            required
                            disabled={isLoading}
                        />
                        <Key size={18} className="rp-input-icon" />
                    </div>

                    <div className="rp-input-wrap">
                        <input
                            type={showPassword ? "text" : "password"}
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Mật khẩu mới (6+ ký tự)"
                            className="rp-input"
                            required
                            disabled={isLoading}
                        />
                        <button
                            type="button"
                            className="rp-eye-btn"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={isLoading}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                        <Lock size={18} className="rp-input-icon" />
                    </div>

                    <div className="rp-input-wrap">
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="Xác nhận mật khẩu"
                            className="rp-input"
                            required
                            disabled={isLoading}
                        />
                        <button
                            type="button"
                            className="rp-eye-btn"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            disabled={isLoading}
                        >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                        <Lock size={18} className="rp-input-icon" />
                    </div>

                    {error && (
                        <div className="rp-error">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

<button type="submit" className="rp-submit" disabled={isLoading}>
                        {isLoading ? <><Loader2 size={18} className="rp-spin-icon" /> Đang cập nhật...</> : 'Cập nhật mật khẩu'}
                    </button>
                </form>

                <div className="rp-footer">
                    <Link to="/login">
                        <ArrowLeft size={16} /> Quay lại Đăng nhập
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
