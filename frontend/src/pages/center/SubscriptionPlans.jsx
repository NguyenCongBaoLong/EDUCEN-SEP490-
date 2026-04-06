import { useEffect, useState } from 'react';
import { Check, CreditCard, PackageOpen, X, ArrowUpDown, Wallet, Clock, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../../components/Sidebar';
import api from '../../services/api';
import paymentService from '../../services/paymentService';
import { useAuth } from '../../context/AuthContext';
import '../../css/pages/center/SubscriptionPlans.css';

const SubscriptionPlans = ({ hideSidebar = false }) => {
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

    const handlePay = async (plan, months = 1) => {
        const tenantId = user?.tenantId || localStorage.getItem('tenantId');
        if (!tenantId) {
            toast.error('Không tìm thấy thông tin trung tâm');
            return;
        }

        setPayingPlanId(plan.planId);
        try {
            const normalizedMonths = Math.max(1, Number(months) || 1);
            const paymentData = {
                tenantId,
                amount: plan.price * normalizedMonths,
                gatewayType: 'VNPay',
                transactionType: 'Subscription',
                referenceId: plan.planId,
                description: `Thanh toán gói ${plan.planName} (${normalizedMonths} tháng)`,
                returnUrl: paymentService.getVNPayReturnUrl(),
                subscriptionMonths: normalizedMonths,
            };

            const result = await paymentService.createPayment(paymentData);
            if (result.success && result.paymentUrl) {
                window.location.href = result.paymentUrl;
                return;
            }

            toast.error(result.errorMessage || 'Không thể tạo giao dịch thanh toán');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Thanh toán thất bại');
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

        const tenantId = user?.tenantId || localStorage.getItem('tenantId');
        if (!tenantId) {
            toast.error('Không tìm thấy thông tin trung tâm');
            return;
        }

        setPayingPlanId('extend');
        try {
            const actualMonths = extendDurationType === 'quarters' ? extendMonths * 3 : extendMonths;
            
            const extendResponse = await api.post('/admin/subscription/extend', {
                months: actualMonths
            });

            const extendData = extendResponse.data;

            if (!extendData.requiresPayment) {
                const confirmResponse = await api.post('/admin/subscription/extend-confirm', {
                    months: actualMonths,
                    paymentRecordId: null
                });

                if (confirmResponse.data.success) {
                    toast.success('Gia hạn gói dịch vụ thành công!');
                    setExtendTarget(null);
                    
                    const [subResult, creditResult] = await Promise.all([
                        api.get('/admin/subscription/current'),
                        api.get('/admin/subscription/credit-balance')
                    ]);
                    setActiveSubscription(subResult.data || null);
                    if (creditResult.data) {
                        setCreditBalance(creditResult.data.creditBalance || 0);
                    }
                }
            } else {
                const paymentData = {
                    tenantId,
                    amount: extendData.amountToCharge,
                    gatewayType: 'VNPay',
                    transactionType: 'SubscriptionExtend',
                    referenceId: extendData.subscriptionId,
                    description: `Gia hạn gói ${extendData.planName} (${actualMonths} tháng)`,
                    returnUrl: paymentService.getVNPayReturnUrl(),
                    subscriptionMonths: actualMonths,
                };

                const result = await paymentService.createPayment(paymentData);
                if (result.success && result.paymentUrl) {
                    localStorage.setItem('pendingExtendMonths', actualMonths.toString());
                    localStorage.setItem('pendingExtendSubscriptionId', extendData.subscriptionId);
                    window.location.href = result.paymentUrl;
                    return;
                }

                toast.error(result.errorMessage || 'Không thể tạo giao dịch thanh toán');
            }
        } catch (error) {
            console.error('Extend subscription error:', error.response?.data);
            toast.error(error.response?.data?.message || 'Gia hạn gói dịch vụ thất bại');
        } finally {
            setPayingPlanId(null);
        }
    };

    const handleConfirmExtendAfterPayment = async () => {
        const pendingMonths = localStorage.getItem('pendingExtendMonths');
        const pendingSubscriptionId = localStorage.getItem('pendingExtendSubscriptionId');
        
        if (!pendingMonths || !pendingSubscriptionId) return;

        const urlParams = new URLSearchParams(window.location.search);
        const vnp_ResponseCode = urlParams.get('vnp_ResponseCode');
        const vnp_TransactionStatus = urlParams.get('vnp_TransactionStatus');

        if (vnp_ResponseCode === '00' && vnp_TransactionStatus === '00') {
            try {
                await api.post('/admin/subscription/extend-confirm', {
                    months: parseInt(pendingMonths),
                    paymentRecordId: null
                });

                toast.success('Gia hạn gói dịch vụ thành công!');
                
                localStorage.removeItem('pendingExtendMonths');
                localStorage.removeItem('pendingExtendSubscriptionId');

                const [subResult, creditResult] = await Promise.all([
                    api.get('/admin/subscription/current'),
                    api.get('/admin/subscription/credit-balance')
                ]);
                setActiveSubscription(subResult.data || null);
                if (creditResult.data) {
                    setCreditBalance(creditResult.data.creditBalance || 0);
                }
            } catch (error) {
                console.error('Confirm extend error:', error);
                toast.error('Xác nhận gia hạn thất bại');
            }
        }
    };

    useEffect(() => {
        if (window.location.search.includes('vnp_ResponseCode')) {
            handleConfirmExtendAfterPayment();
        }
    }, []);

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

    // Xác nhận đổi gói
    const confirmChangePlan = async () => {
        if (!changePlanTarget) return;

        const amountToPay = calculateChangePlanAmount(changePlanTarget);

        // Nếu cần trả thêm tiền → chuyển sang VNPay thanh toán
        if (amountToPay > 0) {
            setChangePlanTarget(null);
            handlePay(changePlanTarget, 1);
            return;
        }

        // Nếu không cần trả thêm → đổi gói trực tiếp
        try {
            const tenantId = user?.tenantId || localStorage.getItem('tenantId');
            console.log('[DEBUG] Frontend tenantId:', tenantId);
            console.log('[DEBUG] Frontend user:', user);
            
            await api.post('/admin/subscription/change-plan', {
                tenantId: tenantId,  // ← Thêm TenantId với fallback
                newPlanId: changePlanTarget.planId,
                months: 1,
                effectiveImmediately: true
            });
            
            toast.success('Đổi gói dịch vụ thành công!');
            setChangePlanTarget(null);
            
            // Refresh data
            const [subResult, creditResult] = await Promise.all([
                api.get('/admin/subscription/current'),
                api.get('/admin/subscription/credit-balance')
            ]);
            setActiveSubscription(subResult.data || null);
            if (creditResult.data) {
                setCreditBalance(creditResult.data.creditBalance || 0);
            }
        } catch (error) {
            console.error('Change plan error:', error.response?.data);
            toast.error(error.response?.data?.message || 'Đổi gói dịch vụ thất bại');
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

    const formatLedgerNote = (entry) => {
        const raw = (entry?.note || entry?.entryType || '').toString();
        const [firstPart] = raw.split(' - ');
        return firstPart || raw;
    };

    return (
        <div className={hideSidebar ? "subscription-embedded" : "subscription-page"}>
            {!hideSidebar && <Sidebar />}
            <main className="subscription-main">
                <header className="subscription-header">
                    <div>
                        <h1>Chọn gói dịch vụ</h1>
                        <p>Có thể gia hạn gói hiện tại hoặc chọn gói mới để thanh toán qua VNPay.</p>
                    </div>
                    {creditBalance > 0 && (
                        <div className="subscription-credit-info">
                            <Wallet size={20} />
                            <span>Số dư: <strong>{formatPrice(creditBalance)} VNĐ</strong></span>
                            <button
                                type="button"
                                className="subscription-credit-history-btn"
                                onClick={loadCreditHistory}
                                disabled={creditHistoryLoading}
                            >
                                {creditHistoryLoading ? 'Đang tải...' : 'Xem lịch sử giao dịch'}
                            </button>
                        </div>
                    )}
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
                                            {isPaying ? 'Đang chuyển đến VNPay...' : 'Đăng ký ngay'}
                                        </button>
                                    )}
                                    
                                    {/* Nút đổi gói - chỉ hiển thị khi ĐÃ có gói và không phải gói đang dùng */}
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

                                    {/* Nút Gia hạn gói - chỉ hiển thị cho gói đang hoạt động */}
                                    {isActivePlan && activeSubscription && (
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
                            <p>Bạn đang đổi sang gói <strong>{changePlanTarget.planName}</strong></p>
                            
                            {activeSubscription && (
                                <div className="subscription-change-summary">
                                    <div className="change-summary-row">
                                        <span>Gói hiện tại:</span>
                                        <strong>{activeSubscription.planName}</strong>
                                    </div>
                                    <div className="change-summary-row">
                                        <span>Số dư hiện có:</span>
                                        <strong className="credit-value">{formatPrice(creditBalance)} VNĐ</strong>
                                    </div>
                                    <div className="change-summary-row">
                                        <span>Giá gói mới:</span>
                                        <strong>{formatPrice(changePlanTarget.price)} VNĐ</strong>
                                    </div>
                                    <div className="change-summary-row">
                                        <span>Số tiền phải trả thêm:</span>
                                        <strong className={
                                            calculateChangePlanAmount(changePlanTarget) === 0 ? 'free' : 
                                            (activeSubscription && changePlanTarget.price > activeSubscription.planPrice ? 'upgrade' : 'pay')
                                        }>
                                            {calculateChangePlanAmount(changePlanTarget) === 0 
                                                ? 'Miễn phí (đã trừ credit)' 
                                                : formatPrice(calculateChangePlanAmount(changePlanTarget)) + ' VNĐ'}
                                        </strong>
                                    </div>
                                    <div className="change-summary-divider"></div>
                                    <div className="change-summary-row total">
                                        <span>Credit còn lại sau đổi gói:</span>
                                        <strong className="credit-remaining">
                                            {formatPrice(Math.max(0, creditBalance - changePlanTarget.price))} VNĐ
                                        </strong>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="subscription-modal-actions">
                            <button
                                className="subscription-modal-submit"
                                onClick={confirmChangePlan}
                            >
                                {calculateChangePlanAmount(changePlanTarget) > 0 
                                    ? 'Thanh toán qua VNPay' 
                                    : 'Xác nhận đổi gói'}
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
                                                <th>Ngày</th>
                                                <th>Loại</th>
                                                <th style={{ textAlign: 'right' }}>Số tiền</th>
                                                <th style={{ textAlign: 'right' }}>Sau</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {creditLedger.map((entry) => (
                                                <tr key={entry.ledgerId || entry.createdAt}>
                                                    <td>{formatDate(entry.createdAt)}</td>
                                                    <td>{formatLedgerNote(entry)}</td>
                                                    <td
                                                        style={{
                                                            textAlign: 'right',
                                                            color: entry.amount > 0 ? '#16a34a' : '#dc2626',
                                                        }}
                                                    >
                                                        {entry.amount > 0 ? '+' : ''}
                                                        {new Intl.NumberFormat('vi-VN', {
                                                            style: 'currency',
                                                            currency: 'VND',
                                                        }).format(entry.amount)}
                                                    </td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        {new Intl.NumberFormat('vi-VN', {
                                                            style: 'currency',
                                                            currency: 'VND',
                                                        }).format(entry.balanceAfter)}
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
        </div>
    );
};

export default SubscriptionPlans;
