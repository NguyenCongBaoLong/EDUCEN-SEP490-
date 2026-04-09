import { useState, useEffect } from 'react';
import {
    MessageSquare, CheckCircle, AlertCircle, Settings2, Trash2, RefreshCw,
    Loader2, X, ShieldCheck, ShieldX, Search, Building2, KeyRound
} from 'lucide-react';
import SystemAdminSidebar from '../../components/SystemAdminSidebar';
import adminApi from '../../services/adminApi';
import zaloOAService from '../../services/zaloOAService';
import '../../css/pages/sysadmin/ZaloOAConfig.css';

const ZaloOAConfig = () => {
    const [tenants, setTenants] = useState([]);
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [toast, setToast] = useState(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState(null);
    const [form, setForm] = useState({ appId: '', oaId: '', secretKey: '' });
    const [saving, setSaving] = useState(false);
    const [verifying, setVerifying] = useState(false);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [tenantsRes, configsRes] = await Promise.all([
                adminApi.get('/admin/Tenants'),
                zaloOAService.getAllConfigs().catch(() => ({ data: { data: [] } })),
            ]);
            setTenants(tenantsRes.data);
            setConfigs(configsRes.data?.data || configsRes.data || []);
        } catch {
            showToast('Không thể tải dữ liệu.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const getConfigForTenant = (tenantId) => {
        return configs.find(c => c.tenantId === tenantId);
    };

    const openSetupModal = (tenant) => {
        setSelectedTenant(tenant);
        const existing = getConfigForTenant(tenant.tenantId);
        setForm({
            appId: existing?.appId || '',
            oaId: existing?.oaId || '',
            secretKey: '',
        });
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.appId.trim() || !form.secretKey.trim()) {
            showToast('Vui lòng nhập App ID và Secret Key.', 'error');
            return;
        }
        setSaving(true);
        try {
            await zaloOAService.setupConfig(selectedTenant.tenantId, form.appId, form.oaId, form.secretKey);
            showToast('Đã lưu cấu hình Zalo OA.');
            setModalOpen(false);
            fetchData();
        } catch (err) {
            showToast(err.response?.data?.message || 'Lưu cấu hình thất bại.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleVerify = async (tenantId) => {
        setVerifying(tenantId);
        try {
            const res = await zaloOAService.verifyConnection(tenantId);
            if (res.data?.data === true) {
                showToast('Kết nối Zalo OA thành công!');
            } else {
                showToast('Kết nối thất bại. Kiểm tra lại OA ID và Secret Key.', 'error');
            }
            fetchData();
        } catch (err) {
            showToast(err.response?.data?.message || 'Kiểm tra kết nối thất bại.', 'error');
        } finally {
            setVerifying(false);
        }
    };

    const handleAuthorize = (tenantId, appId) => {
        if (!appId) {
            showToast('Vui lòng thiết lập App ID trước khi cấp quyền.', 'error');
            return;
        }
        const callbackUrl = `${window.location.origin}/sysadmin/zalo-oa`;
        const authUrl = `https://oauth.zaloapp.com/v4/oa/permission?app_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${tenantId}`;
        window.location.href = authUrl;
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        if (code && state) {
            // Xóa URL params NGAY để tránh code bị dùng lại khi React re-mount
            window.history.replaceState({}, '', '/sysadmin/zalo-oa');
            (async () => {
                try {
                    const data = await zaloOAService.handleCallback(state, code, state);
                    if (data.success) {
                        showToast('Cấp quyền Zalo OA thành công!');
                    } else {
                        showToast(data.message || 'Cấp quyền thất bại.', 'error');
                    }
                    fetchData();
                } catch (err) {
                    showToast(err.response?.data?.message || 'Cấp quyền Zalo OA thất bại.', 'error');
                }
            })();
        }
    }, []);

    const handleDelete = async (tenantId) => {
        if (!window.confirm('Bạn có chắc muốn xóa cấu hình Zalo OA của trung tâm này?')) return;
        try {
            await zaloOAService.deleteConfig(tenantId);
            showToast('Đã xóa cấu hình Zalo OA.');
            fetchData();
        } catch {
            showToast('Xóa cấu hình thất bại.', 'error');
        }
    };

    const filteredTenants = tenants.filter(t =>
        (t.tenantName || '').toLowerCase().includes(search.toLowerCase()) ||
        (t.subDomain || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="zalo-oa-page">
            <SystemAdminSidebar />
            <main className="zalo-oa-main">
                <div className="zalo-oa-header">
                    <div>
                        <h1 className="zalo-oa-title">
                            <MessageSquare size={24} />
                            Cấu Hình Zalo OA
                        </h1>
                        <p className="zalo-oa-subtitle">Quản lý Official Account Zalo cho từng trung tâm</p>
                    </div>
                </div>

                <div className="zalo-oa-toolbar">
                    <div className="zalo-oa-search">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm trung tâm..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button className="zalo-oa-refresh-btn" onClick={fetchData}>
                        <RefreshCw size={15} />
                        Làm mới
                    </button>
                </div>

                {loading ? (
                    <div className="zalo-oa-loading"><Loader2 className="spin" size={32} /> Đang tải...</div>
                ) : (
                    <div className="zalo-oa-table-wrapper">
                        <table className="zalo-oa-table">
                            <thead>
                                <tr>
                                    <th>Trung Tâm</th>
                                    <th>Subdomain</th>
                                    <th>App ID</th>
                                    <th>OA ID</th>
                                    <th>Trạng Thái</th>
                                    <th>Ngày Cập Nhật</th>
                                    <th>Thao Tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTenants.map(tenant => {
                                    const config = getConfigForTenant(tenant.tenantId);
                                    return (
                                        <tr key={tenant.tenantId}>
                                            <td>
                                                <div className="zalo-oa-tenant-cell">
                                                    <Building2 size={16} />
                                                    <span>{tenant.tenantName}</span>
                                                </div>
                                            </td>
                                            <td className="zalo-oa-subdomain">{tenant.subDomain}</td>
                                            <td>{config?.appId || <span className="zalo-oa-na">—</span>}</td>
                                            <td>{config?.oaId || <span className="zalo-oa-na">—</span>}</td>
                                            <td>
                                                {config ? (
                                                    config.isActive ? (
                                                        <span className="zalo-oa-badge active">
                                                            <ShieldCheck size={13} /> Hoạt động
                                                        </span>
                                                    ) : (
                                                        <span className="zalo-oa-badge inactive">
                                                            <ShieldX size={13} /> Chưa kích hoạt
                                                        </span>
                                                    )
                                                ) : (
                                                    <span className="zalo-oa-badge none">—</span>
                                                )}
                                            </td>
                                            <td className="zalo-oa-date">
                                                {config ? new Date(config.updatedAt).toLocaleDateString('vi-VN') : '—'}
                                            </td>
                                            <td>
                                                <div className="zalo-oa-actions">
                                                    <button
                                                        className="zalo-oa-action-btn setup"
                                                        onClick={() => openSetupModal(tenant)}
                                                        title={config ? 'Cập nhật cấu hình' : 'Thiết lập OA'}
                                                    >
                                                        <Settings2 size={15} />
                                                    </button>
                                                    {config && (
                                                        <>
                                                            <button
                                                                className="zalo-oa-action-btn verify"
                                                                onClick={() => handleVerify(tenant.tenantId)}
                                                                disabled={verifying === tenant.tenantId}
                                                                title="Kiểm tra kết nối"
                                                            >
                                                                {verifying === tenant.tenantId ? <Loader2 className="spin" size={15} /> : <RefreshCw size={15} />}
                                                            </button>
                                                            <button
                                                                className="zalo-oa-action-btn authorize"
                                                                onClick={() => handleAuthorize(tenant.tenantId, config?.appId)}
                                                                title="Cấp quyền Zalo OA"
                                                            >
                                                                <KeyRound size={15} />
                                                            </button>
                                                            <button
                                                                className="zalo-oa-action-btn delete"
                                                                onClick={() => handleDelete(tenant.tenantId)}
                                                                title="Xóa cấu hình"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredTenants.length === 0 && (
                                    <tr><td colSpan={7} className="zalo-oa-empty">Không tìm thấy trung tâm.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Setup Modal */}
                {modalOpen && (
                    <div className="zalo-oa-modal-overlay" onClick={() => setModalOpen(false)}>
                        <div className="zalo-oa-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="zalo-oa-modal-header">
                                <h3>Thiết Lập Zalo OA — {selectedTenant?.tenantName}</h3>
                                <button onClick={() => setModalOpen(false)}><X size={20} /></button>
                            </div>
                            <div className="zalo-oa-modal-body">
                                <div className="zalo-oa-field">
                                    <label>App ID *</label>
                                    <input
                                        type="text"
                                        placeholder="Nhập App ID (từ Zalo Developer Portal)..."
                                        value={form.appId}
                                        onChange={(e) => setForm({ ...form, appId: e.target.value })}
                                    />
                                </div>
                                <div className="zalo-oa-field">
                                    <label>OA ID</label>
                                    <input
                                        type="text"
                                        placeholder="Nhập OA ID (nếu khác App ID)..."
                                        value={form.oaId}
                                        onChange={(e) => setForm({ ...form, oaId: e.target.value })}
                                    />
                                    <small>Để trống nếu OA ID trùng với App ID.</small>
                                </div>
                                <div className="zalo-oa-field">
                                    <label>Secret Key *</label>
                                    <input
                                        type="password"
                                        placeholder="Nhập Secret Key..."
                                        value={form.secretKey}
                                        onChange={(e) => setForm({ ...form, secretKey: e.target.value })}
                                    />
                                    <small>Secret Key sẽ được mã hóa khi lưu vào hệ thống.</small>
                                </div>
                            </div>
                            <div className="zalo-oa-modal-footer">
                                <button className="zalo-oa-cancel-btn" onClick={() => setModalOpen(false)}>Hủy</button>
                                <button className="zalo-oa-save-btn" onClick={handleSave} disabled={saving}>
                                    {saving ? <><Loader2 className="spin" size={15} /> Đang lưu...</> : 'Lưu Cấu Hình'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Toast */}
                {toast && (
                    <div className={`zalo-oa-toast ${toast.type}`}>
                        {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                        {toast.message}
                    </div>
                )}
            </main>
        </div>
    );
};

export default ZaloOAConfig;
