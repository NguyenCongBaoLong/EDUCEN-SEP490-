import { useState, useEffect, useMemo } from 'react';
import {
    FileText,
    CreditCard,
    CheckCircle,
    Clock,
    AlertCircle,
    Calendar,
    Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import StudentSidebar from '../../components/StudentSidebar';
import ParentSidebar from '../../components/ParentSidebar';
import tuitionService from '../../services/tuitionService';
import paymentService from '../../services/paymentService';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useChild } from '../../context/ChildContext';
import FamilyInvoices from '../parent/FamilyInvoices';
import vnpayLogo from '../../vnpay-logo.png';
import '../../css/pages/student/MyInvoices.css';

const MyInvoices = () => {
    const [allChildrenTab, setAllChildrenTab] = useState('all'); // 'all' | 'merge' | 'history'
    const [invoiceTab, setInvoiceTab] = useState('active'); // 'active' | 'history'
    const { user } = useAuth();
    const { selectedChild, childrenList } = useChild();
    const isParent = user?.role === 'Parent';
    const isAllChildren = isParent && selectedChild?.studentId === 'all';

    const [invoices, setInvoices] = useState([]);
    const [outstandingInvoices, setOutstandingInvoices] = useState([]);
    const [consolidatedInvoiceIds, setConsolidatedInvoiceIds] = useState(() => {
        const saved = localStorage.getItem('consolidatedInvoiceIds');
        if (!saved) return [];
        try {
            const parsed = JSON.parse(saved);
            return Array.isArray(parsed) ? parsed.map((id) => String(id)) : [];
        } catch {
            return [];
        }
    });
    const normalizedConsolidatedIds = useMemo(
        () => new Set((consolidatedInvoiceIds || []).map((id) => String(id))),
        [consolidatedInvoiceIds]
    );
    const [loading, setLoading] = useState(true);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [processingPayment, setProcessingPayment] = useState(false);

    useEffect(() => {
        fetchInvoices();
    }, [selectedChild]);

    // Refresh data khi component được focus lại (khi chuyển tab)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                console.log('Page became visible, refreshing invoices...');
                fetchInvoices();
            }
        };

        const handleFocus = () => {
            console.log('Window focused, refreshing invoices...');
            fetchInvoices();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, []);

    useEffect(() => {
        localStorage.setItem('consolidatedInvoiceIds', JSON.stringify(consolidatedInvoiceIds));
    }, [consolidatedInvoiceIds]);

    // Function để reset consolidated state khi cần
    const resetConsolidatedState = () => {
        console.log('Resetting consolidated state...');
        localStorage.removeItem('consolidatedInvoiceIds');
        setConsolidatedInvoiceIds([]);
    };

    // Thêm global function để user có thể reset thủ công
    useEffect(() => {
        window.resetConsolidatedInvoices = () => {
            console.log('Manual reset triggered by user');
            resetConsolidatedState();
            fetchInvoices();
            alert('Đã reset trạng thái gộp hóa đơn!');
        };
        
        window.showResetButton = () => {
            localStorage.setItem('showResetButton', 'true');
            alert('Đã hiển thị nút reset! Vui lòng refresh trang.');
        };
        
        window.hideResetButton = () => {
            localStorage.removeItem('showResetButton');
            alert('Đã ẩn nút reset! Vui lòng refresh trang.');
        };
        
        return () => {
            delete window.resetConsolidatedInvoices;
            delete window.showResetButton;
            delete window.hideResetButton;
        };
    }, []);

    
    // Lắng nghe sự thay đổi khi huỷ gộp hóa đơn
    useEffect(() => {
        const handleConsolidatedInvoicesChanged = (event) => {
            console.log('Consolidated invoices changed:', event.detail);
            
            if (event.detail.type === 'force-refresh') {
                // Force refresh: clear state và reload từ localStorage
                console.log('Force refreshing consolidated IDs...');
                resetConsolidatedState();
            } else {
                // Normal case: cập nhật state từ localStorage
                const savedIds = localStorage.getItem('consolidatedInvoiceIds');
                if (savedIds) {
                    const parsedIds = JSON.parse(savedIds);
                    setConsolidatedInvoiceIds(Array.isArray(parsedIds) ? parsedIds.map((id) => String(id)) : []);
                    console.log('Updated consolidated IDs from event:', parsedIds);
                }
            }
            
            // Refresh data để đảm bảo UI cập nhật
            fetchInvoices();
        };

        window.addEventListener('consolidatedInvoicesChanged', handleConsolidatedInvoicesChanged);
        
        return () => {
            window.removeEventListener('consolidatedInvoicesChanged', handleConsolidatedInvoicesChanged);
        };
    }, []);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            let allInvoices = await tuitionService.getMyInvoices();
            let outstanding = await tuitionService.getOutstandingInvoices();

            if (isParent && selectedChild && !isAllChildren) {
                allInvoices = allInvoices.filter((inv) => inv.studentId === selectedChild.studentId);
                outstanding = outstanding.filter((inv) => inv.studentId === selectedChild.studentId);
            }

            setInvoices(allInvoices);
            setOutstandingInvoices(outstanding);
        } catch (error) {
            toast.error('Không thể tải danh sách hóa đơn');
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        if (!selectedInvoice) return;

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

        // Kiểm tra xem hóa đơn đã được gộp hay chưa
        if (isInvoiceConsolidated(selectedInvoice)) {
            toast.error('Hóa đơn này đã được gộp vào hóa đơn tập thể. Vui lòng thanh toán qua hóa đơn tập thể.');
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
                toast.error(result.errorMessage || 'Lỗi tạo thanh toán');
            }
        } catch (error) {
            console.error('Payment create failed', error);
            toast.error(error.response?.data?.message || error.message || 'Lỗi thanh toán');
        } finally {
            setProcessingPayment(false);
        }
    };

    const handleConsolidateInvoices = async () => {
        console.log('handleConsolidateInvoices called');
        console.log('outstandingInvoices:', outstandingInvoices);
        
        const parentId = user?.userId || user?.nameid;
        const studentId = isParent
            ? (isAllChildren ? null : selectedChild?.studentId)
            : outstandingInvoices.find((inv) => inv.studentId)?.studentId
                || invoices.find((inv) => inv.studentId)?.studentId
                || user?.userId
                || user?.nameid;

        if (isParent && !studentId && !isAllChildren) {
            toast.error('Vui lòng chọn con');
            return;
        }

        if (!isParent && !studentId) {
            toast.error('Không thể xác định học sinh để gộp hóa đơn');
            return;
        }
        if (outstandingInvoices.length < 2) {
            toast.error('Cần ít nhất 2 hóa đơn để gộp');
            return;
        }

        setProcessingPayment(true);
        try {
            const periods = [...new Set(outstandingInvoices.map((inv) => `${inv.invoiceMonth}-${inv.invoiceYear}`))];
            let consolidatedCount = 0;
            let singleInvoices = [];

            for (const period of periods) {
                const [month, year] = period.split('-').map(Number);
                const monthInvoices = outstandingInvoices.filter(
                    (inv) => inv.invoiceMonth === month && inv.invoiceYear === year
                );
                
                if (monthInvoices.length >= 2) {
                    // Gộp những kỳ có 2 hóa đơn trở lên
                    const monthStudentIds = [...new Set(monthInvoices.map((inv) => inv.studentId).filter(Boolean))];
                    await api.post('/family-invoices/create-family', {
                        parentId: String(parentId),
                        type: isAllChildren ? 'Family' : 'Student',
                        month,
                        year,
                        studentIds: isAllChildren ? monthStudentIds : [studentId],
                        selectedTuitionInvoiceIds: monthInvoices.map((inv) => inv.invoiceId)
                    });
                    
                    // Lưu ID các hóa đơn đã gộp
                    const consolidatedIds = monthInvoices.map(inv => inv.invoiceId);
                    setConsolidatedInvoiceIds(prev => {
                        const newList = [...prev, ...consolidatedIds.map((id) => String(id))];
                        console.log('Previous consolidated IDs:', prev);
                        console.log('New consolidated IDs:', newList);
                        return newList;
                    });
                    
                    consolidatedCount++;
                } else if (monthInvoices.length === 1) {
                    // Lưu lại những hóa đơn đơn lẻ để thông báo
                    singleInvoices.push(monthInvoices[0]);
                }
            }

            // Thông báo kết quả
            let message = '';
            if (consolidatedCount > 0 && singleInvoices.length > 0) {
                message = `Đã gộp thành công ${consolidatedCount} kỳ. ${singleInvoices.length} hóa đơn đơn lẻ sẽ được thanh toán riêng.`;
            } else if (consolidatedCount > 0) {
                message = `Đã gộp thành công ${consolidatedCount} kỳ.`;
            } else if (singleInvoices.length > 0) {
                message = `Không thể gộp hóa đơn. Sẽ thanh toán ${singleInvoices.length} hóa đơn đơn lẻ.`;
            }
            
            toast.success(message || 'Đã xử lý xong');
            await fetchInvoices();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi tạo hóa đơn gộp');
        } finally {
            setProcessingPayment(false);
        }
    };

    const handleConsolidateSpecificPeriod = async (period, invoices) => {
        console.log('handleConsolidateSpecificPeriod called');
        console.log('period:', period);
        console.log('invoices:', invoices);
        
        const parentId = user?.userId || user?.nameid;
        const studentId = isParent
            ? (isAllChildren ? null : selectedChild?.studentId)
            : invoices.find((inv) => inv.studentId)?.studentId
                || outstandingInvoices.find((inv) => inv.studentId)?.studentId
                || user?.userId
                || user?.nameid;

        if (isParent && !studentId && !isAllChildren) {
            toast.error('Vui lòng chọn con');
            return;
        }

        if (!isParent && !studentId) {
            toast.error('Không thể xác định học sinh để gộp hóa đơn');
            return;
        }

        setProcessingPayment(true);
        try {
            const [month, year] = period.split('/').map(Number);
            const monthStudentIds = [...new Set(invoices.map((inv) => inv.studentId).filter(Boolean))];
            
            await api.post('/family-invoices/create-family', {
                parentId: String(parentId),
                type: isAllChildren ? 'Family' : 'Student',
                month,
                year,
                studentIds: isAllChildren ? monthStudentIds : [studentId],
                selectedTuitionInvoiceIds: invoices.map((inv) => inv.invoiceId)
            });

            // Lưu ID các hóa đơn đã gộp
            const consolidatedIds = invoices.map(inv => inv.invoiceId);
            setConsolidatedInvoiceIds(prev => {
                const newList = [...prev, ...consolidatedIds.map((id) => String(id))];
                console.log('Added consolidated invoice IDs for period:', consolidatedIds);
                console.log('New consolidated IDs list:', newList);
                return newList;
            });

            toast.success(`Đã gộp thành công hóa đơn kì ${period}`);
            await fetchInvoices();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi tạo hóa đơn gộp');
        } finally {
            setProcessingPayment(false);
        }
    };

    const handleQuickPay = async () => {
        if (outstandingInvoices.length === 0) return;

        if (outstandingInvoices.length === 1) {
            setSelectedInvoice(outstandingInvoices[0]);
            setShowPaymentModal(true);
            return;
        }

        await handleConsolidateInvoices();
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);

    const formatDate = (value) => new Date(value).toLocaleDateString('vi-VN');

    const isOverdue = (dueDate) => new Date(dueDate) < new Date();

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

    const getStatusText = (status, invoice) => {
        // Kiểm tra xem hóa đơn đã được gộp hay chưa (chỉ áp dụng cho parent)
        if (invoice && isInvoiceConsolidated(invoice)) {
            return 'Đã gộp';
        }
        
        switch (status) {
            case 'Paid':
                return 'Đã thanh toán';
            case 'Pending':
                return 'Chờ thanh toán';
            case 'Overdue':
                return 'Quá hạn';
            case 'Cancelled':
                return 'Đã hủy';
            case 'Draft':
                return 'Nháp';
            case 'Sent':
                // Student/Parent: "Đã gửi" hiển thị là "Chờ thanh toán"
                // Admin sẽ hiển thị "Đã gửi" (được xử lý ở file khác)
                return 'Chờ thanh toán';
            case 'Processing':
                return 'Đang xử lý';
            case 'Completed':
                return 'Đã hoàn thành';
            case 'Failed':
                return 'Thất bại';
            default:
                return status;
        }
    };

    const getStatusClassName = (status) => {
        switch (status) {
            case 'Paid':
                return 'paid';
            case 'Sent':
            case 'Pending':
            case 'Draft':
            case 'Processing':
                return 'pending';
            case 'Cancelled':
            case 'Overdue':
            case 'Failed':
                return 'failed';
            default:
                return 'default';
        }
    };

    const getStudentDisplayName = (invoice) => {
        const fromInvoice = invoice?.studentName?.trim();
        if (fromInvoice) return fromInvoice;
        const matched = childrenList?.find((c) => String(c.studentId) === String(invoice?.studentId));
        if (matched?.fullName) return matched.fullName;
        return `#${invoice?.studentId ?? 'N/A'}`;
    };

    const isInvoiceConsolidated = (invoice) => {
        // Debug: Log invoice structure để xem backend trả về gì
        console.log('Invoice structure:', invoice);
        console.log('Consolidated invoice IDs:', consolidatedInvoiceIds);
        console.log('Checking invoice ID:', invoice.invoiceId);
        
        // 1. Kiểm tra đơn giản nhất: ID có trong danh sách đã gộp không
        if (normalizedConsolidatedIds.has(String(invoice.invoiceId))) {
            console.log('Invoice found in consolidated list');
            return true;
        }
        
        // 2. Kiểm tra các field backend đánh dấu rõ ràng hóa đơn đã gộp
        const backendConsolidated = invoice.isConsolidated === true || 
               invoice.consolidatedInvoiceId || 
               invoice.familyInvoiceId ||
               invoice.isInFamilyInvoice === true ||
               invoice.status === 'Consolidated' || 
               invoice.status === 'InFamilyInvoice' ||
               invoice.status === 'Grouped' ||
               invoice.status === 'Merged';
               
        if (backendConsolidated) {
            console.log('Invoice marked as consolidated by backend');
            return true;
        }
        
        // 3. Chỉ kiểm tra outstanding nếu thực sự có hóa đơn gộp tồn tại
        // Kiểm tra xem có hóa đơn gộp nào cho cùng kỳ và cùng học sinh không
        const hasFamilyInvoiceForPeriod = invoices.some(inv => 
            (inv.type === 'Family' || inv.familyInvoiceId || inv.status === 'Family') &&
            inv.invoiceMonth === invoice.invoiceMonth && 
            inv.invoiceYear === invoice.invoiceYear &&
            (inv.studentId === invoice.studentId || !inv.studentId)
        );
        
        if (hasFamilyInvoiceForPeriod && (invoice.status === 'Pending' || invoice.status === 'Sent')) {
            console.log('Family invoice exists for same period, checking if invoice is included');
            
            // Kiểm tra xem hóa đơn có thực sự nằm trong hóa đơn gộp đó không
            const familyInvoice = invoices.find(inv => 
                (inv.type === 'Family' || inv.familyInvoiceId || inv.status === 'Family') &&
                inv.invoiceMonth === invoice.invoiceMonth && 
                inv.invoiceYear === invoice.invoiceYear &&
                (inv.studentId === invoice.studentId || !inv.studentId)
            );
            
            if (familyInvoice) {
                const isIncluded = familyInvoice.tuitionInvoiceIds?.includes(invoice.invoiceId) ||
                                 familyInvoice.selectedTuitionInvoiceIds?.includes(invoice.invoiceId) ||
                                 familyInvoice.invoiceIds?.includes(invoice.invoiceId);
                
                if (isIncluded) {
                    console.log('Invoice is included in family invoice');
                    return true;
                }
            }
        }
        
        console.log('Invoice is NOT consolidated');
        return false;
    };

    const activeInvoices = invoices.filter((invoice) => invoice.status !== 'Paid');
    const paidInvoices = invoices.filter((invoice) => invoice.status === 'Paid');
    const isHistoryView = isParent && isAllChildren
        ? allChildrenTab === 'history'
        : invoiceTab === 'history';
    const showAllInvoicesView = !isHistoryView && (!isParent || !isAllChildren || allChildrenTab === 'all');

    return (
        <div className="my-invoices-container">
            {isParent ? <ParentSidebar /> : <StudentSidebar />}

            <div className="invoices-content">
                <div className="page-header">
                    <h1>
                        {isParent && selectedChild
                            ? (isAllChildren ? 'Hóa đơn học phí của tất cả con' : `Hóa đơn học phí của ${selectedChild.fullName}`)
                            : 'Hóa đơn học phí của tôi'}
                    </h1>
                </div>

                {isParent && isAllChildren && (
                    <div className="invoices-subtabs">
                        <button
                            type="button"
                            className={`invoice-subtab-btn ${allChildrenTab === 'all' ? 'active' : ''}`}
                            onClick={() => setAllChildrenTab('all')}
                        >
                            Toàn bộ hóa đơn
                        </button>
                        <button
                            type="button"
                            className={`invoice-subtab-btn ${allChildrenTab === 'merge' ? 'active' : ''}`}
                            onClick={() => setAllChildrenTab('merge')}
                        >
                            Gộp hóa đơn
                        </button>
                        <button
                            type="button"
                            className={`invoice-subtab-btn ${allChildrenTab === 'history' ? 'active' : ''}`}
                            onClick={() => setAllChildrenTab('history')}
                        >
                            Lịch sử giao dịch
                        </button>
                    </div>
                )}

                {(!isParent || !isAllChildren) && (
                    <div className="invoices-subtabs">
                        <button
                            type="button"
                            className={`invoice-subtab-btn ${invoiceTab === 'active' ? 'active' : ''}`}
                            onClick={() => setInvoiceTab('active')}
                        >
                            Hóa đơn cần thanh toán
                        </button>
                        <button
                            type="button"
                            className={`invoice-subtab-btn ${invoiceTab === 'history' ? 'active' : ''}`}
                            onClick={() => setInvoiceTab('history')}
                        >
                            Lịch sử giao dịch
                        </button>
                    </div>
                )}

                {showAllInvoicesView && outstandingInvoices.length > 0 && (
                    <div className="outstanding-alert">
                        <div className="alert-content">
                            <AlertCircle />
                            <div className="alert-text">
                                <h3>Phí thanh toán: {formatCurrency(outstandingInvoices.reduce((sum, inv) => sum + inv.finalAmount, 0))}</h3>
                                
                                {(() => {
                                    const periods = [...new Set(outstandingInvoices.map(inv => `${inv.invoiceMonth}/${inv.invoiceYear}`))];
                                    const groupedByPeriod = {};
                                    
                                    outstandingInvoices.forEach(inv => {
                                        const period = `${inv.invoiceMonth}/${inv.invoiceYear}`;
                                        if (!groupedByPeriod[period]) {
                                            groupedByPeriod[period] = [];
                                        }
                                        groupedByPeriod[period].push(inv);
                                    });
                                    
                                    return (
                                        <div style={{ marginTop: '1rem' }}>
                                            <p style={{ marginBottom: '0.75rem' }}>
                                                Bạn hiện có <strong>{outstandingInvoices.length} hóa đơn</strong> phân bổ theo {periods.length} kỳ:
                                            </p>
                                            
                                            <div className="period-breakdown" style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>
                                                {Object.entries(groupedByPeriod).map(([period, invoices]) => (
                                                    <div key={period} className="period-item" style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '0.75rem',
                                                        background: '#f8fafc',
                                                        border: '1px solid #e2e8f0',
                                                        borderRadius: '0.5rem',
                                                        fontSize: '0.9rem'
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <Calendar size={16} style={{ color: '#3b82f6' }} />
                                                            <strong>Kỳ {period}</strong>
                                                            <span style={{ color: '#64748b' }}>({invoices.length} hóa đơn)</span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <span style={{ fontWeight: '600', color: '#059669' }}>
                                                                {formatCurrency(invoices.reduce((sum, inv) => sum + inv.finalAmount, 0))}
                                                            </span>
                                                            {invoices.length === 1 ? (
                                                                <button
                                                                    className="period-pay-btn"
                                                                    onClick={() => {
                                                                        setSelectedInvoice(invoices[0]);
                                                                        setShowPaymentModal(true);
                                                                    }}
                                                                    style={{
                                                                        padding: '0.4rem 0.8rem',
                                                                        background: '#3b82f6',
                                                                        color: 'white',
                                                                        border: 'none',
                                                                        borderRadius: '0.375rem',
                                                                        fontSize: '0.8rem',
                                                                        fontWeight: '500',
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '0.25rem'
                                                                    }}
                                                                >
                                                                    <CreditCard size={14} />
                                                                    Thanh toán
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    className="period-consolidate-btn"
                                                                    onClick={() => handleConsolidateSpecificPeriod(period, invoices)}
                                                                    style={{
                                                                        padding: '0.4rem 0.8rem',
                                                                        background: '#10b981',
                                                                        color: 'white',
                                                                        border: 'none',
                                                                        borderRadius: '0.375rem',
                                                                        fontSize: '0.8rem',
                                                                        fontWeight: '500',
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '0.25rem'
                                                                    }}
                                                                >
                                                                    <Users size={14} />
                                                                    Gộp hóa đơn
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            {periods.length > 1 && (
                                                <div className="period-notice" style={{
                                                    padding: '0.75rem',
                                                    background: '#dcfce7',
                                                    border: '1px solid #22c55e',
                                                    borderRadius: '0.5rem',
                                                    fontSize: '0.85rem',
                                                    color: '#166534'
                                                }}>
                                                    <strong style={{ display: 'block', marginBottom: '0.25rem' }}>
                                                        <CheckCircle size={14} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                                                        Thanh toán theo từng kỳ
                                                    </strong>
                                                    <div style={{ marginBottom: '0.5rem' }}>
                                                        Bạn có thể thanh toán từng kỳ riêng biệt.
                                                        Những kỳ có nhiều hóa đơn sẽ được gộp lại trước khi thanh toán.
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )}

                {showAllInvoicesView && (loading ? (
                    <div className="loading">Đang tải...</div>
                ) : (
                    <div className="invoices-list">
                        {activeInvoices.length === 0 ? (
                            <div className="empty-state">
                                <FileText />
                                <p>Hiện tại bạn không có hóa đơn cần thanh toán</p>
                            </div>
                        ) : (
                            activeInvoices.map((invoice) => (
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
                                            {getStatusText(invoice.status, invoice)}
                                        </div>
                                    </div>

                                    <div className="invoice-details">
                                        {isParent && isAllChildren && (
                                            <div className="detail-item">
                                                <span className="detail-label">Học sinh</span>
                                                <div className="detail-value">{getStudentDisplayName(invoice)}</div>
                                            </div>
                                        )}
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
                                                <span className="amount-value">{formatCurrency(invoice.finalAmount)}</span>
                                            </div>
                                        </div>

                                        {invoice.status !== 'Paid' && invoice.status !== 'Cancelled' && !isInvoiceConsolidated(invoice) && (
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

                                        {isInvoiceConsolidated(invoice) && (
                                            <div className="consolidated-indicator">
                                                <CheckCircle size={16} />
                                                <span>Đã gộp</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ))}

                {isHistoryView && (loading ? (
                    <div className="loading">Đang tải...</div>
                ) : (
                    <div className="history-table-wrapper">
                        {paidInvoices.length === 0 ? (
                            <div className="empty-state">
                                <FileText />
                                <p>Chưa có giao dịch thanh toán nào</p>
                            </div>
                        ) : (
                            <table className="history-table">
                                <thead>
                                    <tr>
                                        <th>Mã hóa đơn</th>
                                        <th>Kỳ</th>
                                        {isParent && <th>Học sinh</th>}
                                        <th>Lớp học</th>
                                        <th>Số buổi</th>
                                        <th>Hạn thanh toán</th>
                                        <th>Ngày thanh toán</th>
                                        <th>Trạng thái</th>
                                        <th>Số tiền</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paidInvoices.map((invoice) => (
                                        <tr key={invoice.invoiceId}>
                                            <td>#{invoice.invoiceId}</td>
                                            <td>{invoice.invoiceMonth}/{invoice.invoiceYear}</td>
                                            {isParent && <td>{getStudentDisplayName(invoice)}</td>}
                                            <td>{invoice.class?.className || 'N/A'}</td>
                                            <td>{invoice.attendedSessions ?? 0}</td>
                                            <td>{formatDate(invoice.dueDate)}</td>
                                            <td>{invoice.paidAt ? formatDate(invoice.paidAt) : (invoice.updatedAt ? formatDate(invoice.updatedAt) : '-')}</td>
                                            <td>
                                                <span className={`history-status-badge ${getStatusClassName(invoice.status)}`}>
                                                    {getStatusText(invoice.status, invoice)}
                                                </span>
                                            </td>
                                            <td>{formatCurrency(invoice.finalAmount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                ))}

                {isParent && isAllChildren && allChildrenTab === 'merge' && (
                    <div className="family-invoices-embedded">
                        <FamilyInvoices embedded />
                    </div>
                )}

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
                                        {isOverdue(selectedInvoice.dueDate) && <span className="overdue-text"> (Quá hạn)</span>}
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

