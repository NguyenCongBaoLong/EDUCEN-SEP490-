import { useState, useRef, useEffect } from 'react';
import {
    MapPin, Phone, Mail, Globe, Clock, BookOpen, Star, Quote, Users, Award,
    TrendingUp, Pencil, X, Check, LayoutDashboard, Eye, Plus, Trash2, ImageIcon, Upload, LogOut
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useSchedule } from '../../context/ScheduleContext';
import { useAuth } from '../../context/AuthContext';
import '../../css/pages/center/CenterHome.css';

/* ─── Initial data ──────────────────────────────────── */
const INIT = {
    name: 'Trung Tâm Gia Sư Elite Scholars',
    logo: null, // null = use BookOpen icon, string = image URL/dataURL
    tagline: 'Trao quyền cho học sinh thông qua việc học cá nhân hóa và hướng dẫn tận tâm. Tham gia cùng chúng tôi để khai phá toàn bộ tiềm năng học tập của bạn.',
    footerTagline: 'Đồng hành cùng học sinh trên con đường chinh phục tri thức',
    address: '123 Đường Giáo Dục, Tầng 100',
    city: 'Thành phố Học Thuật, HT 12345',
    phone: '(028) 1234-5678',
    email: 'admin@elitescholars.com',
    website: 'www.elitescholars.com',
    images: [
        'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=600&h=500&fit=crop',
        'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&h=500&fit=crop',
        'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&h=500&fit=crop',
    ],
    heroImages: [
        'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=2000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=2000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=2000&auto=format&fit=crop'
    ],
    introTitle: 'Câu chuyện của chúng tôi',
    introDescription: 'Với hơn 10 năm kinh nghiệm trong lĩnh vực giáo dục, chúng tôi cam kết mang đến cho học sinh những phương pháp học tập hiện đại, hiệu quả và phù hợp với từng cá nhân. Đội ngũ giáo viên của chúng tôi đều là những chuyên gia giàu kinh nghiệm, luôn đồng hành cùng học sinh trên con đường chinh phục kiến thức.',
    highlights: [
        { icon: 'Users', text: 'Hơn 500+ học sinh đã tin tưởng' },
        { icon: 'Award', text: 'Tỉ lệ đậu đại học 95%' },
        { icon: 'Star', text: 'Đánh giá 5 sao từ phụ huynh' },
        { icon: 'TrendingUp', text: 'Tăng trung bình 2 điểm sau 3 tháng' },
    ],
    courses: [
        { value: 'math', label: 'Toán học' },
        { value: 'english', label: 'Tiếng Anh' },
        { value: 'science', label: 'Khoa học' },
        { value: 'history', label: 'Lịch sử' },
    ],
    quoteText: 'Giáo dục không phải là việc đổ đầy một cái thùng, mà là thắp sáng ngọn lửa đam mê học hỏi. Mỗi học sinh đều có tiềm năng riêng, và sứ mệnh của chúng tôi là giúp các em khám phá và phát triển những điều tốt đẹp nhất trong bản thân.',
    copyright: '© 2024 Trung Tâm Gia Sư Elite Scholars. All rights reserved.',
};

const ICON_MAP = {
    Users: <Users size={20} />,
    Award: <Award size={20} />,
    Star: <Star size={20} />,
    TrendingUp: <TrendingUp size={20} />,
};

/* ─── Day mapping helper ─────────────────────────────── */
// ScheduleManagement uses: day 1=Mon ... 6=Sat, 0=Sun
// Calendar columns: 0=Mon ... 5=Sat, 6=Sun
const DAY_LABELS = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
const dayToColumnIndex = (day) => (day === 0 ? 6 : day - 1);


/* ── Inline edit helper ── */
const InlineEditField = ({ draft, set, field, className, placeholder, multiline, rows = 3 }) =>
    multiline ? (
        <textarea
            className={`admin-edit-textarea${className ? ' ' + className : ''}`}
            value={draft[field] || ''}
            onChange={e => set(field, e.target.value)}
            rows={rows}
            placeholder={placeholder}
        />
    ) : (
        <input
            className={`admin-edit-field${className ? ' ' + className : ''}`}
            value={draft[field] || ''}
            onChange={e => set(field, e.target.value)}
            placeholder={placeholder}
        />
    );

/* ── Logo render helper ── */
const LogoDisplay = ({ logoSrc, name }) => (
    logoSrc
        ? <img src={logoSrc} alt="logo" className="center-logo-img" />
        : <><BookOpen size={24} /><span>{name}</span></>
);

