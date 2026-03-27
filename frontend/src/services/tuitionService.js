import api from './api';

const tuitionService = {
    // === Admin Endpoints ===

    // Tính toán học phí cho một học sinh
    calculateTuition: async (studentId, classId, month, year) => {
        const response = await api.post('/tuition/calculate', {
            studentId,
            classId,
            month,
            year
        });
        return response.data;
    },

    // Tính toán học phí cho cả lớp
    calculateClassTuition: async (classId, month, year) => {
        const response = await api.post('/tuition/calculate-class', {
            classId,
            month,
            year
        });
        return response.data;
    },

    // Tạo hóa đơn cho một học sinh
    createInvoice: async (invoiceData) => {
        const response = await api.post('/tuition/invoices', invoiceData);
        return response.data;
    },

    // Tạo hóa đơn hàng loạt cho cả lớp
    createBatchInvoices: async (batchData) => {
        const response = await api.post('/tuition/invoices/batch', batchData);
        return response.data;
    },

    // Lấy danh sách hóa đơn
    getInvoices: async (filters = {}) => {
        const params = new URLSearchParams();
        Object.keys(filters).forEach(key => {
            if (filters[key] !== undefined && filters[key] !== null) {
                params.append(key, filters[key]);
            }
        });
        const response = await api.get(`/tuition/invoices?${params.toString()}`);
        return response.data;
    },

    // Lấy chi tiết hóa đơn
    getInvoice: async (invoiceId) => {
        const response = await api.get(`/tuition/invoices/${invoiceId}`);
        return response.data;
    },

    // Gửi hóa đơn
    sendInvoice: async (invoiceId) => {
        const response = await api.post(`/tuition/invoices/${invoiceId}/send`);
        return response.data;
    },

    // Hủy hóa đơn
    cancelInvoice: async (invoiceId, reason) => {
        const response = await api.post(`/tuition/invoices/${invoiceId}/cancel`, { reason });
        return response.data;
    },

    // === Student/Parent Endpoints ===

    // Lấy hóa đơn của tôi
    getMyInvoices: async (tenantId) => {
        const response = await api.get(`/tuition/my-invoices?tenantId=${tenantId}`);
        return response.data;
    },

    // Lấy hóa đơn chưa thanh toán
    getOutstandingInvoices: async (tenantId) => {
        const response = await api.get(`/tuition/outstanding?tenantId=${tenantId}`);
        return response.data;
    }
};

export default tuitionService;
