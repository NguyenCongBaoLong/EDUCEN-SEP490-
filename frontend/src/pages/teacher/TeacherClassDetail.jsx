import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    ChevronLeft, Calendar, Clock,
    Search, X,
    CheckCircle, UserCheck, CalendarClock,
    MessageSquare, Pencil, Lock
} from 'lucide-react';
import TeacherSidebar from '../../components/TeacherSidebar';
import AttendanceModal from '../../components/AttendanceModal';
import ScheduleRequestModal from '../../components/ScheduleRequestModal';
import '../../css/pages/center/ClassDetail.css';
import '../../css/components/AttendanceModal.css';

/* ─── Date helper ──────────────────────────────── */
// Parse "DD/MM/YYYY" → Date object (midnight local)
const parseDate = (str) => {
    const [d, m, y] = str.split('/');
    return new Date(Number(y), Number(m) - 1, Number(d));
};
const today = new Date();
today.setHours(0, 0, 0, 0);

const isPast = (dateStr) => parseDate(dateStr) <= today;   // ngày đã đến hoặc là hôm nay
const isFuture = (dateStr) => parseDate(dateStr) > today;  // buổi chưa đến

/* ─── Mock data ─────────────────────────────────── */
const TEACHER_CLASSES_DATA = {
    101: {
        id: 101,
        code: 'TOÁN-G10-ADV',
        name: 'Đại Số Nâng Cao',
        subject: 'Toán học',
        gradeLevel: 'THPT',
        status: 'active',
        schedule: 'Thứ Hai & Thứ Tư',
        scheduleTime: '16:30 - 18:00 (90 phút)',
        startDate: '04/09/2023',
        duration: '12 tuần',
        maxStudents: 15,
        mainTeacher: { name: 'Thầy Nguyễn Minh', initials: 'NM', subject: 'Chuyên gia Toán học' },
        assistant: { name: 'Cô Lê Hoa', initials: 'LH', subject: 'Trợ giảng Toán' },
        students: [
            { id: 'ST-001', name: 'Nguyễn Văn An', avatar: 'NA', attendance: 95, lastAttended: '12/10/2023', grade: 'A' },
            { id: 'ST-002', name: 'Trần Thị Bích', avatar: 'TB', attendance: 82, lastAttended: '12/10/2023', grade: 'B+' },
            { id: 'ST-003', name: 'Lê Minh Cường', avatar: 'LC', attendance: 98, lastAttended: '12/10/2023', grade: 'A+' },
            { id: 'ST-004', name: 'Phạm Thị Dung', avatar: 'PD', attendance: 76, lastAttended: '10/10/2023', grade: 'B' },
            { id: 'ST-005', name: 'Hoàng Văn Em', avatar: 'HE', attendance: 90, lastAttended: '12/10/2023', grade: 'A-' },
        ],
        sessions: [
            { scheduleId: 1, date: '04/09/2023', dayLabel: 'Thứ Hai', time: '16:30 - 18:00' },
            { scheduleId: 2, date: '06/09/2023', dayLabel: 'Thứ Tư', time: '16:30 - 18:00' },
            { scheduleId: 3, date: '11/09/2023', dayLabel: 'Thứ Hai', time: '16:30 - 18:00' },
            { scheduleId: 4, date: '13/09/2023', dayLabel: 'Thứ Tư', time: '16:30 - 18:00' },
            { scheduleId: 5, date: '18/09/2023', dayLabel: 'Thứ Hai', time: '16:30 - 18:00' },
            { scheduleId: 6, date: '20/09/2023', dayLabel: 'Thứ Tư', time: '16:30 - 18:00' },
            { scheduleId: 7, date: '25/09/2023', dayLabel: 'Thứ Hai', time: '16:30 - 18:00' },
            { scheduleId: 8, date: '12/10/2023', dayLabel: 'Thứ Hai', time: '16:30 - 18:00' },
            // Buổi tương lai (chưa đến) — dùng để test validation
            { scheduleId: 9, date: '28/02/2026', dayLabel: 'Thứ Bảy', time: '16:30 - 18:00' },
            { scheduleId: 10, date: '04/03/2026', dayLabel: 'Thứ Tư', time: '16:30 - 18:00' },
        ],
        activities: [
            { id: 1, type: 'note', title: 'Ghi chú buổi học', desc: 'Đã dạy xong chương 3 - Phương trình bậc hai.', time: '2 giờ trước', by: 'Thầy Nguyễn Minh' },
            { id: 2, type: 'enroll', title: 'Học sinh nhập học', desc: 'Hoàng Văn Em đã được ghi danh vào lớp.', time: 'Hôm qua', by: 'Hệ thống' },
            { id: 3, type: 'schedule', title: 'Cập nhật lịch học', desc: 'Phòng học đã được đổi từ 201 sang 302.', time: '10/10/2023', by: 'Quản trị viên' },
        ],
        classesCompleted: 8,
        totalClasses: 10,
    },
    102: {
        id: 102,
        code: 'TOÁN-G11-CB',
        name: 'Giải Tích Cơ Bản',
        subject: 'Toán học',
        gradeLevel: 'THPT',
        status: 'active',
        schedule: 'Thứ Ba & Thứ Năm',
        scheduleTime: '17:00 - 18:30 (90 phút)',
        startDate: '01/09/2023',
        duration: '10 tuần',
        maxStudents: 15,
        mainTeacher: { name: 'Thầy Nguyễn Minh', initials: 'NM', subject: 'Chuyên gia Toán học' },
        assistant: null,
        students: [
            { id: 'ST-006', name: 'Vũ Thị Phương', avatar: 'VP', attendance: 88, lastAttended: '11/10/2023', grade: 'B+' },
            { id: 'ST-007', name: 'Đặng Văn Giang', avatar: 'DG', attendance: 100, lastAttended: '11/10/2023', grade: 'A' },
        ],
        sessions: [
            { scheduleId: 9, date: '05/09/2023', dayLabel: 'Thứ Ba', time: '17:00 - 18:30' },
            { scheduleId: 10, date: '07/09/2023', dayLabel: 'Thứ Năm', time: '17:00 - 18:30' },
            { scheduleId: 11, date: '11/10/2023', dayLabel: 'Thứ Ba', time: '17:00 - 18:30' },
        ],
        activities: [
            { id: 1, type: 'note', title: 'Ghi chú buổi học', desc: 'Hoàn thành chương giới hạn và liên tục.', time: '1 ngày trước', by: 'Thầy Nguyễn Minh' },
        ],
        classesCompleted: 3,
        totalClasses: 10,
    },
};

