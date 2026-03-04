import { useState } from 'react';
import { User, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth, getRedirectPath } from '../../context/AuthContext';
import '../../css/pages/auth/Login.css';

const Login = () => {
    const [formData, setFormData] = useState({ username: '', password: '', rememberMe: false });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const user = await login(formData.username, formData.password);
            navigate(getRedirectPath(user.role));
        } catch (err) {
            const data = err.response?.data;
            const message = data?.message || (typeof data === 'string' ? data : null) || 'Tên đăng nhập hoặc mật khẩu không đúng.';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-bg">
            {/* Stars */}
            <div className="login-stars" />

            {/* Mountain / forest silhouette */}
            <div className="login-scenery">
                <svg viewBox="0 0 1440 320" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#2d1b69" d="M0,224L60,213.3C120,203,240,181,360,181.3C480,181,600,203,720,213.3C840,224,960,224,1080,208C1200,192,1320,160,1380,144L1440,128L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z" />
                    <path fill="#1a0f3d" d="M0,288L80,272C160,256,320,224,480,218.7C640,213,800,235,960,240C1120,245,1280,235,1360,229.3L1440,224L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z" />
                    {/* Trees */}
                    {[30, 80, 140, 220, 310, 420, 530, 650, 780, 900, 1020, 1140, 1260, 1350, 1410].map((x, i) => (
                        <polygon key={i} fill="#0f0926" points={`${x},${270 - (i % 3) * 20} ${x - 18},300 ${x + 18},300`} />
                    ))}
                </svg>
            </div>

            {/* Glassmorphism card */}
            <div className="login-card">
                <h1 className="login-card-title">Đăng Nhập</h1>

                <form onSubmit={handleSubmit} className="login-card-form">
                    <div className="lc-input-wrap">
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="Tên đăng nhập"
                            required
                            disabled={isLoading}
                            className="lc-input"
                        />
                        <User size={18} className="lc-input-icon" />
                    </div>

                    <div className="lc-input-wrap">
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Mật khẩu"
                            required
                            disabled={isLoading}
                            className="lc-input"
                        />
                        <Lock size={18} className="lc-input-icon" />
                    </div>

                    {error && (
                        <div className="lc-error">
                            <AlertCircle size={14} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="lc-options">
                        <label className="lc-remember">
                            <input type="checkbox" name="rememberMe" checked={formData.rememberMe} onChange={handleChange} />
                            <span>Ghi nhớ tôi</span>
                        </label>
                        <a href="/forgot-password" className="lc-forgot">Quên mật khẩu?</a>
                    </div>

                    <button type="submit" className="lc-submit" disabled={isLoading}>
                        {isLoading ? <><Loader2 size={18} className="spin-icon" /> Đang đăng nhập...</> : 'Đăng nhập'}
                    </button>
                </form>
                <div className="lc-footer">
                    <p>
                        <a href="/center">← Quay lại trang trung tâm</a>
                    </p>
                </div>


            </div>
        </div>
    );
};

export default Login;
