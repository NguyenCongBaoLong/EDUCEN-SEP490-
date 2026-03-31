import { useState, useEffect } from 'react';
import { MessageSquare, Send, CheckCircle, Star, AlertCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import ParentSidebar from '../../components/ParentSidebar';
import api from '../../services/api';
import '../../css/pages/parent/ParentFeedback.css';

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
    if (status === 'Answered')
        return <span className="pf-status-badge replied"><MessageSquare size={13} /> Đã trả lời</span>;
    if (status === 'Read' || status === 'Pending')
        return <span className="pf-status-badge read"><CheckCircle size={13} /> Đã xem</span>;
    return <span className="pf-status-badge pending"><Clock size={13} /> Chờ xử lý</span>;
};

const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const parseTitle = (title) => {
    const match = title.match(/^\[(.+?)\]\s*(.*)$/);
    if (match) return { category: match[1], subject: match[2] };
    return { category: 'Khác', subject: title };
};

const parseContent = (content) => {
    const match = content.match(/^Đánh giá:\s*(\d+)\/5\s*\n---\n([\s\S]*)$/);
    if (match) return { rating: parseInt(match[1]), body: match[2] };
    return { rating: 0, body: content };
};

const ParentFeedback = () => {
    const [form, setForm] = useState({ category: '', subject: '', content: '', rating: 0 });
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [errors, setErrors] = useState({});

    const fetchFeedbacks = async () => {
        try {
            const res = await api.get('/support-requests/my');
            setFeedbacks(res.data);
        } catch (error) {
            console.error('Error fetching feedbacks:', error);
            toast.error('Không thể tải danh sách phản hồi.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeedbacks();
    }, []);

    const validate = () => {
        const e = {};
        if (!form.category) e.category = 'Vui lòng chọn danh mục.';
        if (!form.subject.trim()) e.subject = 'Vui lòng nhập tiêu đề.';
        if (!form.content.trim() || form.content.trim().length < 20) e.content = 'Nội dung phải có ít nhất 20 ký tự.';
        if (form.rating === 0) e.rating = 'Vui lòng chọn mức đánh giá.';
        return e;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }

        setSubmitting(true);
        try {
            const title = `[${form.category}] ${form.subject}`;
            const content = `Đánh giá: ${form.rating}/5\n---\n${form.content}`;

            await api.post('/support-requests', { Title: title, Content: content });

            setForm({ category: '', subject: '', content: '', rating: 0 });
            setErrors({});
            setSubmitted(true);
            setTimeout(() => setSubmitted(false), 4000);
            toast.success('Phản hồi đã được gửi thành công!');
            await fetchFeedbacks();
        } catch (error) {
            console.error('Error submitting feedback:', error);
            toast.error(error.response?.data?.message || 'Gửi phản hồi thất bại.');
        } finally {
            setSubmitting(false);
        }
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

                                <button type="submit" className="pf-btn-submit" disabled={submitting}>
                                    <Send size={16} /> {submitting ? 'Đang gửi...' : 'Gửi phản hồi'}
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

                            {loading ? (
                                <div className="pf-empty">
                                    <p>Đang tải...</p>
                                </div>
                            ) : feedbacks.length === 0 ? (
                                <div className="pf-empty">
                                    <MessageSquare size={40} />
                                    <p>Chưa có phản hồi nào được gửi.</p>
                                </div>
                            ) : (
                                <div className="pf-history-list">
                                    {feedbacks.map(fb => {
                                        const { category, subject } = parseTitle(fb.title);
                                        const { rating, body } = parseContent(fb.content);
                                        return (
                                            <div key={fb.id} className={`pf-history-item ${fb.status === 'Answered' ? 'replied' : fb.isRead ? 'read' : 'pending'}`}>
                                                <div className="pf-history-top">
                                                    <div className="pf-history-meta">
                                                        <span className="pf-history-category">{category}</span>
                                                        <StatusBadge status={fb.status} />
                                                    </div>
                                                    <div className="pf-history-stars">
                                                        {Array.from({ length: 5 }).map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                size={12}
                                                                fill={i < rating ? '#f59e0b' : 'none'}
                                                                color={i < rating ? '#f59e0b' : '#e2e8f0'}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="pf-history-subject">{subject}</div>
                                                <div className="pf-history-content">{body}</div>
                                                <div className="pf-history-date">{formatDate(fb.createdAt)}</div>

                                                {fb.adminResponse && (
                                                    <div className="pf-history-reply">
                                                        <div className="pf-reply-label">
                                                            <MessageSquare size={13} /> Phản hồi từ trung tâm:
                                                        </div>
                                                        <p>{fb.adminResponse}</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
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
