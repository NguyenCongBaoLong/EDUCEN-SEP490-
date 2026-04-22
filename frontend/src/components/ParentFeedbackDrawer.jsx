import { useState, useEffect, useCallback } from 'react';
import {
    Inbox, X, ArrowLeft, Send, MessageSquare, CheckCircle,
    Clock, Star, AlertCircle, MailOpen
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import '../css/pages/parent/ParentFeedback.css';
import '../css/components/TeacherInboxDrawer.css';

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
    if (status === 'Read')
        return <span className="pf-status-badge read"><CheckCircle size={13} /> Đã xem</span>;
    return <span className="pf-status-badge pending"><Clock size={13} /> Chờ xử lý</span>;
};

const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const parseTitle = (title) => {
    const match = title?.match(/^\[(.+?)\]\s*(.*)$/);
    if (match) return { category: match[1], subject: match[2] };
    return { category: 'Khác', subject: title };
};

const parseContent = (content) => {
    const match = content?.match(/^Đánh giá:\s*(\d+)\/5\s*\n---\n([\s\S]*)$/);
    if (match) return { rating: parseInt(match[1]), body: match[2] };
    return { rating: 0, body: content };
};

const EMPTY_FORM = { category: '', subject: '', content: '', rating: 0 };

const ParentFeedbackDrawer = ({ autoOpenSignal = 0, hideTrigger = false }) => {
    const [open, setOpen] = useState(false);
    const [view, setView] = useState('list');
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedFb, setSelectedFb] = useState(null);

    const [form, setForm] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const fetchFeedbacks = useCallback(async (reason = 'manual') => {
        setLoading(true);
        try {
            const res = await api.get('/support-requests/my');
            const data = res.data || [];
            setFeedbacks(data);
            setSelectedFb((prev) => {
                if (!prev?.id) return null;
                return data.find((f) => f?.id === prev.id) || null;
            });
            console.debug('[ParentFeedbackDrawer] refreshed inbox badge', {
                reason,
                total: data.length,
                unread: data.filter(f => f.adminResponse && !f.isReadByUser).length
            });
        } catch {
            toast.error('Không thể tải danh sách phản hồi.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFeedbacks('mount');

        const intervalId = window.setInterval(() => {
            fetchFeedbacks('interval-30s');
        }, 30000);

        const handleFocus = () => fetchFeedbacks('window-focus');
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                fetchFeedbacks('tab-visible');
            }
        };
        const handleManualRefresh = () => fetchFeedbacks('custom-event');

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('parent-feedback-refresh', handleManualRefresh);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('parent-feedback-refresh', handleManualRefresh);
        };
    }, [fetchFeedbacks]);

    useEffect(() => {
        if (open) {
            fetchFeedbacks('drawer-open');
        }
    }, [open, fetchFeedbacks]);

    useEffect(() => {
        if (autoOpenSignal > 0) {
            setOpen(true);
        }
    }, [autoOpenSignal]);

    const unreadCount = feedbacks.filter(f => f.adminResponse && !f.isReadByUser).length;

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
            toast.success('Phản hồi đã được gửi thành công!');
            setForm(EMPTY_FORM);
            setErrors({});
            setView('list');
            await fetchFeedbacks('submit');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gửi phản hồi thất bại.');
        } finally {
            setSubmitting(false);
        }
    };

    const closeDrawer = () => {
        setOpen(false);
        setView('list');
        setSelectedFb(null);
        setForm(EMPTY_FORM);
        setErrors({});
    };

    return (
        <>
            {!hideTrigger && (
                <button className="tid-trigger-btn" onClick={() => setOpen(true)}>
                    <Inbox size={16} />
                    Hộp thư
                    {unreadCount > 0 && (
                        <span className="tid-trigger-badge">{unreadCount}</span>
                    )}
                </button>
            )}

            {open && <div className="tid-overlay" onClick={closeDrawer} />}

            <div className={`tid-drawer ${open ? 'open' : ''}`}>
                <div className="tid-drawer-header">
                    {view !== 'list' ? (
                        <button className="tid-back-btn" onClick={() => { setView('list'); setSelectedFb(null); }}>
                            <ArrowLeft size={16} /> Quay lại
                        </button>
                    ) : (
                        <div className="tid-drawer-title">
                            <Inbox size={18} />
                            <span>Hộp thư</span>
                            {unreadCount > 0 && (
                                <span className="tid-drawer-title-badge">{unreadCount}</span>
                            )}
                        </div>
                    )}
                    <button className="tid-close-btn" onClick={closeDrawer}>
                        <X size={20} />
                    </button>
                </div>

                <div className="tid-drawer-body">
                    {view === 'list' && (
                        <div>
                            <div style={{ padding: '0 0', borderBottom: '1px solid #f1f5f9' }}></div>

                            {loading ? (
                                <div className="tid-empty"><p>Đang tải...</p></div>
                            ) : feedbacks.length === 0 ? (
                                <div className="tid-empty">
                                    <MailOpen size={40} strokeWidth={1} />
                                    <p>Chưa có phản hồi nào được gửi.</p>
                                </div>
                            ) : feedbacks.map(fb => {
                                const { category, subject } = parseTitle(fb.title);
                                const { rating } = parseContent(fb.content);
                                return (
                                    <div
                                        key={fb.id}
                                        className={`tid-msg-item ${fb.adminResponse && !fb.isReadByUser ? 'unread' : ''}`}
                                        onClick={() => { setSelectedFb(fb); setView('detail'); }}
                                    >
                                        <div className={`tid-msg-avatar ${fb.adminResponse ? 'replied' : 'pending'}`}>
                                            {fb.adminResponse ? 'A' : 'T'}
                                        </div>
                                        <div className="tid-msg-body">
                                            <div className="tid-msg-top">
                                                <span className="tid-msg-sender">{category}</span>
                                                <span className="tid-msg-time">{formatDate(fb.createdAt)}</span>
                                            </div>
                                            <div className={`tid-msg-title ${fb.adminResponse && !fb.isReadByUser ? 'unread' : ''}`}>
                                                {fb.adminResponse && !fb.isReadByUser && <span className="tid-unread-dot" />}
                                                {subject}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                                <div style={{ display: 'flex', gap: '2px' }}>
                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                        <Star key={i} size={11} fill={i < rating ? '#f59e0b' : 'none'} color={i < rating ? '#f59e0b' : '#e2e8f0'} />
                                                    ))}
                                                </div>
                                                <StatusBadge status={fb.status} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {view === 'detail' && selectedFb && (() => {
                        const { category, subject } = parseTitle(selectedFb.title);
                        const { rating, body } = parseContent(selectedFb.content);
                        return (
                            <div className="tid-detail">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <div>
                                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: '999px' }}>{category}</span>
                                    </div>
                                    <StatusBadge status={selectedFb.status} />
                                </div>

                                <h3 className="tid-detail-subject">{subject}</h3>

                                <div style={{ display: 'flex', gap: '2px', marginBottom: '12px' }}>
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Star key={i} size={16} fill={i < rating ? '#f59e0b' : 'none'} color={i < rating ? '#f59e0b' : '#e2e8f0'} />
                                    ))}
                                </div>

                                <div className="tid-detail-content">{body}</div>

                                <div className="tid-detail-time" style={{ marginBottom: '16px' }}>
                                    <Clock size={12} /> {formatDate(selectedFb.createdAt)}
                                </div>

                                {selectedFb.adminResponse ? (
                                    <div className="tid-response-box">
                                        <div className="tid-response-header">
                                            <CheckCircle size={14} /> Phản hồi từ trung tâm
                                        </div>
                                        <p className="tid-response-text">{selectedFb.adminResponse}</p>
                                        {selectedFb.receiverName && <p className="tid-response-by">Bởi: {selectedFb.receiverName}</p>}
                                    </div>
                                ) : (
                                    <div className="tid-pending-box">
                                        <MessageSquare size={16} />
                                        Trung tâm chưa phản hồi. Vui lòng chờ trong ít phút.
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            </div>
        </>
    );
};

export default ParentFeedbackDrawer;