import api from './api';

const isValidTenantId = (tenantId) => (
    !!tenantId && tenantId !== 'undefined' && tenantId !== 'null'
);

const resolveTenantId = (preferredTenantId) => {
    if (isValidTenantId(preferredTenantId)) return preferredTenantId;

    const storedTenantId = localStorage.getItem('tenantId');
    if (isValidTenantId(storedTenantId)) return storedTenantId;

    const urlParams = new URLSearchParams(window.location.search);
    const tenantFromUrl = urlParams.get('tenantId') || urlParams.get('tenant');
    if (isValidTenantId(tenantFromUrl)) return tenantFromUrl;

    return null;
};

const buildReturnUrl = (tenantId) => {
    const returnUrl = new URL('/payment/result', window.location.origin);

    if (isValidTenantId(tenantId)) {
        returnUrl.searchParams.set('tenant', tenantId);
        returnUrl.searchParams.set('tenantId', tenantId);
    }

    return returnUrl.toString();
};

const withTenantContext = (payload) => {
    const resolvedTenantId = resolveTenantId(payload?.tenantId);

    if (resolvedTenantId) {
        return { ...payload, tenantId: resolvedTenantId };
    }

    const { tenantId, ...rest } = payload || {};
    return rest;
};

const paymentService = {
    // Tạo thanh toán mới
    createPayment: async (paymentData) => {
        const response = await api.post('/payments/create', withTenantContext(paymentData));
        return response.data;
    },

    // Kiểm tra trạng thái thanh toán
    verifyPayment: async (paymentRecordId) => {
        const response = await api.get(`/payments/verify/${paymentRecordId}`);
        return response.data;
    },

    // Frontend confirm thanh toán sau khi VNPay redirect về
    // (dùng khi IPN chưa đến backend, ví dụ ngrok expired)
    confirmPayment: async (vnpayParams) => {
        const response = await api.post('/payments/confirm', vnpayParams);
        return response.data;
    },

    // Các gateway URLs (được sử dụng khi redirect)
    getVNPayReturnUrl: (tenantId) => {
        return buildReturnUrl(resolveTenantId(tenantId));
    },

    resolveTenantId,


};

export default paymentService;
