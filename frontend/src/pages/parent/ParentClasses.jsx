import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, GraduationCap, BookOpen, Clock, Star, CheckCircle, AlertCircle, Eye, Loader2, MessageSquare, TrendingUp, Award, FileCheck } from 'lucide-react';
import ParentSidebar from '../../components/ParentSidebar';
import ParentFeedbackDrawer from '../../components/ParentFeedbackDrawer';
import ParentFeedbackModal from '../../components/ParentFeedbackModal';
import { useChild } from '../../context/ChildContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import '../../css/pages/parent/ParentClasses.css';

const SUBJECT_COLORS = {
    'Toán học': '#3b82f6',
    'Tiếng Anh': '#10b981',
    'Vật lý': '#f59e0b',
    'Hóa học': '#8b5cf6',
    'Sinh học': '#ec4899',
};

/* ── Assignment Detail Modal ── */
const ClassDetailModal = ({ cls, onClose }) => {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const { selectedChild } = useChild();
    const accent = SUBJECT_COLORS[cls?.subjectName] || cls?.color || '#3b82f6';

    useEffect(() => {
        if (!cls || !selectedChild) return;
        const studentId = cls?.studentId || selectedChild?.studentId;
        if (!studentId || studentId === 'all') return;
        setLoading(true);
        api.get(`/Classes/parent/child/${studentId}/class/${cls.classId}/detail`)
            .then(res => setDetail(res.data))
            .catch(() => toast.error('Không thể tải chi tiết lớp học'))
            .finally(() => setLoading(false));
    }, [cls, selectedChild]);

    if (!cls) return null;

    const allAssignments = detail?.sessions?.flatMap(s => (s.assignments || []).map(a => ({
        ...a,
        sessionTitle: s.title || `Buổi ${s.sessionNum}`,
        sessionNum: s.sessionNum,
    }))) || [];

    const graded = allAssignments.filter(a => a.currentSubmission?.score !== null && a.currentSubmission?.score !== undefined && a.currentSubmission?.isPublished);
    const avg = graded.length ? (graded.reduce((s, a) => s + a.currentSubmission.score, 0) / graded.length).toFixed(1) : null;

    // Calculate attendance from sessions
    const pastSessions = detail?.sessions?.filter(s => s.status === 'Attended' || s.status === 'Absent') || [];
    const attendedCount = detail?.sessions?.filter(s => s.status === 'Attended').length || 0;
    const attendanceRate = pastSessions.length > 0 ? Math.round((attendedCount / pastSessions.length) * 100) : null;

    return (
        <div className="pc-modal-overlay" onClick={onClose}>
            <div className="pc-modal" onClick={e => e.stopPropagation()}>
                <div className="pc-modal-header" style={{ borderTopColor: accent }}>
                    <div>
                        <div className="pc-modal-subject" style={{ color: accent }}>{cls.subjectName}</div>
                        <h2>{cls.className}</h2>
                        <p>{cls.scheduleDays} • {cls.scheduleTime}</p>
                    </div>
                    <button className="pc-modal-close" onClick={onClose}>✕</button>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                        <Loader2 className="animate-spin" size={36} color={accent} />
                    </div>
                ) : (
                    <>
                        <div className="pc-modal-stats">
                            <div className="pc-modal-stat">
                                <span className="pc-modal-stat-val" style={{ color: accent }}>
                                    {cls.completedSessions}/{cls.totalSessions}
                                </span>
                                <span className="pc-modal-stat-label">Buổi học</span>
                            </div>
                            <div className="pc-modal-stat">
                                <span className="pc-modal-stat-val" style={{ color: attendanceRate !== null && attendanceRate >= 80 ? '#16a34a' : '#dc2626' }}>
                                    {attendanceRate !== null ? `${attendanceRate}%` : '—'}
                                </span>
                                <span className="pc-modal-stat-label">Chuyên cần</span>
                            </div>
                            <div className="pc-modal-stat">
                                <span className="pc-modal-stat-val" style={{ color: avg ? '#8b5cf6' : '#94a3b8' }}>
                                    {avg ?? '—'}
                                </span>
                                <span className="pc-modal-stat-label">TB điểm bài tập</span>
                            </div>
                        </div>

                        <div className="pc-modal-section">
                            <div className="pc-modal-section-title">Giáo viên</div>
                            <div className="pc-modal-teachers">
                                <div className="pc-teacher-chip">
                                    <div className="pc-teacher-avatar" style={{ background: accent }}>{cls.teacherInitials}</div>
                                    <div>
                                        <div className="pc-teacher-name">{cls.teacherName}</div>
                                        <div className="pc-teacher-role">Giáo viên chính</div>
                                    </div>
                                </div>
                                {cls.assistantName && (
                                    <div className="pc-teacher-chip">
                                        <div className="pc-teacher-avatar assistant">{cls.assistantInitials}</div>
                                        <div>
                                            <div className="pc-teacher-name">{cls.assistantName}</div>
                                            <div className="pc-teacher-role">Trợ giảng</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pc-modal-section">
                            <div className="pc-modal-section-title">Bài tập & Điểm số ({allAssignments.length} bài)</div>
                            {allAssignments.length === 0 ? (
                                <p className="pc-modal-empty">Chưa có bài tập nào.</p>
                            ) : (
                                <div className="pc-asm-list">
                                    {detail?.sessions?.map(session => {
                                        if (!session.assignments?.length) return null;
                                        return (
                                            <div key={session.sessionNum} className="pc-asm-session-group" style={{ marginBottom: 16 }}>
                                                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b', marginBottom: 8, textTransform: 'uppercase' }}>
                                                    {session.title || `Buổi ${session.sessionNum}`}
                                                </div>
                                                {session.assignments.map(asm => (
                                                    <div key={asm.asmId} className={`pc-asm-row ${asm.currentSubmission ? 'submitted' : 'pending'}`} style={{ marginBottom: 8 }}>
                                                        <div className="pc-asm-left">
                                                            <div className="pc-asm-status-icon">
                                                                {asm.currentSubmission
                                                                    ? <CheckCircle size={16} color="#16a34a" />
                                                                    : <AlertCircle size={16} color="#f59e0b" />}
                                                            </div>
                                                            <div>
                                                                <div className="pc-asm-title">{asm.title}</div>
                                                                <div className="pc-asm-due">Hạn: {asm.dueDate ? new Date(asm.dueDate).toLocaleDateString('vi-VN') : 'Chưa giới hạn'}</div>
                                                            </div>
                                                        </div>
                                                        <div className="pc-asm-right">
                                                            {asm.currentSubmission?.score !== null && asm.currentSubmission?.score !== undefined && asm.currentSubmission?.isPublished ? (
                                                                <div className="pc-asm-grade-block">
                                                                    <span className={`pc-asm-grade ${asm.currentSubmission.score >= 8 ? 'high' : asm.currentSubmission.score >= 6.5 ? 'mid' : 'low'}`}>
                                                                        <Star size={12} /> {asm.currentSubmission.score}/10
                                                                    </span>
                                                                    {asm.currentSubmission.teacherComment && (
                                                                        <div className="pc-asm-comment">💬 {asm.currentSubmission.teacherComment}</div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="pc-asm-pending">
                                                                    {asm.currentSubmission ? 'Chờ chấm' : 'Chưa nộp'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                )}

                <div className="pc-modal-footer">
                    <button className="pc-btn-close" onClick={onClose}>Đóng</button>
                </div>
            </div>
        </div>
    );
};

/* ── Performance Report Modal ── */
const PerformanceReportModal = ({ onClose }) => {
    const { selectedChild } = useChild();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!selectedChild) return;
        setLoading(true);
        api.get(`/Parents/child/${selectedChild.studentId}/performance-report`)
            .then(res => setReport(res.data))
            .catch(() => toast.error('Không thể tải báo cáo học tập'))
            .finally(() => setLoading(false));
    }, [selectedChild]);

    if (!selectedChild || selectedChild.studentId === 'all') return null;

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
                        <div className="pc-modal-subject" style={{ color: '#6366f1' }}>Học sinh: {selectedChild?.fullName}</div>
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

                <div className="pc-modal-footer">
                    <button className="pc-btn-close" onClick={onClose}>Đóng báo cáo</button>
                </div>
            </div>
        </div>
    );
};

/* ── Main ── */
const ParentClasses = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { selectedChild, loading: childLoading } = useChild();
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedClass, setSelectedClass] = useState(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [inboxOpenSignal, setInboxOpenSignal] = useState(0);

    useEffect(() => {
        const panel = searchParams.get('panel');
        if (panel === 'feedback') {
            setIsFeedbackModalOpen(true);
        } else if (panel === 'inbox') {
            setInboxOpenSignal(prev => prev + 1);
        } else {
            return;
        }

        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('panel');
        setSearchParams(nextParams, { replace: true });
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        if (!selectedChild) return;
        setLoading(true);
        setClasses([]);
        const loadClasses = async () => {
            const isAllChildren = selectedChild?.studentId === 'all';
            if (!isAllChildren) {
                const res = await api.get(`/Classes/parent/child/${selectedChild.studentId}/classes`);
                return (res.data || []).map(item => ({
                    ...item,
                    studentId: selectedChild.studentId,
                    studentName: selectedChild.fullName
                }));
            }

            const childrenRes = await api.get('/Parents/my-children');
            const allChildren = childrenRes.data || [];
            const results = await Promise.all(
                allChildren.map(async (child) => {
                    const res = await api.get(`/Classes/parent/child/${child.studentId}/classes`);
                    return (res.data || []).map(item => ({
                        ...item,
                        studentId: child.studentId,
                        studentName: child.fullName
                    }));
                })
            );
            return results.flat();
        };

        loadClasses()
            .then(data => setClasses(data))
            .catch(() => toast.error('Không thể tải dữ liệu lớp học'))
            .finally(() => setLoading(false));
    }, [selectedChild]);

    const filtered = classes.filter(cls => {
        const matchSearch = cls.className?.toLowerCase().includes(search.toLowerCase()) ||
            cls.subjectName?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = !statusFilter || (statusFilter === 'active' ? cls.status === 'Active' : cls.status !== 'Active');
        return matchSearch && matchStatus;
    });

    const activeCount = classes.filter(c => c.status === 'Active').length;
    const totalSessions = classes.reduce((s, c) => s + (c.completedSessions || 0), 0);

    const getAllAssignmentsForClass = (cls) => cls.sessions?.flatMap(s => s.assignments || []) || [];

    return (
        <div className="pc-page">
            <ParentSidebar />

            <main className="pc-main">
                <div className="pc-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="pc-child-info">
                        {selectedChild?.studentId !== 'all' && (
                            <div className="pc-child-avatar">
                                {(selectedChild?.fullName || '?').trim().split(' ').pop().charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <h1 className="pc-title">
                                {selectedChild?.studentId === 'all'
                                    ? 'Lớp học của tất cả con'
                                    : `Lớp học của ${selectedChild?.fullName || '...'}`}
                            </h1>
                            <p className="pc-subtitle">{selectedChild?.grade || ''}</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {selectedChild && selectedChild.studentId !== 'all' && (
                            <button className="pc-btn-report" onClick={() => setShowReportModal(true)}>
                                <TrendingUp size={18} /> Báo cáo học tập
                            </button>
                        )}
                        <button className="pc-btn-feedback" style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '8px 16px', borderRadius: '10px',
                            background: '#6366f1', color: 'white', border: 'none',
                            fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer'
                        }} onClick={() => setIsFeedbackModalOpen(true)}>
                            <MessageSquare size={18} /> Gửi phản hồi
                        </button>
                        <ParentFeedbackDrawer autoOpenSignal={inboxOpenSignal} />
                    </div>
                </div>

                {childLoading || loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                        <Loader2 className="animate-spin" size={48} color="#6366f1" />
                    </div>
                ) : !selectedChild ? (
                    <div className="pc-empty">
                        <GraduationCap size={48} />
                        <p>Chưa có học sinh nào được liên kết với tài khoản của bạn.</p>
                    </div>
                ) : (
                    <>
                        <div className="pc-stats-row">
                            <div className="pc-stat-card">
                                <div className="pc-stat-icon blue"><GraduationCap size={20} /></div>
                                <div>
                                    <div className="pc-stat-num">{classes.length}</div>
                                    <div className="pc-stat-label">Tổng lớp</div>
                                </div>
                            </div>
                            <div className="pc-stat-card">
                                <div className="pc-stat-icon green"><BookOpen size={20} /></div>
                                <div>
                                    <div className="pc-stat-num">{activeCount}</div>
                                    <div className="pc-stat-label">Đang học</div>
                                </div>
                            </div>
                            <div className="pc-stat-card">
                                <div className="pc-stat-icon purple"><Clock size={20} /></div>
                                <div>
                                    <div className="pc-stat-num">{totalSessions}</div>
                                    <div className="pc-stat-label">Buổi đã học</div>
                                </div>
                            </div>
                        </div>

                        <div className="pc-filters">
                            <div className="pc-filter-search">
                                <Search size={18} />
                                <input
                                    type="text"
                                    placeholder="Tìm lớp theo tên hoặc môn học..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                            <select className="pc-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                                <option value="">Tất cả trạng thái</option>
                                <option value="active">Đang học</option>
                                <option value="inactive">Đã kết thúc</option>
                            </select>
                        </div>

                        <div className="pc-section">
                            <h2 className="pc-section-title">Danh sách lớp học</h2>
                            {filtered.length === 0 ? (
                                <div className="pc-empty">
                                    <GraduationCap size={48} />
                                    <p>Không tìm thấy lớp học phù hợp.</p>
                                </div>
                            ) : (
                                <div className="pc-grid">
                                    {filtered.map(cls => {
                                        const accent = SUBJECT_COLORS[cls.subjectName] || cls.color || '#3b82f6';
                                        const progress = cls.totalSessions > 0
                                            ? Math.round((cls.completedSessions / cls.totalSessions) * 100)
                                            : 0;
                                        // Status: Chưa học / Đang học / Đã kết thúc
                                        const hasStarted = cls.startDate ? new Date(cls.startDate) <= new Date() : false;
                                        const statusKey = cls.status !== 'Active'
                                            ? 'inactive'
                                            : (cls.completedSessions === 0 && !hasStarted ? 'notstarted' : 'active');
                                        const statusLabel = cls.status !== 'Active'
                                            ? 'Đã kết thúc'
                                            : (cls.completedSessions === 0 && !hasStarted ? 'Chưa học' : 'Đang học');
                                        // Date range
                                        const fmtDate = d => d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null;
                                        const dateRange = [fmtDate(cls.startDate), fmtDate(cls.endDate)].filter(Boolean).join(' – ');
                                        return (
                                            <div key={`${cls.studentId}-${cls.classId}`} className="pc-card" style={{ '--accent': accent }}>
                                                <div className="pc-card-top">
                                                    <div className="pc-card-accent" style={{ background: accent }} />
                                                    <div className="pc-card-header-row">
                                                        <div className="pc-card-subject-badge" style={{ background: accent + '18', color: accent }}>
                                                            {cls.subjectName}
                                                        </div>
                                                        <span className={`pc-card-status ${statusKey}`}>
                                                            {statusLabel}
                                                        </span>
                                                    </div>
                                                    <h3 className="pc-card-name">{cls.className}</h3>
                                                    <p className="pc-card-code">{cls.gradeLevel}</p>
                                                    {dateRange && (
                                                        <p className="pc-card-code" style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                            📅 {dateRange}
                                                        </p>
                                                    )}
                                                    {selectedChild?.studentId === 'all' && (
                                                        <p className="pc-card-code" style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: 600 }}>
                                                            Học sinh: {cls.studentName || `#${cls.studentId}`}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="pc-card-body">
                                                    <div className="pc-card-info-row">
                                                        <Clock size={14} />
                                                        <span>{cls.scheduleDays} • {cls.scheduleTime}</span>
                                                    </div>
                                                    <div className="pc-card-mini-stats">
                                                        <div className="pc-mini-stat">
                                                            <span className="pc-mini-label">GV</span>
                                                            <span className="pc-mini-val" style={{ fontSize: '0.78rem' }}>{cls.teacherName || '—'}</span>
                                                        </div>
                                                        <div className="pc-mini-stat">
                                                            <span className="pc-mini-label">Buổi học</span>
                                                            <span className="pc-mini-val">{cls.completedSessions}/{cls.totalSessions}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="pc-card-footer">
                                                    <div className="pc-progress-label">
                                                        <span>Tiến độ</span>
                                                        <span style={{ color: accent, fontWeight: 600 }}>
                                                            {cls.completedSessions}/{cls.totalSessions} buổi • {progress}%
                                                        </span>
                                                    </div>
                                                    <div className="pc-progress-track">
                                                        <div className="pc-progress-fill" style={{ width: `${progress}%`, background: accent }} />
                                                    </div>
                                                    <button
                                                        className="pc-btn-detail"
                                                        style={{ borderColor: accent, color: accent }}
                                                        onClick={() => setSelectedClass(cls)}
                                                    >
                                                        <Eye size={15} /> Xem bài tập & điểm
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>

            {selectedClass && (
                <ClassDetailModal cls={selectedClass} onClose={() => setSelectedClass(null)} />
            )}

            {showReportModal && (
                <PerformanceReportModal onClose={() => setShowReportModal(false)} />
            )}

            <ParentFeedbackModal 
                isOpen={isFeedbackModalOpen} 
                onClose={() => setIsFeedbackModalOpen(false)}
                onSuccess={() => setInboxOpenSignal(prev => prev + 1)} 
            />
        </div>
    );
};

export default ParentClasses;


