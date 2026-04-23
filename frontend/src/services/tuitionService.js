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
        Object.entries(filters).forEach(([key, value]) => {
            if (value === undefined || value === null) {
                return;
            }

            if (typeof value === 'string') {
                const trimmed = value.trim();
                if (trimmed === '') {
                    return;
                }
                params.append(key, trimmed);
                return;
            }

            params.append(key, value);
        });

        const queryString = params.toString();
        const response = await api.get(
            queryString ? `/tuition/invoices?${queryString}` : '/tuition/invoices'
        );
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

    // Admin thu tiền học phí mặt
    markAsPaid: async (invoiceId, paymentMethod = 'Cash', notes = '') => {
        const response = await api.post(`/tuition/invoices/${invoiceId}/mark-as-paid`, {
            paymentMethod,
            notes
        });
        return response.data;
    },

    issueSandboxEInvoice: async (invoiceId) => {
        const response = await api.post(`/tuition/invoices/${invoiceId}/einvoice/issue`);
        return response.data;
    },

    downloadSandboxEInvoiceXml: async (invoiceId) => {
        return api.get(`/tuition/invoices/${invoiceId}/einvoice/xml`, {
            responseType: 'blob'
        });
    },

    downloadSandboxEInvoiceRepresentation: async (invoiceId) => {
        return api.get(`/tuition/invoices/${invoiceId}/einvoice/representation`, {
            responseType: 'blob'
        });
    },

    // === Student/Parent Endpoints ===

    // Lấy hóa đơn của tôi
    getMyInvoices: async () => {
        const response = await api.get('/tuition/my-invoices');
        return response.data;
    },

    // Lấy hóa đơn chưa thanh toán
    
    getOutstandingInvoices: async () => {
        const response = await api.get('/tuition/outstanding');
        return response.data;
    },

    downloadMyEInvoiceXml: async (invoiceId) => {
        return api.get(`/tuition/my-invoices/${invoiceId}/einvoice/xml`, {
            responseType: 'blob'
        });
    },

    downloadMyEInvoiceRepresentation: async (invoiceId) => {
        return api.get(`/tuition/my-invoices/${invoiceId}/einvoice/representation`, {
            responseType: 'blob'
        });
    },
    // Cập nhật đơn giá buổi học của lớp
    updateClassPrice: async (classId, price) => {
        const response = await api.put(`/classes/${classId}/price`, { price });
        return response.data;
    },

    // Khóa chỉnh sửa hóa đơn tháng
    lockMonth: async (month, year) => {
        const response = await api.post('/tuition/lock', { month, year });
        return response.data;
    },

    // Mở khóa chỉnh sửa hóa đơn tháng
    unlockMonth: async (month, year) => {
        const response = await api.post('/tuition/unlock', { month, year });
        return response.data;
    },

    // Lấy thông tin khóa của tháng
    getLockInfo: async (month, year) => {
        const response = await api.get(`/tuition/lock/${month}/${year}`);
        return response.data;
    },

    // Preview hóa đơn trước khi tạo
    previewInvoices: async (month, year) => {
        const response = await api.get(`/InvoiceGeneration/preview?month=${month}&year=${year}`);
        return response.data;
    },

    // Tạo hóa đơn hàng loạt
    generateInvoices: async (month, year) => {
        const response = await api.post('/InvoiceGeneration/generate', { month, year });
        return response.data;
    },
};

export default tuitionService;
