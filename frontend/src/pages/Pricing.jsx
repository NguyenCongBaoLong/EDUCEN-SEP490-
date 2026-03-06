import { useState } from 'react';
import { Check, BookOpen, Users, GraduationCap, Settings, Phone, Zap, BarChart3, Shield, Clock, Calendar, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../css/pages/Pricing.css';
import '../css/pages/HomePage.css';

const Pricing = () => {
    const [billingPeriod, setBillingPeriod] = useState('monthly');
    const [showMegaMenu, setShowMegaMenu] = useState(false);
    const [activeCategory, setActiveCategory] = useState('management');
    const [showBenefitsMenu, setShowBenefitsMenu] = useState(false);
    const [activeBenefitCategory, setActiveBenefitCategory] = useState('efficiency');

    // Features menu data
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
            { icon: Users, title: 'Quản lý học viên', desc: 'Hồ sơ học viên tập trung, lịch sử lớp học, báo cáo điểm danh, báo cáo học tập, báo cáo học phí & công nợ, lịch sử tương tác & chăm sóc.' },
            { icon: Calendar, title: 'Quản lý công việc & lịch trình', desc: 'Tùy chỉnh linh hoạt trạng thái công việc, phân công từng nhân viên, theo dõi theo học viên, nhắc nhở tự động, đánh giá hiệu suất rõ ràng & minh bạch.' },
            { icon: Shield, title: 'Quản lý nhân sự', desc: 'Hồ sơ nhân sự tập trung, phân quyền chặt chẽ, chấm công thông minh bằng công nghệ FaceID, tính lương tự động, lịch làm việc trực quan, đánh giá hiệu suất rõ ràng.' },
            { icon: BarChart3, title: 'Quản lý giáo viên', desc: 'Phân công giảng dạy, lịch dạy trực quan, chấm công & nghỉ phép, đánh giá dựa trên tiến độ giảng dạy và điểm số, đánh giá hiệu suất giáo viên.' },
        ],
        teaching: [
            { icon: Users, title: 'Quản lý khóa học', desc: 'Tạo và quản lý các khóa học, chương trình giảng dạy chi tiết, theo dõi tiến độ học tập của từng học viên.' },
            { icon: Calendar, title: 'Lịch giảng dạy', desc: 'Xem lịch giảng dạy, quản lý lớp học, theo dõi điểm danh.' },
            { icon: BarChart3, title: 'Báo cáo học tập', desc: 'Báo cáo hiệu suất học viên, theo dõi điểm số, phân tích tiến độ.' },
        ],
        admin: [
            { icon: Settings, title: 'Cấu hình hệ thống', desc: 'Tùy chỉnh cài đặt hệ thống, quản lý thông tin trung tâm, cấu hình các tham số vận hành.' },
            { icon: Shield, title: 'Bảo mật & Phân quyền', desc: 'Phân quyền chi tiết theo vai trò, bảo mật dữ liệu cấp ngân hàng, sao lưu tự động.' },
        ],
        contact: [
            { icon: Phone, title: 'Liên lạc', desc: 'Quản lý thông tin liên lạc học viên, phụ huynh, giáo viên. Gửi thông báo hàng loạt qua SMS, Email.' },
        ],
    };

    // Benefits menu data
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

    const plans = [
        {
            id: 'basic',
            name: 'CƠ BẢN',
            price: 'Free',
            description: 'Hoàn hảo cho giáo viên gia sư cá nhân',
            features: [
                'Tối đa 50 học viên',
                'Lên lịch trực tuyến',
                'Hỗ trợ qua Email',
                'Bảng điều khiển báo cáo cơ bản'
            ],
            buttonText: 'Bắt đầu miễn phí',
            highlighted: false
        },
        {
            id: 'professional',
            name: 'CHUYÊN NGHIỆP',
            price: { monthly: '3,000', yearly: '2,500' },
            priceUnit: 'VNĐ / học viên',
            description: 'Mọi thứ bạn cần để mở rộng trung tâm',
            features: [
                'Không giới hạn học viên',
                'Lên lịch trực tuyến đầy đủ',
                'Báo cáo tài chính & Thuế',
                'Nhắc nhở SMS tự động',
                'Cổng phụ huynh tùy chỉnh',
                'Hỗ trợ ưu tiên 24/7'
            ],
            buttonText: 'Chọn Chuyên nghiệp',
            highlighted: true
        },
        {
            id: 'enterprise',
            name: 'DOANH NGHIỆP',
            price: 'Custom',
            description: 'Cho tổ chức lớn đa trung tâm',
            features: [
                'Quản lý đa địa điểm',
                'Truy cập API & webhooks đầy đủ',
                'Quản lý tài khoản chuyên trách',
                'Tùy chỉnh thương hiệu & white-label',
                'SLA & Kiểm tra bảo mật'
            ],
            buttonText: 'Liên hệ bán hàng',
            highlighted: false
        }
    ];

    const faqs = [
        {
            question: 'Tôi có thể đổi gói sau này không?',
            answer: 'Có, bạn có thể nâng cấp hoặc hạ cấp gói bất cứ lúc nào từ cài đặt tài khoản. Nếu bạn nâng cấp, giá mới sẽ được tính theo tỷ lệ để đảm bảo công bằng.'
        },
        {
            question: 'Có thời gian dùng thử miễn phí không?',
            answer: 'Chúng tôi cung cấp bản dùng thử đầy đủ 14 ngày cho gói Chuyên nghiệp. Không cần thẻ tín dụng để bắt đầu!'
        },
        {
            question: 'Điều gì xảy ra nếu tôi vượt quá giới hạn học viên?',
            answer: 'Đối với gói Cơ bản, chúng tôi sẽ thông báo cho bạn khi bạn gần đạt giới hạn. Bạn cần nâng cấp lên Chuyên nghiệp để thêm hơn 50 học viên.'
        },
        {
            question: 'Bạn có giảm giá cho tổ chức phi lợi nhuận không?',
            answer: 'Có! Các tổ chức phi lợi nhuận giáo dục và tổ chức từ thiện đã đăng ký đủ điều kiện được giảm 20% cho bất kỳ gói nào. Liên hệ hỗ trợ để biết thêm thông tin.'
        }
    ];

    return (
        <div className="pricing-page">
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
                            <Link to="/pricing" className="active">Bảng giá</Link>
                            <Link to="/login" className="btn-login">Đăng nhập</Link>
                            <Link to="/signup" className="btn-primary">Bắt đầu</Link>
                        </nav>
                    </div>
                </div>

                {/* Features Mega Menu */}
                {showMegaMenu && (
                    <>
                        <div className="mega-menu-overlay" onClick={() => setShowMegaMenu(false)} />
                        <div className="mega-menu">
                            <div className="mega-menu-container">
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

            <div className="pricing-container">
                {/* Title Section */}
                <div className="pricing-hero">
                    <h1>Các Gói Dịch Vụ Phần Mềm</h1>
                    <p>Bảng giá linh hoạt cho giáo viên gia sư cá nhân và trung tâm giáo dục đang phát triển. Chọn gói phù hợp với doanh nghiệp của bạn.</p>
                </div>

                {/* Billing Toggle */}
                <div className="billing-toggle">
                    <button
                        className={billingPeriod === 'monthly' ? 'active' : ''}
                        onClick={() => setBillingPeriod('monthly')}
                    >
                        Thanh toán hàng tháng
                    </button>
                    <button
                        className={billingPeriod === 'yearly' ? 'active' : ''}
                        onClick={() => setBillingPeriod('yearly')}
                    >
                        Hàng năm <span className="save-badge">(Tiết kiệm 10%)</span>
                    </button>
                </div>

                {/* Pricing Cards */}
                <div className="pricing-cards">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`pricing-card ${plan.highlighted ? 'highlighted' : ''}`}
                        >
                            {plan.highlighted && <div className="best-value-badge">GIÁ TRỊ TỐT NHẤT</div>}

                            <div className="plan-header">
                                <h3>{plan.name}</h3>
                                <div className="plan-price">
                                    {plan.price === 'Custom' ? (
                                        <span className="custom-price">Tùy chỉnh</span>
                                    ) : plan.price === 'Free' ? (
                                        <span className="free-price">Miễn phí</span>
                                    ) : plan.priceUnit ? (
                                        <>
                                            <span className="amount">
                                                {typeof plan.price === 'object'
                                                    ? (billingPeriod === 'monthly' ? plan.price.monthly : plan.price.yearly)
                                                    : plan.price
                                                }
                                            </span>
                                            <span className="period">{plan.priceUnit}</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="currency">$</span>
                                            <span className="amount">
                                                {billingPeriod === 'monthly' ? plan.price.monthly : plan.price.yearly}
                                            </span>
                                            <span className="period">/mo</span>
                                        </>
                                    )}
                                </div>
                                <p className="plan-description">{plan.description}</p>
                            </div>

                            <button className={`plan-button ${plan.highlighted ? 'primary' : ''}`}>
                                {plan.buttonText}
                            </button>

                            <ul className="plan-features">
                                {plan.features.map((feature, index) => (
                                    <li key={index}>
                                        <Check size={18} />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* FAQ Section */}
                <div className="faq-section">
                    <h2>Câu hỏi thường gặp</h2>
                    <div className="faq-grid">
                        {faqs.map((faq, index) => (
                            <div key={index} className="faq-item">
                                <h4>{faq.question}</h4>
                                <p>{faq.answer}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Pricing;
