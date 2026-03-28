import { useState, useEffect } from 'react';
import { Search, GraduationCap, BookOpen, Clock, Users, Loader2 } from 'lucide-react';
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

const StudentClasses = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [myEnrolledClasses, setMyEnrolledClasses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMyClasses();
    }, []);

    const fetchMyClasses = async () => {
        try {
            setLoading(true);
            const response = await api.get('/Classes/student/my-classes');
            setMyEnrolledClasses(response.data);
        } catch (error) {
            console.error('Error fetching classes:', error);
            toast.error('Không thể tải danh sách lớp học');
        } finally {
            setLoading(false);
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
                    {loading ? (
                        <div className="sc-loading">
                            <Loader2 className="animate-spin" size={48} />
                            <p>Đang tải danh sách lớp học...</p>
                        </div>
                    ) : filteredClasses.length === 0 ? (
                        <div className="sc-empty">
                            <GraduationCap size={48} />
                            <p>Không tìm thấy lớp học phù hợp.</p>
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
                                                <span className={`sc-card-status ${statusKey}`}>
                                                    {statusLabel}
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
                                                {cls.assistantName && (
                                                    <div className="sc-teacher-chip">
                                                        <div className="sc-teacher-avatar assistant">
                                                            {cls.assistantInitials}
                                                        </div>
                                                        <span>{cls.assistantName}</span>
                                                    </div>
                                                )}
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
            </main>
        </div>
    );
};

export default StudentClasses;
