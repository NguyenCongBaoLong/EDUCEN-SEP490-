import { useState, useEffect } from 'react';
import {
    Filter, Star, Calendar as CalendarIcon, FileCheck, TrendingUp, MoreVertical, Search, Bell
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line
} from 'recharts';
import TeacherSidebar from '../../components/TeacherSidebar';
import api from '../../services/api';
import '../../css/pages/teacher/TeacherPerformanceReport.css';

// Reusable Custom Tooltip for charts
const CustomTooltip = ({ active, payload, label, suffix = '' }) => {
    if (active && payload && payload.length) {
        return (
            <div className="report-chart-tooltip">
                <p className="report-tooltip-label">{label}</p>
                <p className="report-tooltip-value">
                    <span className="tooltip-dot" style={{ backgroundColor: payload[0].color }}></span>
                    {payload[0].value}{suffix}
                </p>
            </div>
        );
    }
    return null;
};

const TeacherPerformanceReport = ({ isTA = false }) => {
    const [classes, setClasses] = useState([]);
    const [filterClass, setFilterClass] = useState('');
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);

    // 1. Định nghĩa hàm fetchReport TRƯỚC khi sử dụng
    const fetchReport = async (classId) => {
        if (!classId) return;
        try {
            setLoading(true);
            const response = await api.get(`/teacher/report/${classId}`);
            setReportData(response.data);
        } catch (error) {
            console.error("Lỗi khi tải báo cáo:", error);
        } finally {
            setLoading(false);
        }
    };

    // 2. Fetch danh sách lớp khi vào trang
    useEffect(() => {
        const fetchClasses = async () => {
            try {
                // Đảm bảo đường dẫn này đúng với cấu hình api của bạn (không trùng lặp /api)
                const response = await api.get('/Classes/teacher/my-classes');

                if (response.data && response.data.length > 0) {
                    setClasses(response.data);
                    // Dùng classId theo đúng JSON bạn gửi
                    const firstClassId = response.data[0].classId;
                    if (firstClassId) {
                        setFilterClass(firstClassId.toString());
                    }
                } else {
                    setLoading(false);
                }
            } catch (error) {
                console.error("Lỗi fetch danh sách lớp:", error);
                setLoading(false);
            }
        };
        fetchClasses();
    }, []);

    // 3. Tự động tải báo cáo khi filterClass thay đổi
    useEffect(() => {
        if (filterClass) {
            fetchReport(filterClass);
        }
    }, [filterClass]);

    // Trạng thái loading
    if (loading && !reportData) {
        return (
            <div className="teacher-report-layout">
                <TeacherSidebar isTA={isTA} />
                <main className="report-main-content">
                    <div className="loading-container">Đang tải dữ liệu báo cáo...</div>
                </main>
            </div>
        );
    }

    // Dữ liệu an toàn để render
    const currentData = {
        metrics: {
            avgGrade: reportData?.metrics?.avgGrade || { value: "0", trend: "N/A", trendClass: "neutral" },
            attendance: reportData?.metrics?.attendance || { value: "0%", trend: "N/A", trendClass: "neutral" },
            assignments: reportData?.metrics?.assignments || { value: "0%", trend: "N/A", trendClass: "neutral" },
            growth: reportData?.metrics?.growth || { value: "0%", trend: "N/A", trendClass: "neutral" }
        },
        gradeData: reportData?.gradeData || [],
        attendanceData: reportData?.attendanceData || [],
        topStudents: reportData?.topStudents || []
    };

    return (
        <div className="teacher-report-layout">
            <TeacherSidebar isTA={isTA} />
            <main className="report-main-content">

                {/* Header */}
                <header className="report-header">
                    <h1 className="report-title">Báo cáo thống kê</h1>
                </header>

                {/* Filters */}
                <div className="report-filters">
                    <div className="filter-group single-filter">
                        <label>CHỌN LỚP CỦA TÔI</label>
                        <select value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                            {classes.map((cls) => (
                                <option key={cls.classId} value={cls.classId}>
                                    {cls.className} ({cls.classCode})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Metric Cards */}
                <div className="report-metrics">
                    <div className="metric-card">
                        <div className="metric-header">
                            <span>Điểm trung bình</span>
                            <div className="metric-icon blue"><Star size={16} /></div>
                        </div>
                        <div className="metric-value">
                            <h2>{currentData.metrics.avgGrade.value}</h2>
                            <span className={`metric-trend ${currentData.metrics.avgGrade.trendClass}`}>{currentData.metrics.avgGrade.trend}</span>
                        </div>
                    </div>

                    <div className="metric-card">
                        <div className="metric-header">
                            <span>Tỷ lệ chuyên cần</span>
                            <div className="metric-icon green"><CalendarIcon size={16} /></div>
                        </div>
                        <div className="metric-value">
                            <h2>{currentData.metrics.attendance.value}</h2>
                            <span className={`metric-trend ${currentData.metrics.attendance.trendClass}`}>{currentData.metrics.attendance.trend}</span>
                        </div>
                    </div>

                    <div className="metric-card">
                        <div className="metric-header">
                            <span>Tỷ lệ nộp bài</span>
                            <div className="metric-icon yellow"><FileCheck size={16} /></div>
                        </div>
                        <div className="metric-value">
                            <h2>{currentData.metrics.assignments.value}</h2>
                            <span className={`metric-trend ${currentData.metrics.assignments.trendClass}`}>{currentData.metrics.assignments.trend}</span>
                        </div>
                    </div>

                    <div className="metric-card">
                        <div className="metric-header">
                            <span>Mức độ tiến bộ</span>
                            <div className="metric-icon purple"><TrendingUp size={16} /></div>
                        </div>
                        <div className="metric-value">
                            <h2>{currentData.metrics.growth.value}</h2>
                            <span className={`metric-trend ${currentData.metrics.growth.trendClass}`}>{currentData.metrics.growth.trend}</span>
                        </div>
                    </div>
                </div>

                {/* Charts Area */}
                <div className="report-charts-grid">
                    {/* Grade Distribution */}
                    <div className="chart-box">
                        <div className="chart-header">
                            <div>
                                <h3>Phân bố điểm số</h3>
                                <p>Dựa trên kỳ kiểm tra giữa kỳ gần nhất</p>
                            </div>
                            <button className="icon-btn"><MoreVertical size={16} /></button>
                        </div>
                        <div className="chart-body">
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={currentData.gradeData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="grade" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 13 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 13 }} />
                                    <Tooltip content={<CustomTooltip suffix=" học sinh" />} cursor={{ fill: '#F3F4F6' }} />
                                    <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Attendance Trends */}
                    <div className="chart-box">
                        <div className="chart-header">
                            <div>
                                <h3>Xu hướng chuyên cần</h3>
                                <p>Tỷ lệ chuyên cần hàng tuần theo thời gian</p>
                            </div>
                            <div className="chart-legend">
                                <span className="legend-item current"><span className="dot"></span> Hiện tại</span>
                                <span className="legend-item goal"><span className="dot"></span> Mục tiêu</span>
                            </div>
                        </div>
                        <div className="chart-body">
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={currentData.attendanceData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 13 }} />
                                    <YAxis axisLine={false} tickLine={false} domain={[80, 100]} tick={{ fill: '#6B7280', fontSize: 13 }} />
                                    <Tooltip content={<CustomTooltip suffix="%" />} />
                                    <Line
                                        type="monotone"
                                        dataKey="rate"
                                        stroke="#3B82F6"
                                        strokeWidth={3}
                                        dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                    {/* Mocking a target line using ReferenceLine could be done or just drawing another line */}
                                    <Line
                                        type="monotone"
                                        dataKey={() => 90}
                                        stroke="#9CA3AF"
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        dot={false}
                                        activeDot={false}
                                        isAnimationActive={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Top Students Table */}
                <div className="report-table-section">
                    <div className="table-header">
                        <div>
                            <h3>Học sinh xuất sắc</h3>
                            <p>Học sinh có điểm trung bình cao nhất kỳ này</p>
                        </div>
                        <button className="view-all-btn">Xem tất cả</button>
                    </div>

                    <table className="report-table">
                        <thead>
                            <tr>
                                <th>XẾP HẠNG</th>
                                <th>HỌC SINH</th>
                                <th>ĐIỂM TRUNG BÌNH</th>
                                <th>CHUYÊN CẦN</th>
                                <th>TRẠNG THÁI</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentData.topStudents.map((student, index) => (
                                <tr key={student.id}>
                                    <td>
                                        <span className={`rank-badge rank-${index + 1}`}>{index + 1}</span>
                                    </td>
                                    <td>
                                        <div className="student-info-cell">
                                            <div className="student-avatar">{student.avatar}</div>
                                            <div>
                                                <div className="student-name">{student.name}</div>
                                                <div className="student-id">{student.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="score-value">{student.score}</span>
                                    </td>
                                    <td className="attendance-cell">
                                        <div className="attendance-info">
                                            <span className="attendance-value">{student.attendance}%</span>
                                            <div className="progress-bar-wrap">
                                                <div
                                                    className="progress-bar-fill"
                                                    style={{ width: `${student.attendance}%`, backgroundColor: '#10B981' }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${student.statusColor}`}>
                                            {student.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </main>
        </div>
    );
};

export default TeacherPerformanceReport;
