import { useState, useEffect, useCallback } from 'react';
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

    const fetchRequests = useCallback(async (reason = 'manual') => {
        try {
            const res = await api.get('/support-requests/my');
            const data = res.data || [];
            setRequests(data);
            setSelectedMsg((prev) => {
                if (!prev?.id) return null;
                return data.find((r) => r?.id === prev.id) || null;
            });
            console.debug('[TeacherInboxDrawer] refreshed inbox badge', {
                reason,
                total: data.length,
                unread: data.filter(r => r.adminResponse && !r.isReadByUser).length
            });
        } catch (err) {
            console.warn('[TeacherInboxDrawer] failed to refresh inbox badge', {
                reason,
                error: err?.response?.data || err?.message || err
            });
        }
    }, []);

    useEffect(() => {
        fetchRequests('mount');

        const intervalId = window.setInterval(() => {
            fetchRequests('interval-30s');
        }, 30000);

        const handleFocus = () => fetchRequests('window-focus');
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                fetchRequests('tab-visible');
            }
        };
        const handleManualRefresh = () => fetchRequests('custom-event');

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('teacher-inbox-refresh', handleManualRefresh);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('teacher-inbox-refresh', handleManualRefresh);
        };
    }, [fetchRequests]);

    useEffect(() => {
        if (inboxOpen) {
            fetchRequests('drawer-open');
        }
    }, [inboxOpen, fetchRequests]);

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
                        /* â”€â”€ Message Detail â”€â”€ */
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

                            <h3 className="tid-detail-subject">
                                {(selectedMsg.title || '').replace(/\[SUPPORT\]|\[SCHEDULE_CHANGE\]/gi, '').trim()}
                            </h3>

                            <div className="tid-detail-content">
                                {(() => {
                                    const raw = selectedMsg.content || '';
                                    const cleaned = raw.replace(/\[SYSTEM_DATA\][\s\S]*?\[\/SYSTEM_DATA\]/g, '').trim();
                                    return cleaned.split('\n').map((line, i) => (
                                        <p key={i}>{line || '\u00a0'}</p>
                                    ));
                                })()}
                            </div>

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
                        /* â”€â”€ Message List â”€â”€ */
                        <div>
                            {messages.length === 0 ? (
                                <div className="tid-empty">
                                    <MailOpen size={48} strokeWidth={1} />
                                    <p>Không có tin nhắn nào</p>
                                </div>
                            ) : messages.map(msg => {
                                    const handleClick = async () => {
                                        setSelectedMsg(msg);
                                        // Nếu là tin nhắn chưa đọc từ admin thì đánh dấu đã đọc
                                        if (msg.adminResponse && !msg.isReadByUser) {
                                            try {
                                                await api.put(`/support-requests/${msg.id}/read`);
                                                // Cập nhật state local để mất dấu đỏ ngay lập tức
                                                setRequests(prev => prev.map(r => 
                                                    r.id === msg.id ? { ...r, isReadByUser: true, isRead: true } : r
                                                ));
                                            } catch (err) {
                                                console.warn("Failed to mark support request as read:", err);
                                            }
                                        }
                                    };
                                    
                                    return (
                                        <div
                                            key={msg.id}
                                            className={`tid-msg-item ${msg.adminResponse && !msg.isReadByUser ? 'unread' : ''}`}
                                            onClick={handleClick}
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
                                                    {(msg.title || '').replace(/\[SUPPORT\]|\[SCHEDULE_CHANGE\]/gi, '').trim()}
                                                </div>
                                                <div className="tid-msg-preview">
                                                    {(() => {
                                                        const base = msg.adminResponse || (msg.content || '').replace(/\[SYSTEM_DATA\][\s\S]*?\[\/SYSTEM_DATA\]/g, '').trim();
                                                        return base.substring(0, 60) + (base.length > 60 ? '...' : '');
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default TeacherInboxDrawer;

