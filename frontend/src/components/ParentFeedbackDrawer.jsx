import { useState, useEffect, useCallback } from 'react';
import {
    Inbox, X, ArrowLeft, Send, MessageSquare, CheckCircle,
    Clock, Star, AlertCircle, MailOpen
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import '../css/pages/parent/ParentFeedback.css';
import '../css/components/TeacherInboxDrawer.css'; // reuse drawer shell styles

const CATEGORIES = [
    'Cháº¥t lÆ°á»£ng giáº£ng dáº¡y',
    'CÆ¡ sá»Ÿ váº­t cháº¥t',
    'Lá»‹ch há»c & Thá»i khÃ³a biá»ƒu',
    'Há»c phÃ­ & Thanh toÃ¡n',
    'ThÃ¡i Ä‘á»™ nhÃ¢n viÃªn',
    'Káº¿t quáº£ há»c táº­p cá»§a con',
    'KhÃ¡c',
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
            {value === 0 ? 'ChÆ°a Ä‘Ã¡nh giÃ¡' : value === 1 ? 'Ráº¥t khÃ´ng hÃ i lÃ²ng' : value === 2 ? 'KhÃ´ng hÃ i lÃ²ng' : value === 3 ? 'BÃ¬nh thÆ°á»ng' : value === 4 ? 'HÃ i lÃ²ng' : 'Ráº¥t hÃ i lÃ²ng'}
        </span>
    </div>
);

const StatusBadge = ({ status }) => {
    if (status === 'Answered')
        return <span className="pf-status-badge replied"><MessageSquare size={13} /> ÄÃ£ tráº£ lá»i</span>;
    if (status === 'Read' || status === 'Pending')
        return <span className="pf-status-badge read"><CheckCircle size={13} /> ÄÃ£ xem</span>;
    return <span className="pf-status-badge pending"><Clock size={13} /> Chá» xá»­ lÃ½</span>;
};

const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const parseTitle = (title) => {
    const match = title?.match(/^\[(.+?)\]\s*(.*)$/);
    if (match) return { category: match[1], subject: match[2] };
    return { category: 'KhÃ¡c', subject: title };
};

const parseContent = (content) => {
    const match = content?.match(/^ÄÃ¡nh giÃ¡:\s*(\d+)\/5\s*\n---\n([\s\S]*)$/);
    if (match) return { rating: parseInt(match[1]), body: match[2] };
    return { rating: 0, body: content };
};

const EMPTY_FORM = { category: '', subject: '', content: '', rating: 0 };

const ParentFeedbackDrawer = ({ autoOpenSignal = 0, hideTrigger = false }) => {
    const [open, setOpen] = useState(false);
    // 'list' | 'form' | 'detail'
    const [view, setView] = useState('list');
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedFb, setSelectedFb] = useState(null);

    const [form, setForm] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    // This component now acts as 'Mailbox' only.
    // Send feedback is handled by ParentFeedbackModal.


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
            toast.error('KhÃ´ng thá»ƒ táº£i danh sÃ¡ch pháº£n há»“i.');
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
        if (!form.category) e.category = 'Vui lÃ²ng chá»n danh má»¥c.';
        if (!form.subject.trim()) e.subject = 'Vui lÃ²ng nháº­p tiÃªu Ä‘á».';
        if (!form.content.trim() || form.content.trim().length < 20) e.content = 'Ná»™i dung pháº£i cÃ³ Ã­t nháº¥t 20 kÃ½ tá»±.';
        if (form.rating === 0) e.rating = 'Vui lÃ²ng chá»n má»©c Ä‘Ã¡nh giÃ¡.';
        return e;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }

        setSubmitting(true);
        try {
            const title = `[${form.category}] ${form.subject}`;
            const content = `ÄÃ¡nh giÃ¡: ${form.rating}/5\n---\n${form.content}`;
            await api.post('/support-requests', { Title: title, Content: content });
            toast.success('Pháº£n há»“i Ä‘Ã£ Ä‘Æ°á»£c gá»­i thÃ nh cÃ´ng!');
            setForm(EMPTY_FORM);
            setErrors({});
            setView('list');
            await fetchFeedbacks('submit');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gá»­i pháº£n há»“i tháº¥t báº¡i.');
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
            {/* Trigger */}
            {!hideTrigger && (
                <button className="tid-trigger-btn" onClick={() => setOpen(true)}>
                    <Inbox size={16} />
                    Há»™p thÆ°
                    {unreadCount > 0 && (
                        <span className="tid-trigger-badge">{unreadCount}</span>
                    )}
                </button>
            )}

            {/* Overlay */}
            {open && <div className="tid-overlay" onClick={closeDrawer} />}

            {/* Drawer */}
            <div className={`tid-drawer ${open ? 'open' : ''}`}>

                {/* Header */}
                <div className="tid-drawer-header">
                    {view !== 'list' ? (
                        <button className="tid-back-btn" onClick={() => { setView('list'); setSelectedFb(null); }}>
                            <ArrowLeft size={16} /> Quay láº¡i
                        </button>
                    ) : (
                        <div className="tid-drawer-title">
                            <Inbox size={18} />
                            <span>Há»™p thÆ°</span>
                            {unreadCount > 0 && (
                                <span className="tid-drawer-title-badge">{unreadCount}</span>
                            )}
                        </div>
                    )}
                    <button className="tid-close-btn" onClick={closeDrawer}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="tid-drawer-body">

                    {/* â”€â”€ LIST VIEW â”€â”€ */}
                    {view === 'list' && (
                        <div>
                            {/* Send new feedback button */}
                            {/* Inbox list container */}
                            <div style={{ padding: '0 0', borderBottom: '1px solid #f1f5f9' }}>
                                {/* Feedback button removed as it is now in Sidebar */}
                            </div>

                            {/* Feedback history */}
                            {loading ? (
                                <div className="tid-empty"><p>Äang táº£i...</p></div>
                            ) : feedbacks.length === 0 ? (
                                <div className="tid-empty">
                                    <MailOpen size={40} strokeWidth={1} />
                                    <p>ChÆ°a cÃ³ pháº£n há»“i nÃ o Ä‘Æ°á»£c gá»­i.</p>
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

                    {/* FORM VIEW REMOVED - Handled by ParentFeedbackModal */}


                    {/* â”€â”€ DETAIL VIEW â”€â”€ */}
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
                                            <CheckCircle size={14} /> Pháº£n há»“i tá»« trung tÃ¢m
                                        </div>
                                        <p className="tid-response-text">{selectedFb.adminResponse}</p>
                                        {selectedFb.receiverName && <p className="tid-response-by">Bá»Ÿi: {selectedFb.receiverName}</p>}
                                    </div>
                                ) : (
                                    <div className="tid-pending-box">
                                        <MessageSquare size={16} />
                                        Trung tÃ¢m chÆ°a pháº£n há»“i. Vui lÃ²ng chá» trong Ã­t phÃºt.
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


