import { useState, useEffect } from 'react';
import { Search, GraduationCap, BookOpen, Clock, Users, Loader2, Award, MessageSquare, Star, BarChart2, Calendar, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StudentSidebar from '../../components/StudentSidebar';
import api from '../../services/api';
import toast from 'react-hot-toast';
import '../../css/pages/student/StudentClasses.css';

const SUBJECT_COLORS = {
    'Toán học': '#3b82f6',
    'Tiếng Anh': '#10b981',
    'Vật lý': '#f59e0b',
    'Hóa học': '#8b5cf6',
    'Sinh học': '#ec4899',
};

const PerformanceReportModal = ({ onClose }) => {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        api.get('/Students/performance-report')
            .then(res => setReport(res.data))
            .catch(() => toast.error('Không thể tải báo cáo học tập'))
            .finally(() => setLoading(false));
    }, []);

    const getRankColor = (rank) => {
        switch (rank) {
            case 'Xuất sắc': return { bg: '#dcfce7', text: '#15803d' };
            case 'Giỏi': return { bg: '#f0fdf4', text: '#16a34a' };
            case 'Khá': return { bg: '#fefce8', text: '#a16207' };
            case 'Trung bình': return { bg: '#fff7ed', text: '#c2410c' };
            case 'Yếu': return { bg: '#fef2f2', text: '#dc2626' };
            default: return { bg: '#f1f5f9', text: '#64748b' };
        }
    };

    return (
        <div className="pc-modal-overlay" onClick={onClose}>
            <div className="pc-modal pc-report-modal" onClick={e => e.stopPropagation()}>
                <div className="pc-modal-header" style={{ borderTopColor: '#6366f1' }}>
                    <div>
                        <div className="pc-modal-subject" style={{ color: '#6366f1' }}>Học sinh: {report?.studentName}</div>
                        <h2>Báo cáo học tập tổng kết</h2>
                        <p>Dữ liệu tổng hợp từ tất cả các lớp đang theo học</p>
                    </div>
                    <button className="pc-modal-close" onClick={onClose}>✕</button>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem', gap: '1rem' }}>
                        <Loader2 className="animate-spin" size={40} color="#6366f1" />
                        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Đang tổng hợp dữ liệu...</p>
                    </div>
                ) : (
                    <>
                        <div className="pc-report-summary">
                            <div className="pc-report-metric">
                                <span className="pc-report-metric-val">{report?.overallGPA || 0}</span>
                                <span className="pc-report-metric-label">GPA Tổng</span>
                            </div>
                            <div className="pc-report-metric">
                                <span className="pc-report-metric-val" style={{ color: (report?.overallAttendanceRate || 0) >= 80 ? '#16a34a' : '#dc2626' }}>
                                    {report?.overallAttendanceRate || 0}%
                                </span>
                                <span className="pc-report-metric-label">Tỷ lệ chuyên cần</span>
                            </div>
                            <div className="pc-report-metric">
                                <span className="pc-report-metric-val">{report?.totalAssignmentsSubmitted || 0}/{report?.totalAssignmentsAssigned || 0}</span>
                                <span className="pc-report-metric-label">Bài tập đã nộp</span>
                            </div>
                            <div className="pc-report-metric">
                                <span className="pc-report-metric-val">{report?.classSummaries?.length || 0}</span>
                                <span className="pc-report-metric-label">Lớp đang học</span>
                            </div>
                        </div>

                        <div className="pc-report-table-container">
                            <table className="pc-report-table">
                                <thead>
                                    <tr>
                                        <th>MÔN HỌC & LỚP</th>
                                        <th>CHUYÊN CẦN</th>
                                        <th>BÀI TẬP</th>
                                        <th style={{ textAlign: 'center' }}>ĐIỂM TRUNG BÌNH</th>
                                        <th style={{ textAlign: 'center' }}>XẾP LOẠI</th>
                                        <th>NHẬN XÉT CỦA GIÁO VIÊN</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report?.classSummaries?.map(row => {
                                        const rankStyle = getRankColor(row.rank);
                                        return (
                                            <tr key={row.classId}>
                                                <td>
                                                    <span className="pc-report-class-name">{row.className}</span>
                                                    <span className="pc-report-subject">{row.subjectName} • GV: {row.teacherName}</span>
                                                </td>
                                                <td>
                                                    <div className="pc-report-att-cell">
                                                        <span style={{ fontWeight: 600 }}>{row.attendanceRate}%</span>
                                                        <div className="pc-report-att-bar">
                                                            <div
                                                                className="pc-report-att-fill"
                                                                style={{
                                                                    width: `${row.attendanceRate}%`,
                                                                    background: row.attendanceRate >= 80 ? '#16a34a' : (row.attendanceRate >= 50 ? '#f59e0b' : '#dc2626')
                                                                }}
                                                            />
                                                        </div>
                                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{row.attendedSessions}/{row.totalSessionsPassed} buổi</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span style={{ fontWeight: 600 }}>{row.submittedAssignments}/{row.totalAssignments}</span>
                                                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8' }}>bài tập đã nộp</p>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {row.averageScore != null ? (
                                                        <span className="pc-report-score" style={{ color: row.averageScore >= 8 ? '#16a34a' : (row.averageScore >= 5 ? '#d97706' : '#dc2626') }}>
                                                            {row.averageScore}
                                                        </span>
                                                    ) : <span style={{ color: '#94a3b8' }}>—</span>}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className="pc-report-rank" style={{ background: rankStyle.bg, color: rankStyle.text }}>
                                                        {row.rank}
                                                    </span>
                                                </td>
                                                <td>
                                                    {row.latestFeedback ? (
                                                        <div className="pc-report-feedback">
                                                            <MessageSquare size={14} />
                                                            <span>{row.latestFeedback}</span>
                                                        </div>
                                                    ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const EnrollConfirmModal = ({ cls, isOpen, onClose, onConfirm, loading }) => {
    if (!isOpen || !cls) return null;

    const accentColor = SUBJECT_COLORS[cls.subjectName] || '#6366f1';

    return (
        <div className="pc-modal-overlay">
            <div className="pc-modal" style={{ maxWidth: '500px' }}>
                <div className="pc-modal-header" style={{ borderTopColor: accentColor }}>
                    <div>
                        <div className="pc-modal-subject" style={{ color: accentColor }}>{cls.subjectName}</div>
                        <h2>Xác nhận đăng ký</h2>
                        <p>Bạn có chắc chắn muốn đăng ký lớp học này không?</p>
                    </div>
                </div>

                <div className="pc-modal-body" style={{ padding: '24px 32px' }}>
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
                        <h4 style={{ margin: '0 0 12px 0', color: '#0f172a' }}>{cls.className}</h4>
                        <div style={{ display: 'grid', gap: '8px', fontSize: '0.9rem', color: '#64748b' }}>
                            <div style={{ display: 'flex', gap: '8px' }}><Users size={16} /> Giáo viên: {cls.teacherName}</div>
                            <div style={{ display: 'flex', gap: '8px' }}><Calendar size={16} /> Ngày bắt đầu: {new Date(cls.startDate).toLocaleDateString('vi-VN')}</div>
                            <div style={{ display: 'flex', gap: '8px' }}><Clock size={16} /> Lịch học: {cls.scheduleSummary}</div>
                            <div style={{ display: 'flex', gap: '8px', fontWeight: 600, color: accentColor }}>
                                <Award size={16} /> Học phí: {cls.pricePerSession?.toLocaleString('vi-VN')}đ / buổi
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            className="sc-enroll-btn"
                            style={{ background: '#f1f5f9', border: 'none' }}
                            onClick={onClose}
                            disabled={loading}
                        >
                            Để sau
                        </button>
                        <button
                            className="sc-enroll-btn"
                            style={{ background: accentColor, color: '#white', borderColor: accentColor }}
                            onClick={onConfirm}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Xác nhận đăng ký'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StudentClasses = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [myEnrolledClasses, setMyEnrolledClasses] = useState([]);
    const [availableClasses, setAvailableClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [availableLoading, setAvailableLoading] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [activeTab, setActiveTab] = useState('my-classes');
    const [studentProfile, setStudentProfile] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ show: false, cls: null });
    const [pendingEnrollmentIds, setPendingEnrollmentIds] = useState(() => {
        try {
            const saved = localStorage.getItem('pendingEnrollments');
            return saved ? new Set(JSON.parse(saved)) : new Set();
        } catch { return new Set(); }
    });

    useEffect(() => {
        onRefresh();
    }, []);

    const onRefresh = async () => {
        setLoading(true);
        try {
            // Sync pending enrollments with backend status first
            await syncPendingEnrollments();
            const myEnrolled = await fetchMyClasses();
            await fetchAvailableClasses(myEnrolled);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Sync pendingEnrollmentIds from backend - backend is source of truth
    const syncPendingEnrollments = async () => {
        try {
            const res = await api.get('/enrollment-requests/my-requests');
            const myRequests = res.data;

            // Build pending set: only keep classIds where the LATEST request is "pending"
            // myRequests is already sorted by date descending (newest first)
            const seen = new Set();
            const pendingFromBackend = new Set();

            for (const req of myRequests) {
                if (!req.classId || seen.has(req.classId)) continue;
                seen.add(req.classId);
                if (req.status === 'Pending') {
                    pendingFromBackend.add(req.classId);
                }
            }

            // Update state and localStorage from backend truth
            localStorage.setItem('pendingEnrollments', JSON.stringify([...pendingFromBackend]));
            setPendingEnrollmentIds(pendingFromBackend);
        } catch {
            // If backend unreachable, keep localStorage state (already initialized in useState)
        }
    };

    const fetchMyClasses = async () => {
        try {
            const res = await api.get('/Classes/student/my-classes');
            setMyEnrolledClasses(res.data);
            return res.data;
        } catch (err) {
            toast.error('Kh\u00f4ng th\u1ec3 t\u1ea3i danh s\u00e1ch l\u1edbp c\u1ee7a b\u1ea1n.');
            return [];
        }
    };

    const fetchAvailableClasses = async (enrolledList = myEnrolledClasses) => {
        try {
            const profRes = await api.get('/Students/profile');
            setStudentProfile({
                gradeId: profRes.data.gradeId,
                gradeLevel: profRes.data.grade || 'N/A'
            });

            const classesRes = await api.get('/CenterHome/classes');
            const allUpcoming = classesRes.data;

            // Filter: 1. Same Grade, 2. Not already enrolled
            const myIds = new Set(enrolledList.map(c => c.classId));

            const filtered = allUpcoming.filter(c => {
                const matchGrade = c.gradeId === profRes.data.gradeId;
                const notEnrolled = !myIds.has(c.classId);
                return matchGrade && notEnrolled;
            });

            setAvailableClasses(filtered);
        } catch (err) {
            console.error('Fetch Discover error:', err);
        }
    };

    const handleQuickEnroll = (cls) => {
        setConfirmModal({ show: true, cls });
    };

    const confirmEnroll = async () => {
        const cls = confirmModal.cls;
        if (!cls) return;

        setAvailableLoading(true);
        try {
            await api.post('/enrollment-requests/student-enroll', {
                gradeId: cls.gradeId,
                classId: cls.classId
            });
            toast.success(`Đã gửi yêu cầu đăng ký lớp ${cls.className} thành công!`);
            // Add to pending set and persist to localStorage
            setPendingEnrollmentIds(prev => {
                const updated = new Set([...prev, cls.classId]);
                localStorage.setItem('pendingEnrollments', JSON.stringify([...updated]));
                return updated;
            });
            setConfirmModal({ show: false, cls: null });
        } catch (err) {
            // Close modal on error (e.g. schedule conflict, class full)
            setConfirmModal({ show: false, cls: null });
        } finally {
            setAvailableLoading(false);
        }
    };

    const filteredClasses = myEnrolledClasses.filter(cls => {
        const matchesSearch =
            cls.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cls.subjectName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = !statusFilter ||
            (statusFilter === 'active' ? cls.status === 'Active' : cls.status !== 'Active');
        return matchesSearch && matchesStatus;
    });

    const activeCount = myEnrolledClasses.filter(c => c.status === 'Active').length;

    const getStatusInfo = (cls, isDiscovery = false) => {
        const hasStarted = cls.startDate ? new Date(cls.startDate) <= new Date() : false;

        if (isDiscovery) {
            const isFull = cls.studentCount >= cls.maxStudents;
            if (isFull) return { key: 'inactive', label: 'Hết chỗ' };
            if (!hasStarted) return { key: 'notstarted', label: 'Sắp khai giảng' };
            return { key: 'active', label: 'Đang mở' };
        }

        // My Classes tab
        if (cls.status !== 'Active') return { key: 'inactive', label: 'Đã kết thúc' };
        if (cls.completedSessions === 0 && !hasStarted) return { key: 'notstarted', label: 'Chưa học' };
        return { key: 'active', label: 'Đang học' };
    };

    const getInitials = (name) => {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div className="sc-page">
            <StudentSidebar />

            <main className="sc-main">
                {/* Header */}
                <div className="sc-header">
                    <div>
                        <h1 className="sc-title">Lớp học của tôi</h1>
                        <p className="sc-subtitle">
                            Bạn đang đăng ký <strong>{activeCount}</strong> lớp đang hoạt động
                        </p>
                    </div>
                    <button
                        className="sc-report-btn"
                        onClick={() => setShowReportModal(true)}
                    >
                        <BarChart2 size={18} />
                        Báo cáo học tập
                    </button>
                </div>

                {/* Stats row */}
                <div className="sc-stats-row">
                    <div className="sc-stat-card">
                        <div className="sc-stat-icon blue"><GraduationCap size={20} /></div>
                        <div>
                            <div className="sc-stat-num">{myEnrolledClasses.length}</div>
                            <div className="sc-stat-label">Tổng lớp</div>
                        </div>
                    </div>
                    <div className="sc-stat-card">
                        <div className="sc-stat-icon green"><BookOpen size={20} /></div>
                        <div>
                            <div className="sc-stat-num">{activeCount}</div>
                            <div className="sc-stat-label">Đang học</div>
                        </div>
                    </div>
                    <div className="sc-stat-card">
                        <div className="sc-stat-icon purple"><Clock size={20} /></div>
                        <div>
                            <div className="sc-stat-num">
                                {myEnrolledClasses.reduce((s, c) => s + c.completedSessions, 0)}
                            </div>
                            <div className="sc-stat-label">Buổi đã học</div>
                        </div>
                    </div>
                    <div className="sc-stat-card">
                        <div className="sc-stat-icon amber"><Users size={20} /></div>
                        <div>
                            <div className="sc-stat-num">
                                {myEnrolledClasses.reduce((s, c) => s + c.totalSessions, 0)}
                            </div>
                            <div className="sc-stat-label">Tổng buổi học</div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="sc-tabs">
                    <button
                        className={`sc-tab ${activeTab === 'my-classes' ? 'active' : ''}`}
                        onClick={() => setActiveTab('my-classes')}
                    >
                        Lớp học của tôi
                    </button>
                    <button
                        className={`sc-tab ${activeTab === 'discover' ? 'active' : ''}`}
                        onClick={() => setActiveTab('discover')}
                    >
                        Khám phá lớp mới
                        {availableClasses.length > 0 && <span className="sc-tab-badge">{availableClasses.length}</span>}
                    </button>
                </div>

                {/* Filters */}
                <div className="sc-filters">
                    <div className="sc-filter-search">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Tìm lớp học theo tên hoặc môn học..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <select
                        className="sc-filter-select"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="active">Đang hoạt động</option>
                        <option value="inactive">Đã kết thúc</option>
                    </select>
                </div>

                {/* My Classes Grid */}
                {activeTab === 'my-classes' && (
                    <div className="sc-section">
                        <h2 className="sc-section-title">Danh sách lớp học hiện tại</h2>
                        {loading ? (
                            <div className="sc-loading">
                                <Loader2 className="animate-spin" size={48} />
                                <p>Đang tải danh sách lớp học...</p>
                            </div>
                        ) : filteredClasses.length === 0 ? (
                            <div className="sc-empty">
                                <GraduationCap size={48} />
                                <p>{searchQuery ? 'Không tìm thấy lớp phù hợp.' : 'Bạn chưa có lớp học nào.'}</p>
                            </div>
                        ) : (
                            <div className="sc-grid">
                                {filteredClasses.map((cls) => {
                                    const progress = cls.totalSessions > 0
                                        ? Math.round((cls.completedSessions / cls.totalSessions) * 100)
                                        : 0;
                                    const accentColor = SUBJECT_COLORS[cls.subjectName] || cls.color;
                                    const hasStarted = cls.startDate ? new Date(cls.startDate) <= new Date() : false;
                                    const statusKey = cls.status !== 'Active'
                                        ? 'inactive'
                                        : (cls.completedSessions === 0 && !hasStarted ? 'notstarted' : 'active');
                                    const statusLabel = cls.status !== 'Active'
                                        ? 'Đã kết thúc'
                                        : (cls.completedSessions === 0 && !hasStarted ? 'Chưa học' : 'Đang học');
                                    return (
                                        <div
                                            key={cls.classId}
                                            className="sc-card"
                                            onClick={() => navigate(`/student/classes/${cls.classId}`)}
                                            style={{ '--accent': accentColor }}
                                        >
                                            <div className="sc-card-top">
                                                <div className="sc-card-accent" style={{ background: accentColor }} />
                                                <div className="sc-card-header-row">
                                                    <div className="sc-card-subject-badge" style={{ background: accentColor + '18', color: accentColor }}>
                                                        {cls.subjectName}
                                                    </div>
                                                    <span className={`sc-card-status ${getStatusInfo(cls).key}`}>
                                                        {getStatusInfo(cls).label}
                                                    </span>
                                                </div>
                                                <h3 className="sc-card-name">{cls.className}</h3>
                                                <p className="sc-card-code">{cls.gradeLevel}</p>
                                            </div>

                                            <div className="sc-card-body">
                                                <div className="sc-card-info-row">
                                                    <Clock size={14} />
                                                    <span>{cls.scheduleDays} • {cls.scheduleTime}</span>
                                                </div>
                                                <div className="sc-card-teachers">
                                                    <div className="sc-teacher-chip">
                                                        <div className="sc-teacher-avatar" style={{ background: accentColor }}>
                                                            {cls.teacherInitials}
                                                        </div>
                                                        <span>{cls.teacherName}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="sc-card-footer">
                                                <div className="sc-progress-label">
                                                    <span>Tiến độ</span>
                                                    <span style={{ color: accentColor, fontWeight: 600 }}>
                                                        {cls.completedSessions}/{cls.totalSessions} buổi • {progress}%
                                                    </span>
                                                </div>
                                                <div className="sc-progress-track">
                                                    <div
                                                        className="sc-progress-fill"
                                                        style={{ width: `${progress}%`, background: accentColor }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Discover Classes Grid */}
                {activeTab === 'discover' && (
                    <div className="sc-section">
                        <div className="sc-section-header-row">
                            <h2 className="sc-section-title">Lớp học phù hợp với {studentProfile?.gradeLevel || 'bạn'}</h2>

                        </div>

                        {availableLoading ? (
                            <div className="sc-loading">
                                <Loader2 className="animate-spin" size={48} />
                                <p>Đang tìm kiếm lớp học phù hợp...</p>
                            </div>
                        ) : availableClasses.length === 0 ? (
                            <div className="sc-empty">
                                <BookOpen size={48} />
                                <p>Hiện không có lớp học mới thuộc khối {studentProfile?.gradeLevel}.</p>
                            </div>
                        ) : (
                            <div className="sc-grid">
                                {availableClasses.map((cls) => {
                                    const accentColor = SUBJECT_COLORS[cls.subjectName] || '#6366f1';
                                    const isPending = pendingEnrollmentIds.has(cls.classId);
                                    const isFull = cls.studentCount >= cls.maxStudents;
                                    const status = isPending
                                        ? { key: 'notstarted', label: 'Đã đăng ký · Chờ duyệt' }
                                        : getStatusInfo(cls, true);

                                    return (
                                        <div
                                            key={cls.classId}
                                            className="sc-card"
                                            style={{ '--accent': accentColor, opacity: isPending ? 0.85 : 1 }}
                                        >
                                            <div className="sc-card-top">
                                                <div className="sc-card-accent" style={{ background: isPending ? '#94a3b8' : accentColor }} />
                                                <div className="sc-card-header-row">
                                                    <div className="sc-card-subject-badge" style={{ background: accentColor + '18', color: accentColor }}>
                                                        {cls.subjectName}
                                                    </div>
                                                    <span className={`sc-card-status ${status.key}`}>
                                                        {status.label}
                                                    </span>
                                                </div>
                                                <h3 className="sc-card-name">{cls.className}</h3>
                                                <p className="sc-card-code">Khối {cls.gradeLevel}</p>
                                            </div>

                                            <div className="sc-card-body">
                                                <div className="sc-card-info-row">
                                                    <Calendar size={14} />
                                                    <span>Bắt đầu: {new Date(cls.startDate).toLocaleDateString('vi-VN')}</span>
                                                </div>
                                                <div className="sc-card-info-row">
                                                    <Clock size={14} />
                                                    <span>Lịch: {cls.scheduleSummary}</span>
                                                </div>
                                                <div className="sc-card-info-row">
                                                    <Users size={14} />
                                                    <span>Sĩ số: {cls.studentCount} / {cls.maxStudents}</span>
                                                </div>
                                                <div className="sc-card-teachers">
                                                    <div className="sc-teacher-chip">
                                                        <div className="sc-teacher-avatar" style={{ background: isPending ? '#94a3b8' : accentColor }}>
                                                            {getInitials(cls.teacherName)}
                                                        </div>
                                                        <span>GV: {cls.teacherName || 'TBA'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="sc-card-footer">
                                                {isPending ? (
                                                    <button className="sc-enroll-btn" disabled style={{ background: '#e2e8f0', color: '#64748b', cursor: 'default' }}>
                                                        ✓ Đã gửi đơn đăng ký
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="sc-enroll-btn"
                                                        onClick={() => handleQuickEnroll(cls)}
                                                        disabled={isFull}
                                                    >
                                                        {isFull ? 'Lớp đã đầy' : (<>Đăng ký ngay <ArrowRight size={16} /></>)}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                <EnrollConfirmModal
                    isOpen={confirmModal.show}
                    cls={confirmModal.cls}
                    onClose={() => setConfirmModal({ show: false, cls: null })}
                    onConfirm={confirmEnroll}
                    loading={availableLoading}
                />

                {showReportModal && <PerformanceReportModal onClose={() => setShowReportModal(false)} />}
            </main>
        </div>
    );
};

export default StudentClasses;
