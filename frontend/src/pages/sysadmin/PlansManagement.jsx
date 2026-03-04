import { useState } from 'react';
import { Package, Check, Edit2, X, Plus } from 'lucide-react';
import SystemAdminSidebar from '../../components/SystemAdminSidebar';
import '../../css/pages/sysadmin/PlansManagement.css';

const MOCK_PLANS = [
    {
        planId: 'basic',
        planName: 'Gói Cơ Bản',
        price: 299000,
        limitUsers: 50,
        storageLimit: 5,
        features: 'Quản lý lớp học,Lịch học,Điểm danh,Bài tập,Tài liệu',
        isPopular: false,
        color: 'blue',
    },
    {
        planId: 'pro',
        planName: 'Gói Chuyên Nghiệp',
        price: 699000,
        limitUsers: 200,
        storageLimit: 20,
        features: 'Tất cả gói Cơ Bản,Báo cáo thành tích,Phụ huynh theo dõi,Thông báo Zalo OA,Xuất báo cáo Excel',
        isPopular: true,
        color: 'purple',
    },
    {
        planId: 'enterprise',
        planName: 'Gói Doanh Nghiệp',
        price: 1499000,
        limitUsers: 999,
        storageLimit: 100,
        features: 'Tất cả gói Pro,Không giới hạn học sinh,API tích hợp,Hỗ trợ 24/7,Custom subdomain,SLA 99.9%',
        isPopular: false,
        color: 'gold',
    },
];

const formatPrice = (p) =>
    p.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

const PlansManagement = () => {
    const [plans] = useState(MOCK_PLANS);
    const [selected, setSelected] = useState(null);

    return (
        <div className="sa-page">
            <SystemAdminSidebar />
            <main className="sa-page-main">

                {/* Header */}
                <div className="sa-page-header">
                    <div>
                        <h1 className="sa-page-title">Gói Dịch Vụ</h1>
                        <p className="sa-page-subtitle">Quản lý các gói pricing cho các trung tâm sử dụng dịch vụ</p>
                    </div>
                    <button className="sa-btn-primary" disabled title="Tính năng sắp ra mắt">
                        <Plus size={18} /> Thêm Gói
                    </button>
                </div>

                {/* Plan Cards */}
                <div className="plans-grid">
                    {plans.map(plan => {
                        const feats = plan.features.split(',');
                        return (
                            <div
                                key={plan.planId}
                                className={`plan-card plan-${plan.color} ${selected === plan.planId ? 'selected' : ''}`}
                                onClick={() => setSelected(selected === plan.planId ? null : plan.planId)}
                            >
                                {plan.isPopular && (
                                    <div className="plan-popular-badge">Phổ biến nhất</div>
                                )}
                                <div className="plan-header">
                                    <div className="plan-icon"><Package size={22} /></div>
                                    <h3 className="plan-name">{plan.planName}</h3>
                                </div>
                                <div className="plan-price">
                                    <span className="plan-price-amount">{formatPrice(plan.price)}</span>
                                    <span className="plan-price-period">/tháng</span>
                                </div>
                                <div className="plan-limits">
                                    <span>👥 Tối đa {plan.limitUsers === 999 ? 'Không giới hạn' : `${plan.limitUsers} người dùng`}</span>
                                    <span>💾 {plan.storageLimit} GB lưu trữ</span>
                                </div>
                                <ul className="plan-features">
                                    {feats.map(f => (
                                        <li key={f}>
                                            <Check size={14} className="plan-check" />
                                            {f.trim()}
                                        </li>
                                    ))}
                                </ul>
                                <div className="plan-actions">
                                    <button className="sa-btn-outline" disabled title="Tính năng sắp ra mắt">
                                        <Edit2 size={14} /> Chỉnh sửa
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Info Note */}
                <div className="plans-info-note">
                    <X size={14} />
                    <span>Chức năng tạo/chỉnh sửa gói dịch vụ sẽ được hoàn thiện trong phiên bản kế tiếp. Hiện tại đang hiển thị dữ liệu mẫu.</span>
                </div>

            </main>
        </div>
    );
};

export default PlansManagement;
