import { useState, useEffect } from 'react';
import { Building2, Package, Globe, TrendingUp, CheckCircle, XCircle, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import SystemAdminSidebar from '../../components/SystemAdminSidebar';
import adminApi from '../../services/adminApi';
import '../../css/pages/sysadmin/SystemAdminDashboard.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const SystemAdminDashboard = () => {
    const [overview, setOverview] = useState(null);
    const [revenue, setRevenue] = useState(null);
    const [tenantsByPlan, setTenantsByPlan] = useState([]);
    const [topCenters, setTopCenters] = useState([]);
    const [expiringSubs, setExpiringSubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const response = await adminApi.get('/admin/dashboard');
                const { overview, revenue, tenantsByPlan, topCenters, expiringSubscriptions } = response.data;
                
                setOverview(overview);
                setRevenue(revenue);
                setTenantsByPlan(tenantsByPlan || []);
                setTopCenters(topCenters || []);
                setExpiringSubs(expiringSubscriptions || []);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const kpis = [
        { label: 'Tổng Trung Tâm', value: loading ? '...' : overview?.totalTenants || 0, icon: Building2, color: 'blue', sub: 'Đang quản lý' },
        { label: 'Đang Hoạt Động', value: loading ? '...' : overview?.activeTenants || 0, icon: CheckCircle, color: 'green', sub: 'Còn hạn dùng' },
        { label: 'Hết Hạn', value: loading ? '...' : overview?.expiredTenants || 0, icon: XCircle, color: 'red', sub: 'Cần gia hạn ngay' },
        { label: 'Doanh Thu Tháng', value: loading ? '...' : (revenue?.thisMonthRevenue || 0).toLocaleString() + ' đ', icon: TrendingUp, color: 'purple', sub: 'Tháng hiện tại' },
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

                {/* Secondary Metrics Section */}
                <div className="sa-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
                    
                    {/* Top Centers */}
                    <div className="sa-overview-card" style={{ marginTop: 0 }}>
                        <div className="sa-card-header">
                            <h2 className="sa-card-title">
                                <TrendingUp size={18} />
                                Top 5 Trung Tâm
                            </h2>
                        </div>
                        <div className="sa-card-body">
                            {loading ? (
                                <div className="sa-loading">Đang tải...</div>
                            ) : topCenters.length === 0 ? (
                                <div className="sa-empty">Chưa có dữ liệu.</div>
                            ) : (
                                <table className="sa-table mini">
                                    <thead>
                                        <tr>
                                            <th>Trung Tâm</th>
                                            <th>Học Viên</th>
                                            <th>Lớp Học</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topCenters.map((c, i) => (
                                            <tr key={i}>
                                                <td className="sa-table-name">{c.tenantName}</td>
                                                <td>{c.totalStudents}</td>
                                                <td>{c.totalClasses}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* Expiring Soon */}
                    <div className="sa-overview-card" style={{ marginTop: 0 }}>
                        <div className="sa-card-header">
                            <h2 className="sa-card-title" style={{ color: '#ef4444' }}>
                                <Activity size={18} />
                                Sắp Hết Hạn (7 ngày tới)
                            </h2>
                        </div>
                        <div className="sa-card-body">
                            {loading ? (
                                <div className="sa-loading">Đang tải...</div>
                            ) : expiringSubs.length === 0 ? (
                                <div className="sa-empty">Không có trung tâm nào sắp hết hạn.</div>
                            ) : (
                                <div className="sa-alert-list">
                                    {expiringSubs.map((s, i) => (
                                        <div key={i} className="sa-alert-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#fef2f2', borderRadius: '8px', marginBottom: '0.5rem', border: '1px solid #fee2e2' }}>
                                            <div>
                                                <div style={{ fontWeight: 600, color: '#991b1b' }}>{s.tenantName}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>({s.subDomain})</div>
                                                <div style={{ fontSize: '0.8rem', color: '#b91c1c', marginTop: '2px' }}>Gói: {s.planName}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontWeight: 600, color: '#991b1b' }}>{new Date(s.expiredAt).toLocaleDateString('vi-VN')}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#ef4444' }}>Hết hạn</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="sa-overview-card" style={{ marginTop: '1.5rem', minHeight: '400px' }}>
                    <div className="sa-card-header">
                        <h2 className="sa-card-title">
                            <Package size={18} />
                            Cơ Cấu Gói Dịch Vụ
                        </h2>
                    </div>
                    <div className="sa-card-body" style={{ height: '350px', padding: '1rem' }}>
                        {loading ? (
                            <div className="sa-loading">Đang tải biểu đồ...</div>
                        ) : tenantsByPlan.length === 0 ? (
                            <div className="sa-empty">Chưa có dữ liệu gói dịch vụ.</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={tenantsByPlan}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={true}
                                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="totalTenants"
                                        nameKey="planName"
                                    >
                                        {tenantsByPlan.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        formatter={(value) => [`${value} Trung tâm`, 'Số lượng']}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36}/>
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

            </main>
        </div>
    );
};

export default SystemAdminDashboard;
