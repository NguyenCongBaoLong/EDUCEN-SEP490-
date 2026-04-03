import { useState, useEffect } from 'react';
import { Inbox, X, ArrowLeft, Clock, MailOpen, CheckCircle, MessageSquare } from 'lucide-react';
import api from '../services/api';
import '../css/components/TeacherInboxDrawer.css';

function formatDateTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

const TeacherInboxDrawer = () => {
    const [inboxOpen, setInboxOpen] = useState(false);
    const [requests, setRequests] = useState([]);
    const [selectedMsg, setSelectedMsg] = useState(null);

    const fetchRequests = async () => {
        try {
            const res = await api.get('/support-requests/my');
            setRequests(res.data || []);
        } catch (err) {
            console.error('Error fetching support requests:', err);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const unreadCount = requests.filter(r => r.adminResponse && !r.isReadByUser).length;

    const messages = [...requests].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    const closeDrawer = () => {
        setInboxOpen(false);
        setSelectedMsg(null);
    };

    return (
        <>
            {/* Trigger Button */}
            <button className="tid-trigger-btn" onClick={() => setInboxOpen(true)}>
                <Inbox size={16} />
                Hộp Thư
                {unreadCount > 0 && (
                    <span className="tid-trigger-badge">{unreadCount}</span>
                )}
            </button>

            {/* Overlay */}
            {inboxOpen && (
                <div className="tid-overlay" onClick={closeDrawer} />
            )}

            {/* Drawer */}
            <div className={`tid-drawer ${inboxOpen ? 'open' : ''}`}>

                {/* Header */}
                <div className="tid-drawer-header">
                    {selectedMsg ? (
                        <button className="tid-back-btn" onClick={() => setSelectedMsg(null)}>
                            <ArrowLeft size={16} /> Tất cả tin nhắn
                        </button>
                    ) : (
                        <div className="tid-drawer-title">
                            <Inbox size={18} />
                            <span>Hộp Thư</span>
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
                    {selectedMsg ? (
                        /* ── Message Detail ── */
                        <div className="tid-detail">
                            <div className="tid-detail-sender-row">
                                <div className="tid-detail-avatar">T</div>
                                <div className="tid-detail-sender-info">
                                    <div className="tid-detail-sender-name">Bạn</div>
                                    <div className="tid-detail-sender-role">Yêu cầu hỗ trợ</div>
                                </div>
                                <div className="tid-detail-time">
                                    <Clock size={12} />
                                    {formatDateTime(selectedMsg.createdAt)}
                                </div>
                            </div>

                            <h3 className="tid-detail-subject">{selectedMsg.title}</h3>

                            <div className="tid-detail-content">{selectedMsg.content}</div>

                            <div className="tid-status-wrap">
                                <span className={`tid-status-badge ${selectedMsg.adminResponse ? 'answered' : 'pending'}`}>
                                    {selectedMsg.adminResponse ? (
                                        <><CheckCircle size={12} /> Đã được phản hồi</>
                                    ) : (
                                        <><Clock size={12} /> Chờ phản hồi</>
                                    )}
                                </span>
                            </div>

                            {selectedMsg.adminResponse ? (
                                <div className="tid-response-box">
                                    <div className="tid-response-header">
                                        <CheckCircle size={14} /> Phản hồi từ Admin
                                    </div>
                                    <p className="tid-response-text">{selectedMsg.adminResponse}</p>
                                    {selectedMsg.receiverName && (
                                        <p className="tid-response-by">Bởi: {selectedMsg.receiverName}</p>
                                    )}
                                </div>
                            ) : (
                                <div className="tid-pending-box">
                                    <MessageSquare size={16} />
                                    Admin chưa phản hồi yêu cầu này. Vui lòng chờ trong ít phút.
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ── Message List ── */
                        <div>
                            {messages.length === 0 ? (
                                <div className="tid-empty">
                                    <MailOpen size={48} strokeWidth={1} />
                                    <p>Không có tin nhắn nào</p>
                                </div>
                            ) : messages.map(msg => (
                                <div
                                    key={msg.id}
                                    className={`tid-msg-item ${msg.adminResponse && !msg.isReadByUser ? 'unread' : ''}`}
                                    onClick={() => setSelectedMsg(msg)}
                                >
                                    <div className={`tid-msg-avatar ${msg.adminResponse ? 'replied' : 'pending'}`}>
                                        {msg.adminResponse ? 'A' : 'T'}
                                    </div>
                                    <div className="tid-msg-body">
                                        <div className="tid-msg-top">
                                            <span className="tid-msg-sender">
                                                {msg.adminResponse ? 'Admin đã phản hồi' : 'Chờ phản hồi'}
                                            </span>
                                            <span className="tid-msg-time">
                                                {formatDateTime(msg.createdAt)}
                                            </span>
                                        </div>
                                        <div className={`tid-msg-title ${msg.adminResponse && !msg.isReadByUser ? 'unread' : ''}`}>
                                            {msg.adminResponse && !msg.isReadByUser && (
                                                <span className="tid-unread-dot" />
                                            )}
                                            {msg.title}
                                        </div>
                                        <div className="tid-msg-preview">
                                            {msg.adminResponse
                                                ? msg.adminResponse.substring(0, 60) + (msg.adminResponse.length > 60 ? '...' : '')
                                                : msg.content?.substring(0, 60) + (msg.content?.length > 60 ? '...' : '')}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default TeacherInboxDrawer;
