import api from './api';
import adminApi from './adminApi';

const zaloOAService = {
    // === Tenant Admin APIs ===

    // Kiểm tra trạng thái Zalo OA
    getStatus: async () => {
        const response = await api.get('/ZaloOAMessage/status');
        return response.data;
    },

    // Gửi tin nhắn hàng loạt qua Zalo OA
    sendBatch: async (title, content, target = 'all') => {
        const response = await api.post('/ZaloOAMessage/send-batch', { title, content, target });
        return response.data;
    },

    // Lấy danh sách follower
    getFollowers: async () => {
        const response = await api.get('/ZaloOAMessage/followers');
        return response.data;
    },

    // Lấy lịch sử gửi tin nhắn
    getMessageHistory: async () => {
        const response = await api.get('/ZaloOAMessage/message-history');
        return response.data;
    },

    // === System Admin APIs (dùng adminApi) ===

    // Lấy tất cả config OA
    getAllConfigs: async () => {
        const response = await adminApi.get('/admin/ZaloOAConfig');
        return response.data;
    },

    // Lấy config OA của 1 tenant
    getConfig: async (tenantId) => {
        const response = await adminApi.get(`/admin/ZaloOAConfig/${tenantId}`);
        return response.data;
    },

    // Thiết lập OA cho tenant
    setupConfig: async (tenantId, oaId, secretKey) => {
        const response = await adminApi.post(`/admin/ZaloOAConfig/${tenantId}`, { oaId, secretKey });
        return response.data;
    },

    // Xóa config OA
    deleteConfig: async (tenantId) => {
        const response = await adminApi.delete(`/admin/ZaloOAConfig/${tenantId}`);
        return response.data;
    },

    // Kiểm tra kết nối OA
    verifyConnection: async (tenantId) => {
        const response = await adminApi.post(`/admin/ZaloOAConfig/${tenantId}/verify`);
        return response.data;
    },

    // Lấy URL cấp quyền Zalo OA
    getAuthUrl: async (tenantId, redirectUri) => {
        const response = await adminApi.get(`/admin/ZaloOAConfig/${tenantId}/auth-url?redirectUri=${encodeURIComponent(redirectUri)}`);
        return response.data;
    },

    // Debug: kiểm tra thông tin config OA
    debugConfig: async (tenantId) => {
        const response = await adminApi.get(`/admin/ZaloOAConfig/${tenantId}/debug`);
        return response.data;
    },

    // OAuth callback
    handleCallback: async (tenantId, code, state) => {
        const response = await adminApi.get(`/admin/ZaloOAConfig/${tenantId}/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state || '')}`);
        return response.data;
    },
};

export default zaloOAService;
