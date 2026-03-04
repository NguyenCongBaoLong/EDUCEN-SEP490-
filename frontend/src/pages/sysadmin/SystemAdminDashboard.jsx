import { useState, useEffect } from 'react';
import { Building2, Package, Globe, TrendingUp, CheckCircle, XCircle, Activity } from 'lucide-react';
import SystemAdminSidebar from '../../components/SystemAdminSidebar';
import adminApi from '../../services/adminApi';
import '../../css/pages/sysadmin/SystemAdminDashboard.css';

const SystemAdminDashboard = () => {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        adminApi.get('/Tenants')
            .then(res => setTenants(res.data))
            .catch(() => setTenants([]))
            .finally(() => setLoading(false));
    }, []);

    const totalTenants = tenants.length;
    const activeTenants = tenants.filter(t => t.isActive).length;
    const inactiveTenants = totalTenants - activeTenants;

    const kpis = [
        { label: 'Tổng Trung Tâm', value: loading ? '...' : totalTenants, icon: Building2, color: 'blue', sub: 'Đang quản lý' },
        { label: 'Đang Hoạt Động', value: loading ? '...' : activeTenants, icon: CheckCircle, color: 'green', sub: 'Trung tâm active' },
        { label: 'Tạm Dừng', value: loading ? '...' : inactiveTenants, icon: XCircle, color: 'red', sub: 'Chưa kích hoạt' },
        { label: 'Gói Dịch Vụ', value: '3', icon: Package, color: 'purple', sub: 'Hiện có sẵn' },
    ];

    const formattedDate = currentTime.toLocaleDateString('vi-VN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    return (
        <div className="sa-dashboard">
            <SystemAdminSidebar />
            <main className="sa-dashboard-main">

                {/* Header */}
                <div className="sa-dashboard-header">
                    <div>
                        <h1 className="sa-dashboard-title">Tổng Quan Hệ Thống</h1>
                        <p className="sa-dashboard-date">{formattedDate}</p>
                    </div>
                    <div className="sa-system-badge">
                        <Globe size={16} />
                        EduCen System Admin
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="sa-kpi-grid">
                    {kpis.map((k) => {
                        const Icon = k.icon;
                        return (
                            <div key={k.label} className={`sa-kpi-card sa-kpi-${k.color}`}>
                                <div className="sa-kpi-icon"><Icon size={22} /></div>
                                <div className="sa-kpi-info">
                                    <div className="sa-kpi-value">{k.value}</div>
                                    <div className="sa-kpi-label">{k.label}</div>
                                    <div className="sa-kpi-sub">{k.sub}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Tenant List Overview */}
                <div className="sa-overview-card">
                    <div className="sa-card-header">
                        <h2 className="sa-card-title">
                            <Activity size={18} />
                            Danh Sách Trung Tâm
                        </h2>
                        <span className="sa-card-badge">{totalTenants} trung tâm</span>
                    </div>

                    {loading ? (
                        <div className="sa-loading">Đang tải dữ liệu...</div>
                    ) : tenants.length === 0 ? (
                        <div className="sa-empty">Chưa có trung tâm nào. Hãy tạo trung tâm đầu tiên!</div>
                    ) : (
                        <table className="sa-table">
                            <thead>
                                <tr>
                                    <th>Tên Trung Tâm</th>
                                    <th>Người Liên Hệ</th>
                                    <th>Email</th>
                                    <th>Domain</th>
                                    <th>Trạng Thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tenants.map(t => (
                                    <tr key={t.tenantId}>
                                        <td className="sa-table-name">{t.tenantName}</td>
                                        <td>{t.contactPerson || '—'}</td>
                                        <td>{t.email || '—'}</td>
                                        <td>
                                            <span className="sa-domain-tag">{t.domainUrl}</span>
                                        </td>
                                        <td>
                                            <span className={`sa-status-badge ${t.isActive ? 'active' : 'inactive'}`}>
                                                {t.isActive ? 'Hoạt động' : 'Tạm dừng'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

            </main>
        </div>
    );
};

export default SystemAdminDashboard;
