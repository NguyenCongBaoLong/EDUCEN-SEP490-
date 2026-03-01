import { useState } from 'react';
import {
    Filter, Star, Calendar as CalendarIcon, FileCheck, TrendingUp, MoreVertical, Search, Bell
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line
} from 'recharts';
import TeacherSidebar from '../../components/TeacherSidebar';
import '../../css/pages/teacher/TeacherPerformanceReport.css';

/* ─── Mock Data ─────────────────────────────────────── */
const MOCK_DATA = {
    'math-10a': {
        metrics: {
            avgGrade: { value: '84.2%', trend: '+2.4% ↗', trendClass: 'positive' },
            attendance: { value: '96.8%', trend: 'Không đổi -', trendClass: 'neutral' },
            assignments: { value: '92%', trend: '-1.2% ↘', trendClass: 'negative' },
            growth: { value: '12.5%', trend: '+5.1% ↗', trendClass: 'positive' }
        },
        gradeData: [
            { grade: 'F', count: 2 },
            { grade: 'D', count: 5 },
            { grade: 'C', count: 12 },
            { grade: 'B', count: 18 },
            { grade: 'A', count: 8 },
        ],
        attendanceData: [
            { week: 'Tuần 1', rate: 92 },
            { week: 'Tuần 2', rate: 88 },
            { week: 'Tuần 3', rate: 95 },
            { week: 'Tuần 4', rate: 85 },
            { week: 'Tuần 5', rate: 96 },
        ],
        topStudents: [
            { id: '#STU-1024', name: 'Benjamin Wright', score: 98.5, attendance: 100, status: 'Xuất sắc', statusColor: 'green', avatar: 'BW' },
            { id: '#STU-1088', name: 'Sarah Jenkins', score: 96.2, attendance: 98, status: 'Giỏi', statusColor: 'green', avatar: 'SJ' }
        ]
    },
    'math-10b': {
        metrics: {
            avgGrade: { value: '76.5%', trend: '+1.2% ↗', trendClass: 'positive' },
            attendance: { value: '91.2%', trend: '-0.5% ↘', trendClass: 'negative' },
            assignments: { value: '88%', trend: '+3.4% ↗', trendClass: 'positive' },
            growth: { value: '8.2%', trend: '+2.1% ↗', trendClass: 'positive' }
        },
        gradeData: [
            { grade: 'F', count: 4 },
            { grade: 'D', count: 8 },
            { grade: 'C', count: 20 },
            { grade: 'B', count: 10 },
            { grade: 'A', count: 3 },
        ],
        attendanceData: [
            { week: 'Tuần 1', rate: 95 },
            { week: 'Tuần 2', rate: 92 },
            { week: 'Tuần 3', rate: 90 },
            { week: 'Tuần 4', rate: 88 },
            { week: 'Tuần 5', rate: 91 },
        ],
        topStudents: [
            { id: '#STU-1099', name: 'Emily Clark', score: 92.0, attendance: 100, status: 'Giỏi', statusColor: 'green', avatar: 'EC' },
            { id: '#STU-1102', name: 'Michael Scott', score: 89.5, attendance: 95, status: 'Khá', statusColor: 'blue', avatar: 'MS' },
            { id: '#STU-1105', name: 'Pam Beesly', score: 88.0, attendance: 96, status: 'Khá', statusColor: 'blue', avatar: 'PB' }
        ]
    },
    'math-12c': {
        metrics: {
            avgGrade: { value: '89.1%', trend: '+4.5% ↗', trendClass: 'positive' },
            attendance: { value: '99.5%', trend: '+0.5% ↗', trendClass: 'positive' },
            assignments: { value: '98%', trend: 'Không đổi -', trendClass: 'neutral' },
            growth: { value: '15.0%', trend: '+6.2% ↗', trendClass: 'positive' }
        },
        gradeData: [
            { grade: 'F', count: 0 },
            { grade: 'D', count: 2 },
            { grade: 'C', count: 8 },
            { grade: 'B', count: 20 },
            { grade: 'A', count: 18 },
        ],
        attendanceData: [
            { week: 'Tuần 1', rate: 98 },
            { week: 'Tuần 2', rate: 99 },
            { week: 'Tuần 3', rate: 100 },
            { week: 'Tuần 4', rate: 100 },
            { week: 'Tuần 5', rate: 99 },
        ],
        topStudents: [
            { id: '#STU-2001', name: 'Jim Halpert', score: 99.5, attendance: 100, status: 'Xuất sắc', statusColor: 'green', avatar: 'JH' },
            { id: '#STU-2005', name: 'Dwight Schrute', score: 99.0, attendance: 100, status: 'Xuất sắc', statusColor: 'green', avatar: 'DS' },
            { id: '#STU-2010', name: 'Angela Martin', score: 98.2, attendance: 100, status: 'Xuất sắc', statusColor: 'green', avatar: 'AM' }
        ]
    }
};

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
    const [filterClass, setFilterClass] = useState('math-10a');

    // Lấy dữ liệu tương ứng với lớp đang chọn (hoặc mặc định nếu lớp không tồn tại)
    const currentData = MOCK_DATA[filterClass] || MOCK_DATA['math-10a'];

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
                            <option value="math-10a">Đại Số Nâng Cao (Lớp 10A)</option>
                            <option value="math-10b">Giải Tích Cơ Bản (Lớp 11B)</option>
                            <option value="math-12c">Toán Nâng Cao (Lớp 12C)</option>
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
                                <th>TỔNG ĐIỂM</th>
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
                                        <div className="score-cell">
                                            <span className="score-value">{student.score}%</span>
                                            <div className="progress-bar-wrap">
                                                <div
                                                    className="progress-bar-fill"
                                                    style={{ width: `${student.score}%`, backgroundColor: '#10B981' }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="attendance-cell">{student.attendance}%</td>
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
