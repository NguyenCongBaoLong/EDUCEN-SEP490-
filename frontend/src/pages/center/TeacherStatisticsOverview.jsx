import React, { useState, useEffect, Fragment } from 'react';
import { 
    Download, Search, BookOpen, TrendingUp, Loader2, 
    ChevronDown, ChevronRight, UserCheck 
} from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../../components/Sidebar';
import api from '../../services/api';
import '../../css/pages/center/TeacherStatisticsOverview.css';

const TeacherStatisticsOverview = () => {
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [stats, setStats] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [expandedRows, setExpandedRows] = useState(new Set());

    const months = [
        { value: 1, label: 'Tháng 1' }, { value: 2, label: 'Tháng 2' },
        { value: 3, label: 'Tháng 3' }, { value: 4, label: 'Tháng 4' },
        { value: 5, label: 'Tháng 5' }, { value: 6, label: 'Tháng 6' },
        { value: 7, label: 'Tháng 7' }, { value: 8, label: 'Tháng 8' },
        { value: 9, label: 'Tháng 9' }, { value: 10, label: 'Tháng 10' },
        { value: 11, label: 'Tháng 11' }, { value: 12, label: 'Tháng 12' },
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/admin/reports/teacher-statistics?month=${selectedMonth}&year=${selectedYear}`);
            setStats(response.data);
            setExpandedRows(new Set()); // Reset expanded rows on period change
        } catch (error) {
            console.error("Fetch stats error:", error);
            toast.error("Không thể tải thống kê giảng dạy");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [selectedMonth, selectedYear]);

    const handleExport = async () => {
        try {
            setExporting(true);
            const response = await api.get(`/admin/reports/teacher-statistics/export?month=${selectedMonth}&year=${selectedYear}`, {
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `ThongKeDayHocChiTiet_${selectedMonth}_${selectedYear}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            
            toast.success("Đã xuất báo cáo thành công");
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Không thể xuất báo cáo");
        } finally {
            setExporting(false);
        }
    };

    const toggleRow = (staffId, role) => {
        const key = `${role}-${staffId}`;
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(key)) {
            newExpanded.delete(key);
        } else {
            newExpanded.add(key);
        }
        setExpandedRows(newExpanded);
    };

    const getInitials = (name) => {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const filteredStats = stats?.statistics?.filter(s => 
        s.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    return (
        <div className="teacher-stats-container">
            <Sidebar />
            <main className="stats-main">
                {/* Header */}
                <div className="stats-header">
                    <h1>Thống kê giảng dạy</h1>
                    <p className="stats-subtitle">Theo dõi chi tiết số buổi dạy của giáo viên và trợ giảng theo từng lớp học</p>
                </div>

                {/* Controls */}
                <div className="stats-controls">
                    <div className="control-group">
                        <div className="date-inputs">
                            <select 
                                value={selectedMonth} 
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            >
                                {months.map(m => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                            <select 
                                value={selectedYear} 
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            >
                                {years.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        <div className="search-input-wrapper" style={{ position: 'relative' }}>
                            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input 
                                type="text" 
                                placeholder="Tìm theo tên hoặc email..." 
                                style={{ paddingLeft: '40px', minWidth: '300px' }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <button 
                        className="btn-export" 
                        onClick={handleExport}
                        disabled={exporting || loading || filteredStats.length === 0}
                    >
                        {exporting ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                        Xuất báo cáo chi tiết (CSV)
                    </button>
                </div>

                {/* Summary Section */}
                {!loading && stats && (
                    <div className="stats-summary">
                        <div className="summary-card">
                            <div className="summary-icon center-sessions">
                                <TrendingUp size={20} />
                            </div>
                            <div className="summary-info">
                                <span className="summary-label">Tổng số buổi dạy</span>
                                <span className="summary-value small">{stats.totalSessionsInCenter} buổi</span>
                            </div>
                        </div>
                        <div className="summary-card">
                            <div className="summary-icon staff-active">
                                <UserCheck size={20} />
                            </div>
                            <div className="summary-info">
                                <span className="summary-label">Nhân sự giảng dạy</span>
                                <span className="summary-value small">{stats.statistics.filter(s => s.taughtSessions > 0).length} người</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Content Area */}
                <div className="stats-table-wrapper">
                    {loading ? (
                        <div className="loader">
                            <Loader2 className="animate-spin" size={40} style={{ color: '#2563eb' }} />
                        </div>
                    ) : (
                        <>
                            {filteredStats.length > 0 ? (
                                <table className="stats-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '80px', textAlign: 'center' }}>STT</th>
                                            <th style={{ textAlign: 'left' }}>Nhân viên</th>
                                            <th style={{ textAlign: 'left' }}>Email</th>
                                            <th style={{ textAlign: 'left' }}>Vai trò</th>
                                            <th style={{ textAlign: 'center' }}>Số buổi dạy</th>
                                            <th style={{ textAlign: 'center' }}>Lớp phụ trách</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredStats.map((item, index) => {
                                            const rowKey = `${item.role}-${item.teacherId}`;
                                            const isExpanded = expandedRows.has(rowKey);

                                            return (
                                                <Fragment key={rowKey}>
                                                    <tr 
                                                        className={`main-row ${isExpanded ? 'expanded' : ''}`}
                                                        onClick={() => toggleRow(item.teacherId, item.role)}
                                                    >
                                                        <td style={{ textAlign: 'center' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                                <div style={{ width: '14px', display: 'flex', alignItems: 'center' }}>
                                                                    {item.classDetails?.length > 0 && (
                                                                        isExpanded ? <ChevronDown size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#94a3b8" />
                                                                    )}
                                                                </div>
                                                                <span style={{ fontWeight: '600', color: '#64748b', fontSize: '0.85rem', width: '20px' }}>{index + 1}</span>
                                                            </div>
                                                        </td>
                                                        <td style={{ textAlign: 'left' }}>
                                                            <div className="teacher-cell">
                                                                <div className="teacher-avatar">
                                                                    <div className="teacher-avatar-initials">
                                                                        {getInitials(item.fullName)}
                                                                    </div>
                                                                </div>
                                                                <span className="teacher-name">{item.fullName}</span>
                                                            </div>
                                                        </td>
                                                        <td style={{ textAlign: 'left' }}>
                                                            <span className="teacher-email-col">{item.email}</span>
                                                        </td>
                                                        <td style={{ textAlign: 'left' }}>
                                                            <span className={`role-badge ${item.role.toLowerCase()}`}>
                                                                {item.role === 'Teacher' ? 'Giáo Viên' : 'Trợ Giảng'}
                                                            </span>
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <span className="session-total">{item.taughtSessions}</span>
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <span className="class-count">{item.totalClasses} lớp</span>
                                                        </td>
                                                    </tr>
                                                    
                                                    {/* Expanded Row Details */}
                                                    {isExpanded && item.classDetails?.length > 0 && (
                                                        <tr className="expanded-row-content">
                                                            <td colSpan="6">
                                                                <div className="details-wrapper">
                                                                    <span className="details-title">Chi tiết lịch dạy theo lớp</span>
                                                                    <table className="details-table">
                                                                        <thead>
                                                                            <tr>
                                                                                <th style={{ textAlign: 'left', background: '#f8fafc', fontSize: '0.7rem' }}>Tên lớp</th>
                                                                                <th style={{ textAlign: 'left', background: '#f8fafc', fontSize: '0.7rem' }}>Môn học</th>
                                                                                <th style={{ textAlign: 'left', background: '#f8fafc', fontSize: '0.7rem' }}>Khối</th>
                                                                                <th style={{ textAlign: 'left', background: '#f8fafc', fontSize: '0.7rem' }}>Phòng</th>
                                                                                <th style={{ textAlign: 'left', background: '#f8fafc', fontSize: '0.7rem' }}>Ngày dạy</th>
                                                                                <th style={{ textAlign: 'right', background: '#f8fafc', fontSize: '0.7rem' }}>Số buổi</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {item.classDetails.map(cls => (
                                                                                <tr key={cls.classId}>
                                                                                    <td className="class-name">{cls.className}</td>
                                                                                    <td className="class-subject" style={{ color: '#64748b' }}>{cls.subjectName}</td>
                                                                                    <td className="class-grade" style={{ color: '#64748b' }}>{cls.gradeName}</td>
                                                                                    <td className="class-room" style={{ color: '#64748b' }}>{cls.roomName}</td>
                                                                                    <td className="class-dates">
                                                                                        <div className="dates-grid">
                                                                                            {cls.sessionDates?.map((d, i) => (
                                                                                                <span key={i} className="date-chip">
                                                                                                    {new Date(d).toLocaleDateString('vi-VN', { 
                                                                                                        day: '2-digit', 
                                                                                                        month: '2-digit' 
                                                                                                    })}
                                                                                                </span>
                                                                                            ))}
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="class-sessions">{cls.taughtSessions} buổi</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="empty-state">
                                    <div style={{ marginBottom: '1rem', color: '#e2e8f0' }}>
                                        <BookOpen size={48} style={{ margin: '0 auto' }} />
                                    </div>
                                    <p>Không tìm thấy dữ liệu phù hợp</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default TeacherStatisticsOverview;
