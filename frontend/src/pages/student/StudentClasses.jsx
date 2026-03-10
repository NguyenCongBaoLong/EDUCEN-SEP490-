import { useState } from 'react';
import { Search, GraduationCap, BookOpen, Clock, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StudentSidebar from '../../components/StudentSidebar';
import '../../css/pages/student/StudentClasses.css';

// Mock data: lớp học mà học sinh này đang đăng ký
const MY_ENROLLED_CLASSES = [
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
        currentStudents: 12,
        maxStudents: 15,
        classesCompleted: 8,
        totalClasses: 24,
        status: 'active',
        color: '#3b82f6',
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
        currentStudents: 10,
        maxStudents: 12,
        classesCompleted: 6,
        totalClasses: 20,
        status: 'active',
        color: '#10b981',
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
        currentStudents: 9,
        maxStudents: 15,
        classesCompleted: 16,
        totalClasses: 16,
        status: 'inactive',
        color: '#f59e0b',
    },
];

const SUBJECT_COLORS = {
    'Toán học': '#3b82f6',
    'Tiếng Anh': '#10b981',
    'Vật lý': '#f59e0b',
    'Hóa học': '#8b5cf6',
    'Sinh học': '#ec4899',
};

const StudentClasses = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const filteredClasses = MY_ENROLLED_CLASSES.filter(cls => {
        const matchesSearch =
            cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cls.subject.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = !statusFilter || cls.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const activeCount = MY_ENROLLED_CLASSES.filter(c => c.status === 'active').length;

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
                </div>

                {/* Stats row */}
                <div className="sc-stats-row">
                    <div className="sc-stat-card">
                        <div className="sc-stat-icon blue"><GraduationCap size={20} /></div>
                        <div>
                            <div className="sc-stat-num">{MY_ENROLLED_CLASSES.length}</div>
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
                                {MY_ENROLLED_CLASSES.reduce((s, c) => s + c.classesCompleted, 0)}
                            </div>
                            <div className="sc-stat-label">Buổi đã học</div>
                        </div>
                    </div>
                    <div className="sc-stat-card">
                        <div className="sc-stat-icon amber"><Users size={20} /></div>
                        <div>
                            <div className="sc-stat-num">
                                {MY_ENROLLED_CLASSES.reduce((s, c) => s + c.totalClasses, 0)}
                            </div>
                            <div className="sc-stat-label">Tổng buổi học</div>
                        </div>
                    </div>
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

                {/* Classes Grid */}
                <div className="sc-section">
                    <h2 className="sc-section-title">Danh sách lớp học</h2>
                    {filteredClasses.length === 0 ? (
                        <div className="sc-empty">
                            <GraduationCap size={48} />
                            <p>Không tìm thấy lớp học phù hợp.</p>
                        </div>
                    ) : (
                        <div className="sc-grid">
                            {filteredClasses.map((cls) => {
                                const progress = Math.round((cls.classesCompleted / cls.totalClasses) * 100);
                                const accentColor = SUBJECT_COLORS[cls.subject] || cls.color;
                                return (
                                    <div
                                        key={cls.id}
                                        className="sc-card"
                                        onClick={() => navigate(`/student/classes/${cls.id}`)}
                                        style={{ '--accent': accentColor }}
                                    >
                                        <div className="sc-card-top">
                                            <div className="sc-card-accent" style={{ background: accentColor }} />
                                            <div className="sc-card-header-row">
                                                <div className="sc-card-subject-badge" style={{ background: accentColor + '18', color: accentColor }}>
                                                    {cls.subject}
                                                </div>
                                                <span className={`sc-card-status ${cls.status}`}>
                                                    {cls.status === 'active' ? 'Đang học' : 'Đã kết thúc'}
                                                </span>
                                            </div>
                                            <h3 className="sc-card-name">{cls.name}</h3>
                                            <p className="sc-card-code">{cls.code} • {cls.gradeLevel}</p>
                                        </div>

                                        <div className="sc-card-body">
                                            <div className="sc-card-info-row">
                                                <Clock size={14} />
                                                <span>{cls.schedule} • {cls.scheduleTime}</span>
                                            </div>
                                            <div className="sc-card-teachers">
                                                <div className="sc-teacher-chip">
                                                    <div className="sc-teacher-avatar" style={{ background: accentColor }}>
                                                        {cls.mainTeacher.initials}
                                                    </div>
                                                    <span>{cls.mainTeacher.name}</span>
                                                </div>
                                                {cls.assistant && (
                                                    <div className="sc-teacher-chip">
                                                        <div className="sc-teacher-avatar assistant">
                                                            {cls.assistant.initials}
                                                        </div>
                                                        <span>{cls.assistant.name}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="sc-card-footer">
                                            <div className="sc-progress-label">
                                                <span>Tiến độ</span>
                                                <span style={{ color: accentColor, fontWeight: 600 }}>
                                                    {cls.classesCompleted}/{cls.totalClasses} buổi • {progress}%
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
            </main>
        </div>
    );
};

export default StudentClasses;
