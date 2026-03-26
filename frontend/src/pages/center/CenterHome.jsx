import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
    Users, Award, Star, TrendingUp, BookOpen,
    Pencil, Eye, Check, X, LayoutDashboard,
    ChevronLeft, ChevronRight, Upload, Phone,
    Mail, MapPin, Globe, ArrowRight, Quote,
    Clock, Calendar, LogOut, Plus, Trash2,
    Facebook, Youtube, Instagram,
    Image as ImageIcon
} from 'lucide-react';
import { useSchedule } from '../../context/ScheduleContext';
import { useAuth } from '../../context/AuthContext';
import '../../css/pages/center/CenterHome.css';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5106/api';

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
    primaryColor: '#007bff',
    backgroundColor: '#f0f4f8',
    facebookUrl: '',
    youtubeUrl: '',
    instagramUrl: '',
    displayConfig: JSON.stringify({
        sections: [
            { id: 'hero', enabled: true, title: 'Đầu trang' },
            { id: 'about', enabled: true, title: 'Giới thiệu' },
            { id: 'teachers', enabled: true, title: 'Giáo viên' },
            { id: 'courses', enabled: true, title: 'Khóa học' },
            { id: 'schedule', enabled: true, title: 'Lịch học' },
            { id: 'gallery', enabled: true, title: 'Thư viện ảnh' },
            { id: 'quote', enabled: true, title: 'Châm ngôn' },
            { id: 'enrollment', enabled: true, title: 'Đăng ký' }
        ]
    }),
    staffs: []
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
    <>
        {logoSrc ? (
            <img src={logoSrc} alt="logo" className="center-logo-img" />
        ) : (
            <BookOpen size={24} />
        )}
        <span>{name}</span>
    </>
);

const BrandingStyles = ({ primaryColor, backgroundColor }) => {
    const safePrimary = primaryColor || '#0066FF';
    const safeBg = backgroundColor || '#ffffff';
    const rgb = hexToRgb(safePrimary);
    
    return (
        <style>{`
            :root {
                --center-primary: ${safePrimary};
                --center-primary-rgb: ${rgb};
                --center-primary-light: rgba(${rgb}, 0.1);
                --center-bg: ${safeBg};
            }

            /* Page background - Override default gradient */
            .center-home {
                background: ${safeBg} !important;
                background-image: none !important;
            }

            .center-btn-apply, .center-btn-submit, .center-btn-hero {
                background: ${safePrimary} !important;
                border-color: ${safePrimary} !important;
                color: #fff !important;
            }

            /* Section badges */
            .center-section-badge, .center-journey-badge {
                background: rgba(${rgb}, 0.12) !important;
                color: ${safePrimary} !important;
            }

            /* Highlight icons */
            .center-highlight-icon {
                background: rgba(${rgb}, 0.12) !important;
                color: ${safePrimary} !important;
            }

            /* Underline titles */
            .teachers-title-underline {
                background: linear-gradient(90deg, ${safePrimary}, ${safePrimary}66) !important;
            }

            /* Links & hover */
            .center-home .center-nav-link:hover, .center-home .center-footer-contact a:hover {
                color: ${safePrimary} !important;
            }

            /* Footer Header Fix - Forced Visibility */
            .center-home .center-footer-section h3, 
            .center-home .center-footer-section h4 {
                color: #1e293b !important;
                display: flex !important;
                opacity: 1 !important;
                visibility: visible !important;
            }
            .center-home .center-footer-tagline, 
            .center-home .center-footer-section p, 
            .center-home .center-footer-contact a, 
            .center-home .center-footer-links a {
                color: #64748b !important;
            }

            /* Schedule */
            .center-schedule-slot {
                border-left-color: ${primaryColor} !important;
            }
            .center-slot-subject {
                color: ${primaryColor} !important;
            }

            /* Footer headings */
            .center-footer h3, .center-footer h4 {
                color: rgba(255,255,255,0.9) !important;
            }

            /* Social icon hover */
            .social-icon:hover {
                background: ${primaryColor} !important;
                border-color: ${primaryColor} !important;
            }

            /* Admin edit mode teacher avatar hover */
            .admin-mode .editable-avatar:hover {
                border-color: ${primaryColor} !important;
            }

            /* Add teacher card */
            .teacher-add-card {
                border-color: ${primaryColor}66 !important;
                color: ${primaryColor} !important;
            }
            .teacher-add-card:hover {
                background: rgba(${rgb}, 0.06) !important;
            }
        `}</style>

    );
};


// Helper hex to rgb
function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
}

