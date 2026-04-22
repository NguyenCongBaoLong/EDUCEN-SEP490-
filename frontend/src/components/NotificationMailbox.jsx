import { useMemo, useState } from 'react';
import {
    Inbox, X, ArrowLeft, Clock, MailOpen, Star, Trash2, Search, Filter,
    ShieldAlert
} from 'lucide-react';
import '../css/components/NotificationMailbox.css';

const formatDateTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const NotificationMailbox = ({
    messages = [],
    loading = false,
    error = '',
    open = true,
    variant = 'drawer',
    title = 'Hộp Thư',
    emptyText = 'Không có tin nhắn nào',
    selectedMessage: controlledSelected,
    onSelectedMessageChange,
    onMarkAsRead,
    onDelete,
    onClose,
    showOverlay = false,
    onOverlayClick,
    showClose = variant === 'drawer',
    renderDetailExtra,
}) => {
    const [internalSelected, setInternalSelected] = useState(null);
    const selectedMessage = controlledSelected ?? internalSelected;
    const setSelectedMessage = onSelectedMessageChange ?? setInternalSelected;
    const getSenderInitial = (name) => (name || '').trim().charAt(0) || '?';

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all'); // all, unread, system, support, feedback, replied

    const unreadCount = useMemo(() => messages.filter(m => !m.isRead && !m.adminResponse).length, [messages]);

    const filteredMessages = useMemo(() => {
        return messages.filter(m => {
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const textTarget = `${m.subject} ${m.senderName} ${m.preview}`.toLowerCase();
                if (!textTarget.includes(query)) return false;
            }
            if (filterType === 'unread') return !m.isRead && !m.adminResponse;
            if (filterType === 'system') return m.type === 'system';
            if (filterType === 'support') return m.type === 'support' && m.status !== 'Approved' && m.status !== 'Rejected' && m.status !== 'Answered';
            if (filterType === 'feedback') return m.type === 'feedback';
            if (filterType === 'replied') return m.status === 'Answered' || m.status === 'Approved' || m.status === 'Rejected';
            return true;
        });
    }, [messages, searchQuery, filterType]);

    const handleSelectMessage = (msg) => {
        setSelectedMessage(msg);
        if (onMarkAsRead) onMarkAsRead(msg);
    };

    const handleDelete = async () => {
        if (!selectedMessage?.canDelete || !onDelete) return;
        const result = await onDelete(selectedMessage);
        if (result !== false) setSelectedMessage(null);
    };

    const handleClose = () => {
        if (onClose) onClose();
    };

    return (
        <div className={`mailbox-panel ${variant}`}>
            {showOverlay && open && (
                <div
                    className="inbox-overlay"
                    onClick={onOverlayClick || onClose}
                />
            )}

            <div className={`inbox-drawer ${open ? 'open' : ''}`}>
                <div className="inbox-drawer-header">
                    {selectedMessage ? (
                        <button
                            className="inbox-back-btn"
                            onClick={() => setSelectedMessage(null)}
                        >
                            <ArrowLeft size={16} /> Tất cả thông báo
                        </button>
                    ) : (
                        <div className="inbox-drawer-title">
                            <Inbox size={18} />
                            <span>{title}</span>
                            {unreadCount > 0 && (
                                <span className="drawer-unread-badge">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                    )}
                    <div className="inbox-drawer-actions">
                        {selectedMessage?.canDelete && onDelete && (
                            <button
                                className="mailbox-action-btn danger"
                                onClick={handleDelete}
                                title="Xóa thông báo"
                                type="button"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                        {showClose && (
                            <button
                                className="inbox-drawer-close"
                                onClick={handleClose}
                                type="button"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                </div>

                {!selectedMessage && (
                    <div className="inbox-filters-bar">
                        <div className="inbox-search-box">
                            <Search size={14} className="inbox-search-icon" />
                            <input 
                                type="text" 
                                placeholder="Tìm kiếm tin nhắn..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                        <div className="inbox-filter-tabs">
                            <button className={filterType === 'all' ? 'active' : ''} onClick={() => setFilterType('all')}>Tất cả</button>
                            <button className={filterType === 'unread' ? 'active' : ''} onClick={() => setFilterType('unread')}>Chưa đọc</button>
                            <button className={filterType === 'replied' ? 'active' : ''} onClick={() => setFilterType('replied')}>Đã phản hồi</button>
                            <button className={filterType === 'support' ? 'active' : ''} onClick={() => setFilterType('support')}>Chờ xử lý</button>
                            <button className={filterType === 'system' ? 'active' : ''} onClick={() => setFilterType('system')}>Hệ thống</button>
                        </div>
                    </div>
                )}

                {selectedMessage ? (
                    <div className="inbox-drawer-detail">
                        <div className="drawer-detail-sender-row">
                            <div className={`inbox-avatar ${selectedMessage.type} ${selectedMessage.priority === 'high' ? 'warning' : ''}`}>
                                {selectedMessage.type === 'system'
                                    ? (selectedMessage.priority === 'high' ? '⚠️' : '📢')
                                    : selectedMessage.type === 'subscription' ? '⭐'
                                    : selectedMessage.type === 'schedule_change' ? <Clock size={18} />
                                    : selectedMessage.type === 'support' ? <ShieldAlert size={18} /> 
                                    : getSenderInitial(selectedMessage.senderName)}
                            </div>
                            <div className="drawer-detail-sender-info">
                                <div className="drawer-detail-sender-name">{selectedMessage.senderName}</div>
                                <div className="drawer-detail-sender-role">{selectedMessage.senderRole}</div>
                            </div>
                            <div className="drawer-detail-time">
                                <Clock size={12} />
                                {formatDateTime(selectedMessage.sentAt)}
                            </div>
                        </div>
                        <h3 className="drawer-detail-subject">{selectedMessage.subject}</h3>
                        <div className="drawer-detail-body">
                            {(() => {
                                // Xử lý giấu thông tin hệ thống khỏi giao diện người dùng
                                const rawContent = selectedMessage.content || '';
                                const cleanContent = rawContent.replace(/\[SYSTEM_DATA\][\s\S]*?\[\/SYSTEM_DATA\]/g, '').trim();
                                
                                return cleanContent.split('\n').map((line, i) => (
                                    <p key={i}>{line || '\u00a0'}</p>
                                ));
                            })()}
                        </div>
                        {renderDetailExtra && renderDetailExtra(selectedMessage)}
                    </div>
                ) : (
                    <div className="inbox-drawer-list">
                        {loading && (
                            <div className="mailbox-state">Đang tải...</div>
                        )}
                        {!loading && error && (
                            <div className="mailbox-state error">{error}</div>
                        )}
                        {!loading && !error && filteredMessages.length === 0 && (
                            <div className="inbox-empty">
                                <MailOpen size={36} />
                                <p>{messages.length === 0 ? emptyText : 'Không tìm thấy tin nhắn phù hợp'}</p>
                            </div>
                        )}
                        {!loading && !error && filteredMessages.length > 0 && filteredMessages.map(msg => (
                            <div
                                key={msg.id}
                                className={`drawer-msg-item ${(!msg.isRead && !msg.adminResponse) ? 'unread' : ''} ${msg.priority === 'high' ? 'high-priority' : ''}`}
                                onClick={() => handleSelectMessage(msg)}
                            >
                                <div className={`inbox-avatar ${msg.type} ${msg.priority === 'high' ? 'warning' : ''}`}>
                                    {msg.type === 'system' ? (msg.priority === 'high' ? '⚠️' : '📢') 
                                        : msg.type === 'subscription' ? '⭐'
                                        : msg.type === 'schedule_change' ? <Clock size={16} />
                                        : msg.type === 'support' ? <ShieldAlert size={16} /> 
                                        : getSenderInitial(msg.senderName)}
                                </div>
                                <div className="drawer-msg-body">
                                    <div className="drawer-msg-top">
                                        <span className="drawer-msg-sender">{msg.senderName}</span>
                                        <span className="drawer-msg-time">{formatDateTime(msg.sentAt)}</span>
                                    </div>
                                    <div className="drawer-msg-subject">
                                        {!msg.isRead && !msg.adminResponse && <span className="unread-dot" />}
                                        {msg.priority === 'high' && <Star size={12} className="priority-star" />}
                                        {msg.subject}
                                    </div>
                                    <div className="drawer-msg-preview">{msg.preview || ''}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationMailbox;
