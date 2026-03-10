import { useState, useEffect } from 'react';
import {
    Building2, Plus, Search, MoreVertical, Edit2,
    ToggleLeft, ToggleRight, X, CheckCircle, AlertCircle, Loader2
} from 'lucide-react';
import SystemAdminSidebar from '../../components/SystemAdminSidebar';
import adminApi from '../../services/adminApi';
import '../../css/pages/sysadmin/TenantManagement.css';

const EMPTY_FORM = {
    tenantId: '', tenantName: '', contactPerson: '',
    email: '', phoneNumber: '', address: '', domainUrl: '',
};

const TenantManagement = () => {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null); // null = create mode
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [openMenu, setOpenMenu] = useState(null);

    const fetchTenants = () => {
        setLoading(true);
        adminApi.get('/Tenants')
            .then(res => setTenants(res.data))
            .catch(() => showToast('Không thể tải danh sách trung tâm.', 'error'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchTenants(); }, []);



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
            contactPerson: tenant.contactPerson || '',
            email: tenant.email || '',
            phoneNumber: tenant.phoneNumber || '',
            address: tenant.address || '',
            domainUrl: tenant.domainUrl,
        });
        setModalOpen(true);
        setOpenMenu(null);
    };

    const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editTarget) {
                await adminApi.put(`/Tenants/${editTarget.tenantId}`, {
                    tenantName: form.tenantName,
                    contactPerson: form.contactPerson,
                    email: form.email,
                    phoneNumber: form.phoneNumber,
                    address: form.address,
                    domainUrl: form.domainUrl,
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
        setOpenMenu(null);
        try {
            await adminApi.put(`/Tenants/${tenant.tenantId}`, {
                tenantName: tenant.tenantName,
                contactPerson: tenant.contactPerson || '',
                email: tenant.email || '',
                phoneNumber: tenant.phoneNumber || '',
                address: tenant.address || '',
                domainUrl: tenant.domainUrl,
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

    const filtered = tenants.filter(t =>
        t.tenantName?.toLowerCase().includes(search.toLowerCase()) ||
        t.domainUrl?.toLowerCase().includes(search.toLowerCase()) ||
        t.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="sa-page">
            <SystemAdminSidebar />
            {/* Overlay đóng dropdown khi click ra ngoài */}
            {openMenu && (
                <div
                    style={{ position: 'fixed', inset: 0, zIndex: 98 }}
                    onClick={() => setOpenMenu(null)}
                />
            )}
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
                                    <th>Người Liên Hệ</th>
                                    <th>Email</th>
                                    <th>Số ĐT</th>
                                    <th>Domain</th>
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
                                        <td>{t.contactPerson || '—'}</td>
                                        <td>{t.email || '—'}</td>
                                        <td>{t.phoneNumber || '—'}</td>
                                        <td>
                                            <span className="sa-domain-tag">{t.domainUrl}</span>
                                        </td>
                                        <td>
                                            <span className={`sa-status-badge ${t.isActive ? 'active' : 'inactive'}`}>
                                                {t.isActive ? 'Hoạt động' : 'Tạm dừng'}
                                            </span>
                                        </td>
                                        <td className="sa-actions-td" style={{ position: 'relative', zIndex: 99 }}>
                                            <button
                                                className="sa-menu-btn"
                                                onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === t.tenantId ? null : t.tenantId); }}
                                            >
                                                <MoreVertical size={18} />
                                            </button>
                                            {openMenu === t.tenantId && (
                                                <div className="sa-dropdown">
                                                    <button onClick={() => openEdit(t)}>
                                                        <Edit2 size={14} /> Chỉnh sửa
                                                    </button>
                                                    <button onClick={() => handleToggle(t)}>
                                                        {t.isActive
                                                            ? <><ToggleLeft size={14} /> Vô hiệu hóa</>
                                                            : <><ToggleRight size={14} /> Kích hoạt</>}
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Modal */}
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
                                        {!editTarget && <span className="sa-form-hint">Dùng làm subdomain: center-hanoi.educen.vn</span>}
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
                                <div className="sa-form-row">
                                    <div className="sa-form-group">
                                        <label>Người Liên Hệ</label>
                                        <input
                                            name="contactPerson"
                                            value={form.contactPerson}
                                            onChange={handleChange}
                                            placeholder="Họ và tên người phụ trách"
                                        />
                                    </div>
                                    <div className="sa-form-group">
                                        <label>Email</label>
                                        <input
                                            name="email"
                                            type="email"
                                            value={form.email}
                                            onChange={handleChange}
                                            placeholder="email@example.com"
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
                                        <label>Domain URL *</label>
                                        <input
                                            name="domainUrl"
                                            value={form.domainUrl}
                                            onChange={handleChange}
                                            placeholder="center-a.educen.vn"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="sa-form-group">
                                    <label>Địa Chỉ</label>
                                    <input
                                        name="address"
                                        value={form.address}
                                        onChange={handleChange}
                                        placeholder="Địa chỉ trung tâm"
                                    />
                                </div>
                                {!editTarget && (
                                    <div className="sa-form-note">
                                        <CheckCircle size={14} />
                                        Hệ thống sẽ tự động tạo database riêng cho trung tâm này sau khi lưu.
                                    </div>
                                )}
                                <div className="sa-modal-footer">
                                    <button type="button" className="sa-btn-cancel" onClick={() => !saving && setModalOpen(false)}>
                                        Hủy
                                    </button>
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
            </main>
        </div>
    );
};

export default TenantManagement;
