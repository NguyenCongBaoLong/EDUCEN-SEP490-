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
    },

    // Lấy danh sách yêu cầu hỗ trợ (Support Requests)
    getSupportRequests: async () => {
        const response = await api.get('/admin/support-requests');
        return response;
    },

    // Lấy danh sách thông báo hệ thống (System Notifications)
    getSystemNotifications: async (tenantId) => {
        const response = await api.get(`/notifications?tenantId=${tenantId}`);
        return response;
    },

    // Trả lời yêu cầu hỗ trợ
    replyToSupportRequest: async (requestId, replyText) => {
        const response = await api.put(`/admin/support-requests/${requestId}/reply`, { replyContent: replyText });
        return response;
    },

    // Đánh dấu yêu cầu hỗ trợ là đã đọc
    markSupportRequestAsRead: async (requestId) => {
        const response = await api.put(`/admin/support-requests/${requestId}/read`);
        return response;
    }
};

export default notificationService;
