import { useEffect, useState } from 'react';
import { Check, CreditCard, PackageOpen, X, ArrowUpDown, Wallet, Clock, Calendar, FileText, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import ContractViewer from '../../components/ContractViewer';
import api from '../../services/api';
import paymentService from '../../services/paymentService';
import { useAuth } from '../../context/AuthContext';
import '../../css/pages/center/SubscriptionPlans.css';

const SubscriptionPlans = ({ hideSidebar = false }) => {
    const location = useLocation();
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [payingPlanId, setPayingPlanId] = useState(null);
    const [activeSubscription, setActiveSubscription] = useState(null);
    const [renewTarget, setRenewTarget] = useState(null);
    const [renewMonths, setRenewMonths] = useState(1);
    const [creditBalance, setCreditBalance] = useState(0);
    const [changePlanTarget, setChangePlanTarget] = useState(null);
    const [extendTarget, setExtendTarget] = useState(null);
    const [extendMonths, setExtendMonths] = useState(1);
    const [extendDurationType, setExtendDurationType] = useState('months');
    const [showCreditHistory, setShowCreditHistory] = useState(false);
    const [creditLedger, setCreditLedger] = useState([]);
    const [creditHistoryLoading, setCreditHistoryLoading] = useState(false);
    const { user } = useAuth();

    // Contract & Change Request states
    const [showContracts, setShowContracts] = useState(false);
    const [contracts, setContracts] = useState([]);
    const [loadingContracts, setLoadingContracts] = useState(false);
    const [viewContractTarget, setViewContractTarget] = useState(null);
    const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);
    const [showInvoicesModal, setShowInvoicesModal] = useState(false);
    const [showRequestsModal, setShowRequestsModal] = useState(false);
    const [changeRequestPlanId, setChangeRequestPlanId] = useState('');
    const [changeRequestMonths, setChangeRequestMonths] = useState(1);
    const [changeRequestReason, setChangeRequestReason] = useState('');
    const [submittingRequest, setSubmittingRequest] = useState(false);
    const [myChangeRequests, setMyChangeRequests] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(false);
    const [myInvoices, setMyInvoices] = useState([]);
    const [loadingInvoices, setLoadingInvoices] = useState(false);
    const [submittingInvoicePayment, setSubmittingInvoicePayment] = useState(false);
    const [onlinePaymentHistory, setOnlinePaymentHistory] = useState([]);
    const [loadingOnlineHistory, setLoadingOnlineHistory] = useState(false);

    useEffect(() => {
        const fetchPlans = async () => {
            setLoading(true);
            const [plansResult, subscriptionResult, creditResult] = await Promise.allSettled([
                api.get('/admin/plans'),
                api.get('/admin/subscription/current'),
                api.get('/admin/subscription/credit-balance'),
            ]);

            if (plansResult.status === 'fulfilled') {
                setPlans(plansResult.value.data || []);
            } else {
                toast.error('Không thể tải danh sách gói dịch vụ');
                setPlans([]);
            }

            if (subscriptionResult.status === 'fulfilled') {
                setActiveSubscription(subscriptionResult.value.data || null);
            } else {
                setActiveSubscription(null);
            }

            if (creditResult.status === 'fulfilled' && creditResult.value.data) {
                setCreditBalance(creditResult.value.data.creditBalance || 0);
            } else {
                setCreditBalance(0);
            }

            setLoading(false);
        };

        fetchPlans();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('contracts') === '1') {
            loadContracts();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search]);

    const loadCreditHistory = async () => {
        if (creditHistoryLoading || creditLedger.length > 0) {
            setShowCreditHistory(true);
            return;
        }

        setCreditHistoryLoading(true);
        try {
            const res = await api.get('/admin/subscription/credit-ledger', {
                params: { page: 1, pageSize: 20 }
            });
            setCreditLedger(Array.isArray(res.data) ? res.data : []);
            setShowCreditHistory(true);
        } catch (error) {
            console.error('Load credit history error:', error?.response?.data || error);
            toast.error('Không thể tải lịch sử giao dịch credit');
        } finally {
            setCreditHistoryLoading(false);
        }
    };

    const loadContracts = async () => {
        setLoadingContracts(true);
        try {
            const res = await api.get('/admin/subscription/contracts');
            setContracts(res.data || []);
            setShowContracts(true);
        } catch (error) {
            console.error('Load contracts error:', error?.response?.data || error);
            toast.error('Không thể tải danh sách hợp đồng');
        } finally {
            setLoadingContracts(false);
        }
    };

    const loadMyChangeRequests = async () => {
        setLoadingRequests(true);
        try {
            const res = await api.get('/admin/subscription/my-change-requests');
            setMyChangeRequests(res.data || []);
        } catch (error) {
            console.error('Load change requests error:', error?.response?.data || error);
        } finally {
            setLoadingRequests(false);
        }
    };

    const loadMyInvoices = async () => {
        setLoadingInvoices(true);
        try {
            const res = await api.get('/admin/subscription/invoices');
            setMyInvoices(res.data || []);
        } catch (error) {
            console.error('Load invoices error:', error?.response?.data || error);
        } finally {
            setLoadingInvoices(false);
        }
    };

    const loadOnlinePaymentHistory = async () => {
        setLoadingOnlineHistory(true);
        try {
            const res = await api.get('/admin/subscription/payment-history');
            setOnlinePaymentHistory(res.data || []);
        } catch (error) {
            console.error('Load payment history error:', error?.response?.data || error);
        } finally {
            setLoadingOnlineHistory(false);
        }
    };

    const submitChangeRequestByPlan = async (planId, months = 1, reason = '') => {
        await api.post('/admin/subscription/request-change', {
            requestedPlanId: planId,
            months,
            reason
        });
    };

    const submitChangeRequest = async (e) => {
        e.preventDefault();
        if (!changeRequestPlanId) {
            toast.error('Vui lòng chọn gói dịch vụ');
            return;
        }

        const tenantId = user?.tenantId || localStorage.getItem('tenantId');
        if (!tenantId) {
            toast.error('Không tìm thấy thông tin trung tâm');
            return;
        }

        setSubmittingRequest(true);
        try {
            await submitChangeRequestByPlan(changeRequestPlanId, changeRequestMonths, changeRequestReason);
            toast.success('Đã gửi yêu cầu đổi gói. Vui lòng chờ SystemAdmin duyệt.');
            setShowChangeRequestModal(false);
            setChangeRequestPlanId('');
            setChangeRequestMonths(1);
            setChangeRequestReason('');
            loadMyChangeRequests();
            loadMyInvoices();
        } catch (error) {
            console.error('Submit change request error:', error?.response?.data || error);
            toast.error(error.response?.data?.message || 'Không thể gửi yêu cầu đổi gói');
        } finally {
            setSubmittingRequest(false);
        }
    };

    const handleViewContract = (contract) => {
        setViewContractTarget(contract);
    };

    const handlePay = async (plan, months = 1) => {
        setPayingPlanId(plan.planId);
        try {
            const normalizedMonths = Math.max(1, Number(months) || 1);
            await submitChangeRequestByPlan(
                plan.planId,
                normalizedMonths,
                `Yêu cầu đăng ký gói ${plan.planName} (${normalizedMonths} tháng)`
            );
            toast.success('Đã gửi yêu cầu đăng ký gói. Vui lòng chờ SystemAdmin duyệt.');
            loadMyChangeRequests();
            loadMyInvoices();
            setShowChangeRequestModal(true);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể gửi yêu cầu đăng ký gói');
        } finally {
            setPayingPlanId(null);
        }
    };

    const openRenewModal = (plan) => {
        setRenewTarget(plan);
        setRenewMonths(1);
    };

    const openExtendModal = () => {
        if (!activeSubscription) return;
        setExtendTarget({ ...activeSubscription });
        setExtendMonths(1);
        setExtendDurationType('months');
    };

    const handleExtendSubscription = async () => {
        if (!extendTarget) return;

        setPayingPlanId('extend');
        try {
            const actualMonths = extendDurationType === 'quarters' ? extendMonths * 3 : extendMonths;
            await submitChangeRequestByPlan(
                extendTarget.planId,
                actualMonths,
                `Yêu cầu gia hạn gói ${extendTarget.planName} (${actualMonths} tháng)`
            );
            toast.success('Đã gửi yêu cầu gia hạn. Vui lòng chờ SystemAdmin duyệt.');
            setExtendTarget(null);
            loadMyChangeRequests();
            loadMyInvoices();
            setShowChangeRequestModal(true);
        } catch (error) {
            console.error('Extend request error:', error.response?.data);
            toast.error(error.response?.data?.message || 'Không thể gửi yêu cầu gia hạn');
        } finally {
            setPayingPlanId(null);
        }
    };


    // Kiểm tra có được đổi gói không
    const canChangePlan = (plan) => {
        if (!activeSubscription) return true; // Lần đầu luôn được
        
        // Nâng gói -> luôn được
        if (plan.price > activeSubscription.planPrice) {
            return true;
        }
        
        // Hạ gói -> chỉ trong 7 ngày đầu
        if (plan.price < activeSubscription.planPrice) {
            const daysSinceStart = Math.floor((new Date() - new Date(activeSubscription.startDate)) / (1000 * 60 * 60 * 24));
            return daysSinceStart <= 7;
        }
        
        return false; // Cùng giá gói -> không cần đổi
    };

    // Xử lý đổi gói - hiển thị modal xác nhận
    const handleChangePlanClick = (plan) => {
        if (!canChangePlan(plan)) {
            const daysSinceStart = Math.floor((new Date() - new Date(activeSubscription.startDate)) / (1000 * 60 * 60 * 24));
            if (daysSinceStart > 7) {
                toast.error('Chỉ được hạ gói trong 7 ngày đầu tiên của gói dịch vụ');
                return;
            }
        }
        setChangePlanTarget(plan);
    };

    // Xác nhận đổi gói: Center chỉ gửi yêu cầu, không đổi trực tiếp
    const confirmChangePlan = async () => {
        if (!changePlanTarget) return;
        try {
            await submitChangeRequestByPlan(
                changePlanTarget.planId,
                1,
                `Yêu cầu đổi sang gói ${changePlanTarget.planName}`
            );
            toast.success('Đã gửi yêu cầu đổi gói. Vui lòng chờ SystemAdmin duyệt.');
            setChangePlanTarget(null);
            loadMyChangeRequests();
            loadMyInvoices();
            setShowChangeRequestModal(true);
        } catch (error) {
            console.error('Request change plan error:', error.response?.data);
            toast.error(error.response?.data?.message || 'Không thể gửi yêu cầu đổi gói');
        }
    };

    const requestOfflineInvoicePayment = async (invoiceId, paymentMethod) => {
        setSubmittingInvoicePayment(true);
        try {
            await api.post(`/admin/subscription/invoices/${invoiceId}/request-offline-payment`, {
                paymentMethod,
                paymentNote: `Center yêu cầu xác nhận thanh toán ${paymentMethod}.`
            });
            toast.success('Đã gửi yêu cầu xác nhận thanh toán tới SystemAdmin.');
            loadMyInvoices();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể gửi yêu cầu thanh toán.');
        } finally {
            setSubmittingInvoicePayment(false);
        }
    };

    const payInvoiceByVnPay = async (invoice) => {
        setSubmittingInvoicePayment(true);
        try {
            const payload = { returnUrl: paymentService.getVNPayReturnUrl() };
            const res = await api.post(`/admin/subscription/invoices/${invoice.invoiceId}/create-vnpay-payment`, payload);
            const paymentUrl = res?.data?.paymentUrl;
            if (!paymentUrl) {
                toast.error('Không thể tạo link thanh toán VNPay');
                return;
            }
            window.location.href = paymentUrl;
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể tạo thanh toán VNPay');
        } finally {
            setSubmittingInvoicePayment(false);
        }
    };

    // Tính số tiền phải trả khi đổi gói (chính sách mới)
    const calculateChangePlanAmount = (plan) => {
        let finalPrice = 0;
        
        if (!activeSubscription) {
            // Chưa có gói → trả giá gói
            finalPrice = Math.round(plan.price);
        } else {
            // Kiểm tra grace period (7 ngày đầu)
            const daysSinceStart = Math.floor((new Date() - new Date(activeSubscription.startDate)) / (1000 * 60 * 60 * 24));
            const GRACE_PERIOD_DAYS = 7;
            
            if (daysSinceStart > GRACE_PERIOD_DAYS) {
                // Ngoài grace period → không refund
                finalPrice = Math.round(plan.price);
            } else {
                // Trong grace period → có thể refund
                if (plan.price < activeSubscription.planPrice) {
                    // Downgrade trong grace period → refund chênh lệch
                    const totalDays = Math.floor((new Date(activeSubscription.endDate) - new Date(activeSubscription.startDate)) / (1000 * 60 * 60 * 24));
                    const remainingDays = Math.floor((new Date(activeSubscription.endDate) - new Date()) / (1000 * 60 * 60 * 24));
                    const refundPercentage = remainingDays / totalDays;
                    const priceDiff = activeSubscription.planPrice - plan.price;
                    const refundAmount = priceDiff * refundPercentage;
                    
                    finalPrice = Math.round(Math.max(0, plan.price - refundAmount));
                } else {
                    // Upgrade → không refund
                    finalPrice = Math.round(plan.price);
                }
            }
        }
        
        // Trừ đi số dư credit hiện có
        const amountToPay = Math.max(0, finalPrice - creditBalance);
        return Math.round(amountToPay);
    };

    const formatPrice = (price) => new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price);
    const formatDate = (value) => new Date(value).toLocaleDateString('vi-VN');
    const formatDateTime = (value) => new Date(value).toLocaleString('vi-VN', {
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value || 0);

    const formatLedgerNote = (entry) => {
        const raw = (entry?.note || entry?.entryType || '').toString();
        // Bỏ phần Request: ... nếu có
        const cleaned = raw.replace(/Request:\s*[a-f0-9-]+/gi, '').trim();
        const [firstPart] = cleaned.split(' - ');
        return firstPart || cleaned;
    };

    const getLedgerSource = (entry) => {
        const refType = (entry?.referenceType || '').toString().toLowerCase();
        if (refType.includes('invoice')) return 'Hóa đơn';
        if (refType.includes('payment')) return 'Thanh toán';
        if (refType.includes('subscription')) return 'Gói dịch vụ';
        if (refType.includes('refund')) return 'Hoàn tiền';
        if (entry?.amount > 0) return 'Nạp credit';
        if (entry?.amount < 0) return 'Trừ credit';
        return 'Điều chỉnh';
    };

    const sortedCreditLedger = [...creditLedger].sort((a, b) => {
        const timeA = new Date(a?.createdAt || 0).getTime();
        const timeB = new Date(b?.createdAt || 0).getTime();
        if (timeB !== timeA) return timeB - timeA;
        const idA = (a?.ledgerId || '').toString();
        const idB = (b?.ledgerId || '').toString();
        return idB.localeCompare(idA);
    });

    return (
        <div className={hideSidebar ? "subscription-embedded" : "subscription-page"}>
            {!hideSidebar && <Sidebar />}
            <main className="subscription-main">
                <header className="subscription-header">
                    <div>
                        <h1>Chọn gói dịch vụ</h1>
                        <p>Đăng ký, đổi gói, gia hạn đều theo luồng yêu cầu duyệt và thanh toán hóa đơn.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            className="subscription-credit-history-btn subscription-action-btn--invoice"
                            onClick={() => {
                                loadMyInvoices();
                                loadOnlinePaymentHistory();
                                setShowInvoicesModal(true);
                            }}
                        >
                            <CreditCard size={15} /> Hoá đơn &amp; Thanh toán
                        </button>
                        <button
                            type="button"
                            className="subscription-credit-history-btn subscription-action-btn--history"
                            onClick={() => {
                                loadMyChangeRequests();
                                setShowRequestsModal(true);
                            }}
                        >
                            <ArrowUpDown size={15} /> Lịch sử đổi gói
                        </button>
                        {creditBalance > 0 && (
                            <div className="subscription-credit-info">
                                <Wallet size={20} />
                                <span>Số dư: <strong>{formatPrice(creditBalance)} VNĐ</strong></span>
                                <button
                                    type="button"
                                    className="subscription-credit-history-btn"
                                    onClick={loadCreditHistory}
                                    disabled={creditHistoryLoading}
                                    style={{ background: '#059669', borderColor: '#059669', color: '#ecfdf5' }}
                                >
                                    {creditHistoryLoading ? 'Đang tải...' : 'Lịch sử credit'}
                                </button>
                            </div>
                        )}
                    </div>

                </header>

                {loading ? (
                    <div className="subscription-state">Đang tải gói dịch vụ...</div>
                ) : plans.length === 0 ? (
                    <div className="subscription-empty">
                        <PackageOpen size={32} />
                        <p>Hiện chưa có gói dịch vụ nào khả dụng.</p>
                    </div>
                ) : (
                    <div className="subscription-grid">
                        {plans.map((plan) => {
                            const features = plan.features
                                ? plan.features.split(',').map((item) => item.trim()).filter(Boolean)
                                : [];
                            const isActivePlan = activeSubscription?.planId === plan.planId;
                            const isPaying = payingPlanId === plan.planId;
                            const disablePay = isPaying || !plan.isActive;

                            return (
                                <div key={plan.planId} className={`subscription-card ${isActivePlan ? 'is-active-plan' : ''}`}>
                                    <div className="subscription-card-header">
                                        <h3>{plan.planName}</h3>
                                        <div className="subscription-price">
                                            <span className="amount">{formatPrice(plan.price)}</span>
                                            <span className="unit">VNĐ / tháng</span>
                                        </div>
                                        {isActivePlan && activeSubscription?.endDate && (
                                            <div className="subscription-status">Hết hạn: {formatDate(activeSubscription.endDate)}</div>
                                        )}
                                        {isActivePlan && !activeSubscription?.endDate && (
                                            <div className="subscription-status">Đang hoạt động</div>
                                        )}
                                    </div>

                                    <div className="subscription-metrics">
                                        <div className="metric-item">
                                            <span className="metric-label">Người dùng</span>
                                            <span className="metric-value">{plan.limitUsers}</span>
                                        </div>
                                        <div className="metric-item">
                                            <span className="metric-label">Lưu trữ</span>
                                            <span className="metric-value">{plan.storageLimit} MB</span>
                                        </div>
                                    </div>

                                    {/* Nút đăng ký - chỉ hiển thị khi CHƯA có gói và chưa có credit */}
                                    {!isActivePlan && !activeSubscription && creditBalance === 0 && (
                                        <button
                                            className={`subscription-pay-btn`}
                                            onClick={() => handlePay(plan, 1)}
                                            disabled={payingPlanId === plan.planId}
                                        >
                                            <CreditCard size={16} />
                                            {isPaying ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu đăng ký'}
                                        </button>
                                    )}
                                    
                                    {/* Nút đổi gói - hiển thị cho tất cả gói không phải gói đang dùng */}
                                    {!isActivePlan && activeSubscription && (
                                        <>
                                            {canChangePlan(plan) ? (
                                                <button
                                                    className="subscription-change-btn"
                                                    onClick={() => handleChangePlanClick(plan)}
                                                    disabled={payingPlanId === plan.planId}
                                                >
                                                    <ArrowUpDown size={16} />
                                                    Đổi gói
                                                </button>
                                            ) : (
                                                <div className="subscription-change-disabled">
                                                    <ArrowUpDown size={16} />
                                                    <span>Không thể hạ gói</span>
                                                    <small>(Chỉ trong 7 ngày đầu)</small>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Hiển thị thông báo 7 ngày cho tất cả gói rẻ hơn gói hiện tại (hạ gói) */}
                                    {!isActivePlan && activeSubscription && plan.price < activeSubscription.planPrice && (
                                        <div className="subscription-grace-period-notice">
                                            <Clock size={14} />
                                            <span>Chỉ được hạ gói trong 7 ngày đầu</span>
                                        </div>
                                    )}

                                    {/* Nút Gia hạn gói - chỉ hiển thị cho gói đang hoạt động và không phải gói Trial (giá = 0) */}
                                    {isActivePlan && activeSubscription && plan.price > 0 && (
                                        <button
                                            className="subscription-extend-btn"
                                            onClick={openExtendModal}
                                            disabled={payingPlanId === plan.planId}
                                        >
                                            <Clock size={16} />
                                            Gia hạn gói
                                        </button>
                                    )}

                                    {features.length > 0 && (
                                        <ul className="subscription-features">
                                            {features.map((feature, idx) => (
                                                <li key={idx}>
                                                    <Check size={16} className="feature-icon-check" />
                                                    {feature}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {renewTarget && (
                <>
                    <div className="subscription-modal-overlay" onClick={() => !payingPlanId && setRenewTarget(null)} />
                    <div className="subscription-modal">
                        <div className="subscription-modal-header">
                            <h2>Gia hạn gói</h2>
                            <button className="subscription-modal-close" onClick={() => !payingPlanId && setRenewTarget(null)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="subscription-modal-body">
                            <p>Chọn số tháng muốn gia hạn cho gói <strong>{renewTarget.planName}</strong>.</p>
                            <div className="subscription-modal-field">
                                <label>Số tháng</label>
                                <select
                                    value={renewMonths}
                                    onChange={(event) => setRenewMonths(event.target.value)}
                                >
                                    {Array.from({ length: 12 }, (_, idx) => idx + 1).map((month) => (
                                        <option key={month} value={month}>{month} tháng</option>
                                    ))}
                                </select>
                            </div>
                            <div className="subscription-modal-summary">
                                <span>Tổng thanh toán:</span>
                                <strong>{formatPrice((renewTarget.price || 0) * Number(renewMonths || 1))} VNĐ</strong>
                            </div>
                        </div>
                        <div className="subscription-modal-actions">
                            <button
                                className="subscription-modal-submit"
                                onClick={() => {
                                    setRenewTarget(null);
                                    handlePay(renewTarget, renewMonths);
                                }}
                                disabled={!!payingPlanId}
                            >
                                {payingPlanId === renewTarget.planId ? 'Đang xử lý...' : 'Thanh toán'}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Modal xác nhận đổi gói */}
            {changePlanTarget && (
                <>
                    <div className="subscription-modal-overlay" onClick={() => setChangePlanTarget(null)} />
                    <div className="subscription-modal">
                        <div className="subscription-modal-header">
                            <h2>Xác nhận đổi gói</h2>
                            <button className="subscription-modal-close" onClick={() => setChangePlanTarget(null)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="subscription-modal-body">
                            <p>Bạn đang gửi yêu cầu đổi sang gói <strong>{changePlanTarget.planName}</strong></p>
                            
                            {activeSubscription && (
                                <div className="subscription-change-summary">
                                    <div className="change-summary-row">
                                        <span>Gói hiện tại</span>
                                        <strong>{activeSubscription.planName}</strong>
                                    </div>
                                    <div className="change-summary-row">
                                        <span>Giá gói mới</span>
                                        <strong>{formatPrice(changePlanTarget.price)} VNĐ/tháng</strong>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="subscription-modal-actions">
                            <button
                                className="subscription-modal-submit"
                                onClick={confirmChangePlan}
                            >
                                Gửi yêu cầu đổi gói
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Modal gia hạn gói */}
            {extendTarget && (
                <>
                    <div className="subscription-modal-overlay" onClick={() => !payingPlanId && setExtendTarget(null)} />
                    <div className="subscription-modal">
                        <div className="subscription-modal-header">
                            <h2>Gia hạn gói dịch vụ</h2>
                            <button className="subscription-modal-close" onClick={() => !payingPlanId && setExtendTarget(null)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="subscription-modal-body">
                            <div className="extend-current-plan">
                                <div className="extend-plan-info">
                                    <div className="extend-plan-header">
                                        <PackageOpen size={20} className="extend-plan-icon" />
                                        <div>
                                            <span className="extend-plan-label">Gói hiện tại</span>
                                            <strong className="extend-plan-name">{extendTarget.planName}</strong>
                                        </div>
                                    </div>
                                    {extendTarget.endDate && (
                                        <div className="extend-expiry-info">
                                            <Clock size={16} className="extend-expiry-icon" />
                                            <span className="extend-end-date">Hết hạn: {formatDate(extendTarget.endDate)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="extend-duration-section">
                                <div className="extend-duration-header">
                                    <Calendar size={18} className="extend-duration-icon" />
                                    <span className="extend-duration-title">Thời gian gia hạn</span>
                                </div>
                                
                                <div className="extend-duration-options">
                                    <div className="duration-type-selector">
                                        <button
                                            type="button"
                                            className={`duration-type-btn ${extendDurationType === 'months' ? 'active' : ''}`}
                                            onClick={() => setExtendDurationType('months')}
                                        >
                                            Theo tháng
                                        </button>
                                        <button
                                            type="button"
                                            className={`duration-type-btn ${extendDurationType === 'quarters' ? 'active' : ''}`}
                                            onClick={() => setExtendDurationType('quarters')}
                                        >
                                            Theo quý
                                        </button>
                                    </div>
                                    
                                    <div className="duration-selector">
                                        <label className="duration-label">
                                            Số {extendDurationType === 'months' ? 'tháng' : 'quý'}
                                        </label>
                                        <select
                                            value={extendMonths}
                                            onChange={(e) => setExtendMonths(Number(e.target.value))}
                                            className="duration-select"
                                        >
                                            {extendDurationType === 'months' ? (
                                                <>
                                                    <option value="">Chọn số tháng</option>
                                                    {Array.from({ length: 12 }, (_, idx) => idx + 1).map((month) => (
                                                        <option key={month} value={month}>{month} tháng</option>
                                                    ))}
                                                    <optgroup label="Gói dài hạn">
                                                        {[15, 18, 24, 36].map(m => (
                                                            <option key={m} value={m}>{m} tháng</option>
                                                        ))}
                                                    </optgroup>
                                                </>
                                            ) : (
                                                <>
                                                    <option value="">Chọn số quý</option>
                                                    {[1, 2, 3, 4].map(q => (
                                                        <option key={q} value={q}>{q} quý ({q * 3} tháng)</option>
                                                    ))}
                                                </>
                                            )}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            {activeSubscription && extendMonths > 0 && (
                                <div className="extend-summary">
                                    <div className="extend-summary-header">
                                        <CreditCard size={18} className="extend-summary-icon" />
                                        <span className="extend-summary-title">Tổng chi phí</span>
                                    </div>
                                    <div className="extend-summary-content">
                                        <div className="extend-summary-details">
                                            <span className="extend-summary-period">
                                                {extendDurationType === 'quarters' 
                                                    ? `${extendMonths} quý = ${extendMonths * 3} tháng`
                                                    : `Gia hạn ${extendMonths} tháng`}
                                            </span>
                                            <div className="extend-summary-price">
                                                <span className="extend-summary-label">Thành tiền:</span>
                                                <strong className="extend-summary-amount">
                                                    {formatPrice((activeSubscription.planPrice || 0) * (extendDurationType === 'quarters' ? extendMonths * 3 : extendMonths))} VNĐ
                                                </strong>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="subscription-modal-actions">
                            <button
                                className="subscription-modal-submit"
                                onClick={handleExtendSubscription}
                                disabled={!!payingPlanId || !activeSubscription}
                            >
                                {payingPlanId === 'extend' 
                                    ? 'Đang xử lý...' 
                                    : 'Gia hạn ngay'}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Modal lịch sử giao dịch credit */}
            {showCreditHistory && (
                <>
                    <div
                        className="subscription-modal-overlay"
                        onClick={() => setShowCreditHistory(false)}
                    />
                    <div className="subscription-modal subscription-credit-history-modal">
                        <div className="subscription-modal-header">
                            <h2>Lịch sử giao dịch credit</h2>
                            <button
                                className="subscription-modal-close"
                                onClick={() => setShowCreditHistory(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="subscription-modal-body">
                            {creditHistoryLoading ? (
                                <div className="subscription-state">Đang tải lịch sử...</div>
                            ) : creditLedger.length === 0 ? (
                                <div className="subscription-state">
                                    Chưa có lịch sử credit.
                                </div>
                            ) : (
                                <div className="subscription-credit-history-table">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Ngày giờ</th>
                                                <th>Nguồn</th>
                                                <th>Loại</th>
                                                <th style={{ textAlign: 'right' }}>Biến động</th>
                                                <th style={{ textAlign: 'right' }}>Số dư trước</th>
                                                <th style={{ textAlign: 'right' }}>Số dư sau giao dịch</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedCreditLedger.map((entry) => {
                                                const amount = Number(entry?.amount || 0);
                                                const balanceAfter = Number(entry?.balanceAfter || 0);
                                                const balanceBefore = balanceAfter - amount;
                                                return (
                                                    <tr key={entry.ledgerId || entry.createdAt}>
                                                        <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(entry.createdAt)}</td>
                                                        <td>{getLedgerSource(entry)}</td>
                                                        <td>{formatLedgerNote(entry)}</td>
                                                        <td
                                                            style={{
                                                                textAlign: 'right',
                                                                color: amount > 0 ? '#16a34a' : amount < 0 ? '#dc2626' : '#334155',
                                                            }}
                                                        >
                                                            {amount > 0 ? '+' : ''}
                                                            {formatCurrency(amount)}
                                                        </td>
                                                        <td style={{ textAlign: 'right' }}>
                                                            {formatCurrency(balanceBefore)}
                                                        </td>
                                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                                            {formatCurrency(balanceAfter)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}


            {/* Contracts Modal */}
            {showContracts && (
                <>
                    <div className="subscription-modal-overlay" onClick={() => setShowContracts(false)} />
                    <div className="subscription-modal" style={{ maxWidth: '1200px', width: '90vw', maxHeight: '90vh', height: 'auto' }}>
                        <div className="subscription-modal-header">
                            <h2>Hợp đồng</h2>
                            <button className="subscription-modal-close" onClick={() => setShowContracts(false)}><X size={18} /></button>
                        </div>
                        <div className="subscription-modal-body" style={{ padding: '1rem', maxHeight: 'calc(90vh - 120px)', display: 'flex', flexDirection: 'column' }}>
                            {loadingContracts ? (
                                <div className="subscription-state">Đang tải...</div>
                            ) : contracts.length === 0 ? (
                                <div className="subscription-state">
                                    <FileText size={40} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                                    <p>Chưa có hợp đồng nào.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', flexShrink: 0 }}>
                                        <thead>
                                            <tr>
                                                <th style={{ textAlign: 'left', padding: '0.75rem', background: '#f8fafc' }}>Tiêu đề</th>
                                                <th style={{ textAlign: 'left', padding: '0.75rem', background: '#f8fafc' }}>Loại</th>
                                                <th style={{ textAlign: 'left', padding: '0.75rem', background: '#f8fafc' }}>Ngày tải</th>
                                                <th style={{ textAlign: 'center', padding: '0.75rem', background: '#f8fafc' }}>Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {contracts.map(c => (
                                                <tr key={c.contractId}>
                                                    <td style={{ padding: '0.75rem' }}>{c.contractTitle}</td>
                                                    <td style={{ padding: '0.75rem' }}>{c.fileType}</td>
                                                    <td style={{ padding: '0.75rem' }}>{c.createdAt ? new Date(c.createdAt).toLocaleDateString('vi-VN') : '—'}</td>
                                                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                        <button style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '0.25rem 0.75rem', borderRadius: '4px', cursor: 'pointer' }} onClick={() => handleViewContract(c)}>Xem</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Invoices & Payment Modal */}
            {showInvoicesModal && (
                <>
                    <div className="subscription-modal-overlay" onClick={() => setShowInvoicesModal(false)} />
                    <div className="subscription-modal" style={{ maxWidth: '820px', width: '92vw', maxHeight: '90vh' }}>
                        <div className="subscription-modal-header">
                            <h2>Hoá đơn &amp; Thanh toán</h2>
                            <button className="subscription-modal-close" onClick={() => setShowInvoicesModal(false)}><X size={18} /></button>
                        </div>
                        <div className="subscription-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: 'calc(90vh - 120px)', overflow: 'auto', padding: '1rem' }}>
                            <div className="subscription-history-card">
                                <h4 style={{ marginBottom: '1rem', color: '#374151', fontWeight: 600 }}>Hóa đơn đổi gói</h4>
                                {loadingInvoices ? (
                                    <div className="subscription-state">Đang tải...</div>
                                ) : myInvoices.length === 0 ? (
                                    <div className="subscription-state">Chưa có hoá đơn nào.</div>
                                ) : (
                                    <div style={{ overflow: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                            <thead>
                                                <tr>
                                                    <th style={{ textAlign: 'left', padding: '0.5rem', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>Mã</th>
                                                    <th style={{ textAlign: 'left', padding: '0.5rem', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>Số tiền</th>
                                                    <th style={{ textAlign: 'left', padding: '0.5rem', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>Loại</th>
                                                    <th style={{ textAlign: 'left', padding: '0.5rem', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>Trạng thái / TT</th>
                                                    <th style={{ textAlign: 'left', padding: '0.5rem', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>Ngày</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {myInvoices.map(i => {
                                                    const status = (i.status || '').trim();
                                                    const paymentMethod = (i.paymentMethod || '').trim();
                                                    const isAwaitingConfirmation = status === 'AwaitingConfirmation';
                                                    const canChoosePayment = status === 'Pending';
                                                    const hasMethod = paymentMethod && paymentMethod !== 'None' && paymentMethod !== '-';

                                                    return (
                                                        <tr key={i.invoiceId}>
                                                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>{i.invoiceNumber}</td>
                                                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap', fontWeight: 600 }}>{formatPrice(i.amount)} VNĐ</td>
                                                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>
                                                                {status === 'Pending' ? 'Chưa chọn' : paymentMethod === 'Cash' ? 'Tiền mặt' : paymentMethod === 'VNPay' ? 'VNPay' : hasMethod ? paymentMethod : 'Chưa chọn'}
                                                            </td>
                                                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>
                                                                {canChoosePayment ? (
                                                                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                                                        <button 
                                                                            type="button" 
                                                                            disabled={submittingInvoicePayment} 
                                                                            onClick={() => requestOfflineInvoicePayment(i.invoiceId, 'Cash')} 
                                                                            style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid #d1d5db', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, background: '#fff' }}
                                                                        >
                                                                            Tiền mặt
                                                                        </button>
                                                                        <button 
                                                                            type="button" 
                                                                            disabled={submittingInvoicePayment} 
                                                                            onClick={() => payInvoiceByVnPay(i)} 
                                                                            style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid #4f46e5', color: '#fff', cursor: 'pointer', fontSize: '0.75rem', background: '#4f46e5', fontWeight: 600 }}
                                                                        >
                                                                            VNPay
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <span style={{ 
                                                                        color: status === 'Paid' ? '#16a34a' : (isAwaitingConfirmation ? '#f59e0b' : '#6b7280'),
                                                                        fontWeight: 600 
                                                                    }}>
                                                                        {status === 'Paid'
                                                                            ? 'Đã thanh toán'
                                                                            : isAwaitingConfirmation
                                                                                ? 'Chờ xác nhận'
                                                                                : status === 'Expired'
                                                                                    ? 'Đã hết hạn'
                                                                                    : status === 'Cancelled'
                                                                                        ? 'Đã hủy'
                                                                                        : status}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #f3f4f6', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                                                {i.createdAt
                                                                    ? new Date(i.createdAt).toLocaleString('vi-VN')
                                                                    : i.dueDate
                                                                        ? new Date(i.dueDate).toLocaleString('vi-VN')
                                                                        : '—'}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            <div className="subscription-history-card">
                                <h4 style={{ marginBottom: '1rem', color: '#374151', fontWeight: 600 }}>Lịch sử giao dịch online (VNPay)</h4>
                                {loadingOnlineHistory ? (
                                    <div className="subscription-state">Đang tải...</div>
                                ) : onlinePaymentHistory.length === 0 ? (
                                    <div className="subscription-state">Chưa có giao dịch online.</div>
                                ) : (
                                    <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                            <thead>
                                                <tr>
                                                    <th style={{ textAlign: 'left', padding: '0.5rem', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>Mã GD</th>
                                                    <th style={{ textAlign: 'left', padding: '0.5rem', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>Số tiền</th>
                                                    <th style={{ textAlign: 'left', padding: '0.5rem', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>Trạng thái</th>
                                                    <th style={{ textAlign: 'left', padding: '0.5rem', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>Ngày</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {onlinePaymentHistory.map(h => (
                                                    <tr key={h.paymentId}>
                                                        <td style={{ padding: '0.5rem', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}><span style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: '#f3f4f6', padding: '0.2rem 0.4rem', borderRadius: '3px' }}>{h.paymentId?.slice(-8)}</span></td>
                                                        <td style={{ padding: '0.5rem', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>{formatPrice(h.amount)} VNĐ</td>
                                                        <td style={{ padding: '0.5rem', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}><span style={{ color: h.status === 'Success' ? '#16a34a' : h.status === 'Failed' ? '#dc2626' : '#f59e0b', fontWeight: 500 }}>{h.status === 'Success' ? 'Thành công' : h.status === 'Failed' ? 'Thất bại' : h.status}</span></td>
                                                        <td style={{ padding: '0.5rem', borderBottom: '1px solid #f3f4f6', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{h.paymentDate ? new Date(h.paymentDate).toLocaleString('vi-VN') : '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Plan History Modal */}
            {showRequestsModal && (
                <>
                    <div className="subscription-modal-overlay" onClick={() => setShowRequestsModal(false)} />
                    <div className="subscription-modal" style={{ maxWidth: '720px', width: '92vw', maxHeight: '90vh' }}>
                        <div className="subscription-modal-header">
                            <h2>Lịch sử đổi gói</h2>
                            <button className="subscription-modal-close" onClick={() => setShowRequestsModal(false)}><X size={18} /></button>
                        </div>
                        <div className="subscription-modal-body" style={{ maxHeight: 'calc(90vh - 120px)', overflow: 'auto', padding: '1rem' }}>
                            {loadingRequests ? (
                                <div className="subscription-state">Đang tải...</div>
                            ) : myChangeRequests.length === 0 ? (
                                <div className="subscription-state">Chưa có yêu cầu đổi gói nào.</div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ textAlign: 'left', padding: '0.5rem', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>Ngày</th>
                                            <th style={{ textAlign: 'left', padding: '0.5rem', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>Gói ban đầu</th>
                                            <th style={{ textAlign: 'left', padding: '0.5rem', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>Gói yêu cầu</th>
                                            <th style={{ textAlign: 'left', padding: '0.5rem', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>Trạng thái</th>
                                            <th style={{ textAlign: 'left', padding: '0.5rem', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>Ghi chú / Lý do</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {myChangeRequests.map(r => (
                                            <tr key={r.requestId}>
                                                <td style={{ padding: '0.5rem', borderBottom: '1px solid #f3f4f6', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{r.requestedAt ? new Date(r.requestedAt).toLocaleDateString('vi-VN') : '—'}</td>
                                                <td style={{ padding: '0.5rem', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>{r.currentPlan?.planName || '—'}</td>
                                                <td style={{ padding: '0.5rem', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>{r.requestedPlan?.planName || '—'}</td>
                                                <td style={{ padding: '0.5rem', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>
                                                    <span style={{ color: r.status === 'Approved' ? '#16a34a' : r.status === 'Rejected' ? '#dc2626' : '#f59e0b', fontWeight: 600 }}>
                                                        {r.status === 'Pending' ? 'Chờ duyệt' : r.status === 'Approved' ? 'Đã duyệt' : r.status === 'Rejected' ? 'Từ chối' : r.status}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '0.5rem', borderBottom: '1px solid #f3f4f6' }}>
                                                    {r.reviewNote || r.reason || '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* View Contract Modal */}
            {viewContractTarget && (
                <>
                    <div className="subscription-modal-overlay" onClick={() => setViewContractTarget(null)} />
                    <div className="subscription-modal" style={{ maxWidth: '1200px', width: '90vw', maxHeight: '90vh', height: 'auto' }}>
                        <div className="subscription-modal-header">
                            <h2>{viewContractTarget.contractTitle}</h2>
                            <button className="subscription-modal-close" onClick={() => setViewContractTarget(null)}><X size={18} /></button>
                        </div>
                        <div className="subscription-modal-body" style={{ padding: '0', height: 'calc(90vh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f1f1' }}>
                            <ContractViewer contract={viewContractTarget} isCenter={true} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default SubscriptionPlans;
