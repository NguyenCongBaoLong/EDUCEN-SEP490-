import { useEffect, useState } from 'react';
import { Check, CreditCard, PackageOpen, X, ArrowUpDown, Wallet } from 'lucide-react';
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

    // Xử lý đổi gói - hiển thị modal xác nhận
    const handleChangePlanClick = (plan) => {
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
        if (!activeSubscription) {
            // Chưa có gói → trả giá gói
            return plan.price;
        }
        
        // Kiểm tra grace period (7 ngày đầu)
        const daysSinceStart = Math.floor((new Date() - new Date(activeSubscription.startDate)) / (1000 * 60 * 60 * 24));
        const GRACE_PERIOD_DAYS = 7;
        
        if (daysSinceStart > GRACE_PERIOD_DAYS) {
            // Ngoài grace period → không refund
            return plan.price;
        }
        
        // Trong grace period → có thể refund
        if (plan.price < activeSubscription.planPrice) {
            // Downgrade trong grace period → refund chênh lệch
            const totalDays = Math.floor((new Date(activeSubscription.endDate) - new Date(activeSubscription.startDate)) / (1000 * 60 * 60 * 24));
            const remainingDays = Math.floor((new Date(activeSubscription.endDate) - new Date()) / (1000 * 60 * 60 * 24));
            const refundPercentage = remainingDays / totalDays;
            const priceDiff = activeSubscription.planPrice - plan.price;
            const refundAmount = priceDiff * refundPercentage;
            
            return Math.max(0, plan.price - refundAmount);
        }
        
        // Upgrade → không refund
        return plan.price;
    };

    const formatPrice = (price) => new Intl.NumberFormat('vi-VN').format(price);
    const formatDate = (value) => new Date(value).toLocaleDateString('vi-VN');

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
                                        <button
                                            className="subscription-change-btn"
                                            onClick={() => handleChangePlanClick(plan)}
                                            disabled={payingPlanId === plan.planId}
                                        >
                                            <ArrowUpDown size={16} />
                                            Đổi gói
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
                                    <div className="change-summary-divider"></div>
                                    <div className="change-summary-row total">
                                        <span>Số tiền phải trả thêm:</span>
                                        <strong className={calculateChangePlanAmount(changePlanTarget) === 0 ? 'free' : 'pay'}>
                                            {calculateChangePlanAmount(changePlanTarget) === 0 
                                                ? 'Miễn phí (đã trừ credit)' 
                                                : formatPrice(calculateChangePlanAmount(changePlanTarget)) + ' VNĐ'}
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
        </div>
    );
};

export default SubscriptionPlans;
