import { useEffect, useMemo, useState, useCallback } from 'react';
import { Bell, Clock, MailOpen, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import notificationService from '../services/notificationService';
import '../css/components/NotificationDrawer.css';

const normalizeNotifications = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== 'object') return [];
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.notifications)) return payload.notifications;
    if (Array.isArray(payload.items)) return payload.items;
    return [];
};

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

const NotificationDrawer = ({
    buttonClassName = '',
    label = 'Thông báo'
}) => {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [notifications, setNotifications] = useState([]);
    const [hasFetched, setHasFetched] = useState(false);

    const tenantId = useMemo(() => {
        const isValidTenantId = (value) => (
            !!value && value !== 'undefined' && value !== 'null'
        );

        if (isValidTenantId(user?.tenantId)) return user.tenantId;

        const storedTenantId = localStorage.getItem('tenantId');
        if (isValidTenantId(storedTenantId)) return storedTenantId;

        return null;
    }, [user?.tenantId]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const fetchNotifications = useCallback(async (reason = 'manual') => {
        if (!tenantId) {
            setNotifications([]);
            setError('Không tìm thấy trung tâm để tải thông báo.');
            setHasFetched(true);
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await notificationService.getNotifications(tenantId);
            const data = normalizeNotifications(res);
            setNotifications(data);
            console.debug('[NotificationDrawer] refreshed badge', {
                reason,
                total: data.length,
                unread: data.filter(n => !n.isRead).length
            });
        } catch (err) {
            console.warn('[NotificationDrawer] failed to refresh badge', {
                reason,
                error: err?.response?.data || err?.message || err
            });
            setError('Không thể tải thông báo.');
        } finally {
            setLoading(false);
            setHasFetched(true);
        }
    }, [tenantId]);

    useEffect(() => {
        fetchNotifications('mount');

        const intervalId = window.setInterval(() => {
            fetchNotifications('interval-30s');
        }, 30000);

        const handleFocus = () => fetchNotifications('window-focus');
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                fetchNotifications('tab-visible');
            }
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [fetchNotifications]);

    useEffect(() => {
        if (!open) return;
        if (!hasFetched || tenantId) {
            fetchNotifications('drawer-open');
        }
    }, [open, tenantId, hasFetched, fetchNotifications]);

    const handleMarkAsRead = async (notification) => {
        if (!notification?.notificationId || notification.isRead) return;
        try {
            await notificationService.markAsRead(notification.notificationId);
            setNotifications(prev =>
                prev.map(n => n.notificationId === notification.notificationId ? { ...n, isRead: true } : n)
            );
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    };

    const handleMarkAllAsRead = async () => {
        if (!tenantId || unreadCount === 0) return;
        try {
            await notificationService.markAllAsRead(tenantId);
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (err) {
            console.error('Error marking all notifications as read:', err);
        }
    };

    return (
        <>
            <button
                type="button"
                className={`notification-trigger ${buttonClassName}`}
                onClick={() => setOpen(true)}
            >
                <Bell size={18} />
                <span className="notification-label">{label}</span>
                {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount}</span>
                )}
            </button>

            {open && (
                <div
                    className="notification-overlay"
                    onClick={() => setOpen(false)}
                />
            )}

            <div className={`notification-drawer ${open ? 'open' : ''}`}>
                <div className="notification-drawer-header">
                    <div className="notification-drawer-title">
                        <Bell size={18} />
                        <span>Thông báo</span>
                        {unreadCount > 0 && (
                            <span className="notification-header-badge">{unreadCount}</span>
                        )}
                    </div>
                    <div className="notification-drawer-actions">
                        <button
                            type="button"
                            className="notification-mark-all"
                            onClick={handleMarkAllAsRead}
                            disabled={unreadCount === 0}
                        >
                            Đánh dấu đã đọc
                        </button>
                        <button
                            type="button"
                            className="notification-close"
                            onClick={() => setOpen(false)}
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="notification-drawer-body">
                    {loading && (
                        <div className="notification-state">Đang tải...</div>
                    )}
                    {!loading && error && (
                        <div className="notification-state error">{error}</div>
                    )}
                    {!loading && !error && notifications.length === 0 && (
                        <div className="notification-empty">
                            <MailOpen size={36} />
                            <p>Không có thông báo</p>
                        </div>
                    )}
                    {!loading && !error && notifications.length > 0 && (
                        <div className="notification-list">
                            {notifications.map((n) => (
                                <button
                                    type="button"
                                    key={n.notificationId || `${n.title}-${n.createdAt}`}
                                    className={`notification-item ${n.isRead ? '' : 'unread'}`}
                                    onClick={() => handleMarkAsRead(n)}
                                >
                                    <div className="notification-item-title">
                                        <span>{n.title || 'Thông báo'}</span>
                                        {!n.isRead && <span className="notification-dot" />}
                                    </div>
                                    <div className="notification-item-message">
                                        {n.message || n.content || ''}
                                    </div>
                                    <div className="notification-item-meta">
                                        <Clock size={12} />
                                        {formatDateTime(n.createdAt || n.sentAt)}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default NotificationDrawer;