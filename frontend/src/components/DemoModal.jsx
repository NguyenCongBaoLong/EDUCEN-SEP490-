import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import '../css/components/DemoModal.css';

const DemoModal = ({ isOpen, onClose }) => {
    const [currentSlide, setCurrentSlide] = useState(0);

    const demoSlides = [
        {
            title: "Dashboard Tổng Quan",
            description: "Theo dõi toàn bộ hoạt động trung tâm của bạn trong một màn hình. Xem số liệu học viên, doanh thu, lịch học và nhiều hơn nữa.",
            features: ["Biểu đồ thời gian thực", "Thống kê nhanh", "Thông báo quan trọng"],
            gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        },
        {
            title: "Quản Lý Học Viên",
            description: "Quản lý thông tin học viên một cách hiệu quả. Theo dõi tiến độ học tập, điểm danh, và học phí của từng học viên.",
            features: ["Hồ sơ chi tiết", "Lịch sử học tập", "Quản lý học phí"],
            gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
        },
        {
            title: "Quản Lý Lịch Học",
            description: "Tạo và quản lý thời khóa biểu dễ dàng. Tự động phát hiện xung đột lịch và gửi thông báo cho giáo viên và học viên.",
            features: ["Lịch trực quan", "Phát hiện xung đột", "Thông báo tự động"],
            gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
        },

        {
            title: "Quản Lý Giáo Viên",
            description: "Quản lý thông tin giáo viên, phân công lớp học và theo dõi hiệu suất giảng dạy.",
            features: ["Hồ sơ giáo viên", "Phân công tự động", "Đánh giá hiệu suất"],
            gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
        },
        {
            title: "Báo Cáo & Phân Tích",
            description: "Tạo báo cáo chi tiết về học viên, doanh thu, hiệu suất giảng dạy. Xuất báo cáo dưới nhiều định dạng.",
            features: ["Báo cáo đa dạng", "Xuất Excel/PDF", "Biểu đồ trực quan"],
            gradient: "linear-gradient(135deg, #30cfd0 0%, #330867 100%)"
        }
    ];

    const nextSlide = () => {
        setCurrentSlide((prev) => (prev + 1) % demoSlides.length);
    };

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev - 1 + demoSlides.length) % demoSlides.length);
    };

    const goToSlide = (index) => {
        setCurrentSlide(index);
    };

    if (!isOpen) return null;

    const currentDemo = demoSlides[currentSlide];

    return (
        <div className="demo-modal-overlay" onClick={onClose}>
            <div className="demo-modal" onClick={(e) => e.stopPropagation()}>
                <button className="demo-modal-close" onClick={onClose}>
                    <X size={24} />
                </button>

                <div className="demo-modal-content">
                    <div className="demo-slide">
                        <div className="demo-mockup" style={{ background: currentDemo.gradient }}>
                            <div className="mockup-content">
                                <div className="mockup-window">
                                    <div className="window-header">
                                        <div className="window-dots">
                                            <span></span>
                                            <span></span>
                                            <span></span>
                                        </div>
                                        <div className="window-title">EduCen Dashboard</div>
                                    </div>
                                    <div className="window-body">
                                        <h3>{currentDemo.title}</h3>
                                        <div className="feature-list">
                                            {currentDemo.features.map((feature, idx) => (
                                                <div key={idx} className="feature-item">
                                                    <span className="feature-dot"></span>
                                                    {feature}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="demo-info">
                            <h2>{currentDemo.title}</h2>
                            <p>{currentDemo.description}</p>
                        </div>
                    </div>

                    <div className="demo-navigation">
                        <button
                            className="nav-btn prev"
                            onClick={prevSlide}
                            disabled={currentSlide === 0}
                        >
                            <ChevronLeft size={24} />
                        </button>

                        <div className="demo-dots">
                            {demoSlides.map((_, index) => (
                                <button
                                    key={index}
                                    className={`dot ${currentSlide === index ? 'active' : ''}`}
                                    onClick={() => goToSlide(index)}
                                />
                            ))}
                        </div>

                        <button
                            className="nav-btn next"
                            onClick={nextSlide}
                            disabled={currentSlide === demoSlides.length - 1}
                        >
                            <ChevronRight size={24} />
                        </button>
                    </div>

                    <div className="demo-counter">
                        {currentSlide + 1} / {demoSlides.length}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DemoModal;
