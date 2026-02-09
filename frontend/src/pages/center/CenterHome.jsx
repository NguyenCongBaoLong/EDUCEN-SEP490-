import { useState } from 'react';
import { MapPin, Phone, Mail, Globe, Clock, BookOpen, Star, Calendar, Image, Quote, Users, Award, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../../css/pages/center/CenterHome.css';

const CenterHome = () => {
    const [enrollmentForm, setEnrollmentForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        preferredCourse: ''
    });

    const centerInfo = {
        name: "Trung Tâm Gia Sư Elite Scholars",
        tagline: "Trao quyền cho học sinh thông qua việc học cá nhân hóa và hướng dẫn tận tâm. Tham gia cùng chúng tôi để khai phá toàn bộ tiềm năng học tập của bạn.",
        location: {
            address: "123 Đường Giáo Dục, Tầng 100",
            city: "Thành phố Học Thuật, HT 12345"
        },
        contact: {
            phone: "(028) 1234-5678",
            email: "admin@elitescholars.com",
            website: "www.elitescholars.com"
        },
        images: [
            "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=600&h=500&fit=crop",
            "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&h=500&fit=crop",
            "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&h=500&fit=crop",
            "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=500&fit=crop"
        ],
        introduction: {
            title: "Câu chuyện của chúng tôi",
            description: "Với hơn 10 năm kinh nghiệm trong lĩnh vực giáo dục, chúng tôi cam kết mang đến cho học sinh những phương pháp học tập hiện đại, hiệu quả và phù hợp với từng cá nhân. Đội ngũ giáo viên của chúng tôi đều là những chuyên gia giàu kinh nghiệm, luôn đồng hành cùng học sinh trên con đường chinh phục kiến thức.",
            highlights: [
                { icon: "Users", text: "Hơn 500+ học sinh đã tin tưởng" },
                { icon: "Award", text: "Tỉ lệ đậu đại học 95%" },
                { icon: "Star", text: "Đánh giá 5 sao từ phụ huynh" },
                { icon: "TrendingUp", text: "Tăng trung bình 2 điểm sau 3 tháng" }
            ]
        }
    };

    // Class schedule data
    const classSchedule = [
        {
            day: 'Thứ Hai', slots: [
                { time: '09:00 - 11:00', subject: 'Toán 10', teacher: 'Thầy Minh' },
                { time: '14:00 - 16:00', subject: 'Vật Lý 11', teacher: 'Cô Hương' }
            ]
        },
        {
            day: 'Thứ Ba', slots: [
                { time: '09:00 - 11:00', subject: 'Hóa 12', teacher: 'Thầy Nam' },
                { time: '16:00 - 18:00', subject: 'Tiếng Anh', teacher: 'Cô Lan' }
            ]
        },
        {
            day: 'Thứ Tư', slots: [
                { time: '09:00 - 11:00', subject: 'Toán 12', teacher: 'Thầy Minh' },
                { time: '14:00 - 16:00', subject: 'Sinh 10', teacher: 'Cô Thu' }
            ]
        },
        {
            day: 'Thứ Năm', slots: [
                { time: '09:00 - 11:00', subject: 'Văn 11', teacher: 'Cô Hà' },
                { time: '14:00 - 16:00', subject: 'Anh 12', teacher: 'Cô Lan' }
            ]
        },
        {
            day: 'Thứ Sáu', slots: [
                { time: '09:00 - 11:00', subject: 'Lý 12', teacher: 'Thầy Đức' },
                { time: '14:00 - 16:00', subject: 'Toán Nâng Cao', teacher: 'Thầy Minh' }
            ]
        },
        {
            day: 'Thứ Bảy', slots: [
                { time: '09:00 - 11:00', subject: 'IELTS', teacher: 'Cô Lan' },
                { time: '14:00 - 16:00', subject: 'SAT Math', teacher: 'Thầy Minh' }
            ]
        },
        { day: 'Chủ Nhật', slots: [] }
    ];

    const operatingHours = [
        { day: "Thứ Hai", open: "09:00", close: "20:00" },
        { day: "Thứ Tư", open: "09:00", close: "20:00" },
        { day: "Thứ Sáu", open: "09:00", close: "18:00" },
        { day: "Chủ Nhật", status: "CLOSED" },
        { day: "Thứ Ba", open: "09:00", close: "20:00" },
        { day: "Thứ Năm", open: "09:00", close: "20:00" },
        { day: "Thứ Bảy", open: "10:00", close: "14:00" },
        { day: "Múi giờ", info: "Giờ Đông Dương (GMT+7)" }
    ];

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setEnrollmentForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Enrollment submitted:', enrollmentForm);
        alert('Đăng ký thành công! Chúng tôi sẽ liên hệ với bạn sớm.');
        setEnrollmentForm({
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            preferredCourse: ''
        });
    };

    return (
        <div className="center-home">
            {/* Header */}
            <header className="center-header">
                <div className="center-header-content">
                    <Link to="/" className="center-logo">
                        <BookOpen size={24} />
                        <span>Trung Tâm Gia Sư Elite Scholars</span>
                    </Link>

                    <div className="center-header-actions">
                        <button className="center-btn-register">Đăng ký ngay</button>
                        <Link to="/login" className="center-link-login">Đăng nhập</Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="center-hero">
                <div className="center-hero-content">
                    <div className="center-welcome-badge">
                        <BookOpen size={16} />
                        CHÀO MỪNG ĐẾN VỚI EDUCEN
                    </div>
                    <h1>Trung Tâm Gia Sư Elite Scholars</h1>
                    <p>{centerInfo.tagline}</p>
                    {/* <a href="#mission" className="center-link-mission">
                        Tham gia cùng chúng tôi để khám phá tiềm năng học tập của bạn.
                    </a> */}
                </div>
            </section>

            {/* Main Content */}
            <div className="center-container">
                {/* Our Center Section */}
                <section className="center-our-center">
                    <div className="center-about-split">
                        {/* Introduction - LEFT */}
                        <div className="center-about-content">
                            <div className="center-section-badge">
                                <BookOpen size={16} />
                                VỀ CHÚNG TÔI
                            </div>
                            <h2>{centerInfo.introduction.title}</h2>
                            <p className="center-intro-text">
                                {centerInfo.introduction.description}
                            </p>
                            <div className="center-highlights">
                                {centerInfo.introduction.highlights.map((item, index) => {
                                    const IconComponent = item.icon === 'Users' ? Users :
                                        item.icon === 'Award' ? Award :
                                            item.icon === 'Star' ? Star : TrendingUp;
                                    return (
                                        <div key={index} className="center-highlight-item">
                                            <div className="center-highlight-icon">
                                                <IconComponent size={20} />
                                            </div>
                                            <span>{item.text}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Images - RIGHT */}
                        <div className="center-about-images">
                            <div className="center-image-grid">
                                {centerInfo.images.map((img, index) => (
                                    <div key={index} className={`center-image-item item-${index}`}>
                                        <img src={img} alt={`Trung tâm ${index + 1}`} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Class Schedule (replacing Operating Hours) */}
                <section className="center-operating-hours">
                    <h2>Lịch Học Các Lớp</h2>
                    <div className="center-schedule">
                        <div className="center-schedule-grid">
                            {classSchedule.map((daySchedule, index) => (
                                <div key={index} className="center-schedule-day">
                                    <div className="center-schedule-day-header">
                                        <Clock size={14} />
                                        <span>{daySchedule.day}</span>
                                    </div>
                                    <div className="center-schedule-slots">
                                        {daySchedule.slots.length > 0 ? (
                                            daySchedule.slots.map((slot, slotIndex) => (
                                                <div key={slotIndex} className="center-schedule-slot">
                                                    <div className="center-slot-time">{slot.time}</div>
                                                    <div className="center-slot-subject">{slot.subject}</div>
                                                    <div className="center-slot-teacher">{slot.teacher}</div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="center-schedule-closed">NGHỈ</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Start Your Journey Section */}
                <section className="center-journey-section">
                    <div className="center-journey-badge">
                        <BookOpen size={16} />
                        BẮT ĐẦU ĐĂNG KÝ
                    </div>
                    <h2>Bắt Đầu Hành Trình Của Bạn Ngay Hôm Nay</h2>
                    <p className="center-journey-subtitle">
                        Điền vào mẫu đăng ký dưới đây để tham gia các lớp học sắp tới. Đội ngũ của chúng tôi sẽ liên hệ với bạn trong vòng 24 giờ để xác nhận.
                    </p>

                    <div className="center-journey-content">
                        {/* Enrollment Form */}
                        <div className="center-enrollment-form-wrapper">
                            <form onSubmit={handleSubmit} className="center-enrollment-form">
                                <div className="center-form-row">
                                    <div className="center-form-group">
                                        <label>Họ</label>
                                        <input
                                            type="text"
                                            name="firstName"
                                            value={enrollmentForm.firstName}
                                            onChange={handleFormChange}
                                            placeholder="Nhập họ của bạn"
                                            required
                                        />
                                    </div>
                                    <div className="center-form-group">
                                        <label>Tên</label>
                                        <input
                                            type="text"
                                            name="lastName"
                                            value={enrollmentForm.lastName}
                                            onChange={handleFormChange}
                                            placeholder="Nhập tên của bạn"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="center-form-group">
                                    <label>Địa chỉ Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={enrollmentForm.email}
                                        onChange={handleFormChange}
                                        placeholder="email@example.com"
                                        required
                                    />
                                </div>

                                <div className="center-form-group">
                                    <label>Số điện thoại</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={enrollmentForm.phone}
                                        onChange={handleFormChange}
                                        placeholder="0912345678"
                                        required
                                    />
                                </div>

                                <div className="center-form-group">
                                    <label>Khóa học mong muốn</label>
                                    <select
                                        name="preferredCourse"
                                        value={enrollmentForm.preferredCourse}
                                        onChange={handleFormChange}
                                        required
                                    >
                                        <option value="">Chọn khóa học</option>
                                        <option value="math">Toán học</option>
                                        <option value="english">Tiếng Anh</option>
                                        <option value="science">Khoa học</option>
                                        <option value="history">Lịch sử</option>
                                    </select>
                                </div>

                                <button type="submit" className="center-btn-submit">
                                    Gửi đăng ký
                                </button>
                            </form>
                        </div>

                        {/* Inspirational Quote Card */}
                        <div className="center-testimonial-card">
                            <div className="center-quote-icon">
                                <Quote size={48} />
                            </div>
                            <div className="center-testimonial-content">
                                <p className="center-testimonial-text">
                                    Giáo dục không phải là việc đổ đầy một cái thùng, mà là thắp sáng ngọn lửa đam mê học hỏi. Mỗi học sinh đều có tiềm năng riêng, và sứ mệnh của chúng tôi là giúp các em khám phá và phát triển những điều tốt đẹp nhất trong bản thân.
                                </p>
                                <div className="center-quote-footer">
                                    <BookOpen size={20} />
                                    <span>Sứ mệnh của chúng tôi</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {/* Footer */}
            <footer className="center-footer">
                <div className="center-footer-main">
                    <div className="center-footer-section">
                        <h3>
                            <BookOpen size={20} />
                            Trung Tâm Gia Sư Elite Scholars
                        </h3>
                        <p className="center-footer-tagline">
                            Đồng hành cùng học sinh trên con đường chinh phục tri thức
                        </p>
                    </div>

                    <div className="center-footer-section">
                        <h4>
                            <MapPin size={18} />
                            Địa chỉ
                        </h4>
                        <p>{centerInfo.location.address}</p>
                        <p>{centerInfo.location.city}</p>
                    </div>

                    <div className="center-footer-section">
                        <h4>
                            <Phone size={18} />
                            Liên hệ
                        </h4>
                        <div className="center-footer-contact">
                            <a href={`tel:${centerInfo.contact.phone}`}>
                                <Phone size={16} />
                                {centerInfo.contact.phone}
                            </a>
                            <a href={`mailto:${centerInfo.contact.email}`}>
                                <Mail size={16} />
                                {centerInfo.contact.email}
                            </a>
                            <a href={`https://${centerInfo.contact.website}`} target="_blank" rel="noopener noreferrer">
                                <Globe size={16} />
                                {centerInfo.contact.website}
                            </a>
                        </div>
                    </div>

                    <div className="center-footer-section">
                        <h4>Liên kết</h4>
                        <div className="center-footer-links">
                            <a href="#privacy">Chính sách bảo mật</a>
                            <a href="#terms">Điều khoản dịch vụ</a>
                            <a href="#support">Hỗ trợ</a>
                        </div>
                    </div>
                </div>

                <div className="center-footer-bottom">
                    <p>© 2024 Trung Tâm Gia Sư Elite Scholars. All rights reserved.</p>
                </div>
            </footer>
        </div >
    );
};

export default CenterHome;
