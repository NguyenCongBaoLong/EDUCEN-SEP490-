import { useEffect, useState } from 'react';
import { Check, CreditCard, PackageOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../../components/Sidebar';
import api from '../../services/api';
import paymentService from '../../services/paymentService';
import { useAuth } from '../../context/AuthContext';
import '../../css/pages/center/SubscriptionPlans.css';

const SubscriptionPlans = () => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [payingPlanId, setPayingPlanId] = useState(null);
    const [activeSubscription, setActiveSubscription] = useState(null);
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

    const handlePay = async (plan) => {
        const tenantId = user?.tenantId || localStorage.getItem('tenantId');
        if (!tenantId) {
            toast.error('Không tìm thấy thông tin trung tâm');
            return;
        }

        setPayingPlanId(plan.planId);
        try {
            const paymentData = {
                tenantId,
                amount: plan.price,
                gatewayType: 'VNPay',
                transactionType: 'Subscription',
                referenceId: plan.planId,
                description: `Thanh toán gói ${plan.planName}`,
                returnUrl: paymentService.getVNPayReturnUrl(),
                subscriptionMonths: 1,
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

    const formatPrice = (price) => new Intl.NumberFormat('vi-VN').format(price);
    const formatDate = (value) => new Date(value).toLocaleDateString('vi-VN');

    return (
        <div className="subscription-page">
            <Sidebar />
            <main className="subscription-main">
                <header className="subscription-header">
                    <div>
                        <h1>Chọn gói dịch vụ</h1>
                        <p>Chọn gói phù hợp và thanh toán qua VNPay để kích hoạt.</p>
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
                            const disablePay = isPaying || isActivePlan;

                            return (
                                <div key={plan.planId} className="subscription-card">
                                    <div className="subscription-card-header">
                                        <div className="subscription-card-title">
                                            <h3>{plan.planName}</h3>
                                            {isActivePlan && (
                                                <span className="subscription-status-badge">Đang sử dụng</span>
                                            )}
                                        </div>
                                        <div className="subscription-price">
                                            <span className="amount">{formatPrice(plan.price)}</span>
                                            <span className="unit">VNĐ / tháng</span>
                                        </div>
                                        {isActivePlan && activeSubscription?.endDate && (
                                            <div className="subscription-status">Hết hạn: {formatDate(activeSubscription.endDate)}</div>
                                        )}
                                    </div>

                                    <div className="subscription-metrics">
                                        <div>
                                            <span className="metric-label">Người dùng</span>
                                            <span className="metric-value">{plan.limitUsers}</span>
                                        </div>
                                        <div>
                                            <span className="metric-label">Lưu trữ</span>
                                            <span className="metric-value">{plan.storageLimit} MB</span>
                                        </div>
                                    </div>

                                    <button
                                        className={`subscription-pay-btn${isActivePlan ? ' is-active' : ''}`}
                                        onClick={() => handlePay(plan)}
                                        disabled={disablePay}
                                    >
                                        <CreditCard size={16} />
                                        {isPaying
                                            ? 'Đang chuyển đến VNPay...'
                                            : isActivePlan
                                                ? 'Đã kích hoạt'
                                                : 'Thanh toán gói này'}
                                    </button>

                                    {features.length > 0 && (
                                        <ul className="subscription-features">
                                            {features.map((feature, idx) => (
                                                <li key={idx}>
                                                    <Check size={16} />
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
        </div>
    );
};

export default SubscriptionPlans;
