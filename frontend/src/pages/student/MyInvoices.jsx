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
    Download,
    AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { showValidationError } from '../../services/toastHelper';
import StudentSidebar from '../../components/StudentSidebar';
import ParentSidebar from '../../components/ParentSidebar';
import tuitionService from '../../services/tuitionService';
import paymentService from '../../services/paymentService';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useChild } from '../../context/ChildContext';
import '../../css/pages/student/MyInvoices.css';

const MyInvoices = () => {
    const { user } = useAuth();
    const { selectedChild } = useChild();
    const isParent = user?.role === 'Parent';
    
    const [invoices, setInvoices] = useState([]);
    const [outstandingInvoices, setOutstandingInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [processingPayment, setProcessingPayment] = useState(false);

    useEffect(() => {
        fetchInvoices();
    }, [selectedChild]);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            // Lấy tất cả hóa đơn
            let allInvoices = await tuitionService.getMyInvoices();
            // Lấy hóa đơn chưa thanh toán
            let outstanding = await tuitionService.getOutstandingInvoices();

            // Nếu là phụ huynh, lọc theo người con đang được chọn
            if (isParent && selectedChild) {
                allInvoices = allInvoices.filter(inv => inv.studentId === selectedChild.studentId);
                outstanding = outstanding.filter(inv => inv.studentId === selectedChild.studentId);
            }

            setInvoices(allInvoices);
            setOutstandingInvoices(outstanding);
        } catch (error) {
            showValidationError(error, 'Không thể tải danh sách hóa đơn');
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        if (!selectedInvoice) return;

        // Kiểm tra invoice có ở trạng thái cho phép thanh toán không
        if (selectedInvoice.status === 'Paid') {
            showValidationError('Hóa đơn này đã được thanh toán');
            setShowPaymentModal(false);
            return;
        }
        if (selectedInvoice.status === 'Cancelled') {
            showValidationError('Hóa đơn này đã bị hủy');
            setShowPaymentModal(false);
            return;
        }
        if (selectedInvoice.status === 'Draft') {
            showValidationError('Hóa đơn chưa được gửi, vui lòng liên hệ trung tâm');
            setShowPaymentModal(false);
            return;
        }

        setProcessingPayment(true);
        try {
            const tenantId = paymentService.resolveTenantId(user?.tenantId);
            const returnUrl = paymentService.getVNPayReturnUrl(tenantId);
            
            const paymentData = {
                amount: selectedInvoice.finalAmount,
                gatewayType: 'VNPAY',
                transactionType: 'Tuition',
                referenceId: selectedInvoice.invoiceId,
                description: `Thanh toán học phí tháng ${selectedInvoice.invoiceMonth}/${selectedInvoice.invoiceYear}`,
                returnUrl
            };

            if (tenantId) {
                paymentData.tenantId = tenantId;
            }

            const result = await paymentService.createPayment(paymentData);
            
            if (result.success && result.paymentUrl) {
                window.location.href = result.paymentUrl;
            } else {
                showValidationError(result.errorMessage || 'Lỗi tạo thanh toán');
            }
        } catch (error) {
            console.error('Payment create failed', error);
            showValidationError(error, 'Lỗi thanh toán');
        } finally {
            setProcessingPayment(false);
        }
    };

    const handleConsolidateInvoices = async () => {
        const parentId = user?.userId || user?.nameid;
        const studentId = isParent
            ? selectedChild?.studentId
            : outstandingInvoices.find(inv => inv.studentId)?.studentId
                || invoices.find(inv => inv.studentId)?.studentId
                || user?.userId
                || user?.nameid;

        if (isParent && !studentId) {
            showValidationError('Vui lòng chọn con');
            return;
        }

        if (!isParent && !studentId) {
            showValidationError('Không thể xác định học sinh để gộp hóa đơn');
            return;
        }
        if (outstandingInvoices.length < 2) {
            showValidationError('Cần ít nhất 2 hóa đơn để gộp');
            return;
        }

        setProcessingPayment(true);
        try {
            const periods = [...new Set(outstandingInvoices.map(inv => `${inv.invoiceMonth}-${inv.invoiceYear}`))];

            // Create consolidated invoice for each month/year that has invoices
            for (const period of periods) {
                const [month, year] = period.split('-').map(Number);
                const monthInvoices = outstandingInvoices.filter(
                    inv => inv.invoiceMonth === month && inv.invoiceYear === year
                );
                if (monthInvoices.length >= 2) {
                    await api.post('/family-invoices/create-family', {
                        parentId: String(parentId),
                        type: 'Student',
                        month,
                        year,
                        studentIds: [studentId],
                        selectedTuitionInvoiceIds: monthInvoices.map(inv => inv.invoiceId)
                    });
                }
            }

            toast.success('Đã tạo hóa đơn gộp thành công');
            if (isParent) {
                window.location.href = '/parent/family-invoices';
            } else {
                await fetchInvoices();
            }
        } catch (error) {
            showValidationError(error, 'Lỗi tạo hóa đơn gộp');
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

    const formatDate = (value) => new Date(value).toLocaleDateString('vi-VN');

    const isOverdue = (dueDate) => {
        return new Date(dueDate) < new Date();
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
                    <h1>
                        {isParent && selectedChild 
                            ? `Hóa đơn học phí của ${selectedChild.fullName}` 
                            : 'Hóa đơn học phí của tôi'}
                    </h1>
                </div>

                {/* Outstanding Summary */}
                {outstandingInvoices.length > 0 && (
                    <div className="outstanding-alert">
                        <div className="alert-content">
                            <AlertCircle />
                            <div className="alert-text">
                                <h3>Phải thanh toán: {formatCurrency(outstandingInvoices.reduce((sum, inv) => sum + inv.finalAmount, 0))}</h3>
                                <p>
                                    Bạn hiện có <strong>{outstandingInvoices.length} hóa đơn</strong> đang chờ xử lý. 
                                    Vui lòng thanh toán sớm để đảm bảo quyền lợi học tập.
                                </p>
                            </div>
                        </div>
                        {outstandingInvoices.length >= 2 && (
                            <button 
                                className="consolidate-btn"
                                onClick={handleConsolidateInvoices}
                                disabled={processingPayment}
                            >
                                <CreditCard size={18} />
                                {processingPayment ? 'Đang xử lý...' : 'Gộp hóa đơn'}
                            </button>
                        )}
                    </div>
                )}

                {loading ? (
                    <div className="loading">Đang tải...</div>
                ) : (
                    <div className="invoices-list">
                        {invoices.length === 0 ? (
                            <div className="empty-state">
                                <FileText />
                                <p>Hiện tại bạn không có hóa đơn nào</p>
                            </div>
                        ) : (
                            invoices.map((invoice) => (
                                <div 
                                    key={invoice.invoiceId} 
                                    className={`invoice-card ${invoice.status.toLowerCase()}`}
                                >
                                    <div className="invoice-header">
                                        <div className="invoice-title">
                                            <span>Tháng {invoice.invoiceMonth}/{invoice.invoiceYear}</span>
                                            <div className="date-label">Hóa đơn học phí</div>
                                        </div>
                                        <div className="invoice-status">
                                            {getStatusIcon(invoice.status)}
                                            {getStatusText(invoice.status)}
                                        </div>
                                    </div>
                                    
                                    <div className="invoice-details">
                                        <div className="detail-item">
                                            <span className="detail-label">Lớp học</span>
                                            <div className="detail-value">
                                                <Calendar size={14} />
                                                {invoice.class?.className || 'N/A'}
                                            </div>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Số buổi</span>
                                            <div className="detail-value">
                                                <Clock size={14} />
                                                {invoice.attendedSessions} buổi
                                            </div>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Hạn thanh toán</span>
                                            <div className={`detail-value ${isOverdue(invoice.dueDate) ? 'overdue-due-date' : ''}`}>
                                                <Calendar size={14} />
                                                {formatDate(invoice.dueDate)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="invoice-footer">
                                        <div className="invoice-amount">
                                            <div className="amount-group">
                                                <span className="amount-label">Số tiền cần trả</span>
                                                <span className="amount-value">
                                                    {formatCurrency(invoice.finalAmount)}
                                                </span>
                                            </div>
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
                                <div className={`summary-row ${isOverdue(selectedInvoice.dueDate) ? 'overdue-warning' : ''}`}>
                                    <span>Hạn thanh toán:</span>
                                    <strong>
                                        {formatDate(selectedInvoice.dueDate)}
                                        {isOverdue(selectedInvoice.dueDate) && (
                                            <span className="overdue-text"> (Quá hạn)</span>
                                        )}
                                    </strong>
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