/* ─── Component ─────────────────────────────────────── */
const CenterHome = ({ isAdmin: isAdminProp = false }) => {
    const navigate = useNavigate();
    const { scheduledClasses } = useSchedule();
    const { user, logout } = useAuth();
    const logoInputRef = useRef(null);

    // Chỉ Admin mới thấy thanh quản lý
    const isAdmin = isAdminProp && user?.role === 'Admin';

    /* Enrollment form */
    const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', preferredCourse: '' });
    const handleFormChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    const handleSubmit = e => {
        e.preventDefault();
        alert('Đăng ký thành công! Chúng tôi sẽ liên hệ với bạn sớm.');
        setForm({ firstName: '', lastName: '', email: '', phone: '', preferredCourse: '' });
    };

    /* Edit state */
    const [editMode, setEditMode] = useState(false);
    const [saved, setSaved] = useState({ ...INIT });
    const [draft, setDraft] = useState({ ...INIT });

    const set = (field, value) => setDraft(p => ({ ...p, [field]: value }));
    const setNested = (field, index, key, value) =>
        setDraft(p => {
            const arr = [...p[field]];
            arr[index] = { ...arr[index], [key]: value };
            return { ...p, [field]: arr };
        });

    const handleSave = () => { setSaved({ ...draft }); setEditMode(false); };
    const handleCancel = () => { setDraft({ ...saved }); setEditMode(false); };

    /* Logo upload */
    const handleLogoUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => set('logo', ev.target.result);
        reader.readAsDataURL(file);
    };

    /* Highlight helpers */
    const addHighlight = () =>
        setDraft(p => ({ ...p, highlights: [...p.highlights, { icon: 'Star', text: 'Điểm nổi bật mới' }] }));
    const removeHighlight = i =>
        setDraft(p => ({ ...p, highlights: p.highlights.filter((_, idx) => idx !== i) }));

    /* Course helpers */
    const addCourse = () =>
        setDraft(p => ({ ...p, courses: [...p.courses, { value: `course_${Date.now()}`, label: 'Khóa học mới' }] }));
    const removeCourse = i =>
        setDraft(p => ({ ...p, courses: p.courses.filter((_, idx) => idx !== i) }));

    /* Image helpers */
    const addImage = () =>
        setDraft(p => ({ ...p, images: [...p.images, 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=500&fit=crop'] }));
    const removeImage = i =>
        setDraft(p => ({ ...p, images: p.images.filter((_, idx) => idx !== i) }));

    /* Data source */
    const d = editMode ? draft : saved;

    /* Hero Slider */
    const [currentHeroSlide, setCurrentHeroSlide] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentHeroSlide(prev => (prev + 1) % (d.heroImages?.length || 1));
        }, 5000);
        return () => clearInterval(interval);
    }, [d.heroImages]);

    return (
        <div className={`center-home${isAdmin ? ' has-admin-bar' : ''}`}>

            {/* ── Admin Top Bar ── */}
            {isAdmin && (
                <div className={`admin-top-bar${editMode ? ' editing' : ''}`}>
                    <div className="admin-top-bar-left">
                        {editMode ? <><Pencil size={15} /><span>Đang chỉnh sửa trang</span></>
                            : <><Eye size={15} /><span>Bạn đang xem với tư cách <strong>Quản trị viên</strong></span></>}
                    </div>
                    <div className="admin-top-bar-actions">
                        {editMode ? (
                            <>
                                <button className="admin-bar-btn save" onClick={handleSave}><Check size={15} /> Lưu thay đổi</button>
                                <button className="admin-bar-btn cancel" onClick={handleCancel}><X size={15} /> Hủy</button>
                            </>
                        ) : (
                            <button className="admin-bar-btn edit" onClick={() => setEditMode(true)}><Pencil size={15} /> Chỉnh sửa trang</button>
                        )}
                        <button className="admin-bar-btn manage" onClick={() => navigate('/center/dashboard')}>
                            <LayoutDashboard size={15} /> Quản lý
                        </button>
                    </div>
                </div>
            )}

            {/* ── Header ── */}
            <header className="center-header">
                <div className="center-header-content">
                    {/* Logo – not a link (center's own page) */}
                    <div className="center-logo">
                        {editMode ? (
                            /* Logo editor */
                            <div className="logo-edit-wrapper">
                                <div
                                    className="logo-upload-target"
                                    onClick={() => logoInputRef.current?.click()}
                                    title="Nhấn để đổi logo"
                                >
                                    {draft.logo
                                        ? <img src={draft.logo} alt="logo preview" className="center-logo-img" />
                                        : <BookOpen size={24} />}
                                    <div className="logo-upload-overlay">
                                        <Upload size={16} />
                                    </div>
                                </div>
                                <input
                                    ref={logoInputRef}
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={handleLogoUpload}
                                />
                                {draft.logo && (
                                    <button className="admin-remove-btn logo-remove" onClick={() => set('logo', null)} title="Xóa logo">
                                        <X size={12} />
                                    </button>
                                )}
                                <InlineEditField draft={draft} set={set} field="name" placeholder="Tên trung tâm" className="logo-name-field" />
                            </div>
                        ) : (
                            <LogoDisplay logoSrc={d.logo} name={d.name} />
                        )}
                    </div>
                    <div className="center-header-actions">
                        {user ? (
                            <>
                                <Link to="/profile" className="center-header-user-link">
                                    <div className="center-header-avatar">
                                        {(user.fullName || user.username || '?').charAt(0).toUpperCase()}
                                    </div>
                                    <span className="center-header-user">{user.fullName || user.username}</span>
                                </Link>
                                <button onClick={() => { logout(); navigate('/center'); }} className="center-header-logout" title="Đăng xuất">
                                    <LogOut size={18} />
                                </button>
                            </>
                        ) : (
                            <>
                                <a href="#enrollment" className="center-header-enroll">Đăng ký</a>
                                <Link to="/login" className="center-link-login">Đăng nhập</Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* ── Hero ── */}
            <section className="center-hero">
                {d.heroImages?.map((img, idx) => (
                    <div
                        key={idx}
                        className={`hero-slide-bg ${idx === currentHeroSlide ? 'active' : ''}`}
                        style={{ backgroundImage: `url(${img})` }}
                    />
                ))}
                <div className="center-hero-overlay"></div>

                <div className="center-hero-content">
                    {/* <div className="center-welcome-badge"><BookOpen size={16} /> CHÀO MỪNG ĐẾN VỚI EDUCEN</div> */}
                    {editMode
                        ? <InlineEditField draft={draft} set={set} field="name" placeholder="Tên trung tâm" className="hero-name-field" />
                        : <h1>{d.name}</h1>}
                    {editMode
                        ? <InlineEditField draft={draft} set={set} field="tagline" multiline rows={3} placeholder="Tagline / mô tả ngắn" className="hero-tagline-field" />
                        : <p>{d.tagline}</p>}
                    <div className="center-hero-buttons">
                        <a href="#enrollment" className="center-btn-hero">Tham Gia Khóa Học Của Chúng Tôi Ngay</a>
                    </div>
                </div>

                <div className="hero-slide-indicators">
                    {d.heroImages?.map((_, idx) => (
                        <div
                            key={idx}
                            className={`hero-indicator ${idx === currentHeroSlide ? 'active' : ''}`}
                            onClick={() => setCurrentHeroSlide(idx)}
                        />
                    ))}
                </div>
            </section>

            {/* ── Main Content ── */}
            <div className="center-container">

                {/* Our Center */}
                <section className="center-our-center">
                    <div className="center-about-split">

                        {/* LEFT – Intro */}
                        <div className="center-about-content">
                            <div className="center-section-badge"><BookOpen size={16} /> VỀ CHÚNG TÔI</div>
                            {editMode
                                ? <InlineEditField draft={draft} set={set} field="introTitle" placeholder="Tiêu đề giới thiệu" className="intro-title-field" />
                                : <h2>{d.introTitle}</h2>}
                            {editMode
                                ? <InlineEditField draft={draft} set={set} field="introDescription" multiline rows={5} placeholder="Mô tả giới thiệu" className="intro-desc-field" />
                                : <p className="center-intro-text">{d.introDescription}</p>}

                            {/* Highlights */}
                            <div className="center-highlights">
                                {(editMode ? draft : saved).highlights.map((item, i) => (
                                    <div key={i} className={`center-highlight-item${editMode ? ' editable' : ''}`}>
                                        <div className="center-highlight-icon">{ICON_MAP[item.icon] || <Star size={20} />}</div>
                                        {editMode ? (
                                            <div className="highlight-edit-row">
                                                <input
                                                    className="admin-edit-field highlight-text-field"
                                                    value={item.text}
                                                    onChange={e => setNested('highlights', i, 'text', e.target.value)}
                                                    placeholder="Nội dung điểm nổi bật"
                                                />
                                                <button className="admin-remove-btn" onClick={() => removeHighlight(i)} title="Xóa">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <span>{item.text}</span>
                                        )}
                                    </div>
                                ))}
                                {editMode && (
                                    <button className="admin-add-btn" onClick={addHighlight}>
                                        <Plus size={14} /> Thêm điểm nổi bật
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* RIGHT – Images */}
                        <div className="center-about-images">
                            <div className={`center-image-grid${editMode ? ' edit-mode' : ''}`}>
                                {(editMode ? draft : saved).images.map((img, i) => (
                                    <div key={i} className={`center-image-item item-${i}`}>
                                        <img src={img} alt={`Trung tâm ${i + 1}`} />
                                        {editMode && (
                                            <div className="image-edit-overlay">
                                                <div className="image-edit-controls">
                                                    <input
                                                        className="image-url-input"
                                                        value={img}
                                                        onChange={e => {
                                                            const arr = [...draft.images];
                                                            arr[i] = e.target.value;
                                                            setDraft(p => ({ ...p, images: arr }));
                                                        }}
                                                        placeholder="URL ảnh"
                                                    />
                                                    <button className="admin-remove-btn white" onClick={() => removeImage(i)} title="Xóa ảnh">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {editMode && draft.images.length < 4 && (
                                    <div className="add-image-slot" onClick={addImage}>
                                        <ImageIcon size={28} />
                                        <span>Thêm ảnh</span>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </section>

                {/* ── Class Schedule (live from ScheduleManagement) ── */}
                <section className="center-operating-hours">
                    <h2>Lịch Học Các Lớp</h2>
                    <div className="center-schedule">
                        <div className="center-schedule-grid">
                            {DAY_LABELS.map((dayLabel, colIdx) => {
                                // colIdx: 0=Mon...5=Sat, 6=Sun
                                const dayClasses = scheduledClasses.filter(c => dayToColumnIndex(c.day) === colIdx);
                                return (
                                    <div key={colIdx} className="center-schedule-day">
                                        <div className="center-schedule-day-header">
                                            <Clock size={14} /><span>{dayLabel}</span>
                                        </div>
                                        <div className="center-schedule-slots">
                                            {dayClasses.length > 0 ? dayClasses.map((cls) => (
                                                <div key={cls.id} className="center-schedule-slot" style={{ borderLeftColor: cls.color }}>
                                                    <span className="center-slot-time">{cls.startTime} - {cls.endTime}</span>
                                                    <span className="center-slot-subject">{cls.name}</span>
                                                    {cls.teacher && (
                                                        <span className="center-slot-teacher">{cls.teacher}</span>
                                                    )}
                                                </div>
                                            )) : (
                                                <div className="center-schedule-closed">NGHỈ</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* Enrollment Section */}
                <section id="enrollment" className="center-journey-section">
                    <div className="center-journey-badge"><BookOpen size={16} /> BẮT ĐẦU ĐĂNG KÝ</div>
                    <h2>Bắt Đầu Hành Trình Của Bạn Ngay Hôm Nay</h2>
                    <p className="center-journey-subtitle">
                        Điền vào mẫu đăng ký dưới đây để tham gia các lớp học sắp tới. Đội ngũ của chúng tôi sẽ liên hệ với bạn trong vòng 24 giờ để xác nhận.
                    </p>
                    <div className="center-journey-content">

                        {/* Form */}
                        <div className="center-enrollment-form-wrapper">
                            {editMode ? (
                                <div className="course-editor">
                                    <div className="course-editor-title">
                                        <Pencil size={15} /> Chỉnh sửa danh sách khóa học
                                    </div>
                                    <div className="course-editor-list">
                                        {draft.courses.map((course, i) => (
                                            <div key={i} className="course-editor-item">
                                                <input
                                                    className="admin-edit-field course-label-field"
                                                    value={course.label}
                                                    onChange={e => setNested('courses', i, 'label', e.target.value)}
                                                    placeholder="Tên khóa học"
                                                />
                                                <button className="admin-remove-btn" onClick={() => removeCourse(i)} title="Xóa">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <button className="admin-add-btn" onClick={addCourse}>
                                        <Plus size={14} /> Thêm khóa học
                                    </button>
                                    <p className="course-editor-hint">Danh sách này sẽ hiển thị trong dropdown chọn khóa học của form đăng ký.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="center-enrollment-form">
                                    <div className="center-form-row">
                                        <div className="center-form-group">
                                            <label>Họ</label>
                                            <input type="text" name="firstName" value={form.firstName} onChange={handleFormChange} placeholder="Nhập họ của bạn" required />
                                        </div>
                                        <div className="center-form-group">
                                            <label>Tên</label>
                                            <input type="text" name="lastName" value={form.lastName} onChange={handleFormChange} placeholder="Nhập tên của bạn" required />
                                        </div>
                                    </div>
                                    <div className="center-form-group">
                                        <label>Địa chỉ Email</label>
                                        <input type="email" name="email" value={form.email} onChange={handleFormChange} placeholder="email@example.com" required />
                                    </div>
                                    <div className="center-form-group">
                                        <label>Số điện thoại</label>
                                        <input type="tel" name="phone" value={form.phone} onChange={handleFormChange} placeholder="0912345678" required />
                                    </div>
                                    <div className="center-form-group">
                                        <label>Khóa học mong muốn</label>
                                        <select name="preferredCourse" value={form.preferredCourse} onChange={handleFormChange} required>
                                            <option value="">Chọn khóa học</option>
                                            {saved.courses.map(c => (
                                                <option key={c.value} value={c.value}>{c.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button type="submit" className="center-btn-submit">Gửi đăng ký</button>
                                </form>
                            )}
                        </div>

                        {/* Quote card */}
                        <div className="center-testimonial-card">
                            <div className="center-quote-icon"><Quote size={48} /></div>
                            <div className="center-testimonial-content">
                                {editMode ? (
                                    <textarea
                                        className="admin-edit-textarea quote-text-field"
                                        value={draft.quoteText}
                                        onChange={e => set('quoteText', e.target.value)}
                                        rows={6}
                                        placeholder="Nội dung trích dẫn"
                                    />
                                ) : (
                                    <p className="center-testimonial-text">{d.quoteText}</p>
                                )}
                                <div className="center-quote-footer">
                                    <BookOpen size={20} />
                                    <span>Sứ mệnh của chúng tôi</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </section>
            </div>

            {/* ── Footer ── */}
            <footer className="center-footer">
                <div className="center-footer-main">

                    {/* Brand */}
                    <div className="center-footer-section">
                        <h3>
                            {d.logo
                                ? <img src={d.logo} alt="logo" className="center-logo-img footer-logo" />
                                : <BookOpen size={20} />}
                            {editMode
                                ? <InlineEditField draft={draft} set={set} field="name" placeholder="Tên trung tâm" className="footer-name-field" />
                                : d.name}
                        </h3>
                        {editMode
                            ? <InlineEditField draft={draft} set={set} field="footerTagline" multiline rows={2} placeholder="Tagline footer" className="footer-tagline-field" />
                            : <p className="center-footer-tagline">{d.footerTagline}</p>}
                    </div>

                    {/* Address */}
                    <div className="center-footer-section">
                        <h4><MapPin size={18} /> Địa chỉ</h4>
                        {editMode ? (
                            <>
                                <InlineEditField draft={draft} set={set} field="address" placeholder="Địa chỉ" className="footer-info-field" />
                                <InlineEditField draft={draft} set={set} field="city" placeholder="Thành phố" className="footer-info-field" />
                            </>
                        ) : (
                            <>
                                <p>{d.address}</p>
                                <p>{d.city}</p>
                            </>
                        )}
                    </div>

                    {/* Contact */}
                    <div className="center-footer-section">
                        <h4><Phone size={18} /> Liên hệ</h4>
                        {editMode ? (
                            <div className="footer-contact-edit">
                                <div className="footer-contact-edit-row">
                                    <Phone size={14} />
                                    <InlineEditField draft={draft} set={set} field="phone" placeholder="Số điện thoại" className="footer-info-field" />
                                </div>
                                <div className="footer-contact-edit-row">
                                    <Mail size={14} />
                                    <InlineEditField draft={draft} set={set} field="email" placeholder="Email" className="footer-info-field" />
                                </div>
                                <div className="footer-contact-edit-row">
                                    <Globe size={14} />
                                    <InlineEditField draft={draft} set={set} field="website" placeholder="Website" className="footer-info-field" />
                                </div>
                            </div>
                        ) : (
                            <div className="center-footer-contact">
                                <a href={`tel:${d.phone}`}><Phone size={16} />{d.phone}</a>
                                <a href={`mailto:${d.email}`}><Mail size={16} />{d.email}</a>
                                <a href={`https://${d.website}`} target="_blank" rel="noopener noreferrer"><Globe size={16} />{d.website}</a>
                            </div>
                        )}
                    </div>

                    {/* Links */}
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
                    {editMode
                        ? <InlineEditField draft={draft} set={set} field="copyright" placeholder="Bản quyền" className="footer-copyright-field" />
                        : <p>{d.copyright}</p>}
                </div>
            </footer>
        </div>
    );
};

export default CenterHome;
