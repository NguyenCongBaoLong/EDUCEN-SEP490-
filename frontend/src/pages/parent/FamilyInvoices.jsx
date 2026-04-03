import { useState, useEffect, useMemo } from 'react';
import { 
    FileText, 
    Users, 
    Calendar, 
    CreditCard, 
    CheckCircle, 
    XCircle,
    Clock,
    AlertCircle,
    X,
    User
} from 'lucide-react';
import toast from 'react-hot-toast';
import ParentSidebar from '../../components/ParentSidebar';
import tuitionService from '../../services/tuitionService';
import familyInvoiceService from '../../services/familyInvoiceService';
import paymentService from '../../services/paymentService';
import { useAuth } from '../../context/AuthContext';
import { useChild } from '../../context/ChildContext';
import '../../css/pages/parent/FamilyInvoices.css';

const FamilyInvoices = () => {
    const { user } = useAuth();
    const { childrenList } = useChild();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'student' | 'family'
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [outstandingTuitionInvoices, setOutstandingTuitionInvoices] = useState([]);
    const [selectedTuitionInvoiceIds, setSelectedTuitionInvoiceIds] = useState([]);
    const [loadingOutstanding, setLoadingOutstanding] = useState(false);
    const [creating, setCreating] = useState(false);

    const selectedInvoices = useMemo(
        () => outstandingTuitionInvoices.filter((invoice) => selectedTuitionInvoiceIds.includes(invoice.invoiceId)),
        [outstandingTuitionInvoices, selectedTuitionInvoiceIds]
    );

    const selectedStudents = useMemo(
        () => [...new Set(selectedInvoices.map((invoice) => invoice.studentId))],
        [selectedInvoices]
    );

    const selectedPeriods = useMemo(
        () => [...new Set(selectedInvoices.map((invoice) => `${invoice.invoiceMonth}-${invoice.invoiceYear}`))],
        [selectedInvoices]
    );

    const childrenWithOutstanding = useMemo(() => {
        const mapByStudentId = new Map();

        childrenList.forEach((child) => {
            mapByStudentId.set(child.studentId, child);
        });

        const ids = [...new Set(outstandingTuitionInvoices.map((invoice) => invoice.studentId))];
        return ids.map((studentId) => (
            mapByStudentId.get(studentId) || { studentId, fullName: `Học sinh ${studentId}` }
        ));
    }, [childrenList, outstandingTuitionInvoices]);

    const defaultPairChildren = childrenWithOutstanding.slice(0, 2);

    useEffect(() => {
        fetchFamilyInvoices();
    }, [activeTab]);

    useEffect(() => {
        if (showCreateModal) {
            fetchOutstandingTuitionInvoices();
            return;
        }

        setSelectedTuitionInvoiceIds([]);
    }, [showCreateModal]);

    const fetchFamilyInvoices = async () => {
        try {
            setLoading(true);
            const type = activeTab === 'student'
                ? 'Student'
                : activeTab === 'family'
                    ? 'Family'
                    : 'all';
            const response = await familyInvoiceService.getFamilyInvoices(type);
            setInvoices(response);
        } catch (error) {
            toast.error('Không thể tải danh sách hóa đơn');
            console.error('Error fetching family invoices:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchOutstandingTuitionInvoices = async () => {
        try {
            setLoadingOutstanding(true);
            const invoicesData = await tuitionService.getOutstandingInvoices();
            setOutstandingTuitionInvoices(invoicesData || []);
        } catch (error) {
            toast.error('Không thể tải hóa đơn học phí chưa thanh toán');
            console.error('Error fetching outstanding tuition invoices:', error);
        } finally {
            setLoadingOutstanding(false);
        }
    };

    const handlePayInvoice = (invoice) => {
        setSelectedInvoice(invoice);
        setShowPaymentModal(true);
    };

    const handlePayment = async () => {
        if (!selectedInvoice) return;

        setProcessingPayment(true);
        try {
            const tenantId = paymentService.resolveTenantId(user?.tenantId);
            const returnUrl = paymentService.getVNPayReturnUrl(tenantId);

            const paymentData = {
                amount: selectedInvoice.totalAmount,
                gatewayType: 'VNPAY',
                transactionType: 'FamilyTuition',
                referenceId: selectedInvoice.invoiceId,
                description: selectedInvoice.type === 'Student'
                    ? `Thanh toán gộp học phí - Tháng ${selectedInvoice.month}/${selectedInvoice.year}`
                    : `Thanh toán hóa đơn gia đình - ${selectedInvoice.studentCount} con - Tháng ${selectedInvoice.month}/${selectedInvoice.year}`,
                returnUrl
            };

            if (tenantId) {
                paymentData.tenantId = tenantId;
            }

            const result = await paymentService.createPayment(paymentData);
            
            if (result.success && result.paymentUrl) {
                window.location.href = result.paymentUrl;
            } else {
                toast.error(result.errorMessage || result.message || 'Thanh toán thất bại');
            }
        } catch (error) {
            toast.error('Lỗi thanh toán: ' + (error.response?.data?.message || error.message));
            console.error('Payment error:', error);
        } finally {
            setProcessingPayment(false);
            setShowPaymentModal(false);
            setSelectedInvoice(null);
        }
    };

    const handleCreateInvoice = async () => {
        if (selectedTuitionInvoiceIds.length === 0) {
            toast.error('Vui lòng chọn ít nhất 1 hóa đơn học phí để gộp');
            return;
        }

        if (selectedPeriods.length > 1) {
            toast.error('Chỉ được gộp các hóa đơn cùng tháng và năm');
            return;
        }

        if (selectedStudents.length === 0) {
            toast.error('Không xác định được học sinh cho hóa đơn đã chọn');
            return;
        }

        const [month, year] = selectedPeriods[0].split('-').map(Number);
        const requestData = {
            type: selectedStudents.length === 1 ? 'Student' : 'Family',
            month,
            year,
            studentIds: selectedStudents,
            selectedTuitionInvoiceIds
        };

        setCreating(true);
        try {
            const response = await familyInvoiceService.createFamilyInvoice(requestData);
            toast.success(response.message || 'Tạo hóa đơn thành công');
            setShowCreateModal(false);
            fetchFamilyInvoices();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi tạo hóa đơn');
        } finally {
            setCreating(false);
        }
    };

    const toggleTuitionInvoice = (invoiceId) => {
        setSelectedTuitionInvoiceIds((prev) => (
            prev.includes(invoiceId)
                ? prev.filter((id) => id !== invoiceId)
                : [...prev, invoiceId]
        ));
    };

    const selectAllInvoices = () => {
        setSelectedTuitionInvoiceIds(outstandingTuitionInvoices.map((invoice) => invoice.invoiceId));
    };

    const selectOnlyChildInvoices = (studentId) => {
        const childInvoices = outstandingTuitionInvoices
            .filter((invoice) => invoice.studentId === studentId)
            .map((invoice) => invoice.invoiceId);

        setSelectedTuitionInvoiceIds(childInvoices);
    };

    const selectPairChildrenInvoices = () => {
        if (defaultPairChildren.length < 2) {
            toast.error('Cần ít nhất 2 con có hóa đơn để chọn chế độ A+B');
            return;
        }

        const pairStudentIds = defaultPairChildren.map((child) => child.studentId);
        const invoiceIds = outstandingTuitionInvoices
            .filter((invoice) => pairStudentIds.includes(invoice.studentId))
            .map((invoice) => invoice.invoiceId);

        setSelectedTuitionInvoiceIds(invoiceIds);
    };

    const clearSelection = () => {
        setSelectedTuitionInvoiceIds([]);
    };

    const getStudentName = (studentId) => {
        const child = childrenList.find((item) => item.studentId === studentId);
        return child?.fullName || `Học sinh ${studentId}`;
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('vi-VN');
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Paid':
                return <CheckCircle className="status-icon paid" size={20} />;
            case 'Pending':
                return <Clock className="status-icon pending" size={20} />;
            case 'Cancelled':
                return <XCircle className="status-icon cancelled" size={20} />;
            default:
                return <AlertCircle className="status-icon unknown" size={20} />;
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'Paid': return 'Đã thanh toán';
            case 'Pending': return 'Chờ thanh toán';
            case 'Cancelled': return 'Đã hủy';
            default: return status;
        }
    };

    const getTypeLabel = (type) => {
        return type === 'Student' ? 'Gộp theo con' : 'Gộp tất cả con';
    };

    const getTypeIcon = (type) => {
        return type === 'Student' ? <User size={16} /> : <Users size={16} />;
    };

    return (
        <div className="family-invoices-container">
            <ParentSidebar />
            
            <div className="family-invoices-content">
                <div className="page-header">
                    <div className="header-left">
                        <h1>Hóa đơn gộp</h1>
                        <p>Chọn linh hoạt từng hóa đơn học phí để tạo lô thanh toán theo con hoặc kết hợp nhiều con</p>
                    </div>
                    <button 
                        className="create-invoice-btn"
                        onClick={() => setShowCreateModal(true)}
                    >
                        <FileText size={18} />
                        Tạo hóa đơn gộp
                    </button>
                </div>

                {/* Tab filter */}
                <div className="tab-filter">
                    <button 
                        className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveTab('all')}
                    >
                        Tất cả
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'student' ? 'active' : ''}`}
                        onClick={() => setActiveTab('student')}
                    >
                        <User size={16} />
                        Gộp theo con
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'family' ? 'active' : ''}`}
                        onClick={() => setActiveTab('family')}
                    >
                        <Users size={16} />
                        Gộp tất cả con
                    </button>
                </div>

                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Đang tải danh sách hóa đơn...</p>
                    </div>
                ) : invoices.length === 0 ? (
                    <div className="empty-state">
                        <FileText size={64} />
                        <h3>Chưa có hóa đơn gộp</h3>
                        <p>Bạn chưa có hóa đơn gộp nào. Nhấn "Tạo hóa đơn gộp" để bắt đầu.</p>
                    </div>
                ) : (
                    <div className="invoices-grid">
                        {invoices.map((invoice) => (
                            <div key={invoice.invoiceId} className={`family-invoice-card ${invoice.status?.toLowerCase()}`}>
                                <div className="invoice-header">
                                    <div className="invoice-info">
                                        <div className="invoice-type-badge">
                                            {getTypeIcon(invoice.type)}
                                            <span>{getTypeLabel(invoice.type)}</span>
                                        </div>
                                        <div className="invoice-meta">
                                            <span className={`invoice-status ${(invoice.status || '').toLowerCase()}`}>
                                                {getStatusIcon(invoice.status)}
                                                {getStatusText(invoice.status)}
                                            </span>
                                        </div>
                                        <div className="invoice-period">
                                            <Calendar size={16} />
                                            Tháng {invoice.month}/{invoice.year}
                                        </div>
                                    </div>
                                    <div className="invoice-actions">
                                        {invoice.status === 'Pending' && (
                                            <button 
                                                className="pay-button"
                                                onClick={() => handlePayInvoice(invoice)}
                                                disabled={processingPayment}
                                            >
                                                <CreditCard size={18} />
                                                {processingPayment ? 'Đang xử lý...' : 'Thanh toán ngay'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="invoice-summary">
                                    <div className="summary-row">
                                        <span className="summary-label">Số lượng:</span>
                                        <span className="summary-value">
                                            {invoice.type === 'Student' 
                                                ? '1 học sinh' 
                                                : `${invoice.studentCount} con`}
                                        </span>
                                    </div>
                                    <div className="summary-row">
                                        <span className="summary-label">Tổng tiền:</span>
                                        <span className="summary-value amount">{formatCurrency(invoice.totalAmount)}</span>
                                    </div>
                                    <div className="summary-row">
                                        <span className="summary-label">Ngày tạo:</span>
                                        <span className="summary-value">{formatDate(invoice.createdAt)}</span>
                                    </div>
                                    {invoice.paidAt && (
                                        <div className="summary-row">
                                            <span className="summary-label">Ngày thanh toán:</span>
                                            <span className="summary-value paid-date">{formatDate(invoice.paidAt)}</span>
                                        </div>
                                    )}
                                </div>

                                {invoice.studentInvoices && invoice.studentInvoices.length > 0 && (
                                    <div className="student-invoices-detail">
                                        <h4>Chi tiết hóa đơn:</h4>
                                        <div className="student-list">
                                            {invoice.studentInvoices.map((item) => (
                                                <div key={item.itemId} className="student-item">
                                                    <div className="student-info">
                                                        <span className="student-name">{item.studentName}</span>
                                                        <span className={`student-status ${(item.status || '').toLowerCase()}`}>
                                                            {getStatusIcon(item.status)}
                                                            {getStatusText(item.status)}
                                                        </span>
                                                    </div>
                                                    <div className="student-amount">
                                                        {formatCurrency(item.amount)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            {showPaymentModal && selectedInvoice && (
                <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Thanh toán hóa đơn gộp</h3>
                            <button className="modal-close" onClick={() => setShowPaymentModal(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="invoice-summary">
                                <div className="summary-row">
                                    <span>Loại:</span>
                                    <strong>{getTypeLabel(selectedInvoice.type)}</strong>
                                </div>
                                <div className="summary-row">
                                    <span>Số lượng:</span>
                                    <strong>
                                        {selectedInvoice.type === 'Student' 
                                            ? '1 học sinh' 
                                            : `${selectedInvoice.studentCount} con`}
                                    </strong>
                                </div>
                                <div className="summary-row">
                                    <span>Tháng:</span>
                                    <strong>Tháng {selectedInvoice.month}/{selectedInvoice.year}</strong>
                                </div>
                                <div className="summary-row total">
                                    <span>Tổng tiền:</span>
                                    <strong className="amount">{formatCurrency(selectedInvoice.totalAmount)}</strong>
                                </div>
                            </div>
                            
                            <div className="gateway-info">
                                <label>Phương thức thanh toán:</label>
                                <div className="gateway-display">
                                    <span>Thanh toán qua VNPay</span>
                                </div>
                                <p className="gateway-note">
                                    Bạn sẽ được chuyển đến cổng thanh toán VNPay để hoàn tất giao dịch
                                </p>
                            </div>
                        </div>
                        
                        <div className="modal-footer">
                            <button 
                                className="cancel-button"
                                onClick={() => setShowPaymentModal(false)}
                            >
                                Hủy
                            </button>
                            <button 
                                className="pay-button"
                                onClick={handlePayment}
                                disabled={processingPayment}
                            >
                                <CreditCard size={18} />
                                {processingPayment ? 'Đang xử lý...' : `Thanh toán ${formatCurrency(selectedInvoice.totalAmount)}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Invoice Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Tạo hóa đơn gộp</h3>
                            <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="selection-hint">
                                Chọn các hóa đơn chưa thanh toán để tạo một lô thanh toán mới. Chỉ hỗ trợ gộp các hóa đơn cùng tháng và năm.
                            </div>

                            <div className="quick-actions">
                                {defaultPairChildren.map((child, index) => (
                                    <button
                                        key={child.studentId}
                                        type="button"
                                        className="quick-action-btn"
                                        onClick={() => selectOnlyChildInvoices(child.studentId)}
                                    >
                                        {`Chỉ con ${index === 0 ? 'A' : 'B'}: ${child.fullName}`}
                                    </button>
                                ))}

                                <button
                                    type="button"
                                    className="quick-action-btn"
                                    onClick={selectPairChildrenInvoices}
                                    disabled={defaultPairChildren.length < 2}
                                >
                                    {defaultPairChildren.length >= 2
                                        ? `Kết hợp A+B (${defaultPairChildren[0].fullName} + ${defaultPairChildren[1].fullName})`
                                        : 'Kết hợp A+B'}
                                </button>

                                <button type="button" className="quick-action-btn" onClick={selectAllInvoices}>
                                    Chọn tất cả
                                </button>

                                <button type="button" className="quick-action-btn muted" onClick={clearSelection}>
                                    Bỏ chọn
                                </button>
                            </div>

                            {loadingOutstanding ? (
                                <div className="loading-state compact">
                                    <div className="spinner"></div>
                                    <p>Đang tải hóa đơn chưa thanh toán...</p>
                                </div>
                            ) : outstandingTuitionInvoices.length === 0 ? (
                                <div className="empty-state compact">
                                    <FileText size={42} />
                                    <h3>Không có hóa đơn cần gộp</h3>
                                    <p>Tất cả hóa đơn học phí hiện đã được thanh toán hoặc chưa phát hành.</p>
                                </div>
                            ) : (
                                <div className="tuition-selection-list">
                                    {outstandingTuitionInvoices.map((invoice) => {
                                        const checked = selectedTuitionInvoiceIds.includes(invoice.invoiceId);

                                        return (
                                            <label
                                                key={invoice.invoiceId}
                                                className={`tuition-item ${checked ? 'selected' : ''}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleTuitionInvoice(invoice.invoiceId)}
                                                />
                                                <div className="tuition-item-content">
                                                    <div className="tuition-item-top">
                                                        <strong>{getStudentName(invoice.studentId)}</strong>
                                                        <span>{formatCurrency(invoice.finalAmount)}</span>
                                                    </div>
                                                    <div className="tuition-item-meta">
                                                        Tháng {invoice.invoiceMonth}/{invoice.invoiceYear} - Hạn {formatDate(invoice.dueDate)}
                                                    </div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="selection-summary">
                                <div>
                                    <span>Đã chọn:</span>
                                    <strong>{selectedTuitionInvoiceIds.length} hóa đơn</strong>
                                </div>
                                <div>
                                    <span>Tạm tính:</span>
                                    <strong>
                                        {formatCurrency(
                                            selectedInvoices.reduce((sum, invoice) => sum + (Number(invoice.finalAmount) || 0), 0)
                                        )}
                                    </strong>
                                </div>
                                {selectedPeriods.length === 1 && selectedInvoices.length > 0 && (
                                    <div>
                                        <span>Kỳ gộp:</span>
                                        <strong>Tháng {selectedInvoices[0].invoiceMonth}/{selectedInvoices[0].invoiceYear}</strong>
                                    </div>
                                )}
                                {selectedPeriods.length > 1 && (
                                    <p className="validation-warning">
                                        Có nhiều tháng/năm trong danh sách chọn. Vui lòng chọn cùng kỳ để tạo hóa đơn gộp.
                                    </p>
                                )}
                            </div>
                        </div>
                        
                        <div className="modal-footer">
                            <button 
                                className="cancel-button"
                                onClick={() => setShowCreateModal(false)}
                            >
                                Hủy
                            </button>
                            <button 
                                className="confirm-button"
                                onClick={handleCreateInvoice}
                                disabled={creating || loadingOutstanding || outstandingTuitionInvoices.length === 0}
                            >
                                {creating ? 'Đang tạo...' : 'Tạo hóa đơn'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FamilyInvoices;
