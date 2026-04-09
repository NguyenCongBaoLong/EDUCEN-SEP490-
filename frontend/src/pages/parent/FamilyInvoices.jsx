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
import { showValidationError } from '../../services/toastHelper';
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
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'paid' | 'pending'
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [outstandingTuitionInvoices, setOutstandingTuitionInvoices] = useState([]);
    const [selectedTuitionInvoiceIds, setSelectedTuitionInvoiceIds] = useState([]);
    const [loadingOutstanding, setLoadingOutstanding] = useState(false);
    const [creating, setCreating] = useState(false);
    const [selectedPeriodFilter, setSelectedPeriodFilter] = useState('all');
    const [cancellingInvoiceId, setCancellingInvoiceId] = useState(null);
    const [expandedInvoiceIds, setExpandedInvoiceIds] = useState([]);

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

    const inferredMergeType = useMemo(
        () => (selectedStudents.length <= 1 ? 'Student' : 'Family'),
        [selectedStudents]
    );

    const periodOptions = useMemo(() => {
        const map = new Map();

        outstandingTuitionInvoices.forEach((invoice) => {
            const key = `${invoice.invoiceMonth}-${invoice.invoiceYear}`;
            if (!map.has(key)) {
                map.set(key, {
                    key,
                    month: invoice.invoiceMonth,
                    year: invoice.invoiceYear
                });
            }
        });

        return Array.from(map.values()).sort((a, b) => {
            if (a.year !== b.year) {
                return b.year - a.year;
            }

            return b.month - a.month;
        });
    }, [outstandingTuitionInvoices]);

    const filteredOutstandingInvoices = useMemo(() => {
        if (selectedPeriodFilter === 'all') {
            return outstandingTuitionInvoices;
        }

        const [month, year] = selectedPeriodFilter.split('-').map(Number);
        return outstandingTuitionInvoices.filter(
            (invoice) => invoice.invoiceMonth === month && invoice.invoiceYear === year
        );
    }, [outstandingTuitionInvoices, selectedPeriodFilter]);

    const childrenWithOutstanding = useMemo(() => {
        const mapByStudentId = new Map();

        childrenList.forEach((child) => {
            mapByStudentId.set(child.studentId, child);
        });

        const ids = [...new Set(filteredOutstandingInvoices.map((invoice) => invoice.studentId))];
        return ids.map((studentId) => (
            mapByStudentId.get(studentId) || { studentId, fullName: `Học sinh ${studentId}` }
        ));
    }, [childrenList, filteredOutstandingInvoices]);

    useEffect(() => {
        fetchFamilyInvoices();
    }, [activeTab]); // Refetch khi tab thay đổi

    useEffect(() => {
        if (showCreateModal) {
            fetchOutstandingTuitionInvoices();
            return;
        }

        setSelectedTuitionInvoiceIds([]);
        setSelectedPeriodFilter('all');
    }, [showCreateModal]);

    useEffect(() => {
        if (!showCreateModal) {
            return;
        }

        if (periodOptions.length === 0) {
            setSelectedPeriodFilter('all');
            return;
        }

        setSelectedPeriodFilter((prev) => {
            if (prev === 'all') {
                return periodOptions[0].key;
            }

            const exists = periodOptions.some((period) => period.key === prev);
            return exists ? prev : periodOptions[0].key;
        });
    }, [periodOptions, showCreateModal]);

    useEffect(() => {
        if (!showCreateModal) {
            return;
        }

        const allowedIds = new Set(filteredOutstandingInvoices.map((invoice) => invoice.invoiceId));
        setSelectedTuitionInvoiceIds((prev) => prev.filter((id) => allowedIds.has(id)));
    }, [filteredOutstandingInvoices, showCreateModal]);

    const fetchFamilyInvoices = async () => {
        try {
            setLoading(true);
            // Luôn fetch tất cả hóa đơn gia đình
            const response = await familyInvoiceService.getFamilyInvoices('all');
            
            // Filter theo tab ở frontend
            let filteredInvoices = response;
            if (activeTab === 'paid') {
                filteredInvoices = response.filter(invoice => invoice.status === 'Paid');
            } else if (activeTab === 'pending') {
                filteredInvoices = response.filter(invoice => invoice.status === 'Pending');
            }
            
            setInvoices(filteredInvoices);
        } catch (error) {
            showValidationError(error, 'Không thể tải danh sách hóa đơn');
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
            showValidationError(error, 'Không thể tải hóa đơn học phí chưa thanh toán');
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
                showValidationError(result.errorMessage || result.message || 'Thanh toán thất bại');
            }
        } catch (error) {
            showValidationError(error, 'Lỗi thanh toán');
            console.error('Payment error:', error);
        } finally {
            setProcessingPayment(false);
            setShowPaymentModal(false);
            setSelectedInvoice(null);
        }
    };

    const handleCreateInvoice = async () => {
        if (selectedTuitionInvoiceIds.length === 0) {
            showValidationError('Vui lòng chọn ít nhất 1 hóa đơn học phí để gộp');
            return;
        }

        if (selectedPeriods.length > 1) {
            showValidationError('Chỉ được gộp các hóa đơn cùng tháng và năm');
            return;
        }

        if (selectedStudents.length === 0) {
            showValidationError('Không xác định được học sinh cho hóa đơn đã chọn');
            return;
        }

        // Validate: chỉ gộp hóa đơn chưa thanh toán
        const hasPaidInvoices = selectedInvoices.some(invoice => invoice.status === 'Paid');
        if (hasPaidInvoices) {
            showValidationError('Không thể gộp hóa đơn đã thanh toán. Vui lòng bỏ chọn các hóa đơn đã thanh toán.');
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
            showValidationError(error, 'Lỗi tạo hóa đơn');
        } finally {
            setCreating(false);
        }
    };

    const handleCancelFamilyInvoice = async (invoiceId) => {
        if (!invoiceId) {
            return;
        }

        setCancellingInvoiceId(invoiceId);
        try {
            const response = await familyInvoiceService.cancelFamilyInvoice(
                invoiceId,
                'Parent cancel to regroup tuition invoices'
            );

            toast.success(response?.message || 'Đã hủy hóa đơn gộp');
            await Promise.all([fetchFamilyInvoices(), fetchOutstandingTuitionInvoices()]);
        } catch (error) {
            showValidationError(error, 'Không thể hủy hóa đơn gộp');
        } finally {
            setCancellingInvoiceId(null);
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
        setSelectedTuitionInvoiceIds(filteredOutstandingInvoices.map((invoice) => invoice.invoiceId));
    };

    const selectOnlyChildInvoices = (studentId) => {
        const childInvoices = filteredOutstandingInvoices
            .filter((invoice) => invoice.studentId === studentId)
            .map((invoice) => invoice.invoiceId);

        setSelectedTuitionInvoiceIds(childInvoices);
    };

    const clearSelection = () => {
        setSelectedTuitionInvoiceIds([]);
    };

    const isSameSelection = (candidateIds) => {
        if (candidateIds.length !== selectedTuitionInvoiceIds.length) {
            return false;
        }

        const selectedSet = new Set(selectedTuitionInvoiceIds);
        return candidateIds.every((id) => selectedSet.has(id));
    };

    const getChildInvoiceIds = (studentId) => (
        filteredOutstandingInvoices
            .filter((invoice) => invoice.studentId === studentId)
            .map((invoice) => invoice.invoiceId)
    );

    const allFilteredInvoiceIds = filteredOutstandingInvoices.map((invoice) => invoice.invoiceId);

    const handlePeriodFilterChange = (event) => {
        setSelectedPeriodFilter(event.target.value);
    };

    const toggleInvoiceDetails = (invoiceId) => {
        setExpandedInvoiceIds((prev) => (
            prev.includes(invoiceId)
                ? prev.filter((id) => id !== invoiceId)
                : [...prev, invoiceId]
        ));
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
        return type === 'Student' ? 'Gộp theo học sinh' : 'Gộp cả gia đình';
    };

    const getCardTitle = (type) => {
        return type === 'Student' ? 'Hóa đơn gộp theo học sinh' : 'Hóa đơn gộp gia đình';
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
                        <h1>Hóa đơn gia đình</h1>
                        <p>Quản lý tất cả hóa đơn học phí của gia đình</p>
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
                        className={`tab-btn ${activeTab === 'paid' ? 'active' : ''}`}
                        onClick={() => setActiveTab('paid')}
                    >
                        <CheckCircle size={16} />
                        Đã thanh toán
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pending')}
                    >
                        <Clock size={16} />
                        Chờ thanh toán
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
                                    <div className="invoice-heading">
                                        <div>
                                            <h3>{getCardTitle(invoice.type)}</h3>
                                            <div className="invoice-type-badge">
                                                {getTypeIcon(invoice.type)}
                                                <span>{getTypeLabel(invoice.type)}</span>
                                            </div>
                                        </div>
                                        <span className={`invoice-status-badge ${(invoice.status || '').toLowerCase()}`}>
                                            {getStatusIcon(invoice.status)}
                                            {getStatusText(invoice.status)}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="invoice-summary">
                                    <div className="summary-row">
                                        <span className="summary-label">
                                            <Calendar size={14} />
                                            Kỳ hóa đơn
                                        </span>
                                        <span className="summary-value">Tháng {invoice.month}/{invoice.year}</span>
                                    </div>
                                    <div className="summary-row">
                                        <span className="summary-label">
                                            <FileText size={14} />
                                            Số học sinh
                                        </span>
                                        <span className="summary-value">
                                            {invoice.type === 'Student' 
                                                ? '1 học sinh' 
                                                : `${invoice.studentCount} con`}
                                        </span>
                                    </div>
                                    
                                    {/* Hiển thị thông tin con trên card */}
                                    {invoice.type === 'Student' && invoice.studentInvoices && invoice.studentInvoices.length > 0 && (
                                        <div className="summary-row">
                                            <span className="summary-label">
                                                <User size={14} />
                                                Học sinh
                                            </span>
                                            <span className="summary-value student-name">
                                                {invoice.studentInvoices[0].studentName}
                                            </span>
                                        </div>
                                    )}
                                    
                                    {invoice.type === 'Family' && invoice.studentInvoices && invoice.studentInvoices.length > 0 && (
                                        <div className="summary-row">
                                            <span className="summary-label">
                                                <Users size={14} />
                                                Danh sách
                                            </span>
                                            <span className="summary-value student-names">
                                                {[...new Set(invoice.studentInvoices.map(item => item.studentName))].join(', ')}
                                            </span>
                                        </div>
                                    )}
                                    
                                    <div className="summary-row">
                                        <span className="summary-label">
                                            <CreditCard size={14} />
                                            Tổng tiền
                                        </span>
                                        <span className="summary-value amount">{formatCurrency(invoice.totalAmount)}</span>
                                    </div>
                                    <div className="summary-row">
                                        <span className="summary-label">
                                            <Clock size={14} />
                                            Ngày tạo
                                        </span>
                                        <span className="summary-value">{formatDate(invoice.createdAt)}</span>
                                    </div>
                                    {invoice.paidAt && (
                                        <div className="summary-row">
                                            <span className="summary-label">Ngày thanh toán:</span>
                                            <span className="summary-value paid-date">{formatDate(invoice.paidAt)}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="invoice-actions">
                                    {invoice.status === 'Pending' && (
                                        <>
                                            <button
                                                className="invoice-action-btn pay"
                                                onClick={() => handlePayInvoice(invoice)}
                                                disabled={processingPayment}
                                            >
                                                <CreditCard size={16} />
                                                {processingPayment ? 'Đang xử lý...' : 'Thanh toán'}
                                            </button>
                                            <button
                                                className="invoice-action-btn cancel"
                                                onClick={() => handleCancelFamilyInvoice(invoice.invoiceId)}
                                                disabled={cancellingInvoiceId === invoice.invoiceId}
                                            >
                                                {cancellingInvoiceId === invoice.invoiceId ? 'Đang hủy...' : 'Hủy gộp'}
                                            </button>
                                        </>
                                    )}

                                    {invoice.studentInvoices && invoice.studentInvoices.length > 0 && (
                                        <button
                                            className="invoice-action-btn details"
                                            onClick={() => toggleInvoiceDetails(invoice.invoiceId)}
                                        >
                                            {expandedInvoiceIds.includes(invoice.invoiceId) ? 'Ẩn chi tiết' : 'Xem chi tiết'}
                                        </button>
                                    )}
                                </div>

                                {invoice.studentInvoices && invoice.studentInvoices.length > 0 && expandedInvoiceIds.includes(invoice.invoiceId) && (
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
                    <div className="modal-content modal-content--create" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Tạo hóa đơn gộp</h3>
                            <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="create-modal-layout">
                                <div className="create-modal-main">
                                    <div className="selection-hint">
                                        Chọn các hóa đơn chưa thanh toán để tạo một lô thanh toán mới. Nếu chỉ chọn hóa đơn của 1 học sinh, hệ thống sẽ tạo gộp theo học sinh; chọn từ nhiều học sinh sẽ tạo gộp gia đình.
                                    </div>

                                    {periodOptions.length > 0 && (
                                        <div className="period-filter">
                                            <label htmlFor="family-period-filter">Kỳ hóa đơn:</label>
                                            <select
                                                id="family-period-filter"
                                                value={selectedPeriodFilter}
                                                onChange={handlePeriodFilterChange}
                                            >
                                                <option value="all">Tất cả kỳ</option>
                                                {periodOptions.map((period) => (
                                                    <option key={period.key} value={period.key}>
                                                        Tháng {period.month}/{period.year}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="quick-actions">
                                        {childrenWithOutstanding.map((child) => (
                                            <button
                                                key={child.studentId}
                                                type="button"
                                                className={`quick-action-btn ${isSameSelection(getChildInvoiceIds(child.studentId)) ? 'active' : ''}`}
                                                onClick={() => selectOnlyChildInvoices(child.studentId)}
                                            >
                                                {`Chỉ ${child.fullName}`}
                                            </button>
                                        ))}

                                        <button
                                            type="button"
                                            className={`quick-action-btn ${isSameSelection(allFilteredInvoiceIds) && allFilteredInvoiceIds.length > 0 ? 'active' : ''}`}
                                            onClick={selectAllInvoices}
                                        >
                                            Chọn tất cả trong kỳ
                                        </button>

                                        <button
                                            type="button"
                                            className={`quick-action-btn muted ${selectedTuitionInvoiceIds.length === 0 ? 'active' : ''}`}
                                            onClick={clearSelection}
                                        >
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
                                    ) : filteredOutstandingInvoices.length === 0 ? (
                                        <div className="empty-state compact">
                                            <FileText size={42} />
                                            <h3>Không có hóa đơn trong kỳ đã chọn</h3>
                                            <p>Hãy chọn kỳ khác hoặc chuyển sang "Tất cả kỳ".</p>
                                        </div>
                                    ) : (
                                        <div className="tuition-selection-list">
                                            {filteredOutstandingInvoices.map((invoice) => {
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
                                </div>

                                <aside className="create-modal-side">
                                    <div className="selection-summary">
                                        <div>
                                            <span>Đã chọn:</span>
                                            <strong>{selectedTuitionInvoiceIds.length} hóa đơn</strong>
                                        </div>
                                        <div>
                                            <span>Đang hiển thị:</span>
                                            <strong>{filteredOutstandingInvoices.length} hóa đơn</strong>
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
                                        {selectedTuitionInvoiceIds.length > 0 && (
                                            <div>
                                                <span>Kiểu gộp:</span>
                                                <strong>{getTypeLabel(inferredMergeType)}</strong>
                                            </div>
                                        )}
                                    </div>
                                </aside>
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
                                disabled={
                                    creating ||
                                    loadingOutstanding ||
                                    filteredOutstandingInvoices.length === 0 ||
                                    selectedTuitionInvoiceIds.length === 0 ||
                                    selectedPeriods.length > 1
                                }
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
