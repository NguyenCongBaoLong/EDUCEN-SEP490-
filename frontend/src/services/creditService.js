import api from './api';
import adminApi from './adminApi';

const creditService = {
    /**
     * Lấy số dư credit của center (dùngcho Center Admin - qua tenant header)
     */
    getCreditBalance: async (tenantId) => {
        // Thử dùng admin subscription endpoint trước (có auth)
        try {
            const response = await api.get('/admin/subscription/credit-balance');
            return response.data;
        } catch {
            // Fallback cho SystemAdmin
            const response = await adminApi.get(`/admin/tenants/${tenantId}/credit-balance`);
            return response.data;
        }
    },

    /**
     * Lấy lịch sử credit ledger của center
     */
    getCreditLedger: async (tenantId, page = 1, pageSize = 20) => {
        try {
            const response = await api.get('/admin/subscription/credit-ledger', {
                params: { page, pageSize }
            });
            return response.data;
        } catch {
            const response = await adminApi.get(`/admin/tenants/${tenantId}/credit-ledger`, {
                params: { page, pageSize }
            });
            return response.data;
        }
    }
};

export default creditService;