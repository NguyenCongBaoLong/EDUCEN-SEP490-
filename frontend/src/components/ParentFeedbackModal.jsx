import { useState } from 'react';
import { 
    X, Send, AlertCircle, MessageSquare, Star, 
    GraduationCap, Building, Calendar, CreditCard, Users, BookOpen, Smile 
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import '../css/components/ParentFeedbackModal.css';

const CATEGORIES = [
    { id: 'Chất lượng giảng dạy', label: 'Giảng dạy', icon: GraduationCap },
    { id: 'Cơ sở vật chất', label: 'Cơ sở vật chất', icon: Building },
    { id: 'Lịch học & Thời khóa biểu', label: 'Lịch học', icon: Calendar },
    { id: 'Học phí & Thanh toán', label: 'Học phí', icon: CreditCard },
    { id: 'Thái độ nhân viên', label: 'Nhân viên', icon: Users },
    { id: 'Kết quả học tập của con', label: 'Kết quả học', icon: BookOpen },
    { id: 'Khác', label: 'Khác', icon: Smile },
];

const ParentFeedbackModal = ({ isOpen, onClose, onSuccess }) => {
    const [form, setForm] = useState({ 
        category: '', 
        subject: '', 
        content: '', 
        rating: 0 
    });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen) return null;

    const validate = () => {
        const e = {};
        if (!form.category) e.category = 'Vui lòng chọn một danh mục.';
        if (!form.subject.trim()) e.subject = 'Vui lòng nhập tiêu đề.';
        if (!form.content.trim()) 
            e.content = 'Vui lòng nhập nội dung chi tiết.';
        if (form.rating === 0) e.rating = 'Vui lòng đánh giá mức độ hài lòng.';
        return e;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) {
            setErrors(errs);
            return;
        }

        setSubmitting(true);
        try {
            const title = `[${form.category}] ${form.subject}`;
            const content = `Đánh giá: ${form.rating}/5\n---\n${form.content}`;
            await api.post('/support-requests', { Title: title, Content: content });
            toast.success('Gửi phản hồi thành công!');
            onSuccess?.();
            onClose();
            setForm({ category: '', subject: '', content: '', rating: 0 });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gửi phản hồi thất bại.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="pf-modal-overlay">
            <div className="pf-modal-container">
                <div className="pf-modal-header">
                    <div className="pf-header-title">
                        <MessageSquare className="pf-header-icon" />
                        <h2>Gửi phản hồi cho trung tâm</h2>
                    </div>
                    <button className="pf-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="pf-modal-content">
                    <form onSubmit={handleSubmit}>
                        {/* Categories Grid */}
                        <div className="pf-form-group">
                            <label>Bạn muốn phản hồi về vấn đề gì? <span style={{color: '#ef4444'}}>*</span></label>
                            <div className="pf-type-grid">
                                {CATEGORIES.map((cat) => {
                                    const Icon = cat.icon;
                                    return (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            className={`pf-type-card ${form.category === cat.id ? 'active' : ''}`}
                                            onClick={() => {
                                                setForm(p => ({ ...p, category: cat.id }));
                                                setErrors(p => ({ ...p, category: undefined }));
                                            }}
                                        >
                                            <Icon size={20} />
                                            <span>{cat.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            {errors.category && <div className="pf-error-msg"><AlertCircle size={12} /> {errors.category}</div>}
                        </div>

                        {/* Subject */}
                        <div className="pf-form-group">
                            <label>Tiêu đề tóm tắt</label>
                            <input
                                className="pf-input"
                                type="text"
                                placeholder="Ví dụ: Phản hồi về giáo viên lớp Toán..."
                                value={form.subject}
                                onChange={e => {
                                    setForm(p => ({ ...p, subject: e.target.value }));
                                    setErrors(p => ({ ...p, subject: undefined }));
                                }}
                            />
                            {errors.subject && <div className="pf-error-msg"><AlertCircle size={12} /> {errors.subject}</div>}
                        </div>

                        {/* Rating */}
                        <div className="pf-form-group">
                            <label>Đánh giá mức độ hài lòng</label>
                            <div className="pf-star-row">
                                {[1, 2, 3, 4, 5].map(n => (
                                    <button
                                        key={n}
                                        type="button"
                                        className="pf-star"
                                        onClick={() => {
                                            setForm(p => ({ ...p, rating: n }));
                                            setErrors(p => ({ ...p, rating: undefined }));
                                        }}
                                    >
                                        <Star 
                                            size={24} 
                                            fill={n <= form.rating ? '#f59e0b' : 'none'} 
                                            color={n <= form.rating ? '#f59e0b' : '#cbd5e1'} 
                                        />
                                    </button>
                                ))}
                                <span className="pf-star-text">
                                    {form.rating === 0 ? 'Chưa đánh giá' : form.rating === 5 ? 'Rất hài lòng' : form.rating >= 4 ? 'Hài lòng' : form.rating >= 3 ? 'Bình thường' : 'Chưa hài lòng'}
                                </span>
                            </div>
                            {errors.rating && <div className="pf-error-msg"><AlertCircle size={12} /> {errors.rating}</div>}
                        </div>

                        {/* Content */}
                        <div className="pf-form-group">
                            <label>Nội dung chi tiết</label>
                            <textarea
                                className="pf-textarea"
                                placeholder="Hãy mô tả chi tiết vấn đề của bạn để trung tâm có thể hỗ trợ tốt nhất..."
                                value={form.content}
                                onChange={e => {
                                    setForm(p => ({ ...p, content: e.target.value }));
                                    setErrors(p => ({ ...p, content: undefined }));
                                }}
                            ></textarea>
                            <div style={{textAlign: 'right', fontSize: '0.7rem', color: '#94a3b8', marginTop: 4}}>
                                {form.content.length}/1000
                            </div>
                            {errors.content && <div className="pf-error-msg"><AlertCircle size={12} /> {errors.content}</div>}
                        </div>
                    </form>
                </div>

                <div className="pf-modal-footer">
                    <button className="pf-btn-cancel" onClick={onClose}>Hủy bỏ</button>
                    <button 
                        className="pf-btn-send" 
                        disabled={submitting}
                        onClick={handleSubmit}
                    >
                        <Send size={16} />
                        {submitting ? 'Đang gửi...' : 'Gửi phản hồi'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ParentFeedbackModal;
