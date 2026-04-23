import api from './api';

const familyInvoiceService = {
    getFamilyInvoices: async (type) => {
        const params = {};

        if (type && type !== 'all') {
            params.type = type;
        }

        const response = await api.get('/family-invoices/family-invoices', { params });
        return response.data;
    },

    createFamilyInvoice: async (payload) => {
        const response = await api.post('/family-invoices/create-family', payload);
        return response.data;
    },

    getFamilyInvoiceById: async (invoiceId) => {
        const response = await api.get(`/family-invoices/${invoiceId}`);
        return response.data;
    },

    cancelFamilyInvoice: async (invoiceId, reason = '') => {
        const response = await api.post(`/family-invoices/${invoiceId}/cancel`, { reason });
        return response.data;
    },

    downloadFamilyEInvoiceXml: async (invoiceId) => {
        return api.get(`/family-invoices/${invoiceId}/einvoice/xml`, {
            responseType: 'blob'
        });
    },

    downloadFamilyEInvoiceRepresentation: async (invoiceId) => {
        return api.get(`/family-invoices/${invoiceId}/einvoice/representation`, {
            responseType: 'blob'
        });
    }
};

export default familyInvoiceService;
