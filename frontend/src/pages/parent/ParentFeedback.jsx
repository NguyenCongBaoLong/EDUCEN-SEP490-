import { useState } from 'react';
import { MessageSquare, Send, CheckCircle, Star, AlertCircle, Clock } from 'lucide-react';
import ParentSidebar from '../../components/ParentSidebar';
import '../../css/pages/parent/ParentFeedback.css';

/* ── Mock: feedback đã gửi trước đó ── */
const SENT_FEEDBACKS = [
    {
        id: 1,
        category: 'Chất lượng giảng dạy',
        subject: 'Góp ý về phương pháp dạy Toán',
        content: 'Thầy dạy rất nhiệt tình và dễ hiểu. Con tôi tiến bộ rõ rệt sau 2 tháng học. Tuy nhiên mong thầy có thêm bài tập về nhà sau mỗi buổi để con ôn tập thêm.',
        rating: 5,
        sentAt: '15/02/2026 09:30',
        status: 'read',
    },
    {
        id: 2,
        category: 'Cơ sở vật chất',
        subject: 'Phòng học tầng 3 thiếu điều hòa',
        content: 'Những ngày nóng phòng học tầng 3 rất nóng, ảnh hưởng đến việc tập trung của các em. Mong trung tâm xem xét lắp thêm điều hòa.',
        rating: 3,
        sentAt: '20/01/2026 14:15',
        status: 'replied',
        reply: 'Cảm ơn phụ huynh đã phản hồi! Trung tâm đã lên kế hoạch lắp thêm 2 điều hòa cho phòng học tầng 3 vào tháng 3. Xin lỗi vì sự bất tiện!',
    },
];

const CATEGORIES = [
    'Chất lượng giảng dạy',
    'Cơ sở vật chất',
    'Lịch học & Thời khóa biểu',
    'Học phí & Thanh toán',
    'Thái độ nhân viên',
    'Kết quả học tập của con',
    'Khác',
];

const StarRating = ({ value, onChange }) => (
    <div className="pf-star-row">
        {[1, 2, 3, 4, 5].map(n => (
            <button
                key={n}
                type="button"
                className={`pf-star ${n <= value ? 'active' : ''}`}
                onClick={() => onChange(n)}
            >
                <Star size={22} fill={n <= value ? '#f59e0b' : 'none'} color={n <= value ? '#f59e0b' : '#cbd5e1'} />
            </button>
        ))}
        <span className="pf-star-label">
            {value === 0 ? 'Chưa đánh giá' : value === 1 ? 'Rất không hài lòng' : value === 2 ? 'Không hài lòng' : value === 3 ? 'Bình thường' : value === 4 ? 'Hài lòng' : 'Rất hài lòng'}
        </span>
    </div>
);

const StatusBadge = ({ status }) => {
    if (status === 'read')
        return <span className="pf-status-badge read"><CheckCircle size={13} /> Đã xem</span>;
    if (status === 'replied')
        return <span className="pf-status-badge replied"><MessageSquare size={13} /> Đã trả lời</span>;
    return <span className="pf-status-badge pending"><Clock size={13} /> Chờ xem</span>;
};

