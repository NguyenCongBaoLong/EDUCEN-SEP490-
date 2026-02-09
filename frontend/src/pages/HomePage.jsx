import { useState, useEffect } from 'react';
import { ArrowRight, BookOpen, Users, Calendar, BarChart3, Shield, Zap, Clock, ChevronRight, GraduationCap, Settings, Bot, Phone, Check, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import DemoModal from '../components/DemoModal';
import '../css/pages/HomePage.css';

const HomePage = () => {
    const [showMegaMenu, setShowMegaMenu] = useState(false);
    const [activeCategory, setActiveCategory] = useState('management');
    const [currentSlide, setCurrentSlide] = useState(0);
    const [showDemoModal, setShowDemoModal] = useState(false);

    const slides = [
        { icon: BarChart3, title: 'Phân tích thời gian thực', color: '#0066FF', gradient: 'linear-gradient(135deg, #e0f2fe 0%, #bfdbfe 100%)' },
        { icon: Users, title: 'Quản lý học viên', color: '#10B981', gradient: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' },
        { icon: Calendar, title: 'Lên lịch thông minh', color: '#8B5CF6', gradient: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)' },
        { icon: Zap, title: 'Hỗ trợ giảng dạy', color: '#F59E0B', gradient: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' },
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [slides.length]);

    // Handle hash navigation for scrolling to sections
    useEffect(() => {
        const hash = window.location.hash;
        if (hash) {
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                const element = document.querySelector(hash);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        }
    }, []);

    const SlideIcon = slides[currentSlide].icon;

    const categories = [
        { id: 'management', icon: Users, label: 'Quản lý', color: '#8B5CF6' },
        { id: 'teaching', icon: GraduationCap, label: 'Giảng dạy', color: '#10B981' },
        { id: 'admin', icon: Settings, label: 'Quản trị', color: '#F59E0B' },
        { id: 'contact', icon: Phone, label: 'Liên lạc', color: '#06B6D4' },
    ];

    const features = {
        management: [
            { icon: Users, title: 'Quản lý tuyển sinh', desc: 'Tùy chỉnh trạng thái khách hàng, gộp & gửi thông báo tự động, tích hợp đa kênh, theo dõi lịch sử chuyển đổi, quản lý hiệu suất đội ngũ tuyển sinh.' },
            { icon: Zap, title: 'Quản lý tài chính', desc: 'Báo cáo doanh thu & chi phí tự động, báo cáo giao dịch, theo dõi công nợ thời gian thực. Luôn kiểm soát tài chính, mọi lúc mọi nơi.' },
            { icon: BookOpen, title: 'Quản lý học viên', desc: 'Hồ sơ học viên tập trung, lịch sử lớp học, báo cáo điểm danh, báo cáo học tập, báo cáo học phí & công nợ, lịch sử tương tác & chăm sóc.' },
            { icon: Calendar, title: 'Quản lý công việc & lịch trình', desc: 'Tùy chỉnh linh hoạt trạng thái công việc, phân công từng nhân viên, theo dõi theo học viên, nhắc nhở tự động, đánh giá hiệu suất rõ ràng & minh bạch.' },
            { icon: Shield, title: 'Quản lý nhân sự', desc: 'Hồ sơ nhân sự tập trung, phân quyền chặt chẽ, chấm công thông minh bằng công nghệ FaceID, tính lương tự động, lịch làm việc trực quan, đánh giá hiệu suất rõ ràng.' },
            { icon: BarChart3, title: 'Quản lý giáo viên', desc: 'Phân công giảng dạy, lịch dạy trực quan, chấm công & nghỉ phép, đánh giá dựa trên tiến độ giảng dạy và điểm số, đánh giá hiệu suất giáo viên.' },
        ],
        teaching: [
            { icon: BookOpen, title: 'Quản lý khóa học', desc: 'Tạo và quản lý các khóa học, chương trình giảng dạy chi tiết, theo dõi tiến độ học tập của từng học viên.' },
            { icon: Calendar, title: 'Lịch giảng dạy', desc: 'Tối ưu hóa lịch giảng dạy, tránh xung đột thời gian, thông báo tự động cho giáo viên và học viên.' },
            { icon: BarChart3, title: 'Báo cáo học tập', desc: 'Theo dõi kết quả học tập, phân tích điểm số, đánh giá năng lực học viên qua biểu đồ trực quan.' },
        ],
        admin: [
            { icon: Settings, title: 'Cấu hình hệ thống', desc: 'Tùy chỉnh cài đặt hệ thống, quản lý thông tin trung tâm, cấu hình các tham số vận hành.' },
            { icon: Shield, title: 'Bảo mật & Phân quyền', desc: 'Phân quyền chi tiết theo vai trò, bảo mật dữ liệu cấp ngân hàng, sao lưu tự động.' },
        ],
        contact: [
            { icon: Phone, title: 'Liên lạc', desc: 'Quản lý thông tin liên lạc học viên, phụ huynh, giáo viên. Gửi thông báo hàng loạt qua SMS, Email.' },
        ],
    };

    const [showBenefitsMenu, setShowBenefitsMenu] = useState(false);
    const [activeBenefitCategory, setActiveBenefitCategory] = useState('efficiency');

    const benefitCategories = [
        { id: 'efficiency', icon: Zap, label: 'Hiệu quả', color: '#F59E0B' },
        { id: 'growth', icon: BarChart3, label: 'Tăng trưởng', color: '#10B981' },
        { id: 'quality', icon: Shield, label: 'Chất lượng', color: '#8B5CF6' },
        { id: 'savings', icon: Clock, label: 'Tiết kiệm chi phí', color: '#0066FF' },
    ];

    const benefits = {
        efficiency: [
            { icon: Zap, title: 'Tự động hóa công việc lặp lại', desc: 'Giảm 80% nhập liệu thủ công. Tự động lên lịch, tính tiền, và báo cáo giúp tiết kiệm hàng giờ mỗi ngày.' },
            { icon: Clock, title: 'Tiết kiệm 15+ giờ mỗi tuần', desc: 'Ít thời gian làm việc hành chính nghĩa là nhiều thời gian hơn cho giảng dạy và phát triển doanh nghiệp.' },
            { icon: BarChart3, title: 'Phân tích thời gian thực', desc: 'Đưa ra quyết định nhanh hơn với truy cập ngay lập tức vào chỉ số hiệu suất và dữ liệu tài chính.' },
        ],
        growth: [
            { icon: Users, title: 'Mở rộng không giới hạn', desc: 'Xử lý gấp 10 lần số lượng học viên mà không cần thuê thêm nhân viên. Hệ thống phát triển cùng bạn.' },
            { icon: BarChart3, title: 'Quyết định dựa trên dữ liệu', desc: 'Xác định các khóa học sinh lời, tối ưu giá, và theo dõi chỉ số tăng trưởng theo thời gian thực.' },
            { icon: Zap, title: 'Tuyển sinh nhanh hơn', desc: 'Quy trình tiếp nhận đơn giản chuyển đổi nhiều khách hàng tiềm năng thành học viên trả tiền.' },
        ],
        quality: [
            { icon: Shield, title: 'Xuất sắc nhất quán', desc: 'Tiêu chuẩn hóa vận hành ở tất cả các địa điểm. Duy trì chất lượng khi mở rộng.' },
            { icon: Users, title: 'Trải nghiệm học viên tốt hơn', desc: 'Lộ trình học tập cá nhân hóa, phản hồi tức thời, và giao tiếp liền mạch tăng sự hài lòng.' },
            { icon: Calendar, title: 'Giảm sai sót', desc: 'Quy trình tự động loại bỏ xung đột lịch trình và thanh toán thiếu.' },
        ],
        savings: [
            { icon: Clock, title: 'Giảm chi phí nhân công', desc: 'Giảm nhu cầu nhân viên hành chính tới 50% nhờ tự động hóa.' },
            { icon: Shield, title: 'Ngăn chặn mất doanh thu', desc: 'Theo dõi thanh toán và nhắc nhở tự động giảm 90% thanh toán trễ.' },
            { icon: Zap, title: 'Hoàn vốn trong 3 tháng', desc: 'Hầu hết các trung tâm thấy hoàn vốn đầy đủ trong quý đầu tiên.' },
        ],
    };

    return (
        <div className="homepage">
            {/* Header / Navigation */}
            <header className="header">
                <div className="container">
                    <div className="nav-wrapper">
                        <Link to="/" className="logo">
                            <BookOpen size={40} strokeWidth={2.5} />
                            <span className="logo-text">EduCen</span>
                        </Link>
                        <nav className="nav">
                            <button
                                className="nav-link-btn"
                                onClick={() => {
                                    setShowMegaMenu(!showMegaMenu);
                                    setShowBenefitsMenu(false);
                                }}
                            >
                                Tính năng
                            </button>
                            <button
                                className="nav-link-btn"
                                onClick={() => {
                                    setShowBenefitsMenu(!showBenefitsMenu);
                                    setShowMegaMenu(false);
                                }}
                            >
                                Lợi ích
                            </button>
                            <Link to="/pricing">Bảng giá</Link>
                            <Link to="/login" className="btn-login">Đăng nhập</Link>
                            <Link to="/signup" className="btn-primary">Bắt đầu</Link>
                        </nav>
                    </div>
                </div>

                {/* Mega Menu Dropdown */}
                {showMegaMenu && (
                    <>
                        <div className="mega-menu-overlay" onClick={() => setShowMegaMenu(false)} />
                        <div className="mega-menu">
                            <div className="mega-menu-container">
                                {/* Sidebar Categories */}
                                <div className="mega-menu-sidebar">
                                    {categories.map((cat) => {
                                        const Icon = cat.icon;
                                        return (
                                            <button
                                                key={cat.id}
                                                className={`category-item ${activeCategory === cat.id ? 'active' : ''}`}
                                                onClick={() => setActiveCategory(cat.id)}
                                                style={{ '--category-color': cat.color }}
                                            >
                                                <Icon size={20} />
                                                <span>{cat.label}</span>
                                                <ChevronRight size={16} className="chevron" />
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Content Area */}
                                <div className="mega-menu-content">
                                    <h3 className="mega-menu-title">
                                        {categories.find(c => c.id === activeCategory)?.label}
                                    </h3>
                                    <div className="mega-menu-grid">
                                        {features[activeCategory].map((feature, index) => {
                                            const FeatureIcon = feature.icon;
                                            return (
                                                <div key={index} className="mega-menu-card">
                                                    <div className="mega-card-icon">
                                                        <FeatureIcon size={20} />
                                                    </div>
                                                    <div className="mega-card-content">
                                                        <h4>{feature.title}</h4>
                                                        <p>{feature.desc}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Benefits Mega Menu */}
                {showBenefitsMenu && (
                    <>
                        <div className="mega-menu-overlay" onClick={() => setShowBenefitsMenu(false)} />
                        <div className="mega-menu">
                            <div className="mega-menu-container">
                                {/* Sidebar Categories */}
                                <div className="mega-menu-sidebar">
                                    {benefitCategories.map((cat) => {
                                        const Icon = cat.icon;
                                        return (
                                            <button
                                                key={cat.id}
                                                className={`category-item ${activeBenefitCategory === cat.id ? 'active' : ''}`}
                                                onClick={() => setActiveBenefitCategory(cat.id)}
                                                style={{ '--category-color': cat.color }}
                                            >
                                                <Icon size={20} />
                                                <span>{cat.label}</span>
                                                <ChevronRight size={16} className="chevron" />
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Content Area */}
                                <div className="mega-menu-content">
                                    <h3 className="mega-menu-title">
                                        {benefitCategories.find(c => c.id === activeBenefitCategory)?.label}
                                    </h3>
                                    <div className="mega-menu-grid">
                                        {benefits[activeBenefitCategory].map((benefit, index) => {
                                            const BenefitIcon = benefit.icon;
                                            return (
                                                <div key={index} className="mega-menu-card">
                                                    <div className="mega-card-icon">
                                                        <BenefitIcon size={20} />
                                                    </div>
                                                    <div className="mega-card-content">
                                                        <h4>{benefit.title}</h4>
                                                        <p>{benefit.desc}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </header>

            {/* Hero Section */}
            <section className="hero">
                <div className="container">
                    <div className="hero-content">
                        <div className="hero-left">
                            <h1 className="hero-title">
                                Đơn Giản Hóa Trung Tâm Gia Sư Của Bạn
                            </h1>
                            <p className="hero-description">
                                Quản lý học viên, lên lịch lớp học, theo dõi tiến độ, tự động hóa thanh toán và mở rộng doanh nghiệp gia sư mà không cần giấy tờ.
                            </p>
                            <div className="hero-actions">
                                <Link to="/signup" className="btn-primary btn-large">
                                    Đăng ký miễn phí
                                    <ArrowRight size={20} />
                                </Link>
                                <button onClick={() => setShowDemoModal(true)} className="btn-secondary btn-large">
                                    Xem Demo
                                </button>
                            </div>
                            <div className="trust-badges">
                                <p>Trusted by 500+ Tutoring Centers Worldwide</p>
                            </div>
                        </div>
                        <div className="hero-right">
                            <div className="dashboard-preview">
                                <div className="preview-card" style={{ background: slides[currentSlide].gradient }}>
                                    <div className="preview-content">
                                        <div className="preview-chart" style={{ color: slides[currentSlide].color }}>
                                            <SlideIcon size={56} className="slide-icon" />
                                            <p>{slides[currentSlide].title}</p>
                                        </div>
                                    </div>
                                    <div className="slide-dots">
                                        {slides.map((_, index) => (
                                            <div
                                                key={index}
                                                className={`dot ${index === currentSlide ? 'active' : ''}`}
                                                onClick={() => setCurrentSlide(index)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="features">
                <div className="container">
                    <div className="section-header">
                        <h2>Mọi Thứ Bạn Cần Để Phát Triển</h2>
                        <p>Tính năng mạnh mẽ giúp bạn quản lý và mở rộng trung tâm gia sư hiệu quả</p>
                    </div>
                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon">
                                <Users />
                            </div>
                            <h3>Quản lý học viên</h3>
                            <p>Theo dõi tiến độ, điểm danh và hiệu suất học viên tất cả ở một nơi. Quản lý hồ sơ và giao tiếp dễ dàng.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">
                                <Calendar />
                            </div>
                            <h3>Lên lịch thông minh</h3>
                            <p>Lên lịch lớp học dễ dàng và tự động thông báo học viên. Ngăn chặn xung đột và tối ưu thời gian rảnh giáo viên.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">
                                <BarChart3 />
                            </div>
                            <h3>Theo dõi tiến độ</h3>
                            <p>Theo dõi thời gian thực và báo cáo hiệu suất tự động. Xác định học viên gặp khó khăn qua phân tích AI.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">
                                <Zap />
                            </div>
                            <h3>Thanh toán tự động</h3>
                            <p>Tự động hóa xuất hóa đơn và theo dõi thanh toán. Gửi nhắc nhở và tạo báo cáo tài chính dễ dàng.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">
                                <Shield />
                            </div>
                            <h3>Bảo mật & Đáng tin cậy</h3>
                            <p>Bảo mật cấp ngân hàng với dữ liệu mã hóa. Kiểm soát truy cập theo vai trò và sao lưu tự động.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">
                                <Clock />
                            </div>
                            <h3>Tiết kiệm thời gian</h3>
                            <p>Giảm 70% công việc hành chính. Tập trung giảng dạy trong khi chúng tôi xử lý vận hành.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta">
                <div className="container">
                    <div className="cta-content">
                        <h2>Sẵn sàng mở rộng trung tâm của bạn?</h2>
                        <p>Tham gia cùng hàng trăm trung tâm đang sử dụng EduCen để quản lý doanh nghiệp hiệu quả</p>
                        <Link to="/signup" className="btn-primary btn-large">
                            Bắt đầu ngay
                            <ArrowRight size={20} />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Privacy Policy Section */}
            <section id="privacy" className="legal-section">
                <div className="container">
                    <div className="legal-header">
                        <div className="legal-badge">Pháp lý</div>
                        <h2>Chính Sách Bảo Mật</h2>
                    </div>

                    <div className="legal-grid">
                        <div className="legal-card">
                            <div className="legal-card-icon">
                                <Shield size={24} />
                            </div>
                            <h3>Giới Thiệu</h3>
                            <p>
                                Chúng tôi cam kết bảo vệ quyền riêng tư và bảo mật thông tin cá nhân của bạn.
                                Chính sách này giải thích cách chúng tôi thu thập, sử dụng và bảo vệ thông tin của bạn.
                            </p>
                        </div>

                        <div className="legal-card">
                            <div className="legal-card-icon">
                                <Users size={24} />
                            </div>
                            <h3>Thông Tin Thu Thập</h3>
                            <p>
                                Chúng tôi thu thập thông tin cá nhân như họ tên, email, số điện thoại,
                                thông tin trung tâm giáo dục, và dữ liệu học viên khi được ủy quyền.
                            </p>
                        </div>

                        <div className="legal-card">
                            <div className="legal-card-icon">
                                <Zap size={24} />
                            </div>
                            <h3>Cách Sử Dụng</h3>
                            <p>
                                Thông tin được sử dụng để cung cấp dịch vụ, xử lý thanh toán,
                                gửi thông báo quan trọng, và cải thiện trải nghiệm người dùng.
                            </p>
                        </div>

                        <div className="legal-card">
                            <div className="legal-card-icon">
                                <Shield size={24} />
                            </div>
                            <h3>Bảo Mật</h3>
                            <p>
                                Áp dụng mã hóa SSL/TLS, lưu trữ an toàn, kiểm soát truy cập nghiêm ngặt,
                                sao lưu thường xuyên và giám sát bảo mật 24/7.
                            </p>
                        </div>

                        <div className="legal-card">
                            <div className="legal-card-icon">
                                <BookOpen size={24} />
                            </div>
                            <h3>Quyền Của Bạn</h3>
                            <p>
                                Bạn có quyền truy cập, sửa đổi, xóa dữ liệu cá nhân, rút lại sự đồng ý,
                                và yêu cầu xuất dữ liệu của mình bất cứ lúc nào.
                            </p>
                        </div>


                    </div>
                </div>
            </section>

            {/* Terms of Service Section */}
            <section id="terms" className="legal-section terms-section">
                <div className="container">
                    <div className="legal-header">
                        <div className="legal-badge">Pháp lý</div>
                        <h2>Điều Khoản Dịch Vụ</h2>
                    </div>

                    <div className="legal-grid">
                        <div className="legal-card">
                            <div className="legal-card-icon">
                                <Check size={24} />
                            </div>
                            <h3>Chấp Nhận Điều Khoản</h3>
                            <p>
                                Bằng việc sử dụng EduCen, bạn đồng ý bị ràng buộc bởi các điều khoản này.
                                Nếu không đồng ý, vui lòng không sử dụng dịch vụ.
                            </p>
                        </div>

                        <div className="legal-card">
                            <div className="legal-card-icon">
                                <Settings size={24} />
                            </div>
                            <h3>Dịch Vụ Cung Cấp</h3>
                            <p>
                                EduCen cung cấp phần mềm quản lý trung tâm với các tính năng:
                                quản lý học viên, lịch học, thanh toán, giáo viên và báo cáo.
                            </p>
                        </div>

                        <div className="legal-card">
                            <div className="legal-card-icon">
                                <Users size={24} />
                            </div>
                            <h3>Tài Khoản</h3>
                            <p>
                                Bạn phải cung cấp thông tin chính xác khi đăng ký và chịu trách nhiệm
                                bảo mật tài khoản. Thông báo ngay nếu phát hiện vi phạm.
                            </p>
                        </div>

                        <div className="legal-card">
                            <div className="legal-card-icon">
                                <BarChart3 size={24} />
                            </div>
                            <h3>Thanh Toán</h3>
                            <p>
                                Phí dịch vụ theo chu kỳ hàng tháng hoặc hàng năm.
                                Các khoản đã thanh toán không được hoàn lại trừ khi có quy định khác.
                            </p>
                        </div>

                        <div className="legal-card">
                            <div className="legal-card-icon">
                                <Shield size={24} />
                            </div>
                            <h3>Sử Dụng Chấp Nhận</h3>
                            <p>
                                Không được vi phạm pháp luật, xâm phạm quyền sở hữu trí tuệ,
                                tải nội dung có hại, can thiệp hệ thống hoặc truy cập trái phép.
                            </p>
                        </div>

                        <div className="legal-card">
                            <div className="legal-card-icon">
                                <AlertCircle size={24} />
                            </div>
                            <h3>Giới Hạn Trách Nhiệm</h3>
                            <p>
                                EduCen không chịu trách nhiệm về thiệt hại gián tiếp, ngẫu nhiên
                                phát sinh từ việc sử dụng hoặc không thể sử dụng dịch vụ.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="footer">
                <div className="container">
                    <div className="footer-content">
                        <div className="footer-column">
                            <Link to="/" className="logo">
                                <BookOpen size={32} strokeWidth={2.5} />
                                <span className="logo-text">EduCen</span>
                            </Link>
                            <p>Đơn giản hóa quản lý giáo dục cho trung tâm gia sư</p>
                        </div>
                        <div className="footer-column">
                            <h4>Liên hệ</h4>
                            <a href="mailto:contact@educen.com">📧 contact@educen.com</a>
                            <a href="tel:+84888000123">📞 +84 (888) 000-1234</a>
                            <a href="#location">📍 123 Tech Plaza, TP. HCM</a>
                        </div>
                        <div className="footer-column">
                            <h4>Pháp lý</h4>
                            <a href="#privacy">Chính sách bảo mật</a>
                            <a href="#terms">Điều khoản dịch vụ</a>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        <p>&copy; 2026 EduCen. Bảo lưu mọi quyền.</p>
                    </div>
                </div>
            </footer>

            {/* Demo Modal */}
            <DemoModal isOpen={showDemoModal} onClose={() => setShowDemoModal(false)} />
        </div>
    );
};

export default HomePage;
