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
    X,
    Lock,
    Unlock,
    ShieldAlert,
    Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import tuitionService from '../../services/tuitionService';
import paymentService from '../../services/paymentService';
import api from '../../services/api';
import ConfirmModal from '../../components/ConfirmModal';
import EInvoiceModal from '../../components/EInvoiceModal';
import vnpayLogo from '../../vnpay-logo.png';
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
    const [existingInvoiceStudentIds, setExistingInvoiceStudentIds] = useState([]);

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
    const [showRepresentationModal, setShowRepresentationModal] = useState(false);
    const [representationUrl, setRepresentationUrl] = useState('');
    const [selectedEInvoice, setSelectedEInvoice] = useState(null);

    // State cho gửi hóa đơn
    const [sendingInvoice, setSendingInvoice] = useState(null);
    const [processingEInvoiceId, setProcessingEInvoiceId] = useState(null);

    // State cho ConfirmModal
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'warning'
    });

    // State cho khóa hóa đơn
    const [lockInfo, setLockInfo] = useState(null);
    const [loadingLockInfo, setLoadingLockInfo] = useState(false);

    // State cho auto generate
    const [autoGenerating, setAutoGenerating] = useState(false);
    const [previewData, setPreviewData] = useState(null);

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

    // Kiểm tra trạng thái khóa khi chọn tháng/năm mới
    useEffect(() => {
        if (activeTab === 'calculate') {
            checkLockStatus(selectedMonth, selectedYear);
        }
    }, [selectedMonth, selectedYear, activeTab]);

    const fetchClasses = async () => {
        setLoadingClasses(true);
        try {
            const response = await api.get('/Classes');
            setClasses(response.data);
        } catch (error) {
            toast.error('Không thể tải danh sách lớp');
        } finally {
            setLoadingClasses(false);
        }
    };

    // Kiểm tra trạng thái khóa của tháng
    const checkLockStatus = async (month, year) => {
        setLoadingLockInfo(true);
        try {
            const data = await tuitionService.getLockInfo(month, year);
            setLockInfo(data);
            return data;
        } catch (error) {
            console.error('Error fetching lock info:', error);
            return null;
        } finally {
            setLoadingLockInfo(false);
        }
    };

    // Khóa tháng
    const handleLockMonth = async (month, year) => {
        try {
            await tuitionService.lockMonth(month, year);
            toast.success(`Đã khóa chỉnh sửa hóa đơn tháng ${month}/${year}`);
            checkLockStatus(month, year);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Khóa thất bại');
        }
    };

    // Mở khóa tháng
    const handleUnlockMonth = async (month, year) => {
        try {
            await tuitionService.unlockMonth(month, year);
            toast.success(`Đã mở khóa chỉnh sửa hóa đơn tháng ${month}/${year}`);
            checkLockStatus(month, year);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Mở khóa thất bại');
        }
    };

    // Kiểm tra xem có thể tạo hóa đơn không
    const canCreateInvoice = () => {
        if (!lockInfo) return true;
        return !lockInfo.isLocked;
    };

    // Preview hóa đơn tự động
    const handlePreviewAutoGenerate = async () => {
        try {
            const data = await tuitionService.previewInvoices(selectedMonth, selectedYear);
            setPreviewData(data);
            if (data.totalStudents === 0) {
                toast.error('Không có học sinh nào trong các lớp có giá');
            }
        } catch (error) {
            console.error('Preview error:', error);
            const message = error.response?.data?.message || error.message || 'Lỗi preview';
            toast.error(message);
        }
    };

    // Tạo hóa đơn tự động
    const handleAutoGenerate = async () => {
        setConfirmModal({
            isOpen: true,
            title: 'Tự động tạo hóa đơn',
            message: `Hệ thống sẽ tự động tạo hóa đơn cho tất cả học sinh trong các lớp có đơn giá cho tháng ${selectedMonth}/${selectedYear}. Tiếp tục?`,
            onConfirm: () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                executeAutoGenerate();
            },
            type: 'info'
        });
    };

    const executeAutoGenerate = async () => {
        setAutoGenerating(true);
        try {
            const result = await tuitionService.generateInvoices(selectedMonth, selectedYear);
            toast.success(`Đã tạo ${result.invoicesCreated} hóa đơn thành công`);
            setPreviewData(null);
            fetchInvoices();
        } catch (error) {
            console.error('Generate error:', error);
            const message = error.response?.data?.message || error.message || 'Lỗi tạo hóa đơn tự động';
            toast.error(message);
        } finally {
            setAutoGenerating(false);
        }
    };

    const fetchExistingInvoiceStudentIds = async (classId, month, year) => {
        const invoiceList = await tuitionService.getInvoices({ classId, month, year });
        const existingIds = new Set();

        (invoiceList || []).forEach((invoice) => {
            const studentId = invoice.studentId || invoice.student?.studentId || invoice.student?.studentNavigation?.studentId;
            if (studentId) {
                existingIds.add(studentId);
            }
        });

        return Array.from(existingIds);
    };

    const isStudentAlreadyInvoiced = (studentId) => existingInvoiceStudentIds.includes(studentId);

    // Tính toán học phí cho lớp
    const handleCalculate = async () => {
        if (!selectedClass) {
            toast.error('Vui lòng chọn lớp học');
            return;
        }

        setLoading(true);
        try {
            const parsedClassId = parseInt(selectedClass);
            const [data, existingIds] = await Promise.all([
                tuitionService.calculateClassTuition(
                    parsedClassId,
                    selectedMonth,
                    selectedYear
                ),
                fetchExistingInvoiceStudentIds(parsedClassId, selectedMonth, selectedYear)
            ]);

            setCalculations(data);
            setExistingInvoiceStudentIds(existingIds);
            setSelectedStudentIds([]);

            if (existingIds.length > 0) {
                toast.success(`Đã tính toán học phí cho ${data.length} học sinh. ${existingIds.length} học sinh đã có hóa đơn sẽ bị khóa chọn.`);
                return;
            }

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
        const alreadyInvoicedStudents = selected.filter(c => isStudentAlreadyInvoiced(c.studentId));
        const selectedWithoutExistingInvoice = selected.filter(c => !isStudentAlreadyInvoiced(c.studentId));

        // Chỉ giữ học sinh có buổi học > 0
        const validStudents = selectedWithoutExistingInvoice.filter(c => c.attendedSessions > 0);
        const noSessionStudents = selectedWithoutExistingInvoice.filter(c => c.attendedSessions === 0);

        if (validStudents.length === 0) {
            if (alreadyInvoicedStudents.length > 0) {
                toast.error('Các học sinh đã chọn đã có hóa đơn trong kỳ này. Vui lòng bỏ chọn các học sinh đã có hóa đơn.');
                return;
            }
            toast.error('Vui lòng chọn ít nhất một học sinh có buổi học.');
            return;
        }

        const warningParts = [];
        if (noSessionStudents.length > 0) {
            warningParts.push(`<span style="color:#f59e0b">⚠ ${noSessionStudents.length} học sinh không có buổi học sẽ bị bỏ qua.</span>`);
        }
        if (alreadyInvoicedStudents.length > 0) {
            warningParts.push(`<span style="color:#64748b">ℹ ${alreadyInvoicedStudents.length} học sinh đã có hóa đơn và sẽ bị loại khỏi yêu cầu tạo mới.</span>`);
        }

        const warningMsg = warningParts.length > 0 ? `<br/>${warningParts.join('<br/>')}` : '';

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
        const filteredStudentIds = [...new Set(studentIds)].filter((studentId) => !isStudentAlreadyInvoiced(studentId));
        if (filteredStudentIds.length === 0) {
            toast.error('Không có học sinh hợp lệ để tạo hóa đơn.');
            return;
        }

        setGenerating(true);
        try {
            const result = await tuitionService.createBatchInvoices({
                classId: parseInt(selectedClass),
                month: selectedMonth,
                year: selectedYear,
                studentIds: filteredStudentIds
            });

            if (result.successCount > 0) {
                toast.success(`Đã tạo ${result.successCount} hóa đơn thành công`);
                setSelectedStudentIds([]);
                const refreshedExistingIds = await fetchExistingInvoiceStudentIds(
                    parseInt(selectedClass),
                    selectedMonth,
                    selectedYear
                );
                setExistingInvoiceStudentIds(refreshedExistingIds);
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
            if (data?.lockInfo) {
                setLockInfo(data.lockInfo);
                toast.error(data.message, { duration: 6000 });
            } else if (data?.errors) {
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

    const downloadBlob = (response, fallbackFileName) => {
        const disposition = response?.headers?.['content-disposition'] || '';
        const fileNameFromHeader = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i);
        const fileName = decodeURIComponent(fileNameFromHeader?.[1] || fileNameFromHeader?.[2] || fallbackFileName);
        const blob = new Blob([response.data], { type: response.data?.type || 'application/octet-stream' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    };

    const openRepresentationPreview = (response) => {
        if (representationUrl) {
            window.URL.revokeObjectURL(representationUrl);
        }
        const blob = new Blob([response.data], { type: 'text/html;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        setRepresentationUrl(url);
        setShowRepresentationModal(true);
    };

    const closeRepresentationModal = () => {
        setShowRepresentationModal(false);
        setSelectedEInvoice(null);
        if (representationUrl) {
            window.URL.revokeObjectURL(representationUrl);
            setRepresentationUrl('');
        }
    };

    const handleOpenEInvoiceModal = async (invoice) => {
        if (!invoice?.invoiceId) return;
        setSelectedEInvoice(invoice);
        await downloadSandboxRepresentation(invoice);
    };

    const issueSandboxEInvoice = async (invoice) => {
        setProcessingEInvoiceId(invoice.invoiceId);
        try {
            const data = await tuitionService.issueSandboxEInvoice(invoice.invoiceId);
            toast.success(`Đã phát hành HĐĐT sandbox: ${data.invoiceNo || invoice.invoiceId}`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể phát hành HĐĐT sandbox');
        } finally {
            setProcessingEInvoiceId(null);
        }
    };

    const downloadSandboxXml = async (invoice) => {
        setProcessingEInvoiceId(invoice.invoiceId);
        try {
            const response = await tuitionService.downloadSandboxEInvoiceXml(invoice.invoiceId);
            downloadBlob(response, `${invoice.invoiceId}.xml`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể tải XML HĐĐT sandbox');
        } finally {
            setProcessingEInvoiceId(null);
        }
    };

    const downloadSandboxRepresentation = async (invoice) => {
        setProcessingEInvoiceId(invoice.invoiceId);
        try {
            const response = await tuitionService.downloadSandboxEInvoiceRepresentation(invoice.invoiceId);
            openRepresentationPreview(response);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể tải bản thể hiện HĐĐT sandbox');
        } finally {
            setProcessingEInvoiceId(null);
        }
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

    // Admin hủy hóa đơn
    const handleCancelInvoice = async (invoiceId) => {
        setConfirmModal({
            isOpen: true,
            title: 'Hủy hóa đơn',
            message: 'Bạn có chắc muốn hủy hóa đơn này? Hành động này không thể hoàn tác.',
            onConfirm: () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                executeCancelInvoice(invoiceId);
            },
            type: 'warning'
        });
    };

    const executeCancelInvoice = async (invoiceId) => {
        try {
            await tuitionService.cancelInvoice(invoiceId, 'Hủy bởi quản trị viên');
            toast.success('Đã hủy hóa đơn thành công');
            fetchInvoices();
        } catch (error) {
            const data = error.response?.data;
            if (data?.lockInfo) {
                setLockInfo(data.lockInfo);
                toast.error(data.message, { duration: 6000 });
            } else {
                toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi hủy hóa đơn');
            }
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

    useEffect(() => {
        setSelectedStudentIds((prev) => prev.filter((id) => !isStudentAlreadyInvoiced(id)));
    }, [existingInvoiceStudentIds]);

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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                <div>
                                    <h3>Tính toán học phí theo tháng</h3>
                                    <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 4 }}>
                                        Hệ thống sẽ tự động tạo hóa đơn vào ngày 1 mỗi tháng
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <button
                                        onClick={handlePreviewAutoGenerate}
                                        disabled={autoGenerating}
                                        style={{
                                            padding: '8px 12px',
                                            background: '#6366f1',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: 6,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        <Zap size={16} />
                                        Xem trước
                                    </button>
                                    <button
                                        onClick={handleAutoGenerate}
                                        disabled={autoGenerating || lockInfo?.isLocked}
                                        style={{
                                            padding: '8px 12px',
                                            background: lockInfo?.isLocked ? '#9ca3af' : '#059669',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: 6,
                                            cursor: lockInfo?.isLocked ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        <Zap size={16} />
                                        {autoGenerating ? 'Đang tạo...' : 'Tạo hóa đơn thủ công'}
                                    </button>
                                    {lockInfo && (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            padding: '8px 12px',
                                            borderRadius: 8,
                                            background: lockInfo.isLocked ? '#fee2e2' : '#d1fae5',
                                            color: lockInfo.isLocked ? '#dc2626' : '#059669'
                                        }}>
                                            {lockInfo.isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                                            <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                                                {lockInfo.isLocked ? 'Đã khóa' : 'Mở khóa'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {lockInfo?.isLocked && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '10px 14px',
                                    background: '#fef3c7',
                                    borderRadius: 8,
                                    marginBottom: 16,
                                    color: '#92400e',
                                    fontSize: '0.9rem'
                                }}>
                                    <ShieldAlert size={18} />
                                    <span>{lockInfo.message}</span>
                                </div>
                            )}

                            {previewData && (
                                <div style={{
                                    marginBottom: 16,
                                    padding: '12px 16px',
                                    background: '#f0f9ff',
                                    borderRadius: 8,
                                    border: '1px solid #bae6fd'
                                }}>
                                    <h4 style={{ margin: '0 0 8px 0', color: '#0369a1' }}>
                                        Preview hóa đơn tháng {previewData.month}/{previewData.year}
                                    </h4>
                                    <div style={{ display: 'flex', gap: 24, fontSize: '0.9rem', color: '#075985' }}>
                                        <span>Tổng lớp: <strong>{previewData.totalClasses}</strong></span>
                                        <span>Tổng học sinh: <strong>{previewData.totalStudents}</strong></span>
                                    </div>
                                    {previewData.classes.length > 0 && (
                                        <table style={{ marginTop: 12, width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: '#e0f2fe' }}>
                                                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Lớp</th>
                                                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Đơn giá</th>
                                                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>HS</th>
                                                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Đã có HĐ</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {previewData.classes.map(cls => (
                                                    <tr key={cls.classId} style={{ borderBottom: '1px solid #e0f2fe' }}>
                                                        <td style={{ padding: '6px 8px' }}>{cls.className}</td>
                                                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>{formatCurrency(cls.pricePerSession)}</td>
                                                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>{cls.studentCount}</td>
                                                        <td style={{ padding: '6px 8px', textAlign: 'right', color: cls.existingInvoices > 0 ? '#dc2626' : '#059669' }}>
                                                            {cls.existingInvoices}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}

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
                                    disabled={loading || (lockInfo?.isLocked)}
                                >
                                    {loading ? 'Đang tính...' : (lockInfo?.isLocked ? 'Đã khóa chỉnh sửa' : 'Tính toán')}
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
                                        <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                                            Đã có hóa đơn (khóa chọn): <strong>{existingInvoiceStudentIds.length}</strong>
                                        </span>
                                        <button
                                            className="generate-btn"
                                            onClick={handleGenerateInvoices}
                                            disabled={generating || selectedStudentIds.length === 0 || lockInfo?.isLocked}
                                        >
                                            <FileText size={18} />
                                            {generating ? 'Đang tạo...' : `Tạo hóa đơn (${selectedStudentIds.length})`}
                                        </button>
                                        <div style={{ display: 'flex', gap: 8, marginLeft: 8 }}>
                                            {lockInfo?.isLocked ? (
                                                <button
                                                    onClick={() => handleUnlockMonth(selectedMonth, selectedYear)}
                                                    style={{
                                                        padding: '8px 12px',
                                                        background: '#059669',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: 6,
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 6,
                                                        fontSize: '0.85rem'
                                                    }}
                                                >
                                                    <Unlock size={16} />
                                                    Mở khóa
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleLockMonth(selectedMonth, selectedYear)}
                                                    style={{
                                                        padding: '8px 12px',
                                                        background: '#dc2626',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: 6,
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 6,
                                                        fontSize: '0.85rem'
                                                    }}
                                                >
                                                    <Lock size={16} />
                                                    Khóa tháng
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="calculation-table">
                                    <div className="table-hint-text">
                                        Checkbox bị khóa nghĩa là học sinh đã có hóa đơn trong cùng lớp/tháng/năm.
                                    </div>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th style={{ width: 40 }}>
                                                    {(() => {
                                                        const selectableRows = calculations.filter((calc) => !isStudentAlreadyInvoiced(calc.studentId));
                                                        const selectableIds = selectableRows.map((calc) => calc.studentId);
                                                        const allSelectableChecked = selectableIds.length > 0
                                                            && selectableIds.every((id) => selectedStudentIds.includes(id));

                                                        return (
                                                            <input
                                                                type="checkbox"
                                                                checked={allSelectableChecked}
                                                                disabled={selectableIds.length === 0}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setSelectedStudentIds(selectableIds);
                                                                    } else {
                                                                        setSelectedStudentIds([]);
                                                                    }
                                                                }}
                                                                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#3b82f6' }}
                                                            />
                                                        );
                                                    })()}
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
                                                const isDisabled = isStudentAlreadyInvoiced(calc.studentId);
                                                return (
                                                    <tr key={index} style={isDisabled ? { opacity: 0.6, background: '#f1f5f9' } : hasNoSessions ? { opacity: 0.5, background: '#fef2f2' } : {}}>
                                                        <td>
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                disabled={isDisabled}
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
                                                            {isDisabled && <span style={{ marginLeft: 8, fontSize: '0.75rem', color: '#64748b' }}>(đã có hóa đơn)</span>}
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
                                    onChange={(e) => setInvoiceFilters({ ...invoiceFilters, status: e.target.value })}
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
                                    onChange={(e) => setInvoiceFilters({ ...invoiceFilters, month: e.target.value })}
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
                                                    {(invoice.status !== 'Paid' && invoice.status !== 'Cancelled') && (
                                                        <button
                                                            className="invoice-action-btn cancel"
                                                            onClick={() => handleCancelInvoice(invoice.invoiceId)}
                                                            style={{
                                                                padding: '4px 10px',
                                                                background: '#dc2626',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: 4,
                                                                cursor: 'pointer',
                                                                fontSize: '0.8rem',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 4,
                                                                marginLeft: 4
                                                            }}
                                                        >
                                                            <X size={12} />
                                                            Hủy
                                                        </button>
                                                    )}
                                                    {invoice.status === 'Paid' && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                className="einvoice-btn"
                                                                disabled={processingEInvoiceId === invoice.invoiceId}
                                                                onClick={() => handleOpenEInvoiceModal(invoice)}
                                                            >
                                                                Xem hóa đơn điện tử
                                                            </button>
                                                        </>
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
                                    <img src={vnpayLogo} alt="VNPay" />
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
                <EInvoiceModal
                    isOpen={showRepresentationModal && !!selectedEInvoice}
                    title="Hợp đồng điện tử"
                    previewUrl={representationUrl}
                    iframeTitle="sandbox-einvoice-representation"
                    onClose={closeRepresentationModal}
                    onDownload={() => downloadSandboxXml(selectedEInvoice)}
                    disableDownload={processingEInvoiceId === selectedEInvoice?.invoiceId}
                    downloadLabel="Tải xuống hóa đơn điện tử"
                />
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
