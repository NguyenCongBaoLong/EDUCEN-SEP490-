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
    CreditCard,
    Send,
    Eye,
    Globe,
    Edit3,
    Save,
    X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import tuitionService from '../../services/tuitionService';
import paymentService from '../../services/paymentService';
import api from '../../services/api';
import ConfirmModal from '../../components/ConfirmModal';
import '../../css/pages/center/TuitionManagement.css';

const TuitionManagement = () => {
    const { classId } = useParams();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('calculate'); // 'calculate' | 'invoices'
    
    // State cho danh sách lớp
    const [classes, setClasses] = useState([]);
    const [loadingClasses, setLoadingClasses] = useState(false);
    
    // State cho tính toán học phí
    const [selectedClass, setSelectedClass] = useState(classId || '');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [calculations, setCalculations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    
    // State cho tick chọn học sinh
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);
    
    // State cho quản lý đơn giá lớp học
    const [currentClassPrice, setCurrentClassPrice] = useState(0);
    const [isEditingPrice, setIsEditingPrice] = useState(false);
    const [newPriceInput, setNewPriceInput] = useState('');
    const [updatingPrice, setUpdatingPrice] = useState(false);
    
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

    // State cho gửi hóa đơn
    const [sendingInvoice, setSendingInvoice] = useState(null);

    // State cho ConfirmModal
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        type: 'warning'
    });

    // Lấy tenantId - chấp nhận cả default-tenant
    const getValidTenantId = () => {
        const stored = localStorage.getItem('tenantId');
        if (stored) return stored;
        if (user?.tenantId) return user.tenantId;
        return 'default-tenant';
    };

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

    // Load danh sách lớp khi mount
    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        setLoadingClasses(true);
        try {
            const response = await api.get('/Classes');
            setClasses(response.data);
            
            // Nếu có classId từ URL, tìm giá của nó
            if (classId) {
                const cls = response.data.find(c => c.classId === parseInt(classId));
                if (cls) setCurrentClassPrice(cls.pricePerSession || 0);
            }
        } catch (error) {
            toast.error('Không thể tải danh sách lớp');
        } finally {
            setLoadingClasses(false);
        }
    };

    // Khi chọn lớp khác, cập nhật đơn giá của lớp đó
    useEffect(() => {
        if (selectedClass) {
            const cls = classes.find(c => c.classId === parseInt(selectedClass));
            if (cls) {
                setCurrentClassPrice(cls.pricePerSession || 0);
                setIsEditingPrice(false);
            }
        } else {
            setCurrentClassPrice(0);
            setIsEditingPrice(false);
        }
    }, [selectedClass, classes]);

    const handleUpdatePrice = async () => {
        const priceValue = parseFloat(newPriceInput);
        if (isNaN(priceValue) || priceValue < 0) {
            toast.error('Vui lòng nhập đơn giá hợp lệ');
            return;
        }

        setUpdatingPrice(true);
        try {
            await tuitionService.updateClassPrice(parseInt(selectedClass), priceValue);
            setCurrentClassPrice(priceValue);
            setIsEditingPrice(false);
            toast.success('Đã cập nhật đơn giá lớp học');
            
            // Cập nhật lại danh sách lớp để đồng bộ dữ liệu
            setClasses(prev => prev.map(cls => 
                cls.classId === parseInt(selectedClass) 
                    ? { ...cls, pricePerSession: priceValue } 
                    : cls
            ));
            
            // Nếu đang có kết quả tính toán, tính lại để cập nhật số liệu
            if (calculations.length > 0) {
                handleCalculate();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi cập nhật đơn giá');
        } finally {
            setUpdatingPrice(false);
        }
    };

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
            setSelectedStudentIds([]);
            toast.success(`Đã tính toán học phí cho ${data.length} học sinh`);
        } catch (error) {
            const data = error.response?.data;
            if (data?.errors) {
                const errorDetails = data.errors.map(e => 
                    `${e.field}: ${e.errors?.join(', ')}`
                ).join('\n');
                toast.error(`Lỗi:\n${errorDetails}`, { duration: 6000 });
            } else {
                toast.error(data?.message || 'Lỗi tính toán học phí');
            }
        } finally {
            setLoading(false);
        }
    };

    // Tạo hóa đơn hàng loạt
    const handleGenerateInvoices = async () => {
        // Lọc học sinh đã chọn
        const selected = calculations.filter(c => selectedStudentIds.includes(c.studentId));
        
        // Chỉ giữ học sinh có buổi học > 0
        const validStudents = selected.filter(c => c.attendedSessions > 0);
        const noSessionStudents = selected.filter(c => c.attendedSessions === 0);

        if (validStudents.length === 0) {
            toast.error('Vui lòng chọn ít nhất một học sinh có buổi học.');
            return;
        }

        let warningMsg = '';
        if (noSessionStudents.length > 0) {
            warningMsg = `<br/><span style="color:#f59e0b">⚠ ${noSessionStudents.length} học sinh không có buổi học sẽ bị bỏ qua.</span>`;
        }

        setConfirmModal({
            isOpen: true,
            title: 'Tạo hóa đơn',
            message: `Tạo hóa đơn cho <strong>${validStudents.length}</strong> học sinh?${warningMsg}`,
            onConfirm: () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                executeGenerateInvoices(validStudents.map(c => c.studentId));
            },
            type: 'info'
        });
    };

    const executeGenerateInvoices = async (studentIds) => {
        setGenerating(true);
        try {
            const result = await tuitionService.createBatchInvoices({
                classId: parseInt(selectedClass),
                month: selectedMonth,
                year: selectedYear,
                studentIds
            });

            if (result.successCount > 0) {
                toast.success(`Đã tạo ${result.successCount} hóa đơn thành công`);
                setSelectedStudentIds([]);
                fetchInvoices();
            }
            if (result.failedCount > 0) {
                const errorDetails = result.errors?.join('\n') || '';
                toast.error(
                    `${result.failedCount} hóa đơn thất bại${errorDetails ? ':\n' + errorDetails : ''}`,
                    { duration: 8000 }
                );
            }
        } catch (error) {
            const data = error.response?.data;
            if (data?.errors) {
                // Hiện chi tiết validation errors
                const errorDetails = data.errors.map(e => 
                    `${e.field}: ${e.errors?.join(', ')}`
                ).join('\n');
                toast.error(`Validation lỗi:\n${errorDetails}`, { duration: 6000 });
            } else {
                toast.error(data?.message || 'Lỗi tạo hóa đơn');
            }
        } finally {
            setGenerating(false);
        }
    };

    // Lấy danh sách hóa đơn
    const fetchInvoices = async () => {
        setInvoicesLoading(true);
        try {
            const data = await tuitionService.getInvoices(invoiceFilters);
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
            const tenantId = getValidTenantId();
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

    // Gửi 1 hóa đơn (Draft → Sent)
    const handleSendInvoice = async (invoiceId) => {
        setSendingInvoice(invoiceId);
        try {
            await tuitionService.sendInvoice(invoiceId);
            toast.success('Đã gửi hóa đơn cho học sinh');
            fetchInvoices();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi gửi hóa đơn');
        } finally {
            setSendingInvoice(null);
        }
    };

    // Gửi hàng loạt hóa đơn Draft
    const handleBatchSend = async () => {
        const draftInvoices = invoices.filter(inv => inv.status === 'Draft');
        if (draftInvoices.length === 0) {
            toast.error('Không có hóa đơn nháp nào để gửi');
            return;
        }

        setConfirmModal({
            isOpen: true,
            title: 'Gửi hóa đơn hàng loạt',
            message: `Bạn đang chuẩn bị gửi <strong>${draftInvoices.length}</strong> hóa đơn nháp cho học sinh/phụ huynh. Tiếp tục?`,
            onConfirm: () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                executeBatchSend(draftInvoices);
            },
            type: 'info'
        });
    };

    const executeBatchSend = async (draftInvoices) => {
        let successCount = 0;
        let failCount = 0;

        for (const invoice of draftInvoices) {
            try {
                await tuitionService.sendInvoice(invoice.invoiceId);
                successCount++;
            } catch {
                failCount++;
            }
        }

        if (successCount > 0) toast.success(`Đã gửi ${successCount} hóa đơn`);
        if (failCount > 0) toast.error(`${failCount} hóa đơn gửi thất bại`);

        fetchInvoices();
    };

    // Admin thu tiền học phí mặt
    const handleMarkAsPaid = async (invoiceId) => {
        setConfirmModal({
            isOpen: true,
            title: 'Xác nhận thu tiền mặt',
            message: 'Bạn đã thực nhận tiền mặt từ học sinh này? Hệ thống sẽ đánh dấu hóa đơn là đã thanh toán.',
            onConfirm: () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                executeMarkAsPaid(invoiceId);
            },
            type: 'warning'
        });
    };

    const executeMarkAsPaid = async (invoiceId) => {
        try {
            await tuitionService.markAsPaid(invoiceId, 'Cash', 'Học sinh nộp tiền mặt tại văn phòng');
            toast.success('Đã xác nhận thu tiền thành công');
            fetchInvoices();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        }
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
                                        disabled={loadingClasses}
                                    >
                                        <option value="">
                                            {loadingClasses ? 'Đang tải lớp...' : 'Chọn lớp...'}
                                        </option>
                                        {classes.map(cls => (
                                            <option key={cls.classId} value={cls.classId}>
                                                {cls.className || `Lớp ${cls.classId}`}
                                            </option>
                                        ))}
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
                                
                                {selectedClass && (
                                    <div className="filter-group class-price-group">
                                        <label>Đơn giá/buổi</label>
                                        {!isEditingPrice ? (
                                            <div className="price-display">
                                                <span className="price-value">{formatCurrency(currentClassPrice)}</span>
                                                <button 
                                                    className="edit-price-btn"
                                                    onClick={() => {
                                                        setNewPriceInput(currentClassPrice.toString());
                                                        setIsEditingPrice(true);
                                                    }}
                                                    title="Chỉnh sửa đơn giá"
                                                >
                                                    <Edit3 size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="price-edit">
                                                <input 
                                                    type="number"
                                                    value={newPriceInput}
                                                    onChange={(e) => setNewPriceInput(e.target.value)}
                                                    placeholder="Nhập giá..."
                                                    className="price-input"
                                                    autoFocus
                                                />
                                                <button 
                                                    className="save-price-btn"
                                                    onClick={handleUpdatePrice}
                                                    disabled={updatingPrice}
                                                >
                                                    <Save size={16} />
                                                </button>
                                                <button 
                                                    className="cancel-price-btn"
                                                    onClick={() => setIsEditingPrice(false)}
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

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
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                            Đã chọn: <strong>{selectedStudentIds.length}</strong>
                                        </span>
                                        <button 
                                            className="generate-btn"
                                            onClick={handleGenerateInvoices}
                                            disabled={generating || selectedStudentIds.length === 0}
                                        >
                                            <FileText size={18} />
                                            {generating ? 'Đang tạo...' : `Tạo hóa đơn (${selectedStudentIds.length})`}
                                        </button>
                                    </div>
                                </div>
                                <div className="calculation-table">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th style={{ width: 40 }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedStudentIds.length === calculations.length && calculations.length > 0}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedStudentIds(calculations.map(c => c.studentId));
                                                            } else {
                                                                setSelectedStudentIds([]);
                                                            }
                                                        }}
                                                        style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#3b82f6' }}
                                                    />
                                                </th>
                                                <th>Học sinh</th>
                                                <th>Số buổi học</th>
                                                <th>Đã học</th>
                                                <th>Vắng mặt</th>
                                                <th>Đơn giá/buổi</th>
                                                <th>Thành tiền</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {calculations.map((calc, index) => {
                                                const isSelected = selectedStudentIds.includes(calc.studentId);
                                                const hasNoSessions = calc.attendedSessions === 0;
                                                return (
                                                <tr key={index} style={hasNoSessions ? { opacity: 0.5, background: '#fef2f2' } : {}}>
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedStudentIds(prev => [...prev, calc.studentId]);
                                                                } else {
                                                                    setSelectedStudentIds(prev => prev.filter(id => id !== calc.studentId));
                                                                }
                                                            }}
                                                            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#3b82f6' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        {calc.studentName}
                                                        {hasNoSessions && <span style={{ marginLeft: 8, fontSize: '0.75rem', color: '#ef4444' }}>(0 buổi)</span>}
                                                    </td>
                                                    <td>{calc.totalSessions}</td>
                                                    <td className="attended">{calc.attendedSessions}</td>
                                                    <td className="absent">{calc.absentSessions}</td>
                                                    <td>{formatCurrency(calc.pricePerSession)}</td>
                                                    <td className="total">{formatCurrency(calc.finalAmount)}</td>
                                                </tr>
                                                );
                                            })}
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
                            {invoices.some(inv => inv.status === 'Draft') && (
                                <button 
                                    className="batch-send-btn"
                                    onClick={handleBatchSend}
                                    style={{
                                        padding: '8px 16px',
                                        background: '#2563eb',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 6,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6
                                    }}
                                >
                                    <Send size={16} />
                                    Gửi tất cả nháp
                                </button>
                            )}
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
                                                    {invoice.status === 'Draft' && (
                                                        <button 
                                                            className="send-btn"
                                                            onClick={() => handleSendInvoice(invoice.invoiceId)}
                                                            disabled={sendingInvoice === invoice.invoiceId}
                                                            style={{
                                                                padding: '4px 10px',
                                                                background: '#2563eb',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: 4,
                                                                cursor: 'pointer',
                                                                fontSize: '0.8rem',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 4
                                                            }}
                                                        >
                                                            <Send size={12} />
                                                            {sendingInvoice === invoice.invoiceId ? 'Đang gửi...' : 'Gửi'}
                                                        </button>
                                                    )}
                                                    {(invoice.status === 'Sent' || invoice.status === 'Overdue') && (
                                                        <button 
                                                            className="pay-btn"
                                                            onClick={() => handleMarkAsPaid(invoice.invoiceId)}
                                                        >
                                                            <CreditCard size={14} />
                                                            Đã thu tiền
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
                {/* Confirm Modal */}
                <ConfirmModal
                    isOpen={confirmModal.isOpen}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    onConfirm={confirmModal.onConfirm}
                    onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                    type={confirmModal.type}
                />
            </div>
        </div>
    );
};

export default TuitionManagement;