const ParentFeedback = () => {
    const [form, setForm] = useState({ category: '', subject: '', content: '', rating: 0 });
    const [feedbacks, setFeedbacks] = useState(SENT_FEEDBACKS);
    const [submitted, setSubmitted] = useState(false);
    const [errors, setErrors] = useState({});

    const validate = () => {
        const e = {};
        if (!form.category) e.category = 'Vui lòng chọn danh mục.';
        if (!form.subject.trim()) e.subject = 'Vui lòng nhập tiêu đề.';
        if (!form.content.trim() || form.content.trim().length < 20) e.content = 'Nội dung phải có ít nhất 20 ký tự.';
        if (form.rating === 0) e.rating = 'Vui lòng chọn mức đánh giá.';
        return e;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }

        const now = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        const sentAt = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

        setFeedbacks(prev => [{
            id: Date.now(),
            ...form,
            sentAt,
            status: 'pending',
        }, ...prev]);

        setForm({ category: '', subject: '', content: '', rating: 0 });
        setErrors({});
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 4000);
    };

    const handleChange = (field, val) => {
        setForm(p => ({ ...p, [field]: val }));
        if (errors[field]) setErrors(p => ({ ...p, [field]: undefined }));
    };

    return (
        <div className="pf-page">
            <ParentSidebar />

            <main className="pf-main">
                {/* Header */}
                <div className="pf-header">
                    <div>
                        <h1 className="pf-title">Gửi phản hồi</h1>
                        <p className="pf-subtitle">Chia sẻ ý kiến, góp ý của bạn đến trung tâm để giúp nâng cao chất lượng dịch vụ</p>
                    </div>
                </div>

                <div className="pf-layout">
                    {/* Form */}
                    <div className="pf-form-col">
                        <div className="pf-card">
                            <div className="pf-card-header">
                                <MessageSquare size={20} />
                                <h2>Phản hồi mới</h2>
                            </div>

                            {submitted && (
                                <div className="pf-success-banner">
                                    <CheckCircle size={18} />
                                    Phản hồi của bạn đã được gửi! Trung tâm sẽ xem xét sớm nhất có thể.
                                </div>
                            )}

                            <form onSubmit={handleSubmit} noValidate>
                                {/* Category */}
                                <div className={`pf-field ${errors.category ? 'error' : ''}`}>
                                    <label>Danh mục <span className="req">*</span></label>
                                    <select
                                        value={form.category}
                                        onChange={e => handleChange('category', e.target.value)}
                                    >
                                        <option value="">-- Chọn danh mục --</option>
                                        {CATEGORIES.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                    {errors.category && <span className="pf-error"><AlertCircle size={13} /> {errors.category}</span>}
                                </div>

                                {/* Subject */}
                                <div className={`pf-field ${errors.subject ? 'error' : ''}`}>
                                    <label>Tiêu đề <span className="req">*</span></label>
                                    <input
                                        type="text"
                                        placeholder="Tóm tắt nội dung phản hồi..."
                                        value={form.subject}
                                        onChange={e => handleChange('subject', e.target.value)}
                                        maxLength={120}
                                    />
                                    {errors.subject && <span className="pf-error"><AlertCircle size={13} /> {errors.subject}</span>}
                                </div>

                                {/* Rating */}
                                <div className={`pf-field ${errors.rating ? 'error' : ''}`}>
                                    <label>Mức độ hài lòng <span className="req">*</span></label>
                                    <StarRating value={form.rating} onChange={v => handleChange('rating', v)} />
                                    {errors.rating && <span className="pf-error"><AlertCircle size={13} /> {errors.rating}</span>}
                                </div>

                                {/* Content */}
                                <div className={`pf-field ${errors.content ? 'error' : ''}`}>
                                    <label>Nội dung <span className="req">*</span></label>
                                    <textarea
                                        placeholder="Mô tả chi tiết phản hồi của bạn (ít nhất 20 ký tự)..."
                                        rows={5}
                                        value={form.content}
                                        onChange={e => handleChange('content', e.target.value)}
                                        maxLength={1000}
                                    />
                                    <div className="pf-char-count">{form.content.length}/1000</div>
                                    {errors.content && <span className="pf-error"><AlertCircle size={13} /> {errors.content}</span>}
                                </div>

                                <button type="submit" className="pf-btn-submit">
                                    <Send size={16} /> Gửi phản hồi
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* History */}
                    <div className="pf-history-col">
                        <div className="pf-card">
                            <div className="pf-card-header">
                                <Clock size={20} />
                                <h2>Lịch sử phản hồi</h2>
                                <span className="pf-count-badge">{feedbacks.length}</span>
                            </div>

                            {feedbacks.length === 0 ? (
                                <div className="pf-empty">
                                    <MessageSquare size={40} />
                                    <p>Chưa có phản hồi nào được gửi.</p>
                                </div>
                            ) : (
                                <div className="pf-history-list">
                                    {feedbacks.map(fb => (
                                        <div key={fb.id} className={`pf-history-item ${fb.status}`}>
                                            <div className="pf-history-top">
                                                <div className="pf-history-meta">
                                                    <span className="pf-history-category">{fb.category}</span>
                                                    <StatusBadge status={fb.status} />
                                                </div>
                                                <div className="pf-history-stars">
                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                        <Star
                                                            key={i}
                                                            size={12}
                                                            fill={i < fb.rating ? '#f59e0b' : 'none'}
                                                            color={i < fb.rating ? '#f59e0b' : '#e2e8f0'}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="pf-history-subject">{fb.subject}</div>
                                            <div className="pf-history-content">{fb.content}</div>
                                            <div className="pf-history-date">{fb.sentAt}</div>

                                            {fb.reply && (
                                                <div className="pf-history-reply">
                                                    <div className="pf-reply-label">
                                                        <MessageSquare size={13} /> Phản hồi từ trung tâm:
                                                    </div>
                                                    <p>{fb.reply}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ParentFeedback;
