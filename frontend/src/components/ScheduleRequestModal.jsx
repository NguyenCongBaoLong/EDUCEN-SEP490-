import { useState } from 'react';
import { X, Send, AlertCircle, Info, Clock, UserCheck } from 'lucide-react';
import PropTypes from 'prop-types';
import '../css/components/ScheduleRequestModal.css';

const ScheduleRequestModal = ({ isOpen, onClose, onSend, initialData }) => {
    const [requestType, setRequestType] = useState(initialData?.type || 'reschedule');
    const [priority, setPriority] = useState('normal');
    const [reason, setReason] = useState('');
    const [proposedTime, setProposedTime] = useState('');

    if (!isOpen) return null;

    const requestTypes = [
        { id: 'reschedule', label: 'Đổi lịch dạy', icon: Clock },
        { id: 'teacher_swap', label: 'Đổi giáo viên', icon: UserCheck },
        { id: 'absence', label: 'Xin nghỉ / Hủy buổi', icon: X },
        { id: 'other', label: 'Thay đổi khác', icon: Info },
    ];

    const handleSend = () => {
        const payload = {
            type: requestType,
            priority,
            reason,
            proposedTime,
            classInfo: initialData?.classInfo,
            requestedAt: new Date().toISOString(),
        };
        onSend(payload);
        setReason('');
        setProposedTime('');
        onClose();
    };

    return (
        <div className="req-modal-overlay">
            <div className="req-modal-container">
                <div className="req-modal-header">
                    <div className="req-header-title">
                        <AlertCircle className="req-header-icon" />
                        <h2>Yêu cầu thay đổi</h2>
                    </div>
                    <button className="req-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="req-modal-content">
                    {initialData?.classInfo && (
                        <div className="req-class-info">
                            <span className="req-info-label">Buổi học:</span>
                            <span className="req-info-value">{initialData.classInfo.name} ({initialData.classInfo.code})</span>
                            <div className="req-info-time">{initialData.classInfo.time} | {initialData.classInfo.date}</div>
                        </div>
                    )}

                    <div className="req-form-group">
                        <label>Loại yêu cầu</label>
                        <div className="req-type-grid">
                            {requestTypes.map((type) => {
                                const Icon = type.icon;
                                return (
                                    <button
                                        key={type.id}
                                        className={`req-type-card ${requestType === type.id ? 'active' : ''}`}
                                        onClick={() => setRequestType(type.id)}
                                    >
                                        <Icon size={18} />
                                        <span>{type.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>



                    <div className="req-form-group">
                        <label>Lý do & Nội dung chi tiết</label>
                        <textarea
                            className="req-textarea"
                            placeholder="Hãy mô tả chi tiết lý do thay đổi để admin dễ dàng xử lý..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        ></textarea>
                    </div>
                </div>

                <div className="req-modal-footer">
                    <button className="req-btn-cancel" onClick={onClose}>Hủy bỏ</button>
                    <button
                        className="req-btn-send"
                        disabled={!reason.trim()}
                        onClick={handleSend}
                    >
                        <Send size={16} />
                        Gửi yêu cầu
                    </button>
                </div>
            </div>
        </div>
    );
};

ScheduleRequestModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSend: PropTypes.func.isRequired,
    initialData: PropTypes.shape({
        type: PropTypes.string,
        classInfo: PropTypes.shape({
            name: PropTypes.string,
            code: PropTypes.string,
            time: PropTypes.string,
            date: PropTypes.string,
        })
    })
};

export default ScheduleRequestModal;
