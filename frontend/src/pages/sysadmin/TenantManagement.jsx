import { useState, useEffect } from 'react';
import {
    Building2, Plus, Search, Edit2, Eye, Lock, Unlock, Package,
    X, CheckCircle, AlertCircle, Loader2
} from 'lucide-react';
import SystemAdminSidebar from '../../components/SystemAdminSidebar';
import adminApi from '../../services/adminApi';
import '../../css/pages/sysadmin/TenantManagement.css';

const EMPTY_FORM = {
    tenantId: '', tenantName: '', subDomain: '',
    contactPerson: '', email: '', phoneNumber: '', address: '',
};

const TenantManagement = () => {
    const [tenants, setTenants] = useState([]);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null); // null = create mode

    // New Modals State 
    const [viewTarget, setViewTarget] = useState(null);
    const [subscribeTarget, setSubscribeTarget] = useState(null);
    const [selectedPlanId, setSelectedPlanId] = useState('');

    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    // Custom Confirm Modal State
    const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

    const fetchTenants = () => {
        setLoading(true);
        adminApi.get('/Tenants')
            .then(res => setTenants(res.data))
            .catch(() => showToast('Không thể tải danh sách trung tâm.', 'error'))
            .finally(() => setLoading(false));
    };

    const fetchPlans = () => {
        adminApi.get('/admin/plans')
            .then(res => setPlans(res.data))
            .catch(() => console.error('Error fetching plans'));
    };

    useEffect(() => {
        fetchTenants();
        fetchPlans();
    }, []);



    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const openCreate = () => {
        setEditTarget(null);
        setForm(EMPTY_FORM);
        setModalOpen(true);
    };

    const openEdit = (tenant) => {
        setEditTarget(tenant);
        setForm({
            tenantId: tenant.tenantId,
            tenantName: tenant.tenantName,
            subDomain: tenant.subDomain,
            contactPerson: tenant.contactPerson || '',
            email: tenant.email || '',
            phoneNumber: tenant.phoneNumber || '',
            address: tenant.address || '',
        });
        setModalOpen(true);
    };

    const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editTarget) {
                await adminApi.put(`/Tenants/${editTarget.tenantId}`, {
                    tenantName: form.tenantName,
                    subDomain: form.subDomain,
                    contactPerson: form.contactPerson || null,
                    email: form.email || null,
                    phoneNumber: form.phoneNumber || null,
                    address: form.address || null,
                    isActive: editTarget.isActive,
                });
                showToast('Cập nhật trung tâm thành công!');
            } else {
                await adminApi.post('/Tenants', form);
                showToast('Tạo trung tâm thành công! DB mới đã được khởi tạo.');
            }
            setModalOpen(false);
            fetchTenants();
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data || 'Có lỗi xảy ra.';
            showToast(typeof msg === 'string' ? msg : 'Có lỗi xảy ra.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async (tenant) => {
        try {
            await adminApi.put(`/Tenants/${tenant.tenantId}`, {
                tenantName: tenant.tenantName,
                subDomain: tenant.subDomain,
                isActive: !tenant.isActive,   // toggle
            });
            showToast(tenant.isActive
                ? 'Đã ngưng hoạt động trung tâm. Domain sẽ không truy cập được.'
                : 'Đã kích hoạt lại trung tâm.'
            );
            fetchTenants();
        } catch {
            showToast('Không thể thay đổi trạng thái.', 'error');
        }
    };

    const openViewDetails = (tenant) => {
        setViewTarget(tenant);
    };

    const openSubscribe = (tenant) => {
        setSubscribeTarget(tenant);
        setSelectedPlanId('');
    };

    const handleSubscribeSubmit = async (e) => {
        e.preventDefault();
        if (!selectedPlanId) {
            showToast('Vui lòng chọn gói dịch vụ', 'error');
            return;
        }
        setSaving(true);
        try {
            await adminApi.post('/Tenants/subscribe', {
                tenantId: subscribeTarget.tenantId,
                planId: selectedPlanId
            });
            showToast(`Đã cấp gói đăng ký cho trung tâm ${subscribeTarget.tenantName}`);
            setSubscribeTarget(null);
            fetchTenants();
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data || 'Không thể cấp gói dịch vụ.';
            showToast(typeof msg === 'string' ? msg : 'Lỗi.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleCancelSubscription = async () => {
        if (!subscribeTarget) return;
        
        setSaving(true);
        try {
            await adminApi.post(`/Tenants/${subscribeTarget.tenantId}/cancel`);
            showToast(`Đã hủy gói dịch vụ của ${subscribeTarget.tenantName}`);
            setSubscribeTarget(null);
            setConfirmCancelOpen(false);
            fetchTenants();
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data || 'Không thể hủy gói dịch vụ.';
            showToast(typeof msg === 'string' ? msg : 'Lỗi.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const filtered = tenants.filter(t =>
        t.tenantName?.toLowerCase().includes(search.toLowerCase()) ||
        t.subDomain?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="sa-page">
            <SystemAdminSidebar />
            <main className="sa-page-main">

                {/* Toast */}
                {toast && (
                    <div className={`sa-toast ${toast.type}`}>
                        {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                        {toast.msg}
                    </div>
                )}

                {/* Header */}
                <div className="sa-page-header">
                    <div>
                        <h1 className="sa-page-title">Quản Lý Trung Tâm</h1>
                        <p className="sa-page-subtitle">Tạo và quản lý các trung tâm gia sư trong hệ thống</p>
                    </div>
                    <button className="sa-btn-primary" onClick={openCreate}>
                        <Plus size={18} /> Thêm Trung Tâm
                    </button>
                </div>

                {/* Toolbar */}
                <div className="sa-toolbar">
                    <div className="sa-search-wrap">
                        <Search size={16} className="sa-search-icon" />
                        <input
                            className="sa-search-input"
                            placeholder="Tìm kiếm theo tên, domain, email..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <span className="sa-count-badge">
                        <Building2 size={14} /> {filtered.length} trung tâm
                    </span>
                </div>

                {/* Table */}
                <div className="sa-table-card">
                    {loading ? (
                        <div className="sa-loading"><Loader2 size={24} className="spin" /> Đang tải...</div>
                    ) : filtered.length === 0 ? (
                        <div className="sa-empty">
                            <Building2 size={40} />
                            <p>{search ? 'Không tìm thấy kết quả phù hợp.' : 'Chưa có trung tâm nào. Hãy tạo trung tâm đầu tiên!'}</p>
                        </div>
                    ) : (
                        <table className="sa-table">
                            <thead>
                                <tr>
                                    <th>Tên Trung Tâm</th>
                                    <th>Domain</th>
                                    <th>Gói Đăng Ký</th>
                                    <th>Trạng Thái</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(t => (
                                    <tr key={t.tenantId}>
                                        <td>
                                            <div className="sa-tenant-name-cell">
                                                <div className="sa-tenant-avatar">
                                                    {t.tenantName?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="sa-tenant-name">{t.tenantName}</div>
                                                    <div className="sa-tenant-id">ID: {t.tenantId}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="sa-domain-tag">{t.subDomain}</span>
                                        </td>
                                        <td>
                                            {t.planName ? (
                                                <div className="sa-subscription-info">
                                                    <span className="sa-plan-name">{t.planName}</span>
                                                    {t.expiredAt && (
                                                        <div style={{ fontSize: '0.75rem', color: '#666', marginTop: 2 }}>
                                                            Hết hạn: {new Date(t.expiredAt).toLocaleDateString('vi-VN')}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span style={{ color: '#999', fontStyle: 'italic', fontSize: '0.85rem' }}>Chưa đăng ký</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`sa-status-badge ${t.isActive ? 'active' : 'inactive'}`}>
                                                {t.isActive ? 'Hoạt động' : 'Tạm dừng'}
                                            </span>
                                        </td>
                                        <td className="sa-actions-td">
                                            <div className="sa-action-buttons">
                                                <button
                                                    className="sa-action-btn view"
                                                    title="Xem chi tiết"
                                                    onClick={() => openViewDetails(t)}
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    className="sa-action-btn subscribe"
                                                    title="Cấp / Đổi Gói Dịch Vụ"
                                                    onClick={() => openSubscribe(t)}
                                                >
                                                    <Package size={18} />
                                                </button>
                                                <button
                                                    className="sa-action-btn edit"
                                                    title="Chỉnh sửa"
                                                    onClick={() => openEdit(t)}
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    className={`sa-action-btn ${t.isActive ? 'lock' : 'unlock'}`}
                                                    title={t.isActive ? 'Vô hiệu hóa' : 'Kích hoạt lại'}
                                                    onClick={() => handleToggle(t)}
                                                >
                                                    {t.isActive ? <Lock size={18} /> : <Unlock size={18} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Create/Edit Modal */}
                {modalOpen && (
                    <>
                        <div className="sa-modal-overlay" onClick={() => !saving && setModalOpen(false)} />
                        <div className="sa-modal">
                            <div className="sa-modal-header">
                                <h2>{editTarget ? 'Chỉnh Sửa Trung Tâm' : 'Thêm Trung Tâm Mới'}</h2>
                                <button className="sa-modal-close" onClick={() => !saving && setModalOpen(false)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="sa-modal-form">
                                <div className="sa-form-row">
                                    <div className="sa-form-group">
                                        <label>Mã Trung Tâm (ID) *</label>
                                        <input
                                            name="tenantId"
                                            value={form.tenantId}
                                            onChange={handleChange}
                                            placeholder="vd: center-hanoi"
                                            required
                                            disabled={!!editTarget}
                                        />
                                        {!editTarget && <span className="sa-form-hint">Dùng làm key DB cho trung tâm</span>}
                                    </div>
                                    <div className="sa-form-group">
                                        <label>Tên Trung Tâm *</label>
                                        <input
                                            name="tenantName"
                                            value={form.tenantName}
                                            onChange={handleChange}
                                            placeholder="vd: Trung Tâm Gia Sư Hà Nội"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="sa-form-group">
                                    <label>Domain / Subdomain *</label>
                                    <input
                                        name="subDomain"
                                        value={form.subDomain}
                                        onChange={handleChange}
                                        placeholder="center-a.educen.vn"
                                        required
                                    />
                                </div>
                                <div className="sa-form-row">
                                    <div className="sa-form-group">
                                        <label>Người Liên Hệ</label>
                                        <input
                                            name="contactPerson"
                                            value={form.contactPerson}
                                            onChange={handleChange}
                                            placeholder="Nguyễn Văn A"
                                        />
                                    </div>
                                    <div className="sa-form-group">
                                        <label>Email</label>
                                        <input
                                            name="email"
                                            type="email"
                                            value={form.email}
                                            onChange={handleChange}
                                            placeholder="admin@trungtam.vn"
                                        />
                                    </div>
                                </div>
                                <div className="sa-form-row">
                                    <div className="sa-form-group">
                                        <label>Số Điện Thoại</label>
                                        <input
                                            name="phoneNumber"
                                            value={form.phoneNumber}
                                            onChange={handleChange}
                                            placeholder="0901234567"
                                        />
                                    </div>
                                    <div className="sa-form-group">
                                        <label>Địa Chỉ</label>
                                        <input
                                            name="address"
                                            value={form.address}
                                            onChange={handleChange}
                                            placeholder="123 Đường ABC, Hà Nội"
                                        />
                                    </div>
                                </div>
                                {!editTarget && (
                                    <div className="sa-form-note">
                                        <CheckCircle size={14} />
                                        Hệ thống sẽ tự động tạo database riêng cho trung tâm này sau khi lưu.
                                    </div>
                                )}
                                <div className="sa-modal-footer">
                                    <button type="button" className="sa-btn-cancel" onClick={() => !saving && setModalOpen(false)}>Hủy</button>
                                    <button type="submit" className="sa-btn-primary" disabled={saving}>
                                        {saving
                                            ? <><Loader2 size={16} className="spin" /> Đang lưu...</>
                                            : editTarget ? 'Cập Nhật' : 'Tạo Trung Tâm'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </>
                )}
                {/* Detail Modal */}
                {viewTarget && (
                    <>
                        <div className="sa-modal-overlay" onClick={() => setViewTarget(null)} />
                        <div className="sa-modal">
                            <div className="sa-modal-header">
                                <h2>Thông Tin Chi Tiết</h2>
                                <button className="sa-modal-close" onClick={() => setViewTarget(null)}><X size={20} /></button>
                            </div>
                            <div className="sa-modal-form" style={{ gap: '1rem', paddingBottom: '1.5rem' }}>
                                {/* Tenant Name + Status */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div className="sa-tenant-avatar" style={{ width: 44, height: 44, fontSize: '1.2rem', borderRadius: 12 }}>
                                        {viewTarget.tenantName?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>{viewTarget.tenantName}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>ID: {viewTarget.tenantId}</div>
                                    </div>
                                    <span className={`sa-status-badge ${viewTarget.isActive ? 'active' : 'inactive'}`} style={{ marginLeft: 'auto' }}>
                                        {viewTarget.isActive ? 'Hoạt động' : 'Tạm dừng'}
                                    </span>
                                </div>

                                {/* Info Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    {[
                                        { label: 'Domain', value: viewTarget.subDomain },
                                        { label: 'Người liên hệ', value: viewTarget.contactPerson },
                                        { label: 'Email', value: viewTarget.email },
                                        { label: 'Số điện thoại', value: viewTarget.phoneNumber },
                                        { label: 'Địa chỉ', value: viewTarget.address, span: true },
                                    ].map(({ label, value, span }) => (
                                        <div key={label} style={{
                                            background: '#f8fafc', padding: '0.75rem 1rem',
                                            borderRadius: '8px', gridColumn: span ? '1 / -1' : undefined
                                        }}>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.2rem' }}>{label}</div>
                                            <div style={{ fontWeight: 500, color: '#1e293b' }}>{value || '—'}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Subscription / Usage */}
                                {viewTarget.planName ? (
                                    <>
                                        <div style={{ fontWeight: 600, color: '#1e293b', marginTop: '0.5rem', borderTop: '1px solid #f0f0f0', paddingTop: '0.75rem' }}>
                                            Thông tin gói: <span style={{ color: '#6366f1' }}>{viewTarget.planName}</span>
                                            {viewTarget.expiredAt && (
                                                <span style={{ fontSize: '0.78rem', color: '#94a3b8', marginLeft: 8 }}>
                                                    (Hết hạn: {new Date(viewTarget.expiredAt).toLocaleDateString('vi-VN')})
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                            <div style={{ background: '#eff6ff', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                                                <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginBottom: '0.2rem' }}>Users (sử dụng / tối đa)</div>
                                                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1d4ed8' }}>
                                                    {viewTarget.totalUsers ?? '—'}
                                                    {viewTarget.limitUsers ? <span style={{ fontWeight: 400, color: '#64748b', fontSize: '0.9rem' }}> / {viewTarget.limitUsers}</span> : ''}
                                                </div>
                                            </div>
                                            <div style={{ background: '#f5f3ff', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                                                <div style={{ fontSize: '0.75rem', color: '#8b5cf6', marginBottom: '0.2rem' }}>Dung lượng (MB sử dụng / tối đa)</div>
                                                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#6d28d9' }}>
                                                    {viewTarget.storageMB ? viewTarget.storageMB.toFixed(1) : '0'}
                                                    {viewTarget.storageLimit ? <span style={{ fontWeight: 400, color: '#64748b', fontSize: '0.9rem' }}> / {viewTarget.storageLimit} MB</span> : ''}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ padding: '0.75rem 1rem', background: '#fffbeb', borderRadius: '8px', color: '#b45309', fontSize: '0.875rem', marginTop: '0.5rem', borderTop: '1px solid #f0f0f0' }}>
                                        Chưa đăng ký gói dịch vụ — Sử dụng nút Package để cấp gói.
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* Subscribe Modal */}
                {subscribeTarget && (
                    <>
                        <div className="sa-modal-overlay" onClick={() => !saving && setSubscribeTarget(null)} />
                        <div className="sa-modal">
                            <div className="sa-modal-header">
                                <h2>Cấp Gói Dịch Vụ</h2>
                                <button className="sa-modal-close" onClick={() => !saving && setSubscribeTarget(null)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleSubscribeSubmit} className="sa-modal-form">
                                <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f1f5f9', borderRadius: '8px' }}>
                                    <div><strong>Trung tâm:</strong> {subscribeTarget.tenantName}</div>
                                    <div style={{ marginTop: 4, display: 'flex', gap: '1rem', fontSize: '0.9rem', color: '#475569' }}>
                                        <span>User hiện tại: <strong>{subscribeTarget.totalUsers}</strong></span>
                                        <span>Dung lượng hiện tại: <strong>{subscribeTarget.storageMB ? `${subscribeTarget.storageMB.toFixed(2)} MB` : '0 MB'}</strong></span>
                                    </div>
                                </div>
                                <div className="sa-form-group">
                                    <label>Chọn Gói Dịch Vụ Mới *</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                                        {plans.length === 0 ? (
                                            <div style={{ padding: '1rem', background: '#fffbeb', color: '#b45309', borderRadius: '6px' }}>
                                                Chưa có Gói Dịch Vụ nào trên hệ thống. Vui lòng tạo gói trước.
                                            </div>
                                        ) : plans.map(p => {
                                            const isCurrentPlan = subscribeTarget.planName === p.planName;
                                            return (
                                                <label 
                                                    key={p.planId} 
                                                    style={{ 
                                                        display: 'flex', alignItems: 'flex-start', gap: '1rem', 
                                                        padding: '1rem', 
                                                        border: `1px solid ${selectedPlanId === p.planId ? '#3b82f6' : '#e2e8f0'}`, 
                                                        borderRadius: '8px', 
                                                        cursor: isCurrentPlan ? 'default' : 'pointer',
                                                        background: isCurrentPlan ? '#f8fafc' : (selectedPlanId === p.planId ? '#eff6ff' : '#fff'),
                                                        opacity: isCurrentPlan ? 0.7 : 1
                                                    }}
                                                >
                                                    <input 
                                                        type="radio" 
                                                        name="planSelection" 
                                                        value={p.planId} 
                                                        checked={selectedPlanId === p.planId || isCurrentPlan}
                                                        onChange={(e) => !isCurrentPlan && setSelectedPlanId(e.target.value)}
                                                        disabled={isCurrentPlan}
                                                        style={{ marginTop: '4px' }}
                                                    />
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '1.05rem' }}>{p.planName}</div>
                                                            {isCurrentPlan && (
                                                                <span style={{ fontSize: '0.7rem', background: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>ĐANG SỬ DỤNG</span>
                                                            )}
                                                        </div>
                                                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px', lineHeight: '1.4' }}>
                                                            <div>Giới hạn: <strong>{p.limitUsers}</strong> Users</div>
                                                            <div>Lưu trữ: <strong>{p.storageLimit} MB</strong></div>
                                                            <div style={{ color: '#10b981', fontWeight: 500, marginTop: '2px' }}>{p.price.toLocaleString('vi-VN')} VND / tháng</div>
                                                        </div>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="sa-modal-footer" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        {subscribeTarget.planName && (
                                            <button 
                                                type="button" 
                                                className="sa-btn-cancel" 
                                                style={{ borderColor: '#ef4444', color: '#ef4444' }}
                                                onClick={() => setConfirmCancelOpen(true)}
                                                disabled={saving}
                                            >
                                                Hủy Gói Hiện Tại
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <button type="button" className="sa-btn-cancel" onClick={() => !saving && setSubscribeTarget(null)}>
                                            Đóng
                                        </button>
                                        <button type="submit" className="sa-btn-primary" disabled={saving || plans.length === 0}>
                                            {saving ? <><Loader2 size={16} className="spin" /> Đang lưu...</> : 'Xác Nhận Cấp Gói'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </>
                )}

                {/* Confirm Cancel Modal */}
                {confirmCancelOpen && (
                    <>
                        <div className="sa-modal-overlay" style={{ zIndex: 1100 }} onClick={() => !saving && setConfirmCancelOpen(false)} />
                        <div className="sa-modal" style={{ zIndex: 1101, maxWidth: '400px', textAlign: 'center' }}>
                            <div style={{ padding: '2rem 1.5rem' }}>
                                <div style={{ 
                                    width: 60, height: 60, borderRadius: '50%', background: '#fef2f2', 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                    margin: '0 auto 1.5rem', color: '#ef4444' 
                                }}>
                                    <AlertCircle size={32} />
                                </div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.75rem' }}>
                                    Xác nhận hủy gói?
                                </h2>
                                <p style={{ color: '#64748b', lineHeight: 1.5, fontSize: '0.95rem' }}>
                                    Bạn có chắc chắn muốn hủy gói dịch vụ của <strong>{subscribeTarget?.tenantName}</strong>? 
                                    Hành động này sẽ dừng các quyền lợi của gói ngay lập tức.
                                </p>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                    <button 
                                        className="sa-btn-cancel" 
                                        style={{ flex: 1 }} 
                                        onClick={() => setConfirmCancelOpen(false)}
                                        disabled={saving}
                                    >
                                        Quay Lại
                                    </button>
                                    <button 
                                        className="sa-btn-primary" 
                                        style={{ flex: 1, background: '#ef4444', borderColor: '#ef4444' }}
                                        onClick={handleCancelSubscription}
                                        disabled={saving}
                                    >
                                        {saving ? <Loader2 size={16} className="spin" /> : 'Xác Nhận Hủy'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

export default TenantManagement;
