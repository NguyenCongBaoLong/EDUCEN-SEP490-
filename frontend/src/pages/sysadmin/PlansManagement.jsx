import { useState, useEffect } from 'react';
import { Package, Check, Edit2, Trash2, Plus, X, Loader2, AlertCircle } from 'lucide-react';
import SystemAdminSidebar from '../../components/SystemAdminSidebar';
import adminApi from '../../services/adminApi';
import '../../css/pages/sysadmin/PlansManagement.css';

const EMPTY_FORM = {
    planName: '',
    price: '',
    limitUsers: '',
    storageLimit: '',
    features: '',
};

const formatPrice = (p) =>
    Number(p).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

const PlansManagement = () => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null); // null = create
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const res = await adminApi.get('/admin/plans');
            setPlans(res.data);
        } catch {
            showToast('Không thể tải danh sách gói dịch vụ', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPlans(); }, []);

    const openCreate = () => {
        setEditTarget(null);
        setForm(EMPTY_FORM);
        setModalOpen(true);
    };

    const openEdit = (plan) => {
        setEditTarget(plan);
        setForm({
            planName: plan.planName,
            price: plan.price,
            limitUsers: plan.limitUsers,
            storageLimit: plan.storageLimit,
            features: plan.features || '',
        });
        setModalOpen(true);
    };

    const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        const payload = {
            planName: form.planName,
            price: Number(form.price),
            limitUsers: Number(form.limitUsers),
            storageLimit: Number(form.storageLimit),
            features: form.features,
        };
        try {
            if (editTarget) {
                await adminApi.put(`/admin/plans/${editTarget.planId}`, payload);
                showToast('Cập nhật gói dịch vụ thành công!');
            } else {
                await adminApi.post('/admin/plans', payload);
                showToast('Tạo gói dịch vụ mới thành công!');
            }
            setModalOpen(false);
            fetchPlans();
        } catch (err) {
            showToast(err.response?.data?.message || 'Có lỗi xảy ra', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await adminApi.delete(`/admin/plans/${deleteTarget.planId}`);
            showToast('Đã xóa gói dịch vụ');
            setDeleteTarget(null);
            fetchPlans();
        } catch (err) {
            showToast(err.response?.data?.message || 'Không thể xóa gói (có thể đang được sử dụng)', 'error');
            setDeleteTarget(null);
        }
    };

    return (
        <div className="sa-page">
            <SystemAdminSidebar />
            <main className="sa-page-main">

                {/* Toast */}
                {toast && (
                    <div className={`sa-toast ${toast.type}`}>
                        {toast.type === 'success'
                            ? <Check size={16} />
                            : <AlertCircle size={16} />}
                        {toast.msg}
                    </div>
                )}

                {/* Header */}
                <div className="sa-page-header">
                    <div>
                        <h1 className="sa-page-title">Gói Dịch Vụ</h1>
                        <p className="sa-page-subtitle">Quản lý các gói pricing cho các trung tâm sử dụng dịch vụ</p>
                    </div>
                    <button className="sa-btn-primary" onClick={openCreate}>
                        <Plus size={18} /> Thêm Gói Mới
                    </button>
                </div>

                {/* Plan Cards */}
                {loading ? (
                    <div className="sa-loading"><Loader2 size={20} className="spin" /> Đang tải...</div>
                ) : plans.length === 0 ? (
                    <div className="sa-empty">
                        <Package size={40} />
                        <p>Chưa có gói dịch vụ nào. Hãy tạo gói đầu tiên!</p>
                    </div>
                ) : (
                    <div className="plans-grid">
                        {plans.map((plan, idx) => {
                            const feats = plan.features ? plan.features.split(',') : [];
                            const colors = ['blue', 'purple', 'gold'];
                            const color = colors[idx % colors.length];
                            return (
                                <div key={plan.planId} className={`plan-card plan-${color}`}>
                                    <div className="plan-header">
                                        <div className="plan-icon"><Package size={22} /></div>
                                        <h3 className="plan-name">{plan.planName}</h3>
                                    </div>
                                    <div className="plan-price">
                                        <span className="plan-price-amount">{formatPrice(plan.price)}</span>
                                        <span className="plan-price-period">/tháng</span>
                                    </div>
                                    <div className="plan-limits">
                                        <span>👥 Tối đa {plan.limitUsers} người dùng</span>
                                        <span>💾 {plan.storageLimit} MB lưu trữ</span>
                                    </div>
                                    {feats.length > 0 && (
                                        <ul className="plan-features">
                                            {feats.map(f => (
                                                <li key={f}>
                                                    <Check size={14} className="plan-check" />
                                                    {f.trim()}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    <div className="plan-actions">
                                        <button className="sa-btn-outline" onClick={() => openEdit(plan)}>
                                            <Edit2 size={14} /> Chỉnh sửa
                                        </button>
                                        <button
                                            className="sa-btn-outline"
                                            style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                                            onClick={() => setDeleteTarget(plan)}
                                        >
                                            <Trash2 size={14} /> Xóa
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

            </main>

            {/* Create / Edit Modal */}
            {modalOpen && (
                <>
                    <div className="sa-modal-overlay" onClick={() => !saving && setModalOpen(false)} />
                    <div className="sa-modal">
                        <div className="sa-modal-header">
                            <h2>{editTarget ? 'Chỉnh sửa Gói' : 'Tạo Gói Mới'}</h2>
                            <button className="sa-modal-close" onClick={() => !saving && setModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="sa-modal-form">
                            <div className="sa-form-group">
                                <label>Tên Gói *</label>
                                <input name="planName" value={form.planName} onChange={handleChange} required placeholder="Ví dụ: Gói Cơ Bản" />
                            </div>
                            <div className="sa-form-row">
                                <div className="sa-form-group">
                                    <label>Giá (VNĐ/tháng) *</label>
                                    <input name="price" type="number" min="0" value={form.price} onChange={handleChange} required placeholder="299000" />
                                </div>
                                <div className="sa-form-group">
                                    <label>Giới hạn Users *</label>
                                    <input name="limitUsers" type="number" min="1" value={form.limitUsers} onChange={handleChange} required placeholder="50" />
                                </div>
                            </div>
                            <div className="sa-form-group">
                                <label>Dung lượng lưu trữ (MB) *</label>
                                <input name="storageLimit" type="number" min="1" value={form.storageLimit} onChange={handleChange} required placeholder="5000" />
                            </div>
                            <div className="sa-form-group">
                                <label>Tính năng (phân cách bằng dấu phẩy)</label>
                                <input
                                    name="features"
                                    value={form.features}
                                    onChange={handleChange}
                                    placeholder="Quản lý lớp học,Lịch học,Điểm danh"
                                />
                                <span className="sa-form-hint">Mỗi tính năng cách nhau bằng dấu phẩy, sẽ hiển thị thành danh sách trên trang Pricing</span>
                            </div>
                            <div className="sa-modal-footer">
                                <button type="button" className="sa-btn-cancel" onClick={() => !saving && setModalOpen(false)}>Hủy</button>
                                <button type="submit" className="sa-btn-primary" disabled={saving}>
                                    {saving ? <><Loader2 size={16} className="spin" /> Đang lưu...</> : (editTarget ? 'Cập nhật' : 'Tạo gói')}
                                </button>
                            </div>
                        </form>
                    </div>
                </>
            )}

            {/* Delete Confirmation */}
            {deleteTarget && (
                <>
                    <div className="sa-modal-overlay" onClick={() => setDeleteTarget(null)} />
                    <div className="sa-modal" style={{ maxWidth: 440 }}>
                        <div className="sa-modal-header">
                            <h2>Xác nhận xóa</h2>
                            <button className="sa-modal-close" onClick={() => setDeleteTarget(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="sa-modal-form">
                            <p>Bạn có chắc muốn xóa gói <strong>{deleteTarget.planName}</strong>? Hành động này không thể hoàn tác và sẽ thất bại nếu có trung tâm đang sử dụng gói này.</p>
                            <div className="sa-modal-footer">
                                <button className="sa-btn-cancel" onClick={() => setDeleteTarget(null)}>Hủy</button>
                                <button
                                    className="sa-btn-primary"
                                    style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                                    onClick={handleDelete}
                                >
                                    <Trash2 size={16} /> Xóa gói
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default PlansManagement;
