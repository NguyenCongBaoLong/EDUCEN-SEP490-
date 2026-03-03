import { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ChevronLeft, Pencil, Calendar, Clock,
    UserPlus, Upload, Search, X, Trash2,
    CheckCircle, UserCheck, CalendarClock, FileSpreadsheet,
    Plus, AlertTriangle, MessageSquare
} from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import CreateClassModal from '../../components/CreateClassModal';
import '../../css/pages/center/ClassDetail.css';
import '../../css/components/DeleteModal.css';

/* ─── Mock data ──────────────────────────────────────── */

const CENTER_STUDENTS = [
    { id: 'ST-001', name: 'Nguyễn Văn An', avatar: 'NA', grade: '10', phone: '0912 345 001' },
    { id: 'ST-002', name: 'Trần Thị Bích', avatar: 'TB', grade: '11', phone: '0912 345 002' },
    { id: 'ST-003', name: 'Lê Minh Cường', avatar: 'LC', grade: '10', phone: '0912 345 003' },
    { id: 'ST-004', name: 'Phạm Thị Dung', avatar: 'PD', grade: '12', phone: '0912 345 004' },
    { id: 'ST-005', name: 'Hoàng Văn Em', avatar: 'HE', grade: '11', phone: '0912 345 005' },
    { id: 'ST-006', name: 'Vũ Thị Phương', avatar: 'VP', grade: '10', phone: '0912 345 006' },
    { id: 'ST-007', name: 'Đặng Văn Giang', avatar: 'DG', grade: '12', phone: '0912 345 007' },
    { id: 'ST-008', name: 'Bùi Thị Hoa', avatar: 'BH', grade: '11', phone: '0912 345 008' },
    { id: 'ST-009', name: 'Ngô Minh Hùng', avatar: 'NH', grade: '10', phone: '0912 345 009' },
    { id: 'ST-010', name: 'Đinh Thị Kim', avatar: 'DK', grade: '12', phone: '0912 345 010' },
];

const CLASSES_DATA = {
    1: {
        id: 1,
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
        ],
        activities: [
            { id: 1, type: 'note', title: 'Cập nhật nội dung', desc: 'Đã thêm bài kiểm tra giữa kỳ vào chương trình.', time: '2 giờ trước', by: 'Quản trị viên' },
            { id: 2, type: 'enroll', title: 'Học sinh nhập học', desc: 'Lê Minh Cường đã được ghi danh vào lớp.', time: 'Hôm qua', by: 'Hệ thống' },
            { id: 3, type: 'schedule', title: 'Cập nhật lịch học', desc: 'Phòng học đã được đổi từ 201 sang 302.', time: '10/10/2023', by: 'Thầy Nguyễn Minh' },
        ],
        classesCompleted: 8,
        totalClasses: 24,
    },
};

/* ─── Helpers ────────────────────────────────────────── */
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
    return (
        <div className="cd-activity-icon" style={{ background: s.bg, color: s.color }}>
            {s.icon}
        </div>
    );
};

