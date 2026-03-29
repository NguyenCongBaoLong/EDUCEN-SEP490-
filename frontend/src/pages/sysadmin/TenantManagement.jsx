import { useState, useEffect } from 'react';
import {
    Building2, Plus, Search, Edit2, Eye, Lock, Unlock, Package,
    X, CheckCircle, AlertCircle, Loader2, ClipboardList, Check, Filter, TrendingUp
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
    const [activeTab, setActiveTab] = useState('tenants'); // 'tenants' | 'registrations'
    const [registrations, setRegistrations] = useState([]);
    const [loadingReg, setLoadingReg] = useState(false);
    const [filterStatus, setFilterStatus] = useState('Pending'); // 'All', 'Pending', 'Approved', 'Rejected'
    const [viewRegTarget, setViewRegTarget] = useState(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null); // null = create mode

    // New Modals State 
    const [viewTarget, setViewTarget] = useState(null);
    const [subscribeTarget, setSubscribeTarget] = useState(null);
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [registrationApprovalTarget, setRegistrationApprovalTarget] = useState(null);
    const [lockTarget, setLockTarget] = useState(null);
    const [historyTarget, setHistoryTarget] = useState(null);
    const [historyRecords, setHistoryRecords] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    // Custom Confirm Modal State
    const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

    const fetchTenants = () => {
        setLoading(true);
        adminApi.get('/admin/Tenants')
            .then(res => setTenants(res.data))
            .catch(() => showToast('Không thể tải danh sách trung tâm.', 'error'))
            .finally(() => setLoading(false));
    };

    const fetchPlans = () => {
        adminApi.get('/admin/plans')
            .then(res => setPlans(res.data))
            .catch(() => console.error('Error fetching plans'));
    };

    const fetchRegistrations = () => {
        setLoadingReg(true);
        adminApi.get('/registrations')
            .then(res => setRegistrations(res.data))
            .catch(() => showToast('Không thể tải danh sách đăng ký.', 'error'))
            .finally(() => setLoadingReg(false));
    };

    useEffect(() => {
        fetchTenants();
        fetchPlans();
        fetchRegistrations();
    }, []);

    const handleUpdateRegistrationStatus = async (id, status) => {
        try {
            await adminApi.put(`/registrations/${id}/status?status=${status}`);
            showToast(status === 'Approved' ? 'Đã duyệt yêu cầu đăng ký!' : 'Đã từ chối yêu cầu.');
            fetchRegistrations();
        } catch {
            showToast('Có lỗi xảy ra khi cập nhật.', 'error');
        }
    };


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

    const openApproveModal = (reg) => {
        setRegistrationApprovalTarget(reg);
        setEditTarget(null);
        setForm({
            tenantId: '',
            tenantName: reg.centerName || '',
            subDomain: '',
            contactPerson: reg.contactPerson || '',
            email: reg.email || '',
            phoneNumber: reg.phoneNumber || '',
            address: '',
        });
        setModalOpen(true);
    };

    const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editTarget) {
                await adminApi.put(`/admin/Tenants/${editTarget.tenantId}`, {
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
                await adminApi.post('/admin/Tenants', form);
                showToast('Tạo trung tâm thành công! DB mới đã được khởi tạo.');
                if (registrationApprovalTarget) {
                    await handleUpdateRegistrationStatus(registrationApprovalTarget.registrationId, 'Approved');
                }
            }
            setModalOpen(false);
            setRegistrationApprovalTarget(null);
            fetchTenants();
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data || 'Có lỗi xảy ra.';
            showToast(typeof msg === 'string' ? msg : 'Có lỗi xảy ra.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = (tenant) => {
        setLockTarget(tenant);
    };

    const executeToggleActive = async () => {
        if (!lockTarget) return;
        setSaving(true);
        try {
            await adminApi.put(`/admin/Tenants/${lockTarget.tenantId}`, {
                tenantName: lockTarget.tenantName,
                subDomain: lockTarget.subDomain,
                isActive: !lockTarget.isActive,   // toggle
            });
            showToast(lockTarget.isActive
                ? `Đã ngưng hoạt động trung tâm ${lockTarget.tenantName}.`
                : `Đã kích hoạt lại trung tâm ${lockTarget.tenantName}.`
            );
            setLockTarget(null);
            fetchTenants();
        } catch {
            showToast('Không thể thay đổi trạng thái.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const openViewDetails = (tenant) => {
        setViewTarget(tenant);
    };

    const openSubscribe = (tenant) => {
        setSubscribeTarget(tenant);
        setSelectedPlanId('');
    };

    const openHistory = (tenant) => {
        setHistoryTarget(tenant);
        setHistoryLoading(true);
        setHistoryRecords([]);
        adminApi.get(`/admin/tenants/${tenant.tenantId}/subscription-history`)
            .then(res => setHistoryRecords(res.data || []))
            .catch(() => showToast('Không thể tải lịch sử mua gói.', 'error'))
            .finally(() => setHistoryLoading(false));
    };

    const handleSubscribeSubmit = async (e) => {
        e.preventDefault();
        if (!selectedPlanId) {
            showToast('Vui lòng chọn gói dịch vụ', 'error');
            return;
        }

        setSaving(true);
        try {
            if (selectedPlanId === subscribeTarget.planId) {
                showToast('Không thể gia hạn gói hiện tại bằng tài khoản hệ thống.', 'error');
                return;
            }
            // Đổi gói mới / Cấp gói lần đầu
            await adminApi.post('/admin/tenants/subscribe', {
                tenantId: subscribeTarget.tenantId,
                planId: selectedPlanId
            });
            showToast(`Đã cập nhật gói dịch vụ thành công cho ${subscribeTarget.tenantName}`);
            setSubscribeTarget(null);
            fetchTenants();
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data || 'Có lỗi xảy ra.';
            showToast(typeof msg === 'string' ? msg : 'Có lỗi xảy ra.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleCancelSubscription = async () => {
        if (!subscribeTarget) return;
        
        setSaving(true);
        try {
            await adminApi.post(`/admin/tenants/${subscribeTarget.tenantId}/cancel`);
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

    const filteredRegistrations = registrations.filter(r => {
        const matchSearch = r.centerName?.toLowerCase().includes(search.toLowerCase()) ||
            r.email?.toLowerCase().includes(search.toLowerCase()) ||
            r.contactPerson?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === 'All' ? true : r.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const pendingCount = registrations.filter(r => r.status === 'Pending').length;

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
                        <h1 className="sa-page-title">{activeTab === 'tenants' ? 'Quản Lý Trung Tâm' : 'Yêu Cầu Đăng Ký'}</h1>
                        <p className="sa-page-subtitle">
                            {activeTab === 'tenants' ? 'Tạo và quản lý các trung tâm gia sư trong hệ thống' : 'Kiểm duyệt các yêu cầu đăng ký mở trung tâm mới'}
                        </p>
                    </div>
                    {activeTab === 'tenants' && (
                        <button className="sa-btn-primary" onClick={openCreate}>
                            <Plus size={18} /> Thêm Trung Tâm
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div className="sa-tabs">
                    <button 
                        className={`sa-tab-btn ${activeTab === 'tenants' ? 'active' : ''}`}
                        onClick={() => setActiveTab('tenants')}
                    >
                        <Building2 size={18} /> Quản Lý Trung Tâm
                    </button>
                    <button 
                        className={`sa-tab-btn ${activeTab === 'registrations' ? 'active' : ''}`}
                        onClick={() => setActiveTab('registrations')}
                    >
                        <ClipboardList size={18} /> Yêu Cầu Đăng Ký
                        {pendingCount > 0 && (
                            <span className="sa-tab-badge">{pendingCount}</span>
                        )}
                    </button>
                </div>

                {/* Toolbar */}
                <div className="sa-toolbar">
                    <div className="sa-search-wrap">
                        <Search size={16} className="sa-search-icon" />
                        <input
                            className="sa-search-input"
                            placeholder={activeTab === 'tenants' ? "Tìm kiếm theo tên, domain, email..." : "Tìm kiếm theo tên trung tâm, email..."}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    {activeTab === 'registrations' && (
                        <div className="sa-filter-wrap">
                            <Filter size={14} className="sa-filter-label" style={{ color: '#6366f1' }} />
                            <span className="sa-filter-label">Trạng thái:</span>
                            <select 
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="sa-filter-select"
                            >
                                <option value="All">Tất cả</option>
                                <option value="Pending">Chờ duyệt</option>
                                <option value="Approved">Đã duyệt</option>
                                <option value="Rejected">Từ chối</option>
                            </select>
                        </div>
                    )}
                    <span className="sa-count-badge">
                        {activeTab === 'tenants' ? (
                            <><Building2 size={14} /> {filtered.length} trung tâm</>
                        ) : (
                            <><ClipboardList size={14} /> {filteredRegistrations.length} yêu cầu</>
                        )}
                    </span>
                </div>

                {/* Tab content: Tenants */}
                {activeTab === 'tenants' && (
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
                                                    <span className="sa-plan-name" style={{ color: t.planIsActive ? 'inherit' : '#ef4444', fontWeight: t.planIsActive ? 'inherit' : 600 }}>
                                                        {t.planName}
                                                        {!t.planIsActive && <span style={{ fontSize: '0.7rem', display: 'block', color: '#ef4444' }}>(Gói đã bị xóa)</span>}
                                                    </span>
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
                                                    title="Xem lịch sử mua gói"
                                                    onClick={() => openHistory(t)}
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
                )}

                {/* Tab content: Registrations */}
                {activeTab === 'registrations' && (
                    <div className="sa-table-card">
                        {/* List Area */}

                        {loadingReg ? (
                            <div className="sa-loading"><Loader2 size={24} className="spin" /> Đang tải...</div>
                        ) : filteredRegistrations.length === 0 ? (
                            <div className="sa-empty">
                                <ClipboardList size={40} />
                                <p>{search ? 'Không tìm thấy kết quả phù hợp.' : 'Chưa có yêu cầu đăng ký nào.'}</p>
                            </div>
                        ) : (
                            <table className="sa-table">
                                <thead>
                                    <tr>
                                        <th>Tên Trung Tâm</th>
                                        <th>Người Liên Hệ</th>
                                        <th>Ngày Gửi</th>
                                        <th>Trạng Thái</th>
                                        <th>Phê Duyệt</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRegistrations.map(r => (
                                        <tr key={r.registrationId}>
                                            <td>
                                                <div className="sa-tenant-name-cell">
                                                    <div className="sa-tenant-avatar" style={{ background: '#f3f4f6', color: '#374151' }}>
                                                        {r.centerName?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="sa-tenant-name">{r.centerName}</div>
                                                        <div className="sa-tenant-id" style={{ whiteSpace: 'normal', maxWidth: '300px' }}>
                                                            {r.message ? `Lời nhắn: ${r.message.length > 50 ? r.message.substring(0, 50) + '...' : r.message}` : 'Không có lời nhắn'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 500, color: '#111827' }}>{r.contactPerson || '—'}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                                    {r.email} {r.phoneNumber ? `• ${r.phoneNumber}` : ''}
                                                </div>
                                            </td>
                                            <td>{new Date(r.createdAt).toLocaleDateString('vi-VN')}</td>
                                            <td>
                                                <span className={`sa-status-badge ${r.status === 'Pending' ? 'pending' : r.status === 'Approved' ? 'active' : 'inactive'}`} style={r.status === 'Pending' ? { background: '#fef3c7', color: '#d97706' } : r.status === 'Rejected' ? { background: '#fef2f2', color: '#ef4444' } : {}}>
                                                    {r.status === 'Pending' ? 'Chờ duyệt' : r.status === 'Approved' ? 'Đã duyệt' : 'Từ chối'}
                                                </span>
                                            </td>
                                            <td className="sa-actions-td">
                                                <div className="sa-action-buttons">
                                                    <button
                                                        className="sa-action-btn view"
                                                        title="Xem chi tiết"
                                                        onClick={() => setViewRegTarget(r)}
                                                        style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    {r.status === 'Pending' && (
                                                        <>
                                                            <button
                                                                className="sa-action-btn subscribe"
                                                                title="Phê duyệt (Tạo trung tâm)"
                                                                onClick={() => openApproveModal(r)}
                                                                style={{ background: '#ecfdf5', border: '1px solid #10b981' }}
                                                            >
                                                                <Check size={18} />
                                                            </button>
                                                            <button
                                                                className="sa-action-btn lock"
                                                                title="Từ chối yêu cầu"
                                                                onClick={() => handleUpdateRegistrationStatus(r.registrationId, 'Rejected')}
                                                                style={{ background: '#fef2f2', border: '1px solid #ef4444' }}
                                                            >
                                                                <X size={18} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* MODALS SECTION */}
                
                {/* Registration Detail Modal */}
                {viewRegTarget && (
                    <>
                        <div className="sa-modal-overlay" onClick={() => setViewRegTarget(null)} />
                        <div className="sa-modal">
                            <div className="sa-modal-header">
                                <h2>Chi Tiết Yêu Cầu Đăng Ký</h2>
                                <button className="sa-modal-close" onClick={() => setViewRegTarget(null)}><X size={20} /></button>
                            </div>
                            <div className="sa-modal-form" style={{ gap: '1rem', paddingBottom: '1.5rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    {[
                                        { label: 'Tên trung tâm', value: viewRegTarget.centerName, span: true },
                                        { label: 'Người liên hệ', value: viewRegTarget.contactPerson },
                                        { label: 'Email', value: viewRegTarget.email },
                                        { label: 'Số điện thoại', value: viewRegTarget.phoneNumber },
                                        { label: 'Trạng thái', value: viewRegTarget.status === 'Pending' ? 'Chưa duyệt' : viewRegTarget.status === 'Approved' ? 'Đã duyệt' : 'Từ chối' },
                                        { label: 'Ngày gửi', value: new Date(viewRegTarget.createdAt).toLocaleString('vi-VN') },
                                        { label: 'Lời nhắn / Yêu cầu', value: viewRegTarget.message || 'Không có', span: true },
                                    ].map(({ label, value, span }) => (
                                        <div key={label} style={{
                                            background: '#f8fafc', padding: '0.75rem 1rem',
                                            borderRadius: '8px', gridColumn: span ? '1 / -1' : undefined
                                        }}>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
                                            <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 500, whiteSpace: 'pre-wrap' }}>{value || '—'}</div>
                                        </div>
                                    ))}
                                </div>
                                {viewRegTarget.status === 'Pending' && (
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                                        <button
                                            className="sa-btn-primary"
                                            style={{ flex: 1, background: '#10b981' }}
                                            onClick={() => {
                                                openApproveModal(viewRegTarget);
                                                setViewRegTarget(null);
                                            }}
                                        >
                                            <Check size={18} /> Phê Duyệt Ngay
                                        </button>
                                        <button
                                            className="sa-btn-cancel"
                                            style={{ flex: 1, color: '#ef4444', borderColor: '#fca5a5', background: '#fef2f2' }}
                                            onClick={() => {
                                                handleUpdateRegistrationStatus(viewRegTarget.registrationId, 'Rejected');
                                                setViewRegTarget(null);
                                            }}
                                        >
                                            <X size={18} /> Từ Chối
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* Create/Edit Modal - Also used for registration approval */}
                {modalOpen && (
                    <>
                        <div className="sa-modal-overlay" onClick={() => !saving && setModalOpen(false)} />
                        <div className="sa-modal">
                            <div className="sa-modal-header">
                                <h2>
                                    {editTarget 
                                        ? 'Chỉnh Sửa Trung Tâm' 
                                        : registrationApprovalTarget 
                                            ? 'Phê Duyệt & Tạo Trung Tâm' 
                                            : 'Thêm Trung Tâm Mới'}
                                </h2>
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
                                            placeholder="0912 345 678"
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

                {/* Subscription History Modal */}
                {historyTarget && (
                    <>
                        <div className="sa-modal-overlay" onClick={() => !historyLoading && setHistoryTarget(null)} />
                        <div className="sa-modal" style={{ maxWidth: '900px' }}>
                            <div className="sa-modal-header">
                                <h2>Lịch Sử Mua Gói</h2>
                                <button className="sa-modal-close" onClick={() => !historyLoading && setHistoryTarget(null)}><X size={20} /></button>
                            </div>
                            <div className="sa-modal-form" style={{ gap: '1rem' }}>
                                <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: '8px' }}>
                                    <strong>Trung tâm:</strong> {historyTarget.tenantName} (ID: {historyTarget.tenantId})
                                </div>

                                {historyLoading ? (
                                    <div className="sa-loading"><Loader2 size={20} className="spin" /> Đang tải lịch sử...</div>
                                ) : historyRecords.length === 0 ? (
                                    <div className="sa-empty" style={{ padding: '1.5rem' }}>
                                        <Package size={36} />
                                        <p>Chưa có lịch sử mua gói.</p>
                                    </div>
                                ) : (
                                    <div className="sa-table-card" style={{ marginTop: 0 }}>
                                        <table className="sa-table">
                                            <thead>
                                                <tr>
                                                    <th>Ngày thanh toán</th>
                                                    <th>Số tiền</th>
                                                    <th>Số tháng</th>
                                                    <th>Trạng thái</th>
                                                    <th>Phương thức</th>
                                                    <th>Ghi chú</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {historyRecords.map((record) => (
                                                    <tr key={record.paymentId}>
                                                        <td>{record.paymentDate ? new Date(record.paymentDate).toLocaleString('vi-VN') : '—'}</td>
                                                        <td>{record.amount != null ? `${record.amount.toLocaleString('vi-VN')} VND` : '—'}</td>
                                                        <td>{record.subscriptionMonths || 1}</td>
                                                        <td>{record.status || '—'}</td>
                                                        <td>{record.paymentMethod || '—'}</td>
                                                        <td>{record.description || '—'}</td>
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
                                    <label>Chọn Gói Dịch Vụ *</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                                        {plans.length === 0 ? (
                                            <div style={{ padding: '1rem', background: '#fffbeb', color: '#b45309', borderRadius: '6px' }}>
                                                Chưa có Gói Dịch Vụ nào trên hệ thống. Vui lòng tạo gói trước.
                                            </div>
                                        ) : plans.map(p => {
                                            const isCurrentPlan = subscribeTarget.planId === p.planId;
                                            const isSelected = selectedPlanId === p.planId;
                                            return (
                                                    <label 
                                                        key={p.planId} 
                                                        style={{ 
                                                            display: 'flex', alignItems: 'flex-start', gap: '1rem', 
                                                            padding: '1rem', 
                                                            border: `1px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}`, 
                                                            borderRadius: '8px', 
                                                            cursor: isCurrentPlan ? 'default' : 'pointer',
                                                            background: isSelected ? '#eff6ff' : '#fff',
                                                        }}
                                                    >
                                                    <input 
                                                        type="radio" 
                                                        name="planSelection" 
                                                        value={p.planId} 
                                                        checked={isSelected}
                                                        onChange={(e) => setSelectedPlanId(e.target.value)}
                                                        style={{ marginTop: '4px' }}
                                                        disabled={isCurrentPlan}
                                                    />
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '1.05rem' }}>{p.planName}</div>
                                                            {isCurrentPlan && (
                                                                <span style={{ fontSize: '0.7rem', background: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>ĐANG SỬ DỤNG</span>
                                                            )}
                                                            {!p.isActive && (
                                                                <span style={{ fontSize: '0.7rem', background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>ĐÃ NGỪNG CẤP</span>
                                                            )}
                                                        </div>
                                                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px', lineHeight: '1.4' }}>
                                                            <div>Giới hạn: <strong>{p.limitUsers}</strong> Users</div>
                                                            <div>Lưu trữ: <strong>{p.storageLimit} MB</strong></div>
                                                            <div style={{ color: '#10b981', fontWeight: 500, marginTop: '2px' }}>{p.price.toLocaleString('vi-VN')} VND / tháng</div>
                                                            {isCurrentPlan && (
                                                                <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '4px' }}>
                                                                    Gói hiện tại không hỗ trợ gia hạn ở đây.
                                                                </div>
                                                            )}
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
                                            {saving ? (
                                                <><Loader2 size={16} className="spin" /> Đang lưu...</>
                                            ) : (
                                                selectedPlanId === subscribeTarget.planId ? 'Xác Nhận Gia Hạn' : 
                                                (subscribeTarget.planId ? 'Đổi Gói Dịch Vụ' : 'Kích Hoạt Gói')
                                            )}
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

                {/* Lock/Unlock Confirmation Modal */}
                {lockTarget && (
                    <>
                        <div className="sa-modal-overlay" style={{ zIndex: 1100 }} onClick={() => !saving && setLockTarget(null)} />
                        <div className="sa-modal" style={{ zIndex: 1101, maxWidth: '450px', textAlign: 'center' }}>
                            <div style={{ padding: '2.5rem 2rem' }}>
                                <div style={{ 
                                    width: 70, height: 70, borderRadius: '50%', 
                                    background: lockTarget.isActive ? '#fff7ed' : '#f0fdf4', 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                    margin: '0 auto 1.5rem', color: lockTarget.isActive ? '#f97316' : '#10b981'
                                }}>
                                    {lockTarget.isActive ? <Lock size={36} /> : <Unlock size={36} />}
                                </div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginBottom: '1rem' }}>
                                    {lockTarget.isActive ? 'Khóa Trung Tâm?' : 'Mở Khóa Trung Tâm?'}
                                </h2>
                                <p style={{ color: '#64748b', lineHeight: 1.6, fontSize: '1rem', marginBottom: '2rem' }}>
                                    {lockTarget.isActive ? (
                                        <>Bạn có chắc muốn tạm dừng hoạt động của <strong>{lockTarget.tenantName}</strong>? <br/>Mọi người dùng thuộc trung tâm này sẽ <b>không thể đăng nhập</b> vào hệ thống.</>
                                    ) : (
                                        <>Kích hoạt lại <strong>{lockTarget.tenantName}</strong>. <br/>Hệ thống và người dùng có thể truy cập lại bình thường.</>
                                    )}
                                </p>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button 
                                        className="sa-btn-cancel" 
                                        style={{ flex: 1, padding: '0.75rem' }} 
                                        onClick={() => setLockTarget(null)}
                                        disabled={saving}
                                    >
                                        Hủy Bỏ
                                    </button>
                                    <button 
                                        className="sa-btn-primary" 
                                        style={{ 
                                            flex: 1, padding: '0.75rem',
                                            background: lockTarget.isActive ? '#f97316' : '#10b981', 
                                            borderColor: lockTarget.isActive ? '#f97316' : '#10b981' 
                                        }}
                                        onClick={executeToggleActive}
                                        disabled={saving}
                                    >
                                        {saving ? <Loader2 size={18} className="spin" /> : (lockTarget.isActive ? 'Xác Nhận Khóa' : 'Mở Khóa Ngay')}
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
