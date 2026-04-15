import adminApi from './adminApi';

const refundService = {
    getRefunds: async (filter = {}) => {
        const response = await adminApi.get('/refunds', { params: filter });
        return response.data;
    },

    getRefundById: async (refundId) => {
        const response = await adminApi.get(`/refunds/${refundId}`);
        return response.data;
    },

    canRefund: async (paymentRecordId) => {
        const response = await adminApi.get(`/refunds/can-refund/${paymentRecordId}`);
        return response.data;
    },

    createRefund: async (payload) => {
        const response = await adminApi.post('/refunds', payload);
        return response.data;
    },

    approveRefund: async (refundId, notes = '') => {
        const response = await adminApi.post(`/refunds/${refundId}/approve`, { notes });
        return response.data;
    },

    rejectRefund: async (refundId, reason) => {
        const response = await adminApi.post(`/refunds/${refundId}/reject`, { reason });
        return response.data;
    },

    processRefund: async (refundId) => {
        const response = await adminApi.post(`/refunds/${refundId}/process`);
        return response.data;
    },

    getSubscriptionHistory: async (tenantId) => {
        const response = await adminApi.get(`/admin/tenants/${tenantId}/subscription-history`);
        return response.data;
    },

    getTenants: async () => {
        const response = await adminApi.get('/admin/Tenants');
        return response.data;
    }
};

export default refundService;
