import { useState } from 'react';
import { Globe, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../css/pages/auth/SystemAdminLogin.css';

const SystemAdminLogin = () => {
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { sysadminLogin } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            // Kiểm tra tên đăng nhập cố định là 'admin'
            if (formData.username !== 'admin') {
                setError('Tên đăng nhập hoặc API Key không đúng.');
                setIsLoading(false);
                return;
            }

            // Xác thực bằng cách gọi thử API Tenants với API Key nhập vào
            const response = await fetch('http://localhost:5106/api/admin/Tenants', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-KEY': formData.password // Dùng mật khẩu làm API Key
                }
            });

            if (response.ok) {
                // Cập nhật AuthContext (hàm này sẽ lo lưu localStorage và cập nhật state user)
                sysadminLogin(formData.password);
                navigate('/sysadmin/dashboard');
            } else {
                setError('Tên đăng nhập hoặc API Key không đúng.');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="syslogin-container">
            {/* Left Side — Branding */}
            <div className="syslogin-left">
                <div className="syslogin-branding">
                    <div className="syslogin-logo">
                        <Globe size={36} strokeWidth={2} />
                        <span>EduCen System</span>
                    </div>
                    <h1 className="syslogin-tagline">
                        Quản trị hệ thống<br />giáo dục toàn diện.
                    </h1>
                    <p className="syslogin-subtitle">
                        Nền tảng quản lý tập trung cho<br />
                        tất cả các trung tâm gia sư<br />
                        trong hệ thống EduCen.
                    </p>
                    <div className="syslogin-badges">
                        <span>🏢 Quản lý trung tâm</span>
                        <span>📦 Gói dịch vụ</span>
                        <span>📊 Thống kê tổng</span>
                    </div>
                </div>
            </div>

            {/* Right Side — Form */}
            <div className="syslogin-right">
                <div className="syslogin-form-wrap">
                    <div className="syslogin-form-header">
                        <h1>Đăng nhập Admin</h1>
                        <p>Dành riêng cho quản trị viên hệ thống</p>
                    </div>

                    <form onSubmit={handleSubmit} className="syslogin-form">
                        <div className="syslogin-form-group">
                            <label htmlFor="username">Tên đăng nhập</label>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                placeholder="Nhập tên đăng nhập"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div className="syslogin-form-group">
                            <label htmlFor="password">Mật khẩu</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        {error && (
                            <div className="syslogin-error">
                                <AlertCircle size={16} />
                                <span>{error}</span>
                            </div>
                        )}

                        <button type="submit" className="syslogin-btn" disabled={isLoading}>
                            {isLoading ? (
                                <><Loader2 size={18} className="spin-icon" /><span>Đang đăng nhập...</span></>
                            ) : (
                                <><span>Đăng nhập</span><ArrowRight size={18} /></>
                            )}
                        </button>
                    </form>

                    <p className="syslogin-back">
                        <Link to="/">← Về trang chủ</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SystemAdminLogin;