/* ─── Main Component ─────────────────────────────────── */
const ClassDetail = () => {
    const { classId } = useParams();
    const navigate = useNavigate();
    const excelInputRef = useRef(null);

    const classData = CLASSES_DATA[classId] || CLASSES_DATA[1];

    const [students, setStudents] = useState(classData.students);
    const [addStudentModal, setAddStudentModal] = useState(false);
    const [addMode, setAddMode] = useState('manual');
    const [studentSearch, setStudentSearch] = useState('');
    const [excelFile, setExcelFile] = useState(null);
    const [removeModal, setRemoveModal] = useState({ show: false, student: null });
    const [showAllStudents, setShowAllStudents] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);

    const availableStudents = CENTER_STUDENTS.filter(
        cs => !students.some(s => s.id === cs.id)
    );

    const filteredAvailable = availableStudents.filter(s =>
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.id.toLowerCase().includes(studentSearch.toLowerCase())
    );

    const handleAddStudent = (centerStudent) => {
        setStudents(prev => [...prev, {
            id: centerStudent.id,
            name: centerStudent.name,
            avatar: centerStudent.avatar,
            attendance: 100,
            lastAttended: '—',
            grade: '—',
        }]);
        setAddStudentModal(false);
        setStudentSearch('');
    };

    const handleExcelUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) setExcelFile(file);
    };

    const handleExcelConfirm = () => {
        alert(`Đã xử lý file "${excelFile?.name}". Trong thực tế sẽ parse và thêm học sinh từ file Excel.`);
        setAddStudentModal(false);
        setExcelFile(null);
    };

    const handleRemoveStudent = () => {
        setStudents(prev => prev.filter(s => s.id !== removeModal.student?.id));
        setRemoveModal({ show: false, student: null });
    };

    const displayedStudents = showAllStudents ? students : students.slice(0, 5);
    const avgAttendance = students.length
        ? Math.round(students.reduce((s, st) => s + st.attendance, 0) / students.length)
        : 0;

    return (
        <div className="class-detail">
            <Sidebar />

            <main className="cd-main">
                {/* Breadcrumb */}
                <div className="cd-breadcrumb">
                    <Link to="/center/classes" className="cd-back">
                        <ChevronLeft size={16} /> Quay lại danh sách lớp
                    </Link>
                    <span className="cd-breadcrumb-sep">/</span>
                    <span className="cd-breadcrumb-current">{classData.name}</span>
                </div>

                {/* Page Header */}
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
                    <div className="cd-header-actions">
                        <button className="cd-btn-primary" onClick={() => setEditModalOpen(true)}>
                            <Pencil size={16} /> Chỉnh sửa lớp
                        </button>
                    </div>
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
                        {/* Student Roster */}
                        <div className="cd-card">
                            <div className="cd-card-header">
                                <h3>Danh sách học sinh ({students.length})</h3>
                                <button className="cd-btn-add-student" onClick={() => setAddStudentModal(true)}>
                                    <UserPlus size={16} /> Thêm học sinh
                                </button>
                            </div>

                            <table className="cd-roster-table">
                                <thead>
                                    <tr>
                                        <th>HỌ VÀ TÊN</th>
                                        <th>CHUYÊN CẦN</th>
                                        <th>BUỔI GẦN NHẤT</th>
                                        <th>XẾP LOẠI</th>
                                        <th></th>
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
                                            <td>
                                                <button
                                                    className="cd-remove-btn"
                                                    onClick={() => setRemoveModal({ show: true, student: st })}
                                                    title="Xóa khỏi lớp"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {students.length > 5 && (
                                <button className="cd-view-all" onClick={() => setShowAllStudents(p => !p)}>
                                    {showAllStudents ? 'Thu gọn' : `Xem tất cả ${students.length} học sinh`}
                                </button>
                            )}
                        </div>

                        {/* Activity Feed */}
                        <div className="cd-card">
                            <div className="cd-card-header">
                                <h3>Nhật ký hoạt động</h3>
                                <button className="cd-text-btn">Xem đầy đủ</button>
                            </div>
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
                        {/* Assigned Staff */}
                        <div className="cd-card">
                            <div className="cd-card-header">
                                <h3>Giáo viên phụ trách</h3>
                            </div>
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
                                            <div className="cd-staff-role">TRỢ GIẢNG</div>
                                            <div className="cd-staff-name">{classData.assistant.name}</div>
                                            <div className="cd-staff-sub">{classData.assistant.subject}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Class Overview */}
                        <div className="cd-card cd-overview-card">
                            <div className="cd-card-header">
                                <h3>Tổng quan lớp học</h3>
                            </div>
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

                            <div className="cd-next-session">
                                <CalendarClock size={14} />
                                <span>Buổi tiếp theo: Thứ Hai, 16/10 lúc 16:30</span>
                            </div>

                            <button className="cd-btn-attendance">
                                <CheckCircle size={16} /> Điểm danh buổi học
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Add Student Modal */}
            {addStudentModal && (
                <div className="delete-modal-overlay" onClick={() => setAddStudentModal(false)}>
                    <div className="cd-add-modal" onClick={e => e.stopPropagation()}>
                        <div className="delete-modal-header">
                            <h3>Thêm học sinh vào lớp</h3>
                            <button className="delete-modal-close" onClick={() => setAddStudentModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="cd-add-tabs">
                            <button
                                className={`cd-add-tab${addMode === 'manual' ? ' active' : ''}`}
                                onClick={() => setAddMode('manual')}
                            >
                                <UserPlus size={15} /> Thêm thủ công
                            </button>
                            <button
                                className={`cd-add-tab${addMode === 'excel' ? ' active' : ''}`}
                                onClick={() => setAddMode('excel')}
                            >
                                <FileSpreadsheet size={15} /> Nhập từ Excel
                            </button>
                        </div>

                        <div className="delete-modal-body">
                            {addMode === 'manual' ? (
                                <>
                                    <p className="cd-add-hint">Chỉ hiển thị học sinh đã có trong trung tâm và chưa có trong lớp này.</p>
                                    <div className="cd-search-box">
                                        <Search size={16} />
                                        <input
                                            type="text"
                                            placeholder="Tìm theo tên hoặc mã học sinh..."
                                            value={studentSearch}
                                            onChange={e => setStudentSearch(e.target.value)}
                                            autoFocus
                                        />
                                        {studentSearch && (
                                            <button onClick={() => setStudentSearch('')}><X size={14} /></button>
                                        )}
                                    </div>

                                    {filteredAvailable.length === 0 ? (
                                        <div className="cd-add-empty">
                                            {availableStudents.length === 0
                                                ? 'Tất cả học sinh trong trung tâm đã có trong lớp này.'
                                                : 'Không tìm thấy học sinh phù hợp.'}
                                        </div>
                                    ) : (
                                        <div className="cd-student-pick-list">
                                            {filteredAvailable.map(s => (
                                                <div key={s.id} className="cd-student-pick-item">
                                                    <div className="cd-avatar">{s.avatar}</div>
                                                    <div className="cd-pick-info">
                                                        <div className="cd-student-name">{s.name}</div>
                                                        <div className="cd-student-id">ID: #{s.id} &nbsp;•&nbsp; Lớp {s.grade}</div>
                                                    </div>
                                                    <button className="cd-btn-pick" onClick={() => handleAddStudent(s)}>
                                                        <Plus size={14} /> Thêm
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="cd-excel-panel">
                                    <div
                                        className={`cd-excel-drop${excelFile ? ' has-file' : ''}`}
                                        onClick={() => excelInputRef.current?.click()}
                                    >
                                        <input
                                            ref={excelInputRef}
                                            type="file"
                                            accept=".xlsx,.xls,.csv"
                                            style={{ display: 'none' }}
                                            onChange={handleExcelUpload}
                                        />
                                        {excelFile ? (
                                            <>
                                                <FileSpreadsheet size={36} className="cd-excel-icon ok" />
                                                <p className="cd-excel-filename">{excelFile.name}</p>
                                                <p className="cd-excel-hint">Nhấn để chọn file khác</p>
                                            </>
                                        ) : (
                                            <>
                                                <Upload size={36} className="cd-excel-icon" />
                                                <p className="cd-excel-title">Kéo thả hoặc nhấn để chọn file</p>
                                                <p className="cd-excel-hint">Hỗ trợ: .xlsx, .xls, .csv</p>
                                            </>
                                        )}
                                    </div>

                                    <div className="cd-excel-template">
                                        <a href="#" onClick={e => e.preventDefault()}>Tải file mẫu Excel</a>
                                        <span> — Điền đúng định dạng để tránh lỗi nhập liệu</span>
                                    </div>

                                    {excelFile && (
                                        <div className="delete-modal-footer">
                                            <button className="btn-delete-cancel" onClick={() => setExcelFile(null)}>Hủy</button>
                                            <button className="btn-delete-confirm" onClick={handleExcelConfirm}>
                                                <Upload size={15} /> Xác nhận nhập
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Remove Student Confirm */}
            {removeModal.show && (
                <div className="delete-modal-overlay" onClick={() => setRemoveModal({ show: false, student: null })}>
                    <div className="delete-modal" onClick={e => e.stopPropagation()}>
                        <div className="delete-modal-header">
                            <h3>Xóa học sinh khỏi lớp</h3>
                            <button className="delete-modal-close" onClick={() => setRemoveModal({ show: false, student: null })}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="delete-modal-body">
                            <div className="delete-modal-warning">
                                <div className="delete-modal-warning-icon"><AlertTriangle size={20} /></div>
                                <div className="delete-modal-warning-content">
                                    <h4>Xác nhận xóa học sinh</h4>
                                    <p>Bạn có chắc muốn xóa <strong>{removeModal.student?.name}</strong> khỏi lớp <strong>{classData.name}</strong>? Thao tác này không xóa học sinh khỏi trung tâm.</p>
                                </div>
                            </div>
                        </div>
                        <div className="delete-modal-footer">
                            <button className="btn-delete-cancel" onClick={() => setRemoveModal({ show: false, student: null })}>Hủy</button>
                            <button className="btn-delete-confirm" onClick={handleRemoveStudent}>Xóa khỏi lớp</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Class Modal */}
            <CreateClassModal
                isOpen={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                onSubmit={(updated) => {
                    console.log('Updated class:', updated);
                    setEditModalOpen(false);
                }}
                editingClass={{ ...classData }}
                existingClasses={[]}
            />
        </div>
    );
};

export default ClassDetail;
