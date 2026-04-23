import { useState, useEffect } from 'react';
import { 
    BarChart3, 
    TrendingUp, 
    TrendingDown, 
    DollarSign, 
    Users, 
    FileText,
    Download,
    Calendar,
    Filter,
    PieChart as LucidePieChart
} from 'lucide-react';
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    BarChart, 
    Bar, 
    PieChart, 
    Pie, 
    Cell, 
    Legend 
} from 'recharts';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import api from '../../services/api';
import '../../css/pages/center/RevenueReport.css';

const RevenueReport = ({ hideSidebar = false }) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'monthly' | 'by-class' | 'outstanding'
    const [loading, setLoading] = useState(false);
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    
    // Data states
    const [summary, setSummary] = useState(null);
    const [monthlyData, setMonthlyData] = useState([]);
    const [outstandingData, setOutstandingData] = useState([]);
    const [debtSearch, setDebtSearch] = useState('');

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
    const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }));

    // Lấy tenantId - chấp nhận cả default-tenant
    const getValidTenantId = () => {
        const stored = localStorage.getItem('tenantId');
        if (stored) return stored;
        if (user?.tenantId) return user.tenantId;
        return 'default-tenant';
    };

    const fetchSummary = async () => {
        setLoading(true);
        try {
            const tenantId = getValidTenantId();
            const fromDate = new Date(year, 0, 1).toISOString();
            const toDate = new Date(year, 11, 31).toISOString();
            
            const response = await api.get(`/revenue-reports/summary?tenantId=${tenantId}&fromDate=${fromDate}&toDate=${toDate}`);
            setSummary(response.data);
        } catch (error) {
            toast.error('Lỗi tải báo cáo tổng quan');
        } finally {
            setLoading(false);
        }
    };

    const fetchMonthlyData = async () => {
        setLoading(true);
        try {
            const tenantId = getValidTenantId();
            const response = await api.get(`/revenue-reports/by-month?tenantId=${tenantId}&year=${year}`);
            setMonthlyData(response.data);
        } catch (error) {
            toast.error('Lỗi tải báo cáo theo tháng');
        } finally {
            setLoading(false);
        }
    };

    const fetchClassData = async () => {
        setLoading(true);
        try {
            const tenantId = getValidTenantId();
            const response = await api.get(`/revenue-reports/by-class?tenantId=${tenantId}&month=${month}&year=${year}`);
            setClassData(response.data);
        } catch (error) {
            toast.error('Lỗi tải báo cáo theo lớp');
        } finally {
            setLoading(false);
        }
    };

    const fetchOutstanding = async () => {
        setLoading(true);
        try {
            const tenantId = getValidTenantId();
            const response = await api.get(`/revenue-reports/outstanding?tenantId=${tenantId}`);
            setOutstandingData(response.data);
        } catch (error) {
            toast.error('Lỗi tải báo cáo công nợ');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const tenantId = getValidTenantId();
            const fromDate = new Date(year, 0, 1).toISOString();
            const toDate = new Date(year, 11, 31).toISOString();
            
            const response = await api.post('/revenue-reports/export', {
                tenantId,
                fromDate,
                toDate,
                reportType: activeTab === 'summary' ? 'Summary' : 'Outstanding'
            }, { responseType: 'blob' });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `revenue_report_${year}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            
            toast.success('Xuất báo cáo thành công');
        } catch (error) {
            toast.error('Lỗi xuất báo cáo');
        }
    };

    useEffect(() => {
        switch (activeTab) {
            case 'summary':
                fetchSummary();
                fetchMonthlyData(); // Fetch for the trend chart
                break;
            case 'monthly':
                fetchMonthlyData();
                break;
            case 'by-class':
                fetchClassData();
                break;
            case 'outstanding':
                fetchOutstanding();
                break;
        }
    }, [activeTab, year, month]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    };

    const formatNumber = (num) => {
        return new Intl.NumberFormat('vi-VN').format(num);
    };

    return (
        <div className={hideSidebar ? "revenue-report-embedded" : "revenue-report-container"}>
            {!hideSidebar && <Sidebar />}
            <div className="report-content">
                <div className="report-header-section">
                    {!hideSidebar && (
                        <div className="page-title-row">
                            <h1>Báo cáo doanh thu</h1>
                        </div>
                    )}
                    
                    <div className="report-controls-row">
                        <div className="header-filters-prominent">
                            <div className="filter-group-modern">
                                <Calendar size={14} />
                                <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="header-actions">
                            <div className="tab-navigation-compact">
                                <button 
                                    className={activeTab === 'summary' ? 'active' : ''}
                                    onClick={() => setActiveTab('summary')}
                                >
                                    <LucidePieChart size={14} />
                                    Tổng quan
                                </button>
                                <button 
                                    className={activeTab === 'outstanding' ? 'active' : ''}
                                    onClick={() => setActiveTab('outstanding')}
                                >
                                    <FileText size={14} />
                                    Công nợ
                                </button>
                            </div>
                            <button className="export-btn-compact" onClick={handleExport}>
                                <Download size={14} />
                                Xuất báo cáo
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="loading">Đang tải...</div>
                ) : (
                    <>
                        {activeTab === 'summary' && summary && (
                            <div className="summary-dashboard">
                                <div className="stats-grid">
                                    <div className="stat-card primary">
                                        <div className="stat-icon-box">
                                            <DollarSign size={22} />
                                        </div>
                                        <div className="stat-info">
                                            <span className="stat-label">Tổng doanh thu</span>
                                            <span className="stat-value">{formatCurrency(summary.totalRevenue)}</span>
                                        </div>
                                    </div>
                                    <div className="stat-card success">
                                        <div className="stat-icon-box">
                                            <TrendingUp size={22} />
                                        </div>
                                        <div className="stat-info">
                                            <span className="stat-label">Đã thu</span>
                                            <span className="stat-value">{formatCurrency(summary.totalPaid)}</span>
                                        </div>
                                    </div>
                                    <div className="stat-card warning">
                                        <div className="stat-icon-box">
                                            <TrendingDown size={22} />
                                        </div>
                                        <div className="stat-info">
                                            <span className="stat-label">Chưa thu</span>
                                            <span className="stat-value">{formatCurrency(summary.totalOutstanding)}</span>
                                        </div>
                                    </div>
                                    <div className="stat-card info">
                                        <div className="stat-icon-box">
                                            <FileText size={22} />
                                        </div>
                                        <div className="stat-info">
                                            <span className="stat-label">Tổng hóa đơn</span>
                                            <span className="stat-value">{formatNumber(summary.totalInvoices)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="dashboard-charts-row">
                                    <div className="chart-container main-trend">
                                        <div className="chart-header-compact">
                                            <h3>Xu hướng doanh thu {year}</h3>
                                        </div>
                                        <div className="chart-body-compact">
                                            <ResponsiveContainer width="100%" height={220}>
                                                <AreaChart data={monthlyData}>
                                                    <defs>
                                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis 
                                                        dataKey="month" 
                                                        tickFormatter={(val) => `T${val}`} 
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: '#64748b', fontSize: 11 }}
                                                    />
                                                    <YAxis 
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: '#64748b', fontSize: 11 }}
                                                        tickFormatter={(val) => val >= 1000000 ? `${(val/1000000).toFixed(0)}M` : val}
                                                    />
                                                    <Tooltip 
                                                        formatter={(value) => formatCurrency(value)}
                                                        labelFormatter={(label) => `Tháng ${label}`}
                                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }}
                                                    />
                                                    <Area 
                                                        type="monotone" 
                                                        dataKey="totalRevenue" 
                                                        stroke="#3b82f6" 
                                                        strokeWidth={2}
                                                        fillOpacity={1} 
                                                        fill="url(#colorRevenue)" 
                                                        animationDuration={1000}
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="chart-container status-pie">
                                        <div className="chart-header-compact">
                                            <h3>Trạng thái hóa đơn</h3>
                                        </div>
                                        <div className="chart-body-compact">
                                            <ResponsiveContainer width="100%" height={220}>
                                                <PieChart>
                                                    <Pie
                                                        data={[
                                                            { name: 'Đã thanh toán', value: summary.paidInvoices },
                                                            { name: 'Chưa thanh toán', value: summary.unpaidInvoices },
                                                            { name: 'Quá hạn', value: summary.overdueInvoices }
                                                        ]}
                                                        innerRadius={45}
                                                        outerRadius={65}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                        animationDuration={1000}
                                                    >
                                                        <Cell fill="#10b981" />
                                                        <Cell fill="#3b82f6" />
                                                        <Cell fill="#ef4444" />
                                                    </Pie>
                                                    <Tooltip 
                                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }}
                                                    />
                                                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} verticalAlign="bottom" align="center" />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'outstanding' && (
                            <div className="outstanding-section">
                                <div className="debt-dashboard-row">
                                    <div className="chart-container debt-chart">
                                        <div className="chart-header-compact">
                                            <h3>Phân bổ nợ năm {year}</h3>
                                        </div>
                                        <div className="chart-body-compact">
                                            <ResponsiveContainer width="100%" height={200}>
                                                <BarChart 
                                                    data={Object.values(outstandingData
                                                        .filter(item => item.invoiceYear === year)
                                                        .reduce((acc, item) => {
                                                            if (!acc[item.className]) acc[item.className] = { className: item.className, amount: 0 };
                                                            acc[item.className].amount += item.amount;
                                                            return acc;
                                                        }, {}))}
                                                    layout="vertical"
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                                    <XAxis type="number" hide />
                                                    <YAxis dataKey="className" type="category" width={100} tick={{ fontSize: 11 }} />
                                                    <Tooltip 
                                                        formatter={(value) => formatCurrency(value)}
                                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '11px' }}
                                                    />
                                                    <Bar dataKey="amount" fill="#ef4444" radius={[0, 4, 4, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                    <div className="debt-stats">
                                        <div className="debt-stat-box">
                                            <span className="label">Tổng nợ chưa thu ({year})</span>
                                            <span className="value overdue">
                                                {formatCurrency(outstandingData
                                                    .filter(item => item.invoiceYear === year)
                                                    .reduce((sum, item) => sum + item.amount, 0))}
                                            </span>
                                        </div>
                                        <div className="debt-stat-box">
                                            <span className="label">Số học sinh còn nợ</span>
                                            <span className="value">
                                                {new Set(outstandingData
                                                    .filter(item => item.invoiceYear === year)
                                                    .map(d => d.studentName)).size}
                                            </span>
                                        </div>
                                        <div className="search-filter-debt">
                                            <input 
                                                type="text" 
                                                placeholder="Tìm tên học sinh, lớp..." 
                                                value={debtSearch}
                                                onChange={(e) => setDebtSearch(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="outstanding-table">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Học sinh</th>
                                                <th>Lớp</th>
                                                <th>Tháng/Năm</th>
                                                <th>Số tiền</th>
                                                <th>Hạn thanh toán</th>
                                                <th>Trạng thái</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {outstandingData
                                                .filter(item => item.invoiceYear === year)
                                                .filter(item => 
                                                    item.studentName.toLowerCase().includes(debtSearch.toLowerCase()) ||
                                                    item.className.toLowerCase().includes(debtSearch.toLowerCase())
                                                )
                                                .map((item) => (
                                                <tr key={item.invoiceId}>
                                                    <td>{item.studentName}</td>
                                                    <td>{item.className}</td>
                                                    <td>{item.invoiceMonth}/{item.invoiceYear}</td>
                                                    <td className="amount">{formatCurrency(item.amount)}</td>
                                                    <td>{new Date(item.dueDate).toLocaleDateString('vi-VN')}</td>
                                                    <td>
                                                        <span className={`status-pill ${item.daysOverdue > 0 ? 'pill-error' : 'pill-warning'}`}>
                                                            {item.daysOverdue > 0 ? `Quá hạn ${item.daysOverdue} ngày` : 'Sắp đến hạn'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default RevenueReport;