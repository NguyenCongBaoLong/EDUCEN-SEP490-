import { useEffect, useMemo, useState } from 'react';
import NotificationMailbox from '../../components/NotificationMailbox';
import notificationService from '../../services/notificationService';
import { useAuth } from '../../context/AuthContext';
import '../../css/pages/shared/MailboxPage.css';

const normalizeNotifications = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== 'object') return [];
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.notifications)) return payload.notifications;
    if (Array.isArray(payload.items)) return payload.items;
    return [];
};

const MailboxPage = ({
    SidebarComponent,
    headerTitle = 'Hộp thư',
    headerSubtitle = 'Theo dõi thông báo từ trung tâm'
}) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const tenantId = useMemo(() => {
        const isValidTenantId = (value) => (
            !!value && value !== 'undefined' && value !== 'null'
        );

        if (isValidTenantId(user?.tenantId)) return user.tenantId;

        const storedTenantId = localStorage.getItem('tenantId');
        if (isValidTenantId(storedTenantId)) return storedTenantId;

        return null;
    }, [user?.tenantId]);

    const fetchNotifications = async () => {
        if (!tenantId) {
            setNotifications([]);
            setError('Không tìm thấy trung tâm để tải thông báo.');
            setLoading(false);
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await notificationService.getNotifications(tenantId);
            setNotifications(normalizeNotifications(res));
        } catch (err) {
            console.error('Error fetching notifications:', err);
            setError('Không thể tải thông báo.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [tenantId]);

    const inboxMessages = useMemo(() => (
        notifications.map(n => {
            const message = n.message || '';
            return {
                id: `notif-${n.notificationId}`,
                notificationId: n.notificationId,
                type: 'system',
                senderName: 'Hệ thống',
                senderRole: n.category === 'Subscription' ? 'Thông báo gói dịch vụ' : 'Thông báo',
                subject: n.title,
                preview: message.substring(0, 80) + (message.length > 80 ? '...' : ''),
                content: message,
                sentAt: n.createdAt,
                isRead: n.isRead,
                priority: n.type === 'Warning' ? 'high' : 'normal',
                category: n.category,
                referenceId: n.referenceId,
                canDelete: true,
            };
        })
            .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
    ), [notifications]);

    const handleMarkAsRead = async (msg) => {
        if (!msg?.notificationId || msg.isRead) return;
        try {
            await notificationService.markAsRead(msg.notificationId);
            setNotifications(prev =>
                prev.map(n => n.notificationId === msg.notificationId ? { ...n, isRead: true } : n)
            );
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    };

    const handleDelete = async (msg) => {
        if (!msg?.notificationId) return false;
        try {
            await notificationService.deleteNotification(msg.notificationId);
            setNotifications(prev => prev.filter(n => n.notificationId !== msg.notificationId));
            return true;
        } catch (err) {
            console.error('Error deleting notification:', err);
            return false;
        }
    };

    return (
        <div className="mailbox-page">
            {SidebarComponent && <SidebarComponent />}
            <main className="mailbox-main">
                <div className="mailbox-header">
                    <div>
                        <h1 className="mailbox-title">{headerTitle}</h1>
                        <p className="mailbox-subtitle">{headerSubtitle}</p>
                    </div>
                </div>

                <NotificationMailbox
                    variant="page"
                    open={true}
                    messages={inboxMessages}
                    loading={loading}
                    error={error}
                    onMarkAsRead={handleMarkAsRead}
                    onDelete={handleDelete}
                    emptyText="Không có thông báo"
                />
            </main>
        </div>
    );
};

export default MailboxPage;