const INITIAL_ATTENDANCE = {
    1: [
        { studentId: 'ST-001', status: 'present' },
        { studentId: 'ST-002', status: 'absent' },
        { studentId: 'ST-003', status: 'present' },
        { studentId: 'ST-004', status: 'present' },
        { studentId: 'ST-005', status: 'present' },
    ],
    2: [
        { studentId: 'ST-001', status: 'present' },
        { studentId: 'ST-002', status: 'present' },
        { studentId: 'ST-003', status: 'present' },
        { studentId: 'ST-004', status: 'absent' },
        { studentId: 'ST-005', status: 'absent' },
    ],
};

/* ─── Helpers ──────────────────────────────────── */
const AttendanceBar = ({ value }) => {
    const color = value >= 90 ? '#16a34a' : value >= 75 ? '#f59e0b' : '#dc2626';
    return (
        <div className="cd-attendance-bar">
            <div className="cd-attendance-track">
                <div className="cd-attendance-fill" style={{ width: `${value}%`, background: color }} />
            </div>
            <span className="cd-attendance-pct" style={{ color }}>{value}%</span>
        </div>
    );
};

const GradeBadge = ({ grade }) => {
    const color = grade?.startsWith('A') ? '#16a34a' : grade?.startsWith('B') ? '#2563eb' : '#f59e0b';
    return <span className="cd-grade-badge" style={{ color, background: color + '18' }}>{grade}</span>;
};

const ActivityIcon = ({ type }) => {
    const map = {
        note: { icon: <MessageSquare size={14} />, bg: '#fee2e2', color: '#ef4444' },
        enroll: { icon: <UserCheck size={14} />, bg: '#dcfce7', color: '#16a34a' },
        schedule: { icon: <CalendarClock size={14} />, bg: '#dbeafe', color: '#2563eb' },
    };
    const s = map[type] || map.note;
    return <div className="cd-activity-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>;
};

