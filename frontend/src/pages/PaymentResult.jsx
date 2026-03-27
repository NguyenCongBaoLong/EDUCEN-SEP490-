import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
    CheckCircle, 
    XCircle, 
    Loader, 
    ArrowLeft,
    FileText,
    Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import paymentService from '../services/paymentService';
import { useAuth } from '../context/AuthContext';
import '../css/pages/PaymentResult.css';

const PaymentResult = () => {
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'failed'
    const [paymentInfo, setPaymentInfo] = useState(null);

    const success = searchParams.get('success') === 'true';
    const orderId = searchParams.get('orderId');
    const transactionId = searchParams.get('transactionId');

    // Xác định trang hóa đơn theo role
    const invoicesPath = user?.role === 'Parent' ? '/parent/invoices' : '/student/invoices';

    useEffect(() => {
        verifyPayment();
    }, []);

    const verifyPayment = async () => {
        // Kiểm tra VNPay redirect trực tiếp (có vnp_ params)
        const vnp_TxnRef = searchParams.get('vnp_TxnRef');
        const vnp_ResponseCode = searchParams.get('vnp_ResponseCode');
        const vnp_TransactionStatus = searchParams.get('vnp_TransactionStatus');

        let paymentOrderId = orderId;
        let isDirectVNPayRedirect = false;

        if (vnp_TxnRef && !orderId) {
            // VNPay redirect trực tiếp về frontend
            paymentOrderId = vnp_TxnRef;
            isDirectVNPayRedirect = true;
        }

        if (!paymentOrderId) {
            setStatus('failed');
            return;
        }

        try {
            if (isDirectVNPayRedirect) {
                // Gọi backend verify ngay (không cần chờ IPN)
                const result = await paymentService.verifyPayment(paymentOrderId);
                setPaymentInfo(result);

                if (result.status === 'Paid' || result.status === 'Success') {
                    setStatus('success');
                    toast.success('Thanh toán thành công!');
                } else if (vnp_ResponseCode === '00' && vnp_TransactionStatus === '00') {
                    // VNPay báo thành công nhưng DB chưa update (IPN chưa đến)
                    setStatus('success');
                    toast.success('Thanh toán thành công!');
                } else {
                    setStatus('failed');
                    toast.error('Thanh toán thất bại');
                }
            } else {
                // Redirect từ backend callback (có orderId param)
                await new Promise(resolve => setTimeout(resolve, 2000));
                const result = await paymentService.verifyPayment(paymentOrderId);
                setPaymentInfo(result);

                if (result.status === 'Paid' || result.status === 'Success') {
                    setStatus('success');
                    toast.success('Thanh toán thành công!');
                } else {
                    setStatus('failed');
                    toast.error('Thanh toán thất bại hoặc đang xử lý');
                }
            }
        } catch (error) {
            // Nếu verify API fail nhưng VNPay báo thành công
            if (isDirectVNPayRedirect && vnp_ResponseCode === '00' && vnp_TransactionStatus === '00') {
                setStatus('success');
                toast.success('Thanh toán thành công!');
            } else {
                setStatus('failed');
                toast.error('Không thể xác minh thanh toán');
            }
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('vi-VN');
    };

    return (
        <div className="payment-result-container">
            <div className="payment-result-card">
                {status === 'loading' && (
                    <div className="loading-state">
                        <Loader className="spinner" size={48} />
                        <h2>Đang xử lý thanh toán...</h2>
                        <p>Vui lòng đợi trong giây lát</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="success-state">
                        <div className="success-icon">
                            <CheckCircle size={64} />
                        </div>
                        <h2>Thanh toán thành công!</h2>
                        <p className="success-message">
                            Giao dịch của bạn đã được xử lý thành công.
                        </p>
                        
                        {paymentInfo && (
                            <div className="payment-details">
                                <div className="detail-row">
                                    <span>Mã giao dịch:</span>
                                    <strong>#{orderId?.slice(-8).toUpperCase()}</strong>
                                </div>
                                <div className="detail-row">
                                    <span>Số tiền:</span>
                                    <strong>{formatCurrency(paymentInfo.amount)}</strong>
                                </div>
                                <div className="detail-row">
                                    <span>Thời gian:</span>
                                    <strong>{formatDate(paymentInfo.completedAt || paymentInfo.createdAt)}</strong>
                                </div>
                                <div className="detail-row">
                                    <span>Phương thức:</span>
                                    <strong>{paymentInfo.gatewayType}</strong>
                                </div>
                            </div>
                        )}

                        <div className="action-buttons">
                            <button 
                                className="primary-btn"
                                onClick={() => window.location.href = invoicesPath}
                            >
                                <FileText size={18} />
                                Xem hóa đơn
                            </button>
                            <button 
                                className="secondary-btn"
                                onClick={() => window.location.href = '/'}
                            >
                                <ArrowLeft size={18} />
                                Về trang chủ
                            </button>
                        </div>
                    </div>
                )}

                {status === 'failed' && (
                    <div className="failed-state">
                        <div className="failed-icon">
                            <XCircle size={64} />
                        </div>
                        <h2>Thanh toán thất bại</h2>
                        <p className="failed-message">
                            Rất tiếc, giao dịch của bạn không thể hoàn tất.
                        </p>
                        <p className="failed-reason">
                            Vui lòng kiểm tra lại thông tin thanh toán hoặc thử lại sau.
                        </p>

                        <div className="action-buttons">
                            <button 
                                className="primary-btn"
                                onClick={() => window.history.back()}
                            >
                                <ArrowLeft size={18} />
                                Thử lại
                            </button>
                            <button 
                                className="secondary-btn"
                                onClick={() => window.location.href = '/'}
                            >
                                Về trang chủ
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentResult;
