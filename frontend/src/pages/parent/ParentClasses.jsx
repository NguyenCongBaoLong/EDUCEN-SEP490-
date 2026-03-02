import { useState } from 'react';
import { Search, GraduationCap, BookOpen, Clock, Star, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ParentSidebar from '../../components/ParentSidebar';
import '../../css/pages/parent/ParentClasses.css';

/* ── Mock: thông tin con của phụ huynh ── */
const CHILD = {
    name: 'Nguyễn Văn An',
    initials: 'NA',
    grade: '10A1',
    school: 'THPT Nguyễn Du',
};

/* ── Mock: lớp học con đang học ── */
const CHILD_CLASSES = [
    {
        id: 201,
        code: 'TOÁN-G10-ADV',
        name: 'Đại Số Nâng Cao',
        subject: 'Toán học',
        gradeLevel: 'THPT',
        mainTeacher: { name: 'Thầy Nguyễn Minh', initials: 'NM' },
        assistant: { name: 'Cô Lê Hoa', initials: 'LH' },
        schedule: 'Thứ Hai & Thứ Tư',
        scheduleTime: '16:30 - 18:00',
        classesCompleted: 8,
        totalClasses: 24,
        attendance: 87,
        status: 'active',
        color: '#3b82f6',
        assignments: [
            { id: 'A1', title: 'Bài tập chương 1 - PT bậc hai', dueDate: '20/09/2023', grade: 9.5, submitted: true, comment: 'Trình bày rõ ràng! Cần chú ý kiểm tra nghiệm.' },
            { id: 'A2', title: 'Bài tập chương 2 - Bất phương trình', dueDate: '10/10/2023', grade: 8.0, submitted: true, comment: 'Làm đúng phần lớn, cần xem lại bài 7.' },
            { id: 'A3', title: 'Kiểm tra giữa kỳ', dueDate: '28/02/2026', grade: null, submitted: false, comment: null },
            { id: 'A4', title: 'Bài tập chương 3 - Hàm số', dueDate: '04/03/2026', grade: null, submitted: false, comment: null },
        ],
    },
    {
        id: 202,
        code: 'ANH-G10-INT',
        name: 'Tiếng Anh Giao Tiếp Nâng Cao',
        subject: 'Tiếng Anh',
        gradeLevel: 'THPT',
        mainTeacher: { name: 'Cô Trần Lan', initials: 'TL' },
        assistant: null,
        schedule: 'Thứ Ba & Thứ Năm',
        scheduleTime: '17:00 - 18:30',
        classesCompleted: 6,
        totalClasses: 20,
        attendance: 100,
        status: 'active',
        color: '#10b981',
        assignments: [
            { id: 'B1', title: 'Writing - My Hometown', dueDate: '20/09/2023', grade: 8.5, submitted: true, comment: 'Good structure! Work on vocabulary variety.' },
        ],
    },
    {
        id: 203,
        code: 'LÝ-G10-CB',
        name: 'Vật Lý Cơ Bản Lớp 10',
        subject: 'Vật lý',
        gradeLevel: 'THPT',
        mainTeacher: { name: 'Thầy Lê Hoàng', initials: 'LH' },
        assistant: null,
        schedule: 'Thứ Sáu',
        scheduleTime: '15:00 - 16:30',
        classesCompleted: 16,
        totalClasses: 16,
        attendance: 94,
        status: 'inactive',
        color: '#f59e0b',
        assignments: [],
    },
];

const SUBJECT_COLORS = {
    'Toán học': '#3b82f6',
    'Tiếng Anh': '#10b981',
    'Vật lý': '#f59e0b',
};

/* ── Assignment Detail Modal ── */
const ClassDetailModal = ({ cls, onClose }) => {
    if (!cls) return null;
    const accent = SUBJECT_COLORS[cls.subject] || cls.color;
    const avg = (() => {
        const graded = cls.assignments.filter(a => a.grade !== null);
        if (!graded.length) return null;
        return (graded.reduce((s, a) => s + a.grade, 0) / graded.length).toFixed(1);
    })();

    return (
        <div className="pc-modal-overlay" onClick={onClose}>
            <div className="pc-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="pc-modal-header" style={{ borderTopColor: accent }}>
                    <div>
                        <div className="pc-modal-subject" style={{ color: accent }}>{cls.subject}</div>
                        <h2>{cls.name}</h2>
                        <p>{cls.code} • {cls.schedule} • {cls.scheduleTime}</p>
                    </div>
                    <button className="pc-modal-close" onClick={onClose}>✕</button>
                </div>

                {/* Stats */}
                <div className="pc-modal-stats">
                    <div className="pc-modal-stat">
                        <span className="pc-modal-stat-val" style={{ color: accent }}>
                            {cls.classesCompleted}/{cls.totalClasses}
                        </span>
                        <span className="pc-modal-stat-label">Buổi học</span>
                    </div>
                    <div className="pc-modal-stat">
                        <span className="pc-modal-stat-val" style={{ color: cls.attendance >= 80 ? '#16a34a' : '#dc2626' }}>
                            {cls.attendance}%
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

                {/* Teacher */}
                <div className="pc-modal-section">
                    <div className="pc-modal-section-title">Giáo viên</div>
                    <div className="pc-modal-teachers">
                        <div className="pc-teacher-chip">
                            <div className="pc-teacher-avatar" style={{ background: accent }}>{cls.mainTeacher.initials}</div>
                            <div>
                                <div className="pc-teacher-name">{cls.mainTeacher.name}</div>
                                <div className="pc-teacher-role">Giáo viên chính</div>
                            </div>
                        </div>
                        {cls.assistant && (
                            <div className="pc-teacher-chip">
                                <div className="pc-teacher-avatar assistant">{cls.assistant.initials}</div>
                                <div>
                                    <div className="pc-teacher-name">{cls.assistant.name}</div>
                                    <div className="pc-teacher-role">Trợ giảng</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Assignments */}
                <div className="pc-modal-section">
                    <div className="pc-modal-section-title">Bài tập & Điểm số ({cls.assignments.length} bài)</div>
                    {cls.assignments.length === 0 ? (
                        <p className="pc-modal-empty">Chưa có bài tập nào.</p>
                    ) : (
                        <div className="pc-asm-list">
                            {cls.assignments.map(asm => (
                                <div key={asm.id} className={`pc-asm-row ${asm.submitted ? 'submitted' : 'pending'}`}>
                                    <div className="pc-asm-left">
                                        <div className="pc-asm-status-icon">
                                            {asm.submitted
                                                ? <CheckCircle size={16} color="#16a34a" />
                                                : <AlertCircle size={16} color="#f59e0b" />}
                                        </div>
                                        <div>
                                            <div className="pc-asm-title">{asm.title}</div>
                                            <div className="pc-asm-due">Hạn: {asm.dueDate}</div>
                                        </div>
                                    </div>
                                    <div className="pc-asm-right">
                                        {asm.grade !== null ? (
                                            <div className="pc-asm-grade-block">
                                                <span className={`pc-asm-grade ${asm.grade >= 8 ? 'high' : asm.grade >= 6.5 ? 'mid' : 'low'}`}>
                                                    <Star size={12} /> {asm.grade}/10
                                                </span>
                                                {asm.comment && (
                                                    <div className="pc-asm-comment">💬 {asm.comment}</div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="pc-asm-pending">
                                                {asm.submitted ? 'Chờ chấm' : 'Chưa nộp'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="pc-modal-footer">
                    <button className="pc-btn-close" onClick={onClose}>Đóng</button>
                </div>
            </div>
        </div>
    );
};

/* ── Main ── */
const ParentClasses = () => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedClass, setSelectedClass] = useState(null);

    const filtered = CHILD_CLASSES.filter(cls => {
        const matchSearch = cls.name.toLowerCase().includes(search.toLowerCase()) ||
            cls.subject.toLowerCase().includes(search.toLowerCase());
        const matchStatus = !statusFilter || cls.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const activeCount = CHILD_CLASSES.filter(c => c.status === 'active').length;
    const avgAttendance = Math.round(CHILD_CLASSES.reduce((s, c) => s + c.attendance, 0) / CHILD_CLASSES.length);
    const allGrades = CHILD_CLASSES.flatMap(c => c.assignments.filter(a => a.grade !== null).map(a => a.grade));
    const avgGrade = allGrades.length ? (allGrades.reduce((s, g) => s + g, 0) / allGrades.length).toFixed(1) : '—';

    return (
        <div className="pc-page">
            <ParentSidebar />

            <main className="pc-main">
                {/* Header */}
                <div className="pc-header">
                    <div className="pc-child-info">
                        <div className="pc-child-avatar">{CHILD.initials}</div>
                        <div>
                            <h1 className="pc-title">Lớp học của {CHILD.name}</h1>
                            <p className="pc-subtitle">{CHILD.grade} • {CHILD.school}</p>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="pc-stats-row">
                    <div className="pc-stat-card">
                        <div className="pc-stat-icon blue"><GraduationCap size={20} /></div>
                        <div>
                            <div className="pc-stat-num">{CHILD_CLASSES.length}</div>
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
                            <div className="pc-stat-num">{avgAttendance}%</div>
                            <div className="pc-stat-label">Chuyên cần TB</div>
                        </div>
                    </div>
                    <div className="pc-stat-card">
                        <div className="pc-stat-icon amber"><Star size={20} /></div>
                        <div>
                            <div className="pc-stat-num">{avgGrade}</div>
                            <div className="pc-stat-label">Điểm TB bài tập</div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
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
                    <select
                        className="pc-filter-select"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="active">Đang học</option>
                        <option value="inactive">Đã kết thúc</option>
                    </select>
                </div>

                {/* Classes Grid */}
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
                                const accent = SUBJECT_COLORS[cls.subject] || cls.color;
                                const progress = Math.round((cls.classesCompleted / cls.totalClasses) * 100);
                                const graded = cls.assignments.filter(a => a.grade !== null);
                                const avg = graded.length
                                    ? (graded.reduce((s, a) => s + a.grade, 0) / graded.length).toFixed(1)
                                    : null;

                                return (
                                    <div
                                        key={cls.id}
                                        className="pc-card"
                                        style={{ '--accent': accent }}
                                    >
                                        <div className="pc-card-top">
                                            <div className="pc-card-accent" style={{ background: accent }} />
                                            <div className="pc-card-header-row">
                                                <div className="pc-card-subject-badge" style={{ background: accent + '18', color: accent }}>
                                                    {cls.subject}
                                                </div>
                                                <span className={`pc-card-status ${cls.status}`}>
                                                    {cls.status === 'active' ? 'Đang học' : 'Đã kết thúc'}
                                                </span>
                                            </div>
                                            <h3 className="pc-card-name">{cls.name}</h3>
                                            <p className="pc-card-code">{cls.code} • {cls.gradeLevel}</p>
                                        </div>

                                        <div className="pc-card-body">
                                            <div className="pc-card-info-row">
                                                <Clock size={14} />
                                                <span>{cls.schedule} • {cls.scheduleTime}</span>
                                            </div>
                                            {/* Attendance + Grade mini-stats */}
                                            <div className="pc-card-mini-stats">
                                                <div className="pc-mini-stat">
                                                    <span className="pc-mini-label">Chuyên cần</span>
                                                    <span className="pc-mini-val" style={{ color: cls.attendance >= 80 ? '#16a34a' : '#dc2626' }}>
                                                        {cls.attendance}%
                                                    </span>
                                                </div>
                                                <div className="pc-mini-stat">
                                                    <span className="pc-mini-label">Điểm TB</span>
                                                    <span className="pc-mini-val" style={{ color: avg ? accent : '#94a3b8' }}>
                                                        {avg ?? '—'}
                                                    </span>
                                                </div>
                                                <div className="pc-mini-stat">
                                                    <span className="pc-mini-label">Bài nộp</span>
                                                    <span className="pc-mini-val">
                                                        {cls.assignments.filter(a => a.submitted).length}/{cls.assignments.length}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pc-card-footer">
                                            <div className="pc-progress-label">
                                                <span>Tiến độ</span>
                                                <span style={{ color: accent, fontWeight: 600 }}>
                                                    {cls.classesCompleted}/{cls.totalClasses} buổi • {progress}%
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
            </main>

            {selectedClass && (
                <ClassDetailModal cls={selectedClass} onClose={() => setSelectedClass(null)} />
            )}
        </div>
    );
};

export default ParentClasses;
