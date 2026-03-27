import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
    Calculator, 
    FileText, 
    DollarSign, 
    Calendar, 
    Users,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    ChevronLeft,
    CreditCard
} from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../../components/Sidebar';
import tuitionService from '../../services/tuitionService';
import paymentService from '../../services/paymentService';
import '../../css/pages/center/TuitionManagement.css';

const TuitionManagement = () => {
    const { classId } = useParams();
    const [activeTab, setActiveTab] = useState('calculate'); // 'calculate' | 'invoices'
    
    // State cho tính toán học phí
    const [selectedClass, setSelectedClass] = useState(classId || '');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [calculations, setCalculations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    
    // State cho danh sách hóa đơn
    const [invoices, setInvoices] = useState([]);
    const [invoicesLoading, setInvoicesLoading] = useState(false);
    const [invoiceFilters, setInvoiceFilters] = useState({
        status: '',
        month: '',
        year: ''
    });

    // State cho modal thanh toán
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [processingPayment, setProcessingPayment] = useState(false);

    const months = [
        { value: 1, label: 'Tháng 1' },
        { value: 2, label: 'Tháng 2' },
        { value: 3, label: 'Tháng 3' },
        { value: 4, label: 'Tháng 4' },
        { value: 5, label: 'Tháng 5' },
        { value: 6, label: 'Tháng 6' },
        { value: 7, label: 'Tháng 7' },
        { value: 8, label: 'Tháng 8' },
        { value: 9, label: 'Tháng 9' },
        { value: 10, label: 'Tháng 10' },
        { value: 11, label: 'Tháng 11' },
        { value: 12, label: 'Tháng 12' },
    ];

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

    // Tính toán học phí cho lớp
    const handleCalculate = async () => {
        if (!selectedClass) {
            toast.error('Vui lòng chọn lớp học');
            return;
        }

        setLoading(true);
        try {
            const data = await tuitionService.calculateClassTuition(
                parseInt(selectedClass),
                selectedMonth,
                selectedYear
            );
            setCalculations(data);
            toast.success(`Đã tính toán học phí cho ${data.length} học sinh`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi tính toán học phí');
        } finally {
            setLoading(false);
        }
    };

    // Tạo hóa đơn hàng loạt
    const handleGenerateInvoices = async () => {
        if (calculations.length === 0) {
            toast.error('Vui lòng tính toán học phí trước');
            return;
        }

        const confirmed = window.confirm(
            `Bạn có chắc muốn tạo hóa đơn cho ${calculations.length} học sinh?`
        );
        if (!confirmed) return;

        setGenerating(true);
        try {
            const tenantId = localStorage.getItem('tenantId');
            const result = await tuitionService.createBatchInvoices({
                tenantId,
                classId: parseInt(selectedClass),
                month: selectedMonth,
                year: selectedYear
            });

            if (result.successCount > 0) {
                toast.success(`Đã tạo ${result.successCount} hóa đơn thành công`);
                setCalculations([]);
                fetchInvoices();
            }
            if (result.failedCount > 0) {
                toast.error(`${result.failedCount} hóa đơn thất bại`);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi tạo hóa đơn');
        } finally {
            setGenerating(false);
        }
    };

    // Lấy danh sách hóa đơn
    const fetchInvoices = async () => {
        setInvoicesLoading(true);
        try {
            const tenantId = localStorage.getItem('tenantId');
            const filters = {
                tenantId,
                ...invoiceFilters
            };
            const data = await tuitionService.getInvoices(filters);
            setInvoices(data);
        } catch (error) {
            toast.error('Lỗi tải danh sách hóa đơn');
        } finally {
            setInvoicesLoading(false);
        }
    };

    // Xử lý thanh toán
    const handlePayment = async () => {
        if (!selectedInvoice) return;

        setProcessingPayment(true);
        try {
            const tenantId = localStorage.getItem('tenantId');
            const returnUrl = `${window.location.origin}/payment/result`;
            
            const paymentData = {
                tenantId,
                amount: selectedInvoice.finalAmount,
                gatewayType: 'VNPAY',
                transactionType: 'Tuition',
                referenceId: selectedInvoice.invoiceId,
                description: `Thanh toán học phí ${selectedInvoice.invoiceMonth}/${selectedInvoice.invoiceYear} - ${selectedInvoice.studentName}`,
                returnUrl,
                customerName: selectedInvoice.studentName,
                customerEmail: selectedInvoice.studentEmail,
                customerPhone: selectedInvoice.studentPhone
            };

            const result = await paymentService.createPayment(paymentData);
            
            if (result.success && result.paymentUrl) {
                // Redirect đến trang thanh toán
                window.location.href = result.paymentUrl;
            } else {
                toast.error(result.errorMessage || 'Lỗi tạo thanh toán');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi thanh toán');
        } finally {
            setProcessingPayment(false);
        }
    };

    // Format tiền tệ
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    };

    // Lấy status badge
    const getStatusBadge = (status) => {
        const styles = {
            'Draft': { bg: '#f3f4f6', color: '#6b7280', icon: Clock },
            'Sent': { bg: '#dbeafe', color: '#2563eb', icon: AlertCircle },
            'Paid': { bg: '#d1fae5', color: '#059669', icon: CheckCircle },
            'Overdue': { bg: '#fee2e2', color: '#dc2626', icon: XCircle },
            'Cancelled': { bg: '#f3f4f6', color: '#9ca3af', icon: XCircle }
        };
        
        const style = styles[status] || styles['Draft'];
        const Icon = style.icon;
        
        return (
            <span className="status-badge" style={{ background: style.bg, color: style.color }}>
                <Icon size={14} />
                {status === 'Draft' && 'Nháp'}
                {status === 'Sent' && 'Đã gửi'}
                {status === 'Paid' && 'Đã thanh toán'}
                {status === 'Overdue' && 'Quá hạn'}
                {status === 'Cancelled' && 'Đã hủy'}
            </span>
        );
    };

    useEffect(() => {
        if (activeTab === 'invoices') {
            fetchInvoices();
        }
    }, [activeTab, invoiceFilters]);

    return (
        <div className="tuition-management-container">
            <Sidebar />
            <div className="tuition-content">
                <div className="page-header">
                    <h1>Quản lý học phí</h1>
                    <div className="tab-buttons">
                        <button
                            className={activeTab === 'calculate' ? 'active' : ''}
                            onClick={() => setActiveTab('calculate')}
                        >
                            <Calculator size={18} />
                            Tính toán học phí
                        </button>
                        <button
                            className={activeTab === 'invoices' ? 'active' : ''}
                            onClick={() => setActiveTab('invoices')}
                        >
                            <FileText size={18} />
                            Danh sách hóa đơn
                        </button>
                    </div>
                </div>

                {activeTab === 'calculate' && (
                    <div className="calculate-section">
                        <div className="filter-card">
                            <h3>Tính toán học phí theo tháng</h3>
                            <div className="filter-row">
                                <div className="filter-group">
                                    <label>Lớp học</label>
                                    <select 
                                        value={selectedClass} 
                                        onChange={(e) => setSelectedClass(e.target.value)}
                                    >
                                        <option value="">Chọn lớp...</option>
                                        {/* TODO: Load classes from API */}
                                    </select>
                                </div>
                                <div className="filter-group">
                                    <label>Tháng</label>
                                    <select 
                                        value={selectedMonth} 
                                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                    >
                                        {months.map(m => (
                                            <option key={m.value} value={m.value}>{m.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="filter-group">
                                    <label>Năm</label>
                                    <select 
                                        value={selectedYear} 
                                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                    >
                                        {years.map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                                <button 
                                    className="calculate-btn"
                                    onClick={handleCalculate}
                                    disabled={loading}
                                >
                                    {loading ? 'Đang tính...' : 'Tính toán'}
                                </button>
                            </div>
                        </div>

                        {calculations.length > 0 && (
                            <div className="calculation-results">
                                <div className="results-header">
                                    <h3>Kết quả tính toán ({calculations.length} học sinh)</h3>
                                    <button 
                                        className="generate-btn"
                                        onClick={handleGenerateInvoices}
                                        disabled={generating}
                                    >
                                        <FileText size={18} />
                                        {generating ? 'Đang tạo...' : 'Tạo hóa đơn'}
                                    </button>
                                </div>
                                <div className="calculation-table">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Học sinh</th>
                                                <th>Số buổi học</th>
                                                <th>Đã học</th>
                                                <th>Vắng có phép</th>
                                                <th>Đơn giá/buổi</th>
                                                <th>Thành tiền</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {calculations.map((calc, index) => (
                                                <tr key={index}>
                                                    <td>{calc.studentName}</td>
                                                    <td>{calc.totalSessions}</td>
                                                    <td className="attended">{calc.attendedSessions}</td>
                                                    <td className="excused">{calc.excusedSessions}</td>
                                                    <td>{formatCurrency(calc.pricePerSession)}</td>
                                                    <td className="total">{formatCurrency(calc.finalAmount)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'invoices' && (
                    <div className="invoices-section">
                        <div className="filter-bar">
                            <div className="filter-group">
                                <select 
                                    value={invoiceFilters.status}
                                    onChange={(e) => setInvoiceFilters({...invoiceFilters, status: e.target.value})}
                                >
                                    <option value="">Tất cả trạng thái</option>
                                    <option value="Draft">Nháp</option>
                                    <option value="Sent">Đã gửi</option>
                                    <option value="Paid">Đã thanh toán</option>
                                    <option value="Overdue">Quá hạn</option>
                                </select>
                            </div>
                            <div className="filter-group">
                                <select
                                    value={invoiceFilters.month}
                                    onChange={(e) => setInvoiceFilters({...invoiceFilters, month: e.target.value})}
                                >
                                    <option value="">Tất cả tháng</option>
                                    {months.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {invoicesLoading ? (
                            <div className="loading">Đang tải...</div>
                        ) : (
                            <div className="invoices-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Mã hóa đơn</th>
                                            <th>Học sinh</th>
                                            <th>Lớp</th>
                                            <th>Tháng/Năm</th>
                                            <th>Số tiền</th>
                                            <th>Hạn thanh toán</th>
                                            <th>Trạng thái</th>
                                            <th>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoices.map((invoice) => (
                                            <tr key={invoice.invoiceId}>
                                                <td>#{invoice.invoiceId.slice(-6).toUpperCase()}</td>
                                                <td>{invoice.student?.studentNavigation?.fullName}</td>
                                                <td>{invoice.class?.className}</td>
                                                <td>{invoice.invoiceMonth}/{invoice.invoiceYear}</td>
                                                <td className="amount">{formatCurrency(invoice.finalAmount)}</td>
                                                <td>{new Date(invoice.dueDate).toLocaleDateString('vi-VN')}</td>
                                                <td>{getStatusBadge(invoice.status)}</td>
                                                <td className="actions">
                                                    <button 
                                                        className="view-btn"
                                                        onClick={() => {/* TODO: View invoice */}}
                                                    >
                                                        Xem
                                                    </button>
                                                    {invoice.status !== 'Paid' && invoice.status !== 'Cancelled' && (
                                                        <button 
                                                            className="pay-btn"
                                                            onClick={() => {
                                                                setSelectedInvoice(invoice);
                                                                setShowPaymentModal(true);
                                                            }}
                                                        >
                                                            <CreditCard size={14} />
                                                            Thu tiền
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Payment Modal */}
                {showPaymentModal && selectedInvoice && (
                    <div className="modal-overlay">
                        <div className="payment-modal">
                            <h3>Thanh toán hóa đơn</h3>
                            <div className="invoice-info">
                                <p><strong>Học sinh:</strong> {selectedInvoice.student?.studentNavigation?.fullName}</p>
                                <p><strong>Số tiền:</strong> {formatCurrency(selectedInvoice.finalAmount)}</p>
                                <p><strong>Tháng:</strong> {selectedInvoice.invoiceMonth}/{selectedInvoice.invoiceYear}</p>
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
                                    {processingPayment ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TuitionManagement;