/* ─── Main Component ────────────────────────────── */
const TeacherClassDetail = () => {
    const { classId } = useParams();
    const classData = TEACHER_CLASSES_DATA[classId] || TEACHER_CLASSES_DATA[101];

    const [students] = useState(classData.students);
    const [showAllStudents, setShowAllStudents] = useState(false);
    const [studentSearch, setStudentSearch] = useState('');

    const [attendanceOpen, setAttendanceOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState(null);
    const [attendanceData, setAttendanceData] = useState(INITIAL_ATTENDANCE);

    // State cho Modal yêu cầu thay đổi
    const [requestOpen, setRequestOpen] = useState(false);
    const [requestInitialData, setRequestInitialData] = useState(null);

    /* --- derived --- */
    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.id.toLowerCase().includes(studentSearch.toLowerCase())
    );
    const displayedStudents = showAllStudents ? filteredStudents : filteredStudents.slice(0, 5);
    const avgAttendance = students.length
        ? Math.round(students.reduce((s, st) => s + st.attendance, 0) / students.length)
        : 0;

    // Buổi tiếp theo chưa điểm danh VÀ đã đến ngày
    const nextSession = classData.sessions.find(
        s => !attendanceData[s.scheduleId] && isPast(s.date)
    );

    const getSessionSummary = (scheduleId) => {
        const records = attendanceData[scheduleId] || [];
        return {
            present: records.filter(r => r.status === 'present').length,
            absent: records.filter(r => r.status === 'absent').length,
        };
    };

    const handleOpen = (session) => { setSelectedSession(session); setAttendanceOpen(true); };
    const handleClose = () => { setAttendanceOpen(false); setSelectedSession(null); };
    const handleSave = (session, payload) => {
        setAttendanceData(prev => ({
            ...prev,
            [session.scheduleId]: payload.map(p => ({ studentId: p.studentId, status: p.status })),
        }));
        handleClose();
    };

    /* Sessions đã qua, mới nhất trước */
    const pastSessions = [...classData.sessions]
        .filter(s => isPast(s.date))
        .reverse();

    const futureSessions = classData.sessions.filter(s => isFuture(s.date));

    return (
        <div className="class-detail">
            <TeacherSidebar />

            <main className="cd-main">
                {/* Breadcrumb */}
                <div className="cd-breadcrumb">
                    <Link to="/teacher/classes" className="cd-back">
                        <ChevronLeft size={16} /> Quay lại lớp của tôi
                    </Link>
                    <span className="cd-breadcrumb-sep">/</span>
                    <span className="cd-breadcrumb-current">{classData.name}</span>
                </div>

                {/* Header */}
                <div className="cd-page-header">
                    <div className="cd-title-block">
                        <div className="cd-title-row">
                            <h1>{classData.name}</h1>
                            <span className={`cd-status-badge ${classData.status}`}>
                                {classData.status === 'active' ? 'Đang hoạt động' : 'Tạm dừng'}
                            </span>
                        </div>
                        <p className="cd-title-meta">
                            Môn: {classData.subject} &nbsp;•&nbsp; Mã lớp: {classData.code} &nbsp;•&nbsp; {classData.gradeLevel}
                        </p>
                    </div>
                    <button className="ts-btn-request" onClick={() => {
                        setRequestInitialData({
                            type: 'reschedule',
                            classInfo: {
                                name: classData.name,
                                code: classData.code,
                                time: classData.scheduleTime,
                                date: classData.schedule
                            }
                        });
                        setRequestOpen(true);
                    }}>
                        <MessageSquare size={18} />
                        Yêu cầu đổi lịch
                    </button>
                </div>

                {/* Info Cards */}
                <div className="cd-info-cards">
                    <div className="cd-info-card">
                        <div className="cd-info-card-label"><Calendar size={16} /> LỊCH HỌC</div>
                        <div className="cd-info-card-value">{classData.schedule}</div>
                        <div className="cd-info-card-sub">{classData.scheduleTime}</div>
                    </div>
                    <div className="cd-info-card">
                        <div className="cd-info-card-label"><Clock size={16} /> THỜI GIAN</div>
                        <div className="cd-info-card-value">{classData.duration}</div>
                        <div className="cd-info-card-sub">Bắt đầu {classData.startDate}</div>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="cd-content-grid">
                    {/* LEFT */}
                    <div className="cd-left">
                        {/* Danh sách học sinh */}
                        <div className="cd-card">
                            <div className="cd-card-header">
                                <h3>Danh sách học sinh ({students.length})</h3>
                            </div>
                            <div className="cd-search-box" style={{ marginBottom: '1rem' }}>
                                <Search size={16} />
                                <input
                                    type="text"
                                    placeholder="Tìm theo tên hoặc mã học sinh..."
                                    value={studentSearch}
                                    onChange={e => setStudentSearch(e.target.value)}
                                />
                                {studentSearch && (
                                    <button onClick={() => setStudentSearch('')}><X size={14} /></button>
                                )}
                            </div>
                            <table className="cd-roster-table">
                                <thead>
                                    <tr>
                                        <th>HỌ VÀ TÊN</th>
                                        <th>CHUYÊN CẦN</th>
                                        <th>BUỔI GẦN NHẤT</th>
                                        <th>XẾP LOẠI</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayedStudents.map(st => (
                                        <tr key={st.id}>
                                            <td>
                                                <div className="cd-student-cell">
                                                    <div className="cd-avatar">{st.avatar}</div>
                                                    <div>
                                                        <div className="cd-student-name">{st.name}</div>
                                                        <div className="cd-student-id">ID: #{st.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><AttendanceBar value={st.attendance} /></td>
                                            <td className="cd-last-attended">{st.lastAttended}</td>
                                            <td><GradeBadge grade={st.grade} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredStudents.length > 5 && (
                                <button className="cd-view-all" onClick={() => setShowAllStudents(p => !p)}>
                                    {showAllStudents ? 'Thu gọn' : `Xem tất cả ${filteredStudents.length} học sinh`}
                                </button>
                            )}
                        </div>

                        {/* ── Lịch sử điểm danh ── */}
                        <div className="cd-card">
                            <div className="cd-card-header">
                                <h3>Lịch sử điểm danh</h3>
                                <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
                                    {Object.keys(attendanceData).length} / {pastSessions.length} buổi đã qua
                                </span>
                            </div>

                            {pastSessions.length === 0 ? (
                                <p style={{ color: '#9ca3af', fontSize: '0.875rem', textAlign: 'center', padding: '1rem 0' }}>
                                    Chưa có buổi học nào.
                                </p>
                            ) : (
                                <div className="att-history-scroll">
                                    <table className="att-history-table">
                                        <thead>
                                            <tr>
                                                <th>NGÀY</th>
                                                <th style={{ textAlign: 'center' }}>CÓ MẶT</th>
                                                <th style={{ textAlign: 'center' }}>VẮNG</th>
                                                <th style={{ textAlign: 'right' }}>THAO TÁC</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pastSessions.map((session, idx) => {
                                                const done = !!attendanceData[session.scheduleId];
                                                const { present, absent } = getSessionSummary(session.scheduleId);
                                                return (
                                                    <tr key={session.scheduleId}>
                                                        <td>
                                                            <div className="att-date-cell">
                                                                <span className="att-session-num">Buổi {pastSessions.length - idx}</span>
                                                                <span className="att-session-date">
                                                                    {session.dayLabel}, {session.date}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            {done
                                                                ? <span className="att-badge present">{present}</span>
                                                                : <span className="att-badge pending">—</span>
                                                            }
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            {done
                                                                ? <span className={`att-badge ${absent > 0 ? 'absent' : 'present'}`}>{absent}</span>
                                                                : <span className="att-badge pending">—</span>
                                                            }
                                                        </td>
                                                        <td style={{ textAlign: 'right' }}>
                                                            {done ? (
                                                                <button
                                                                    className="att-btn-edit"
                                                                    onClick={() => handleOpen(session)}
                                                                    title="Sửa điểm danh"
                                                                >
                                                                    <Pencil size={13} /> Sửa
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    className="att-btn-take"
                                                                    onClick={() => handleOpen(session)}
                                                                >
                                                                    <CheckCircle size={13} /> Điểm danh
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Buổi tương lai */}
                            {futureSessions.length > 0 && (
                                <div className="att-future-notice">
                                    <Lock size={13} />
                                    <span>
                                        {futureSessions.length} buổi sắp tới chưa mở điểm danh
                                        &nbsp;(buổi gần nhất: {futureSessions[0].dayLabel}, {futureSessions[0].date})
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Nhật ký hoạt động */}
                        <div className="cd-card">
                            <div className="cd-card-header"><h3>Nhật ký hoạt động</h3></div>
                            <div className="cd-activity-list">
                                {classData.activities.map(act => (
                                    <div key={act.id} className="cd-activity-item">
                                        <ActivityIcon type={act.type} />
                                        <div className="cd-activity-content">
                                            <div className="cd-activity-title">{act.title}</div>
                                            <div className="cd-activity-desc">{act.desc}</div>
                                            <div className="cd-activity-meta">{act.time} • Bởi {act.by}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT */}
                    <div className="cd-right">
                        {/* Giáo viên phụ trách */}
                        <div className="cd-card">
                            <div className="cd-card-header"><h3>Giáo viên phụ trách</h3></div>
                            <div className="cd-staff-list">
                                <div className="cd-staff-item">
                                    <div className="cd-staff-avatar">{classData.mainTeacher.initials}</div>
                                    <div className="cd-staff-info">
                                        <div className="cd-staff-role">GIÁO VIÊN CHÍNH</div>
                                        <div className="cd-staff-name">{classData.mainTeacher.name}</div>
                                        <div className="cd-staff-sub">{classData.mainTeacher.subject}</div>
                                    </div>
                                </div>
                                {classData.assistant && (
                                    <div className="cd-staff-item">
                                        <div className="cd-staff-avatar assistant">{classData.assistant.initials}</div>
                                        <div className="cd-staff-info">
                                            <div className="cd-staff-role" style={{ color: '#6366f1' }}>TRỢ GIẢNG</div>
                                            <div className="cd-staff-name">{classData.assistant.name}</div>
                                            <div className="cd-staff-sub">{classData.assistant.subject}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tổng quan */}
                        <div className="cd-card cd-overview-card">
                            <div className="cd-card-header"><h3>Tổng quan lớp học</h3></div>
                            <div className="cd-overview-stats">
                                <div className="cd-overview-row">
                                    <span>Tổng học sinh</span>
                                    <span className="cd-overview-val">{students.length} / {classData.maxStudents}</span>
                                </div>
                                <div className="cd-overview-row">
                                    <span>Chuyên cần TB</span>
                                    <span className="cd-overview-val green">{avgAttendance}%</span>
                                </div>
                                <div className="cd-overview-row">
                                    <span>Buổi đã học</span>
                                    <span className="cd-overview-val">{classData.classesCompleted} / {classData.totalClasses}</span>
                                </div>
                                <div className="cd-overview-row">
                                    <span>Đã điểm danh</span>
                                    <span className="cd-overview-val">
                                        {Object.keys(attendanceData).length} / {pastSessions.length} buổi
                                    </span>
                                </div>
                            </div>

                            <div className="cd-progress-wrap">
                                <div className="cd-progress-label">
                                    <span>Tiến độ khóa học</span>
                                    <span>{Math.round(classData.classesCompleted / classData.totalClasses * 100)}%</span>
                                </div>
                                <div className="cd-progress-track">
                                    <div
                                        className="cd-progress-fill"
                                        style={{ width: `${classData.classesCompleted / classData.totalClasses * 100}%` }}
                                    />
                                </div>
                            </div>

                            {/* Nút điểm danh buổi tiếp theo */}
                            {nextSession ? (
                                <>
                                    <div className="cd-next-session">
                                        <CalendarClock size={14} />
                                        <span>Buổi cần điểm danh: {nextSession.dayLabel}, {nextSession.date}</span>
                                    </div>
                                    <button
                                        className="cd-btn-attendance"
                                        onClick={() => handleOpen(nextSession)}
                                    >
                                        <CheckCircle size={16} />
                                        Điểm danh buổi {nextSession.date}
                                    </button>
                                </>
                            ) : futureSessions.length > 0 ? (
                                <>
                                    <div className="cd-next-session">
                                        <CalendarClock size={14} />
                                        <span>Buổi tiếp theo: {futureSessions[0].dayLabel}, {futureSessions[0].date}</span>
                                    </div>
                                    {/* Disabled — chưa đến ngày */}
                                    <button className="cd-btn-attendance" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                                        <Lock size={16} />
                                        Chưa đến ngày học
                                    </button>
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#16a34a', padding: '0.75rem', background: '#f0fdf4', borderRadius: '8px' }}>
                                    ✓ Đã điểm danh tất cả các buổi
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Attendance Modal */}
            {attendanceOpen && selectedSession && (
                <AttendanceModal
                    isOpen={attendanceOpen}
                    onClose={handleClose}
                    onSave={handleSave}
                    session={selectedSession}
                    students={students}
                    existingRecords={attendanceData[selectedSession.scheduleId]}
                />
            )}

            {/* Request Change Modal */}
            {requestOpen && (
                <ScheduleRequestModal
                    isOpen={requestOpen}
                    onClose={() => setRequestOpen(false)}
                    onSend={(payload) => {
                        console.log("Schedule Request Sent from Detail:", payload);
                        setRequestOpen(false);
                    }}
                    initialData={requestInitialData}
                />
            )}
        </div>
    );
};

export default TeacherClassDetail;
