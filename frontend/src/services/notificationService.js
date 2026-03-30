import api from './api';

const notificationService = {
    // Lấy danh sách thông báo
    getNotifications: async (tenantId, unreadOnly = false) => {
        const response = await api.get(`/notifications?tenantId=${tenantId}&unreadOnly=${unreadOnly}`);
        return response.data;
    },

    // Đánh dấu đã đọc
    markAsRead: async (notificationId) => {
        const response = await api.post(`/notifications/${notificationId}/read`);
        return response.data;
    },

    // Đánh dấu tất cả đã đọc
    markAllAsRead: async (tenantId) => {
        const response = await api.post(`/notifications/read-all?tenantId=${tenantId}`);
        return response.data;
    },

    // Xóa thông báo
    deleteNotification: async (notificationId) => {
        const response = await api.delete(`/notifications/${notificationId}`);
        return response.data;
    },

    // Gửi nhắc nhở thanh toán
    sendReminder: async (invoiceId) => {
        const response = await api.post(`/notifications/send-reminder/${invoiceId}`);
        return response.data;
    },

    // Gửi nhắc nhở hàng loạt
    sendBatchReminders: async (daysBefore = 3) => {
        const response = await api.post(`/notifications/send-batch-reminders?daysBefore=${daysBefore}`);
        return response.data;
    }
};

export default notificationService;
