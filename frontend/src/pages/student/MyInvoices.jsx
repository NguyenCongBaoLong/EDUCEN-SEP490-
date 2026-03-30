import { useState, useEffect } from 'react';
import { 
    FileText, 
    CreditCard, 
    CheckCircle, 
    Clock, 
    AlertCircle,
    ChevronRight,
    Calendar,
    DollarSign,
    Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import StudentSidebar from '../../components/StudentSidebar';
import ParentSidebar from '../../components/ParentSidebar';
import tuitionService from '../../services/tuitionService';
import paymentService from '../../services/paymentService';
import { useAuth } from '../../context/AuthContext';
import '../../css/pages/student/MyInvoices.css';

const MyInvoices = () => {
    const { user } = useAuth();
    const isParent = user?.role === 'Parent';
    
    const [invoices, setInvoices] = useState([]);
    const [outstandingInvoices, setOutstandingInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [processingPayment, setProcessingPayment] = useState(false);

    // Lấy tenantId - chấp nhận cả default-tenant
    const getValidTenantId = () => {
        const stored = localStorage.getItem('tenantId');
        if (stored) return stored;
        if (user?.tenantId) return user.tenantId;
        return 'default-tenant';
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            // Lấy tất cả hóa đơn
            const allInvoices = await tuitionService.getMyInvoices();
            setInvoices(allInvoices);

            // Lấy hóa đơn chưa thanh toán
            const outstanding = await tuitionService.getOutstandingInvoices();
            setOutstandingInvoices(outstanding);
        } catch (error) {
            toast.error('Không thể tải danh sách hóa đơn');
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        if (!selectedInvoice) return;

        // Kiểm tra invoice có ở trạng thái cho phép thanh toán không
        if (selectedInvoice.status === 'Paid') {
            toast.error('Hóa đơn này đã được thanh toán');
            setShowPaymentModal(false);
            return;
        }
        if (selectedInvoice.status === 'Cancelled') {
            toast.error('Hóa đơn này đã bị hủy');
            setShowPaymentModal(false);
            return;
        }
        if (selectedInvoice.status === 'Draft') {
            toast.error('Hóa đơn chưa được gửi, vui lòng liên hệ trung tâm');
            setShowPaymentModal(false);
            return;
        }

        setProcessingPayment(true);
        try {
            const tenantId = getValidTenantId();
            const returnUrl = `${window.location.origin}/payment/result`;
            
            const paymentData = {
                tenantId,
                amount: selectedInvoice.finalAmount,
                gatewayType: 'VNPAY',
                transactionType: 'Tuition',
                referenceId: selectedInvoice.invoiceId,
                description: `Thanh toán học phí tháng ${selectedInvoice.invoiceMonth}/${selectedInvoice.invoiceYear}`,
                returnUrl
            };

            const result = await paymentService.createPayment(paymentData);
            
            if (result.success && result.paymentUrl) {
                window.location.href = result.paymentUrl;
            } else {
                toast.error(result.errorMessage || 'Lỗi tạo thanh toán');
            }
        } catch (error) {
            console.error('Payment create failed', error);
            toast.error(error.response?.data?.message || error.message || 'Lỗi thanh toán');
        } finally {
            setProcessingPayment(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Paid':
                return <CheckCircle className="status-icon paid" size={20} />;
            case 'Sent':
            case 'Draft':
                return <Clock className="status-icon pending" size={20} />;
            case 'Overdue':
                return <AlertCircle className="status-icon overdue" size={20} />;
            default:
                return null;
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'Paid':
                return 'Đã thanh toán';
            case 'Sent':
                return 'Chờ thanh toán';
            case 'Draft':
                return 'Nháp';
            case 'Overdue':
                return 'Quá hạn';
            default:
                return status;
        }
    };

    return (
        <div className="my-invoices-container">
            {isParent ? <ParentSidebar /> : <StudentSidebar />}
            <div className="invoices-content">
                <div className="page-header">
                    <h1>Hóa đơn học phí của tôi</h1>
                </div>

                {/* Outstanding Summary */}
                {outstandingInvoices.length > 0 && (
                    <div className="outstanding-alert">
                        <AlertCircle size={24} />
                        <div>
                            <h3>Bạn có {outstandingInvoices.length} hóa đơn chưa thanh toán</h3>
                            <p>
                                Tổng số tiền cần thanh toán: {' '}
                                <strong>
                                    {formatCurrency(outstandingInvoices.reduce((sum, inv) => sum + inv.finalAmount, 0))}
                                </strong>
                            </p>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="loading">Đang tải...</div>
                ) : (
                    <div className="invoices-list">
                        {invoices.length === 0 ? (
                            <div className="empty-state">
                                <FileText size={48} />
                                <p>Chưa có hóa đơn nào</p>
                            </div>
                        ) : (
                            invoices.map((invoice) => (
                                <div 
                                    key={invoice.invoiceId} 
                                    className={`invoice-card ${invoice.status.toLowerCase()}`}
                                >
                                    <div className="invoice-header">
                                        <div className="invoice-title">
                                            <FileText size={20} />
                                            <span>Hóa đơn tháng {invoice.invoiceMonth}/{invoice.invoiceYear}</span>
                                        </div>
                                        <div className="invoice-status">
                                            {getStatusIcon(invoice.status)}
                                            <span>{getStatusText(invoice.status)}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="invoice-details">
                                        <div className="detail-item">
                                            <Calendar size={16} />
                                            <span>Lớp: {invoice.class?.className}</span>
                                        </div>
                                        <div className="detail-item">
                                            <DollarSign size={16} />
                                            <span>Số buổi học: {invoice.attendedSessions}</span>
                                        </div>
                                    </div>

                                    <div className="invoice-amount">
                                        <span className="amount-label">Tổng tiền:</span>
                                        <span className="amount-value">
                                            {formatCurrency(invoice.finalAmount)}
                                        </span>
                                    </div>

                                    {invoice.status !== 'Paid' && invoice.status !== 'Cancelled' && (
                                        <button 
                                            className="pay-button"
                                            onClick={() => {
                                                setSelectedInvoice(invoice);
                                                setShowPaymentModal(true);
                                            }}
                                        >
                                            <CreditCard size={18} />
                                            Thanh toán ngay
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Payment Modal */}
                {showPaymentModal && selectedInvoice && (
                    <div className="modal-overlay">
                        <div className="payment-modal">
                            <h3>Thanh toán hóa đơn</h3>
                            
                            <div className="invoice-summary">
                                <div className="summary-row">
                                    <span>Hóa đơn:</span>
                                    <strong>Tháng {selectedInvoice.invoiceMonth}/{selectedInvoice.invoiceYear}</strong>
                                </div>
                                <div className="summary-row">
                                    <span>Lớp học:</span>
                                    <strong>{selectedInvoice.class?.className}</strong>
                                </div>
                                <div className="summary-row total">
                                    <span>Số tiền thanh toán:</span>
                                    <strong>{formatCurrency(selectedInvoice.finalAmount)}</strong>
                                </div>
                            </div>

                            <div className="gateway-info">
                                <label>Phương thức thanh toán:</label>
                                <div className="gateway-display">
                                    <img src="/vnpay-logo.png" alt="VNPay" />
                                    <span>Thanh toán qua VNPay</span>
                                </div>
                                <p className="gateway-note">
                                    Bạn sẽ được chuyển đến cổng thanh toán VNPay để hoàn tất giao dịch
                                </p>
                            </div>

                            <div className="modal-actions">
                                <button 
                                    className="cancel-btn"
                                    onClick={() => setShowPaymentModal(false)}
                                >
                                    Hủy
                                </button>
                                <button 
                                    className="confirm-btn"
                                    onClick={handlePayment}
                                    disabled={processingPayment}
                                >
                                    {processingPayment ? 'Đang xử lý...' : 'Thanh toán'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyInvoices;