/* ─── Component ─────────────────────────────────────── */
const CenterHome = ({ isAdmin: isAdminProp = false }) => {
    const navigate = useNavigate();
    const { scheduledClasses = [], refreshSchedules } = useSchedule() || {};
    const { user, logout } = useAuth();
    const logoInputRef = useRef(null);

    // Chỉ Admin mới thấy thanh quản lý
    const isAdmin = isAdminProp && user?.role === 'Admin';

    const location = useLocation();

    // Hỗ trợ nhận diện tenant từ URL (ví dụ: ?tenant=center1)
    useEffect(() => {
        fetchCenterData();
        if (refreshSchedules) refreshSchedules();
    }, [refreshSchedules]);

    const fetchCenterData = async () => {
        try {
            const response = await axios.get(`${API_URL}/CenterHome`);
            if (response.data) {
                const data = response.data;
                // Đảm bảo các mảng không bị null
                data.highlights = data.highlights || [];
                data.courses = data.courses || [];
                data.images = data.images || [];
                data.heroImages = data.heroImages || [];
                data.staffs = data.staffs || [];

                // Parse displayConfig if needed
                if (!data.displayConfig) {
                    data.displayConfig = INIT.displayConfig;
                }

                setSaved(data);
                setDraft(data);
            }
        } catch (error) {
            console.error('Error fetching center data:', error);
            // Nếu không tìm thấy (404), dùng dữ liệu mặc định INIT
            if (error.response?.status === 404) {
                setSaved({ ...INIT });
                setDraft({ ...INIT });
            }
        }
    };


    /* Enrollment form */
    const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', preferredCourse: '', address: '' });
    const [isSubmittingEnrollment, setIsSubmittingEnrollment] = useState(false);
    const [availableSubjects, setAvailableSubjects] = useState([]);

    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const res = await axios.get(`${API_URL}/tenantadmin/Subjects`);
                setAvailableSubjects(res.data || []);
            } catch (err) {
                console.error('Cannot fetch subjects:', err);
            }
        };
        fetchSubjects();
    }, []);

    const handleFormChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

    const handleSubmitEnrollment = async e => {
        e.preventDefault();
        setIsSubmittingEnrollment(true);

        try {
            const payload = { ...form };

            const response = await axios.post(`${API_URL}/enrollment-requests`, payload);

            if (response.status === 200 || response.status === 201) {
                toast.success(response.data.message || 'Đăng ký thành công! Chúng tôi sẽ liên hệ với bạn sớm.');
                setForm({ firstName: '', lastName: '', email: '', phone: '', preferredCourse: '', address: '' });
            }
        } catch (error) {
            console.error('Enrollment error:', error);
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
        } finally {
            setIsSubmittingEnrollment(false);
        }
    };

    /* Edit state */
    const [editMode, setEditMode] = useState(false);
    const [showCmsHub, setShowCmsHub] = useState(false); // <--- Added
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState({ ...INIT });
    const [draft, setDraft] = useState({ ...INIT });
    const [activeAdminTab, setActiveAdminTab] = useState('branding'); // branding, sections, staff

    const set = (field, value) => setDraft(p => ({ ...p, [field]: value }));

    /* --- File Management --- */
    const [logoFile, setLogoFile] = useState(null);
    const [fileBuffer, setFileBuffer] = useState({
        hero: {},   // {index: File}
        staff: {},  // {index: File}
        gallery: {}, // {index: File}
        intro: null,
        quote: null
    });

    const triggerImageUpload = (callback) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const previewUrl = URL.createObjectURL(file);
            callback(previewUrl, file);
        };
        input.click();
    };

    /* --- Action Helpers --- */
    const addHeroImage = () => {
        const newHero = {
            imageUrl: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=2070',
            title: 'Tiêu đề mới',
            subTitle: 'Mô tả mới',
            buttonText: 'Xem thêm',
            buttonLink: '#'
        };
        set('heroImages', [...(draft.heroImages || []), newHero]);
    };

    const removeHeroImage = (idx) => {
        const h = [...(draft.heroImages || [])];
        h.splice(idx, 1);
        set('heroImages', h);
        setFileBuffer(p => {
            const next = { ...p, hero: { ...p.hero } };
            delete next.hero[idx];
            return next;
        });
    };

    const addStaff = () => {
        const newStaff = { name: 'Giáo viên mới', role: 'Vị trí', bio: '', avatarUrl: '' };
        set('staffs', [...(draft.staffs || []), newStaff]);
    };

    const removeStaff = (idx) => {
        const s = [...(draft.staffs || [])];
        s.splice(idx, 1);
        set('staffs', s);
        setFileBuffer(p => {
            const next = { ...p, staff: { ...p.staff } };
            delete next.staff[idx];
            return next;
        });
    };

    const addHighlight = () => {
        const newH = { icon: 'Star', text: 'Ưu điểm mới' };
        set('highlights', [...(draft.highlights || []), newH]);
    };

    const removeHighlight = (idx) => {
        const h = [...(draft.highlights || [])];
        h.splice(idx, 1);
        set('highlights', h);
    };

    const handleActualSave = async () => {
        setIsSaving(true);
        try {
            const formData = new FormData();

            const fields = [
                'name', 'tagline', 'footerTagline', 'address', 'city', 'phone',
                'email', 'website', 'introTitle', 'introDescription', 'quoteText',
                'copyright', 'primaryColor', 'backgroundColor', 'facebookUrl', 'instagramUrl', 'youtubeUrl',
                'displayConfig'
            ];
            fields.forEach(f => formData.append(f, draft[f] || ''));

            if (logoFile) {
                formData.append('LogoFile', logoFile);
            } else if (draft.logo && !draft.logo.startsWith('blob:') && !draft.logo.startsWith('data:')) {
                formData.append('ExistingLogoUrl', draft.logo);
            }

            if (fileBuffer.intro) formData.append('IntroFile', fileBuffer.intro);
            else if (draft.introImage) formData.append('ExistingIntroImageUrl', draft.introImage);

            if (fileBuffer.quote) formData.append('QuoteFile', fileBuffer.quote);
            else if (draft.quoteImage) formData.append('ExistingQuoteImageUrl', draft.quoteImage);

            let heroFileCount = 0;
            (draft.heroImages || []).forEach((hero, i) => {
                const isObject = typeof hero === 'object';
                const url = isObject ? hero.imageUrl : hero;
                if (url && !url.startsWith('blob:') && !url.startsWith('data:')) {
                    formData.append(`HeroImages[${i}].ExistingImageUrl`, url);
                }
                if (fileBuffer.hero[i]) {
                    formData.append('HeroImageFiles', fileBuffer.hero[i]);
                    formData.append(`HeroImages[${i}].FileIndex`, heroFileCount++);
                }
                if (isObject) {
                    formData.append(`HeroImages[${i}].Title`, hero.title || '');
                    formData.append(`HeroImages[${i}].SubTitle`, hero.subTitle || '');
                    formData.append(`HeroImages[${i}].ButtonText`, hero.buttonText || '');
                    formData.append(`HeroImages[${i}].ButtonLink`, hero.buttonLink || '');
                }
            });

            let staffFileCount = 0;
            (draft.staffs || []).forEach((s, i) => {
                if (s.avatarUrl && !s.avatarUrl.startsWith('blob:') && !s.avatarUrl.startsWith('data:')) {
                    formData.append(`Staffs[${i}].ExistingAvatarUrl`, s.avatarUrl);
                }
                if (fileBuffer.staff[i]) {
                    formData.append('StaffAvatarFiles', fileBuffer.staff[i]);
                    formData.append(`Staffs[${i}].FileIndex`, staffFileCount++);
                }
                formData.append(`Staffs[${i}].Name`, s.name || '');
                formData.append(`Staffs[${i}].Role`, s.role || '');
                formData.append(`Staffs[${i}].Bio`, s.bio || '');
            });

            // 6. Highlights
            (draft.highlights || []).forEach((h, i) => {
                formData.append(`Highlights[${i}].Icon`, h.icon || '');
                formData.append(`Highlights[${i}].Text`, h.text || '');
            });

            // 7. Gallery (Images)
            (draft.images || []).forEach((img, i) => {
                if (img && !img.startsWith('blob:') && !img.startsWith('data:')) {
                    formData.append('ExistingImageUrls', img);
                }
            });
            Object.values(fileBuffer.gallery).forEach(f => {
                if (f) formData.append('ImageFiles', f);
            });

            const res = await axios.post(`${API_URL}/CenterHome/save`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.status === 200) {
                toast.success('Đã lưu thay đổi thành công!');
                setSaved({ ...draft });
                setEditMode(false);
                setShowCmsHub(false);
                setFileBuffer({ hero: {}, staff: {}, gallery: {}, intro: null, quote: null });
                setLogoFile(null);
                await fetchCenterData();
            }
        } catch (err) {
            console.error('Save error:', err);
            toast.error('Có lỗi xảy ra khi lưu: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setDraft({ ...saved });
        setEditMode(false);
        setShowCmsHub(false);
        setLogoFile(null);
        setFileBuffer({ hero: {}, staff: {}, gallery: {}, intro: null, quote: null });
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLogoFile(file);
        const url = URL.createObjectURL(file);
        set('logo', url);
    };

    const d = editMode ? draft : saved;
    const config = JSON.parse(d.displayConfig || INIT.displayConfig);

    /* Hero Slider Auto-play */
    const [currentHeroSlide, setCurrentHeroSlide] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentHeroSlide(prev => (prev + 1) % (d.heroImages?.length || 1));
        }, 5000);
        return () => clearInterval(interval);
    }, [d.heroImages]);


    return (
        <div className={`center-home${editMode ? ' admin-mode' : ''}`}>
            <BrandingStyles primaryColor={d.primaryColor} backgroundColor={d.backgroundColor} />

            {/* ── Admin Toolbar ── */}
            {isAdmin && (
                <div className={`admin-top-bar${editMode ? ' editing' : ''}`}>
                    <div className="admin-top-bar-left">
                        {editMode ? (
                            <>
                                <Pencil size={15} />
                                <span>Đang chỉnh sửa trang</span>
                            </>
                        ) : (
                            <>
                                <Eye size={15} />
                                <span>
                                    Bạn đang xem với tư cách <strong>Quản trị viên</strong>
                                </span>
                            </>
                        )}
                    </div>
                    <div className="admin-top-bar-actions">
                        {editMode ? (
                            <>
                                <button className="admin-bar-btn cms-toggle" onClick={() => setShowCmsHub(!showCmsHub)}>
                                    <LayoutDashboard size={15} /> {showCmsHub ? 'Ẩn bảng Cài đặt' : 'Mở bảng Cài đặt'}
                                </button>
                                <button className="admin-bar-btn save" onClick={handleActualSave} disabled={isSaving}>
                                    {isSaving ? 'Đang lưu...' : <><Check size={15} /> Lưu thay đổi</>}
                                </button>
                                <button className="admin-bar-btn cancel" onClick={handleCancel} disabled={isSaving}>
                                    <X size={15} /> Hủy
                                </button>
                            </>
                        ) : (
                            <button className="admin-bar-btn edit" onClick={() => { setEditMode(true); setShowCmsHub(true); }}>
                                <Pencil size={15} /> Chỉnh sửa trang
                            </button>
                        )}
                        <button className="admin-bar-btn manage" onClick={() => navigate('/center/dashboard')}>
                            <LayoutDashboard size={15} /> Quản lý
                        </button>
                    </div>
                </div>
            )}

            {/* ── Admin CMS Hub (Visible in Edit Mode) ── */}
            {editMode && showCmsHub && (
                <div className="admin-cms-overlay">
                    <div className="admin-cms-hub">
                        <div className="admin-cms-header">
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                <h3><LayoutDashboard size={18} /> Cấu hình Mini CMS</h3>
                                <button
                                    onClick={() => setShowCmsHub(false)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                                    title="Ẩn bảng điều khiển"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="admin-cms-tabs">
                                <button
                                    className={`admin-cms-tab ${activeAdminTab === 'branding' ? 'active' : ''}`}
                                    onClick={() => setActiveAdminTab('branding')}
                                >
                                    <TrendingUp size={16} /> Thương hiệu
                                </button>
                                <button
                                    className={`admin-cms-tab ${activeAdminTab === 'slides' ? 'active' : ''}`}
                                    onClick={() => setActiveAdminTab('slides')}
                                >
                                    <ImageIcon size={16} /> Slide
                                </button>
                                <button
                                    className={`admin-cms-tab ${activeAdminTab === 'sections' ? 'active' : ''}`}
                                    onClick={() => setActiveAdminTab('sections')}
                                >
                                    <LayoutDashboard size={16} /> Bố cục
                                </button>

                            </div>
                        </div>

                        <div className="admin-cms-content">
                            {activeAdminTab === 'branding' && (
                                <div className="admin-cms-branding-grid">
                                    <div className="admin-cms-field">
                                        <label>Màu sắc chủ đạo</label>
                                        <div className="color-picker-wrapper">
                                            <input
                                                type="color"
                                                value={draft.primaryColor || '#007bff'}
                                                onChange={e => set('primaryColor', e.target.value)}
                                            />
                                            <span>{draft.primaryColor || '#007bff'}</span>
                                        </div>
                                    </div>
                                    <div className="admin-cms-field">
                                        <label>Màu nền trang</label>
                                        <div className="color-picker-wrapper">
                                            <input
                                                type="color"
                                                value={draft.backgroundColor || '#f0f4f8'}
                                                onChange={e => set('backgroundColor', e.target.value)}
                                            />
                                            <span>{draft.backgroundColor || '#f0f4f8'}</span>
                                        </div>
                                    </div>

                                    <div className="admin-cms-field">
                                        <label>Facebook URL</label>
                                        <input
                                            type="text"
                                            value={draft.facebookUrl || ''}
                                            onChange={e => set('facebookUrl', e.target.value)}
                                            placeholder="https://facebook.com/..."
                                        />
                                    </div>
                                    <div className="admin-cms-field">
                                        <label>Youtube URL</label>
                                        <input
                                            type="text"
                                            value={draft.youtubeUrl || ''}
                                            onChange={e => set('youtubeUrl', e.target.value)}
                                            placeholder="https://youtube.com/..."
                                        />
                                    </div>
                                    <div className="admin-cms-field">
                                        <label>Instagram URL</label>
                                        <input
                                            type="text"
                                            value={draft.instagramUrl || ''}
                                            onChange={e => set('instagramUrl', e.target.value)}
                                            placeholder="https://instagram.com/..."
                                        />
                                    </div>
                                </div>
                            )}

                            {activeAdminTab === 'sections' && (
                                <div className="admin-cms-sections-list">
                                    <p className="admin-cms-hint">Nhấn vào mắt để ẩn/hiện, nhấn mũi tên để thay đổi thứ tự.</p>
                                    {config.sections.map((sec, idx) => (
                                        <div key={sec.id} className={`admin-cms-section-item ${!sec.enabled ? 'disabled' : ''}`}>
                                            <div className="sec-info">
                                                <span className="sec-name">{sec.title}</span>
                                                <span className="sec-id">#{sec.id}</span>
                                            </div>
                                            <div className="sec-actions">
                                                <button
                                                    className="sec-btn toggle"
                                                    title={sec.enabled ? 'Ẩn' : 'Hiện'}
                                                    onClick={() => {
                                                        const newSections = [...config.sections];
                                                        newSections[idx].enabled = !newSections[idx].enabled;
                                                        set('displayConfig', JSON.stringify({ ...config, sections: newSections }));
                                                    }}
                                                >
                                                    {sec.enabled ? <Eye size={16} /> : <Eye size={16} stroke="#ccc" />}
                                                </button>
                                                <button
                                                    className="sec-btn move"
                                                    disabled={idx === 0}
                                                    onClick={() => {
                                                        const newSections = [...config.sections];
                                                        [newSections[idx], newSections[idx - 1]] = [newSections[idx - 1], newSections[idx]];
                                                        set('displayConfig', JSON.stringify({ ...config, sections: newSections }));
                                                    }}
                                                >
                                                    <ChevronRight size={16} className="rotate--90" />
                                                </button>
                                                <button
                                                    className="sec-btn move"
                                                    disabled={idx === config.sections.length - 1}
                                                    onClick={() => {
                                                        const newSections = [...config.sections];
                                                        [newSections[idx], newSections[idx + 1]] = [newSections[idx + 1], newSections[idx]];
                                                        set('displayConfig', JSON.stringify({ ...config, sections: newSections }));
                                                    }}
                                                >
                                                    <ChevronRight size={16} className="rotate-90" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeAdminTab === 'slides' && (
                                <div className="admin-cms-slides-list">
                                    <div className="slides-grid-edit">
                                        {(draft.heroImages || []).map((hero, idx) => {
                                            const imgUrl = hero.imageUrl || hero;
                                            return (
                                                <div key={idx} className="slide-card-edit">
                                                    <div className="slide-preview-edit">
                                                        <img src={imgUrl} alt="slide" />
                                                        <div className="slide-actions-overlay">
                                                            <button
                                                                className="slide-upload-btn-overlay"
                                                                title="Đổi ảnh slide"
                                                                onClick={() => triggerImageUpload((url, file) => {
                                                                    const newHero = [...draft.heroImages];
                                                                    newHero[idx] = { ...newHero[idx], imageUrl: url };
                                                                    set('heroImages', newHero);
                                                                    setFileBuffer(p => ({ ...p, hero: { ...p.hero, [idx]: file } }));
                                                                })}
                                                            >
                                                                <Upload size={16} />
                                                            </button>
                                                            <button
                                                                className="slide-delete-btn"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const newHero = draft.heroImages.filter((_, i) => i !== idx);
                                                                    set('heroImages', newHero);
                                                                }}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="slide-fields-edit">
                                                        <input
                                                            type="text"
                                                            placeholder="Tiêu đề Slide"
                                                            value={hero.title || ''}
                                                            onChange={e => {
                                                                const newHero = [...draft.heroImages];
                                                                newHero[idx] = { ...newHero[idx], title: e.target.value };
                                                                set('heroImages', newHero);
                                                            }}
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Mô tả phụ"
                                                            value={hero.subTitle || ''}
                                                            onChange={e => {
                                                                const newHero = [...draft.heroImages];
                                                                newHero[idx] = { ...newHero[idx], subTitle: e.target.value };
                                                                set('heroImages', newHero);
                                                            }}
                                                        />
                                                        <div className="slide-fields-row">
                                                            <input
                                                                type="text"
                                                                placeholder="Text Nút"
                                                                value={hero.buttonText || ''}
                                                                onChange={e => {
                                                                    const newHero = [...draft.heroImages];
                                                                    newHero[idx] = { ...newHero[idx], buttonText: e.target.value };
                                                                    set('heroImages', newHero);
                                                                }}
                                                            />
                                                            <input
                                                                type="text"
                                                                placeholder="Link Nút"
                                                                value={hero.buttonLink || ''}
                                                                onChange={e => {
                                                                    const newHero = [...draft.heroImages];
                                                                    newHero[idx] = { ...newHero[idx], buttonLink: e.target.value };
                                                                    set('heroImages', newHero);
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <button className="add-slide-btn" onClick={addHeroImage}>
                                            <Plus size={24} />
                                            <span>Thêm Slide mới</span>
                                        </button>
                                    </div>
                                </div>
                            )}


                        </div>
                    </div>
                </div>
            )}




            {/* ── Header ── */}
            <header className="center-header">
                <div className="center-header-content">
                    <div className="center-logo">
                        {editMode ? (
                            <div className="logo-edit-wrapper">
                                <div className="logo-upload-target" onClick={() => logoInputRef.current?.click()} title="Nhấn để đổi logo">
                                    {draft.logo ? (
                                        <img src={draft.logo} alt="logo preview" className="center-logo-img" />
                                    ) : (
                                        <BookOpen size={24} />
                                    )}
                                    <div className="logo-upload-overlay">
                                        <Upload size={16} />
                                    </div>
                                </div>
                                <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
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
                                    <div className="center-header-avatar">{(user.fullName || user.username || '?').charAt(0).toUpperCase()}</div>
                                    <span className="center-header-user">{user.fullName || user.username}</span>
                                </Link>
                                <button
                                    onClick={() => {
                                        logout();
                                        navigate('/center');
                                    }}
                                    className="center-header-logout"
                                    title="Đăng xuất"
                                >
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

            {/* ── Main Content Sections Rendered Dynamically (Fix for Reordering) ── */}
            <div className="center-main-content">
                {config.sections.map((sec) => {
                    const isSectionEnabled = sec.enabled;
                    if (!isSectionEnabled && !editMode) return null;
                    const isHidden = !isSectionEnabled && editMode;
                    const sectionClass = isHidden ? 'section-disabled' : '';

                    switch (sec.id) {
                        case 'hero':
                            return (
                                <section key="hero" className={`center-hero ${sectionClass}`}>
                                    {d.heroImages?.map((hero, idx) => {
                                        const imgUrl = typeof hero === 'string' ? hero : hero.imageUrl;
                                        return (
                                            <div
                                                key={idx}
                                                className={`hero-slide-bg ${idx === currentHeroSlide ? 'active' : ''}`}
                                                style={{ backgroundImage: `url(${imgUrl})` }}
                                            />
                                        );
                                    })}
                                    <div className="center-hero-overlay"></div>

                                    <div className="center-hero-content">
                                        {editMode ? (
                                            <InlineEditField draft={draft} set={set} field="name" placeholder="Tên trung tâm" className="hero-name-field" />
                                        ) : (
                                            <h1>{d.name}</h1>
                                        )}
                                        {editMode ? (
                                            <InlineEditField draft={draft} set={set} field="tagline" multiline rows={3} placeholder="Tagline / mô tả ngắn" className="hero-tagline-field" />
                                        ) : (
                                            <p>{d.tagline}</p>
                                        )}
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
                            );

                        case 'about':
                            return (
                                <div key="about" className="center-container">
                                    <section className={`center-our-center ${sectionClass}`}>
                                        <div className="center-about-split">
                                            {/* LEFT: text + highlights */}
                                            <div className="center-about-content">
                                                <div className="center-section-badge"><BookOpen size={16} /> VỀ CHÚNG TÔI</div>
                                                {editMode ? (
                                                    <InlineEditField draft={draft} set={set} field="introTitle" placeholder="Tiêu đề giới thiệu" className="intro-title-field" />
                                                ) : (
                                                    <h2>{d.introTitle}</h2>
                                                )}
                                                {editMode ? (
                                                    <InlineEditField draft={draft} set={set} field="introDescription" multiline rows={5} placeholder="Mô tả giới thiệu" className="intro-desc-field" />
                                                ) : (
                                                    <p className="center-intro-text">{d.introDescription}</p>
                                                )}

                                                {/* Highlights */}
                                                <div className="center-highlights" style={editMode ? { display: 'flex', flexDirection: 'column', gap: '0.75rem' } : {}}>
                                                    {(editMode ? draft.highlights : d.highlights).map((item, i) => (
                                                        <div key={i} className={`center-highlight-item ${editMode ? 'highlight-item-edit' : ''}`}>
                                                            {editMode ? (
                                                                <select
                                                                    className="highlight-icon-select"
                                                                    value={item.icon || 'Star'}
                                                                    onChange={e => {
                                                                        const nh = [...draft.highlights];
                                                                        nh[i] = { ...nh[i], icon: e.target.value };
                                                                        set('highlights', nh);
                                                                    }}
                                                                >
                                                                    <option value="Users">👥 Users</option>
                                                                    <option value="Award">🏆 Award</option>
                                                                    <option value="Star">⭐ Star</option>
                                                                    <option value="TrendingUp">📈 TrendingUp</option>
                                                                </select>
                                                            ) : (
                                                                <div className="center-highlight-icon">{ICON_MAP[item.icon] || <Star size={20} />}</div>
                                                            )}
                                                            {editMode ? (
                                                                <input
                                                                    className="highlight-edit-input"
                                                                    value={item.text || ''}
                                                                    style={{ flex: 1 }}
                                                                    onChange={e => {
                                                                        const nh = [...draft.highlights];
                                                                        nh[i] = { ...nh[i], text: e.target.value };
                                                                        set('highlights', nh);
                                                                    }}
                                                                />
                                                            ) : (
                                                                <span>{item.text}</span>
                                                            )}
                                                            {editMode && (
                                                                <button
                                                                    className="highlight-delete-btn"
                                                                    onClick={() => removeHighlight(i)}
                                                                    title="Xóa"
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {editMode && (
                                                        <button className="highlight-add-btn" onClick={addHighlight}>
                                                            <Plus size={16} /> Thêm nổi bật
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* RIGHT: image grid */}
                                            <div className="center-about-images">
                                                <div className={`center-image-grid ${editMode ? 'image-grid-edit-mode' : ''}`}>
                                                    {(editMode ? draft.images : (d.images && d.images.length > 0 ? d.images : [
                                                        'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=500&fit=crop',
                                                        'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&h=500&fit=crop',
                                                        'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&h=500&fit=crop',
                                                    ])).map((img, i) => (
                                                        <div key={i} className="center-image-item" style={{ position: 'relative' }}>
                                                            <img src={img || 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=500&fit=crop'} alt={`Gallery ${i}`} />
                                                            {editMode && (
                                                                <div className="image-item-actions">
                                                                    <button
                                                                        className="img-action-btn replace"
                                                                        title="Thay ảnh"
                                                                        onClick={() => triggerImageUpload((url, file) => {
                                                                            const ni = [...(draft.images || [])];
                                                                            ni[i] = url;
                                                                            set('images', ni);
                                                                            setFileBuffer(p => ({ ...p, gallery: { ...p.gallery, [i]: file } }));
                                                                        })}
                                                                    >
                                                                        <Upload size={14} />
                                                                    </button>
                                                                    <button
                                                                        className="img-action-btn remove"
                                                                        title="Xóa ảnh"
                                                                        onClick={() => {
                                                                            const ni = (draft.images || []).filter((_, idx) => idx !== i);
                                                                            set('images', ni);
                                                                        }}
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {editMode && (draft.images || []).length < 10 && (
                                                        <button
                                                            className="image-add-slot"
                                                            onClick={() => {
                                                                const ni = [...(draft.images || []), 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&h=500&fit=crop'];
                                                                set('images', ni);
                                                            }}
                                                        >
                                                            <Plus size={28} />
                                                            <span>Thêm ảnh</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            );


                        case 'teachers':
                            return (
                                <div key="teachers" className="center-container">
                                    <section className={`center-teachers-section ${sectionClass}`}>
                                        <div className="teachers-section-header">
                                            <div>
                                                <div className="center-section-badge"><Users size={16} /> ĐỘI NGŨ GIÁO VIÊN</div>
                                                <h2 className="teachers-title">Đội ngũ giáo viên chuyên nghiệp</h2>
                                                <div className="teachers-title-underline"></div>
                                            </div>
                                            {editMode && (
                                                <button className="teacher-add-btn-top" onClick={addStaff}>
                                                    <Plus size={18} /> Thêm giáo viên
                                                </button>
                                            )}
                                        </div>

                                        <div className="teachers-grid-new">
                                            {(editMode ? draft.staffs : d.staffs).map((staff, i) => (
                                                <div key={i} className={`teacher-card-new ${editMode ? 'editable' : ''}`}>
                                                    {editMode && (
                                                        <button
                                                            className="teacher-inline-delete"
                                                            onClick={() => removeStaff(i)}
                                                            title="Xóa giáo viên"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    )}

                                                    {/* Avatar */}
                                                    <div
                                                        className={`teacher-avatar-new ${editMode ? 'editable-avatar' : ''}`}
                                                        onClick={editMode ? () => triggerImageUpload((url, file) => {
                                                            const ns = [...draft.staffs];
                                                            ns[i] = { ...ns[i], avatarUrl: url };
                                                            set('staffs', ns);
                                                            setFileBuffer(p => ({ ...p, staff: { ...p.staff, [i]: file } }));
                                                        }) : undefined}
                                                        title={editMode ? 'Nhấn để thay ảnh' : ''}
                                                    >
                                                        <img
                                                            src={staff.avatarUrl && staff.avatarUrl.trim() !== '' ? staff.avatarUrl
                                                                : `https://ui-avatars.com/api/?name=${encodeURIComponent(staff.name || 'GV')}&size=300&background=0066FF&color=fff&bold=true`}
                                                            alt={staff.name}
                                                        />
                                                        {editMode && (
                                                            <div className="teacher-avatar-edit-hint">
                                                                <Upload size={20} />
                                                                <span>Thay ảnh</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Info */}
                                                    <div className="teacher-info-new">
                                                        {editMode ? (
                                                            <input
                                                                className="teacher-inline-name"
                                                                value={staff.name || ''}
                                                                placeholder="Tên giáo viên"
                                                                onChange={e => {
                                                                    const ns = [...draft.staffs];
                                                                    ns[i] = { ...ns[i], name: e.target.value };
                                                                    set('staffs', ns);
                                                                }}
                                                            />
                                                        ) : (
                                                            <h3 className="teacher-name-new">{staff.name || 'Giáo viên'}</h3>
                                                        )}

                                                        {editMode ? (
                                                            <input
                                                                className="teacher-inline-role"
                                                                value={staff.role || ''}
                                                                placeholder="Chức vụ / môn dạy"
                                                                onChange={e => {
                                                                    const ns = [...draft.staffs];
                                                                    ns[i] = { ...ns[i], role: e.target.value };
                                                                    set('staffs', ns);
                                                                }}
                                                            />
                                                        ) : (
                                                            <span className="teacher-role-new">{staff.role || 'Giảng viên'}</span>
                                                        )}

                                                        {editMode ? (
                                                            <textarea
                                                                className="teacher-inline-bio"
                                                                value={staff.bio || ''}
                                                                rows={5}
                                                                placeholder="Giới thiệu ngắn về giáo viên..."
                                                                onChange={e => {
                                                                    const ns = [...draft.staffs];
                                                                    ns[i] = { ...ns[i], bio: e.target.value };
                                                                    set('staffs', ns);
                                                                }}
                                                            />
                                                        ) : (
                                                            <p className="teacher-bio-new">{staff.bio || 'Giáo viên giàu kinh nghiệm, luôn tận tâm đồng hành cùng học sinh trên con đường chinh phục tri thức.'}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}

                                            {editMode && (
                                                <button className="teacher-add-card" onClick={addStaff}>
                                                    <Plus size={36} />
                                                    <span>Thêm giáo viên</span>
                                                </button>
                                            )}
                                        </div>
                                    </section>
                                </div>
                            );

                        case 'schedule':
                            return (
                                <div key="schedule" className="center-container">
                                    <section className={`center-operating-hours ${sectionClass}`}>
                                        <h2>Lịch Học Các Lớp</h2>
                                        <div className="center-schedule">
                                            <div className="center-schedule-grid">
                                                {DAY_LABELS.map((dayLabel, colIdx) => (
                                                    <div key={colIdx} className="center-schedule-day">
                                                        <div className="center-schedule-day-header">
                                                            <Clock size={14} /><span>{dayLabel}</span>
                                                        </div>
                                                        <div className="center-schedule-slots">
                                                            {scheduledClasses.filter(c => dayToColumnIndex(c.day) === colIdx).length > 0 ? (
                                                                scheduledClasses.filter(c => dayToColumnIndex(c.day) === colIdx).map((cls) => (
                                                                    <div key={cls.id} className="center-schedule-slot" style={{ borderLeftColor: cls.color }}>
                                                                        <span className="center-slot-time">{cls.startTime} - {cls.endTime}</span>
                                                                        <span className="center-slot-subject">{cls.name}</span>
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
                                </div>
                            );

                        case 'enrollment':
                            return (
                                <div key="enrollment" className="center-container">
                                    <section id="enrollment" className={`center-journey-section ${sectionClass}`}>
                                        <div className="center-journey-badge"><BookOpen size={16} /> BẮT ĐẦU ĐĂNG KÝ</div>
                                        <h2>Bắt Đầu Hành Trình Của Bạn</h2>
                                        <div className="center-journey-content">
                                            <div className="center-enrollment-form-wrapper">
                                                <form onSubmit={handleSubmitEnrollment} className="center-enrollment-form">
                                                    <div className="center-form-row">
                                                        <div className="center-form-group">
                                                            <label>Họ</label>
                                                            <input type="text" name="firstName" value={form.firstName} onChange={handleFormChange} placeholder="Nhập họ" required />
                                                        </div>
                                                        <div className="center-form-group">
                                                            <label>Tên</label>
                                                            <input type="text" name="lastName" value={form.lastName} onChange={handleFormChange} placeholder="Nhập tên" required />
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
                                                            {availableSubjects.map(s => (
                                                                <option key={s.subjectId} value={s.subjectName}>
                                                                    {s.subjectName}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="center-form-group">
                                                        <label>Địa chỉ</label>
                                                        <input type="text" name="address" value={form.address} onChange={handleFormChange} placeholder="Nhập địa chỉ" />
                                                    </div>
                                                    <button type="submit" className="center-btn-submit" disabled={isSubmittingEnrollment}>
                                                        {isSubmittingEnrollment ? 'Đang gửi...' : 'Gửi đăng ký'}
                                                    </button>
                                                </form>
                                            </div>
                                            <div className="center-testimonial-card">
                                                <div className="center-quote-icon"><Quote size={48} /></div>
                                                {editMode ? (
                                                    <InlineEditField draft={draft} set={set} field="quoteText" multiline rows={6} placeholder="Câu châm ngôn truyền cảm hứng" className="quote-textarea-edit" />
                                                ) : (
                                                    <p className="center-testimonial-text">{d.quoteText}</p>
                                                )}
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            );

                        default:
                            return null;
                    }
                })}
            </div>

            {/* ── Footer ── */}
            <footer className="center-footer">
                <div className="center-footer-main">
                    <div className="center-footer-section">
                        <h3>
                            {d.logo ? <img src={d.logo} alt="logo" className="center-logo-img footer-logo" /> : <BookOpen size={20} />}
                            {editMode ? (
                                <InlineEditField draft={draft} set={set} field="name" placeholder="Tên trung tâm" className="footer-name-field" />
                            ) : (
                                d.name
                            )}
                        </h3>
                        {editMode ? (
                            <InlineEditField draft={draft} set={set} field="footerTagline" multiline rows={2} placeholder="Tagline footer" className="footer-tagline-field" />
                        ) : (
                            <p className="center-footer-tagline">{d.footerTagline}</p>
                        )}
                    </div>

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

                    <div className="center-footer-section">
                        <div className="center-footer-links">
                            <a href="#privacy">Chính sách bảo mật</a>
                            <a href="#terms">Điều khoản dịch vụ</a>
                            <a href="#support">Hỗ trợ</a>
                        </div>
                    </div>

                    <div className="center-footer-section">
                        <h4>Mạng xã hội</h4>
                        <div className="center-footer-social">
                            {d.facebookUrl && (
                                <a href={d.facebookUrl} target="_blank" rel="noopener noreferrer" className="social-icon facebook" title="Facebook">
                                    <Facebook size={20} />
                                </a>
                            )}
                            {d.youtubeUrl && (
                                <a href={d.youtubeUrl} target="_blank" rel="noopener noreferrer" className="social-icon youtube" title="Youtube">
                                    <Youtube size={20} />
                                </a>
                            )}
                            {d.instagramUrl && (
                                <a href={d.instagramUrl} target="_blank" rel="noopener noreferrer" className="social-icon instagram" title="Instagram">
                                    <Instagram size={20} />
                                </a>
                            )}
                            {!d.facebookUrl && !d.youtubeUrl && !d.instagramUrl && (
                                <p className="no-social-msg">Chưa cập nhật liên kết mxh.</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="center-footer-bottom">
                    {editMode ? (
                        <InlineEditField draft={draft} set={set} field="copyright" placeholder="Bản quyền" className="footer-copyright-field" />
                    ) : (
                        <p>{d.copyright}</p>
                    )}
                </div>
            </footer>
        </div>
    );
};

export default CenterHome;
