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
    PieChart
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import api from '../../services/api';
import '../../css/pages/center/RevenueReport.css';

const RevenueReport = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'monthly' | 'by-class' | 'outstanding'
    const [loading, setLoading] = useState(false);
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    
    // Data states
    const [summary, setSummary] = useState(null);
    const [monthlyData, setMonthlyData] = useState([]);
    const [classData, setClassData] = useState([]);
    const [outstandingData, setOutstandingData] = useState([]);

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
        <div className="revenue-report-container">
            <Sidebar />
            <div className="report-content">
                <div className="page-header">
                    <h1>Báo cáo doanh thu</h1>
                    <button className="export-btn" onClick={handleExport}>
                        <Download size={18} />
                        Xuất báo cáo
                    </button>
                </div>

                <div className="tab-navigation">
                    <button 
                        className={activeTab === 'summary' ? 'active' : ''}
                        onClick={() => setActiveTab('summary')}
                    >
                        <PieChart size={18} />
                        Tổng quan
                    </button>
                    <button 
                        className={activeTab === 'monthly' ? 'active' : ''}
                        onClick={() => setActiveTab('monthly')}
                    >
                        <BarChart3 size={18} />
                        Theo tháng
                    </button>
                    <button 
                        className={activeTab === 'by-class' ? 'active' : ''}
                        onClick={() => setActiveTab('by-class')}
                    >
                        <Users size={18} />
                        Theo lớp
                    </button>
                    <button 
                        className={activeTab === 'outstanding' ? 'active' : ''}
                        onClick={() => setActiveTab('outstanding')}
                    >
                        <FileText size={18} />
                        Công nợ
                    </button>
                </div>

                <div className="filter-bar">
                    <div className="filter-group">
                        <Calendar size={16} />
                        <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    {activeTab === 'by-class' && (
                        <div className="filter-group">
                            <Filter size={16} />
                            <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
                                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="loading">Đang tải...</div>
                ) : (
                    <>
                        {activeTab === 'summary' && summary && (
                            <div className="summary-section">
                                <div className="stats-grid">
                                    <div className="stat-card primary">
                                        <div className="stat-icon">
                                            <DollarSign size={24} />
                                        </div>
                                        <div className="stat-info">
                                            <span className="stat-label">Tổng doanh thu</span>
                                            <span className="stat-value">{formatCurrency(summary.totalRevenue)}</span>
                                        </div>
                                    </div>
                                    <div className="stat-card success">
                                        <div className="stat-icon">
                                            <TrendingUp size={24} />
                                        </div>
                                        <div className="stat-info">
                                            <span className="stat-label">Đã thu</span>
                                            <span className="stat-value">{formatCurrency(summary.totalPaid)}</span>
                                        </div>
                                    </div>
                                    <div className="stat-card warning">
                                        <div className="stat-icon">
                                            <TrendingDown size={24} />
                                        </div>
                                        <div className="stat-info">
                                            <span className="stat-label">Chưa thu</span>
                                            <span className="stat-value">{formatCurrency(summary.totalOutstanding)}</span>
                                        </div>
                                    </div>
                                    <div className="stat-card info">
                                        <div className="stat-icon">
                                            <FileText size={24} />
                                        </div>
                                        <div className="stat-info">
                                            <span className="stat-label">Tổng hóa đơn</span>
                                            <span className="stat-value">{formatNumber(summary.totalInvoices)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="invoice-status-breakdown">
                                    <h3>Trạng thái hóa đơn</h3>
                                    <div className="status-items">
                                        <div className="status-item">
                                            <span className="status-dot paid"></span>
                                            <span className="status-label">Đã thanh toán</span>
                                            <span className="status-value">{summary.paidInvoices}</span>
                                        </div>
                                        <div className="status-item">
                                            <span className="status-dot unpaid"></span>
                                            <span className="status-label">Chưa thanh toán</span>
                                            <span className="status-value">{summary.unpaidInvoices}</span>
                                        </div>
                                        <div className="status-item">
                                            <span className="status-dot overdue"></span>
                                            <span className="status-label">Quá hạn</span>
                                            <span className="status-value">{summary.overdueInvoices}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'monthly' && (
                            <div className="monthly-section">
                                <div className="monthly-table">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Tháng</th>
                                                <th>Doanh thu</th>
                                                <th>Số hóa đơn</th>
                                                <th>Tỷ lệ tăng trưởng</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {monthlyData.map((data, index) => {
                                                const prevMonth = index > 0 ? monthlyData[index - 1].totalRevenue : 0;
                                                const growth = prevMonth > 0 ? ((data.totalRevenue - prevMonth) / prevMonth * 100) : 0;
                                                
                                                return (
                                                    <tr key={data.month}>
                                                        <td>Tháng {data.month}</td>
                                                        <td className="amount">{formatCurrency(data.totalRevenue)}</td>
                                                        <td>{data.invoiceCount}</td>
                                                        <td className={growth >= 0 ? 'positive' : 'negative'}>
                                                            {growth > 0 ? '+' : ''}{growth.toFixed(1)}%
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'by-class' && (
                            <div className="by-class-section">
                                <div className="class-table">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Lớp</th>
                                                <th>Số học sinh</th>
                                                <th>Số buổi học</th>
                                                <th>Tổng doanh thu</th>
                                                <th>Đã thu</th>
                                                <th>Chưa thu</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {classData.map((data) => (
                                                <tr key={data.classId}>
                                                    <td>{data.className}</td>
                                                    <td>{data.studentCount}</td>
                                                    <td>{data.totalSessions}</td>
                                                    <td className="amount">{formatCurrency(data.totalRevenue)}</td>
                                                    <td className="paid">{formatCurrency(data.paidAmount)}</td>
                                                    <td className="outstanding">{formatCurrency(data.outstandingAmount)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'outstanding' && (
                            <div className="outstanding-section">
                                <div className="outstanding-summary">
                                    <h3>Tổng công nợ: {formatCurrency(outstandingData.reduce((sum, item) => sum + item.amount, 0))}</h3>
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
                                                <th>Quá hạn</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {outstandingData.map((item) => (
                                                <tr key={item.invoiceId}>
                                                    <td>{item.studentName}</td>
                                                    <td>{item.className}</td>
                                                    <td>{item.invoiceMonth}/{item.invoiceYear}</td>
                                                    <td className="amount">{formatCurrency(item.amount)}</td>
                                                    <td>{new Date(item.dueDate).toLocaleDateString('vi-VN')}</td>
                                                    <td className={item.daysOverdue > 0 ? 'overdue' : ''}>
                                                        {item.daysOverdue > 0 ? `${item.daysOverdue} ngày` : 'Chưa quá hạn'}
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
