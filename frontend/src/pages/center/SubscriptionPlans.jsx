import { useEffect, useState } from 'react';
import { Check, CreditCard, PackageOpen, X } from 'lucide-react';
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
    const { user } = useAuth();

    useEffect(() => {
        const fetchPlans = async () => {
            setLoading(true);
            const [plansResult, subscriptionResult] = await Promise.allSettled([
                api.get('/admin/plans'),
                api.get('/admin/subscription/current'),
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

                                    <button
                                        className={`subscription-pay-btn${isActivePlan ? ' is-active' : ''}`}
                                        onClick={() => (isActivePlan ? openRenewModal(plan) : handlePay(plan, 1))}
                                        disabled={disablePay}
                                    >
                                        <CreditCard size={16} />
                                        {isPaying
                                            ? 'Đang chuyển đến VNPay...'
                                            : isActivePlan
                                                ? 'Gia hạn gói này'
                                                : 'Thanh toán gói này'}
                                    </button>

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
                                className="subscription-modal-cancel"
                                onClick={() => setRenewTarget(null)}
                                disabled={!!payingPlanId}
                            >
                                Hủy
                            </button>
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
        </div>
    );
};

export default SubscriptionPlans;
