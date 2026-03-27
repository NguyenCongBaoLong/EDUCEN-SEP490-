import api from './api';

const paymentService = {
    // Tạo thanh toán mới
    createPayment: async (paymentData) => {
        const response = await api.post('/payments/create', paymentData);
        return response.data;
    },

    // Kiểm tra trạng thái thanh toán
    verifyPayment: async (paymentRecordId) => {
        const response = await api.get(`/payments/verify/${paymentRecordId}`);
        return response.data;
    },

    // Các gateway URLs (được sử dụng khi redirect)
    getVNPayReturnUrl: () => {
        return `${window.location.origin}/payment/result`;
    },


};

export default paymentService;
