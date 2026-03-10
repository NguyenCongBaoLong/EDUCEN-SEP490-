import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ChevronLeft, Pencil, Calendar, Clock,
    UserPlus, Upload, Search, X, Trash2,
    CheckCircle, UserCheck, CalendarClock, FileSpreadsheet,
    Plus, AlertTriangle, BookOpen, Info, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../../components/Sidebar';
import CreateClassModal from '../../components/CreateClassModal';
import api from '../../services/api';
import '../../css/pages/center/ClassDetail.css';
import '../../css/components/DeleteModal.css';

/* ─── Helpers ────────────────────────────────────────── */

const DAY_NAMES = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
const DAY_NAMES_FULL = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function calcWeeks(start, end) {
    if (!start || !end) return '—';
    const diff = new Date(end) - new Date(start);
    const weeks = Math.round(diff / (1000 * 60 * 60 * 24 * 7));
    return `${weeks} tuần`;
}

function formatScheduleSlots(slots) {
    if (!slots || slots.length === 0) return '—';
    return slots.map(s => DAY_NAMES_FULL[s.dayOfWeek] || `Thứ ${s.dayOfWeek}`).join(' & ');
}

function formatScheduleTime(slots) {
    if (!slots || slots.length === 0) return '—';
    const s = slots[0];
    return `${s.startTime} – ${s.endTime}`;
}

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

const StatusBadge = ({ status }) => {
    const isActive = status?.toLowerCase() === 'active';
    return (
        <span className={`cd-status-badge ${isActive ? 'active' : 'inactive'}`}>
            {isActive ? 'Đang hoạt động' : status || 'Không rõ'}
        </span>
    );
};

/* ─── Main Component ─────────────────────────────────── */
const ClassDetail = () => {
    const { classId } = useParams();
    const navigate = useNavigate();
    const excelInputRef = useRef(null);

    // ── State ──
    const [classData, setClassData] = useState(null);
    const [students, setStudents] = useState([]);
    const [centerStudents, setCenterStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal states
    const [addStudentModal, setAddStudentModal] = useState(false);
    const [addMode, setAddMode] = useState('manual');
    const [studentSearch, setStudentSearch] = useState('');
    const [excelFile, setExcelFile] = useState(null);
    const [removeModal, setRemoveModal] = useState({ show: false, student: null });
    const [showAllStudents, setShowAllStudents] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [importResult, setImportResult] = useState(null); // { total, success, failed, errors[] }

    // ── Fetch class data ──
    const fetchClassData = async () => {
        try {
            const res = await api.get(`/Classes/${classId}`);
            setClassData(res.data);
        } catch (err) {
            setError('Không thể tải thông tin lớp học.');
            console.error(err);
        }
    };

    const fetchStudents = async () => {
        try {
            const res = await api.get(`/Classes/${classId}/students`);
            setStudents(res.data);
        } catch (err) {
            console.error('Lỗi tải danh sách học sinh:', err);
        }
    };

    const fetchCenterStudents = async () => {
        try {
            const res = await api.get('/Students');
            setCenterStudents(res.data);
        } catch (err) {
            console.error('Lỗi tải danh sách trung tâm:', err);
        }
    };

    useEffect(() => {
        if (!classId) return;
        setLoading(true);
        Promise.all([fetchClassData(), fetchStudents(), fetchCenterStudents()])
            .finally(() => setLoading(false));
    }, [classId]);

    // ── Computed ──
    const enrolledIds = new Set(students.map(s => s.userId));
    const availableStudents = centerStudents.filter(s => !enrolledIds.has(s.userId));
    const filteredAvailable = availableStudents.filter(s =>
        (s.fullName || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
        (s.username || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
        (s.email || '').toLowerCase().includes(studentSearch.toLowerCase())
    );
    const displayedStudents = showAllStudents ? students : students.slice(0, 5);

    // ── Actions ──
    const handleAddStudent = async (student) => {
        setActionLoading(true);
        try {
            await api.post(`/Classes/${classId}/students/${student.userId}`);
            await fetchStudents();
            setAddStudentModal(false);
            setStudentSearch('');
            toast.success(`Đã thêm ${student.fullName} vào lớp thành công!`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể thêm học sinh.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRemoveStudent = async () => {
        if (!removeModal.student) return;
        setActionLoading(true);
        try {
            await api.delete(`/Classes/${classId}/students/${removeModal.student.userId}`);
            await fetchStudents();
            toast.success(`Đã xóa ${removeModal.student.fullName} khỏi lớp thành công!`);
            setRemoveModal({ show: false, student: null });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể xóa học sinh.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleExcelUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) setExcelFile(file);
    };

    const handleExcelConfirm = async () => {
        if (!excelFile) return;
        setActionLoading(true);
        setImportResult(null);
        try {
            const formData = new FormData();
            formData.append('file', excelFile);
            const res = await api.post(`/Classes/${classId}/import-students`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const data = res.data;
            const result = {
                total: data.importResults?.total ?? 0,
                success: data.importResults?.success ?? 0,
                failed: data.importResults?.failed ?? 0,
                errors: data.importResults?.errors ?? []
            };
            setImportResult(result);
            setExcelFile(null);
            if (result.success > 0) {
                await fetchStudents();
                toast.success(`Import xong! ${result.success}/${result.total} học sinh được thêm vào lớp.`);
            }
            if (result.failed > 0 && result.success === 0) {
                toast.error(`Import thất bại: ${result.failed} dòng bị lỗi.`);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Import thất bại, vui lòng thử lại.');
        } finally {
            setActionLoading(false);
        }
    };

    const DAY_NAME_TO_NUMBER = {
        'CN': 0, 'Thứ 2': 1, 'Thứ 3': 2, 'Thứ 4': 3,
        'Thứ 5': 4, 'Thứ 6': 5, 'Thứ 7': 6
    };

    const handleEditSubmit = async (modalData) => {
        try {
            const updateDto = {
                className: modalData.name,
                description: modalData.description || null,
                syllabusContent: modalData.syllabusContent || null,
                startDate: modalData.startDate || null,
                endDate: modalData.endDate || null,
                status: modalData.status || 'Active',
                scheduleSlots: (modalData.scheduleSlots || [])
                    .filter(s => s.day && s.startTime && s.endTime)
                    .map(s => ({
                        dayOfWeek: DAY_NAME_TO_NUMBER[s.day] ?? 1,
                        startTime: s.startTime,
                        endTime: s.endTime
                    }))
            };
            await api.put(`/Classes/${classId}`, updateDto);
            await fetchClassData();
            setEditModalOpen(false);
            toast.success('Đã cập nhật thông tin lớp học thành công!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể cập nhật lớp học.');
        }
    };

    // ── Loading / Error ──
    if (loading) {
        return (
            <div className="class-detail">
                <Sidebar />
                <main className="cd-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center', color: '#64748b' }}>
                        <Loader2 size={40} className="cd-spinner" />
                        <p style={{ marginTop: 12 }}>Đang tải thông tin lớp học...</p>
                    </div>
                </main>
            </div>
        );
    }

    if (error || !classData) {
        return (
            <div className="class-detail">
                <Sidebar />
                <main className="cd-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center', color: '#dc2626' }}>
                        <AlertTriangle size={40} />
                        <p style={{ marginTop: 12 }}>{error || 'Không tìm thấy lớp học.'}</p>
                        <button className="cd-btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/center/classes')}>
                            Quay lại danh sách lớp
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    const scheduleLabel = formatScheduleSlots(classData.scheduleSlots);
    const timeLabel = formatScheduleTime(classData.scheduleSlots);
    const durationLabel = calcWeeks(classData.startDate, classData.endDate);

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
                    <span className="cd-breadcrumb-current">{classData.className}</span>
                </div>

                {/* Page Header */}
                <div className="cd-page-header">
                    <div className="cd-title-block">
                        <div className="cd-title-row">
                            <h1>{classData.className}</h1>
                            <StatusBadge status={classData.status} />
                        </div>
                        <p className="cd-title-meta">
                            Môn: {classData.subjectName} &nbsp;•&nbsp; Mã lớp: #{classData.classId} &nbsp;•&nbsp; {classData.status}
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
                        <div className="cd-info-card-value">{scheduleLabel}</div>
                        <div className="cd-info-card-sub">{timeLabel}</div>
                    </div>
                    <div className="cd-info-card">
                        <div className="cd-info-card-label"><Clock size={16} /> THỜI GIAN</div>
                        <div className="cd-info-card-value">{durationLabel}</div>
                        <div className="cd-info-card-sub">
                            {formatDate(classData.startDate)} → {formatDate(classData.endDate)}
                        </div>
                    </div>
                </div>

                {/* Description & Syllabus */}
                {(classData.description || classData.syllabusContent) && (
                    <div className="cd-info-cards" style={{ marginTop: 0 }}>
                        {classData.description && (
                            <div className="cd-info-card" style={{ flex: 1 }}>
                                <div className="cd-info-card-label"><Info size={16} /> MÔ TẢ LỚP HỌC</div>
                                <div className="cd-info-card-value" style={{ fontSize: '0.9rem', fontWeight: 400, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                    {classData.description}
                                </div>
                            </div>
                        )}
                        {classData.syllabusContent && (
                            <div className="cd-info-card" style={{ flex: 1 }}>
                                <div className="cd-info-card-label"><BookOpen size={16} /> CHƯƠNG TRÌNH HỌC</div>
                                <div className="cd-info-card-value" style={{ fontSize: '0.9rem', fontWeight: 400, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                    {classData.syllabusContent}
                                </div>
                            </div>
                        )}
                    </div>
                )}

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

                            {students.length === 0 ? (
                                <div className="cd-add-empty" style={{ padding: '2rem', textAlign: 'center' }}>
                                    Chưa có học sinh nào trong lớp này.
                                </div>
                            ) : (
                                <table className="cd-roster-table">
                                    <thead>
                                        <tr>
                                            <th>HỌ VÀ TÊN</th>
                                            <th>EMAIL</th>
                                            <th>KHỐI</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayedStudents.map(st => (
                                            <tr key={st.userId}>
                                                <td>
                                                    <div className="cd-student-cell">
                                                        <div className="cd-avatar">{getInitials(st.fullName)}</div>
                                                        <div>
                                                            <div className="cd-student-name">{st.fullName}</div>
                                                            <div className="cd-student-id">@{st.username}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="cd-last-attended">{st.email || '—'}</td>
                                                <td>
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        padding: '2px 10px',
                                                        borderRadius: 12,
                                                        background: st.grade ? '#eff6ff' : '#f1f5f9',
                                                        color: st.grade ? '#2563eb' : '#94a3b8',
                                                        fontWeight: 600
                                                    }}>
                                                        {st.grade ? `Khối ${st.grade}` : '—'}
                                                    </span>
                                                </td>
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
                            )}

                            {students.length > 5 && (
                                <button className="cd-view-all" onClick={() => setShowAllStudents(p => !p)}>
                                    {showAllStudents ? 'Thu gọn' : `Xem tất cả ${students.length} học sinh`}
                                </button>
                            )}
                        </div>

                        {/* Attendance – Read only notice */}
                        <div className="cd-card">
                            <div className="cd-card-header">
                                <h3>Điểm danh</h3>
                            </div>
                            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>
                                <CalendarClock size={32} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.4 }} />
                                <p style={{ fontSize: '0.9rem' }}>Điểm danh do <strong>giáo viên phụ trách</strong> thực hiện trực tiếp trong buổi học.</p>
                                <p style={{ fontSize: '0.8rem', marginTop: 6, color: '#94a3b8' }}>
                                    Admin trung tâm chỉ có quyền xem báo cáo điểm danh.
                                </p>
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
                                {classData.teacherName ? (
                                    <div className="cd-staff-item">
                                        <div className="cd-staff-avatar">{getInitials(classData.teacherName)}</div>
                                        <div className="cd-staff-info">
                                            <div className="cd-staff-role">GIÁO VIÊN CHÍNH</div>
                                            <div className="cd-staff-name">{classData.teacherName}</div>
                                            <div className="cd-staff-sub">{classData.subjectName}</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ color: '#94a3b8', fontSize: '0.875rem', padding: '0.5rem 0' }}>Chưa phân công giáo viên</div>
                                )}

                                {classData.assistantName && (
                                    <div className="cd-staff-item">
                                        <div className="cd-staff-avatar assistant">{getInitials(classData.assistantName)}</div>
                                        <div className="cd-staff-info">
                                            <div className="cd-staff-role">TRỢ GIẢNG</div>
                                            <div className="cd-staff-name">{classData.assistantName}</div>
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
                                    <span className="cd-overview-val">{students.length}</span>
                                </div>
                                <div className="cd-overview-row">
                                    <span>Môn học</span>
                                    <span className="cd-overview-val">{classData.subjectName}</span>
                                </div>
                                <div className="cd-overview-row">
                                    <span>Ngày bắt đầu</span>
                                    <span className="cd-overview-val">{formatDate(classData.startDate)}</span>
                                </div>
                                <div className="cd-overview-row">
                                    <span>Ngày kết thúc</span>
                                    <span className="cd-overview-val">{formatDate(classData.endDate)}</span>
                                </div>
                            </div>

                            {classData.scheduleSlots && classData.scheduleSlots.length > 0 && (
                                <div className="cd-next-session">
                                    <CalendarClock size={14} />
                                    <span>
                                        Lịch học: {classData.scheduleSlots.map(s =>
                                            `${DAY_NAMES[s.dayOfWeek]} (${s.startTime}–${s.endTime})`
                                        ).join(', ')}
                                    </span>
                                </div>
                            )}

                            {/* Read-only attendance note */}
                            <div style={{ marginTop: 12, padding: '10px 12px', background: '#f0f9ff', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <CheckCircle size={16} style={{ color: '#0ea5e9', flexShrink: 0 }} />
                                <span style={{ fontSize: '0.8rem', color: '#0369a1' }}>
                                    Điểm danh do giáo viên thực hiện
                                </span>
                            </div>
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
                                            placeholder="Tìm theo tên, username hoặc email..."
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
                                                <div key={s.userId} className="cd-student-pick-item">
                                                    <div className="cd-avatar">{getInitials(s.fullName)}</div>
                                                    <div className="cd-pick-info">
                                                        <div className="cd-student-name">{s.fullName}</div>
                                                        <div className="cd-student-id">@{s.username} &nbsp;•&nbsp; {s.email}</div>
                                                    </div>
                                                    <button
                                                        className="cd-btn-pick"
                                                        onClick={() => handleAddStudent(s)}
                                                        disabled={actionLoading}
                                                    >
                                                        {actionLoading ? <Loader2 size={14} /> : <><Plus size={14} /> Thêm</>}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="cd-excel-panel">
                                    {!importResult ? (
                                        <>
                                            <div
                                                className={`cd-excel-drop${excelFile ? ' has-file' : ''}`}
                                                onClick={() => excelInputRef.current?.click()}
                                            >
                                                <input
                                                    ref={excelInputRef}
                                                    type="file"
                                                    accept=".xlsx,.xls"
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
                                                        <p className="cd-excel-hint">Hỗ trợ: .xlsx, .xls</p>
                                                    </>
                                                )}
                                            </div>

                                            <div className="cd-excel-template" style={{ marginBottom: 8 }}>
                                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                    📋 File cần có cột <strong>Username</strong> — chỉ học sinh đã có trong hệ thống mới được thêm vào lớp.
                                                </span>
                                            </div>

                                            {excelFile && (
                                                <div className="delete-modal-footer">
                                                    <button className="btn-delete-cancel" onClick={() => setExcelFile(null)}>Hủy</button>
                                                    <button
                                                        className="btn-delete-confirm"
                                                        onClick={handleExcelConfirm}
                                                        disabled={actionLoading}
                                                        style={actionLoading ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                                                    >
                                                        {actionLoading
                                                            ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Đang import...</>
                                                            : <><Upload size={15} /> Xác nhận nhập</>
                                                        }
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        // Import result view
                                        <div style={{ padding: '0.5rem 0' }}>
                                            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                                                <div style={{ flex: 1, textAlign: 'center', padding: '10px 8px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                                                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#16a34a' }}>{importResult.success}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#15803d' }}>Thêm thành công</div>
                                                </div>
                                                <div style={{ flex: 1, textAlign: 'center', padding: '10px 8px', background: importResult.failed > 0 ? '#fef2f2' : '#f8fafc', borderRadius: 8, border: `1px solid ${importResult.failed > 0 ? '#fecaca' : '#e2e8f0'}` }}>
                                                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: importResult.failed > 0 ? '#dc2626' : '#94a3b8' }}>{importResult.failed}</div>
                                                    <div style={{ fontSize: '0.75rem', color: importResult.failed > 0 ? '#b91c1c' : '#94a3b8' }}>Thất bại</div>
                                                </div>
                                            </div>

                                            {importResult.errors.length > 0 && (
                                                <div style={{ maxHeight: 160, overflowY: 'auto', marginBottom: 10 }}>
                                                    {importResult.errors.map((err, i) => (
                                                        <div key={i} style={{
                                                            padding: '5px 10px', background: '#fef2f2', borderRadius: 6,
                                                            fontSize: '0.78rem', color: '#dc2626', marginBottom: 4
                                                        }}>
                                                            ⚠ {err}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="delete-modal-footer">
                                                <button className="btn-delete-cancel" onClick={() => {
                                                    setImportResult(null);
                                                    setAddStudentModal(false);
                                                }}>Đóng</button>
                                                <button className="cd-btn-primary" onClick={() => setImportResult(null)}>
                                                    Import thêm
                                                </button>
                                            </div>
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
                                    <p>Bạn có chắc muốn xóa <strong>{removeModal.student?.fullName}</strong> khỏi lớp <strong>{classData.className}</strong>? Thao tác này không xóa học sinh khỏi trung tâm.</p>
                                </div>
                            </div>
                        </div>
                        <div className="delete-modal-footer">
                            <button className="btn-delete-cancel" onClick={() => setRemoveModal({ show: false, student: null })}>Hủy</button>
                            <button
                                className="btn-delete-confirm"
                                onClick={handleRemoveStudent}
                                disabled={actionLoading}
                            >
                                {actionLoading ? 'Đang xóa...' : 'Xóa khỏi lớp'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Class Modal */}
            <CreateClassModal
                isOpen={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                onSubmit={handleEditSubmit}
                editingClass={classData ? {
                    // Map ClassDto → CreateClassModal's expected shape
                    id: classData.classId,
                    name: classData.className,
                    subject: classData.subjectName,
                    mainTeacher: classData.teacherName ? { name: classData.teacherName } : null,
                    assistant: classData.assistantName ? { name: classData.assistantName } : null,
                    description: classData.description || '',
                    syllabusContent: classData.syllabusContent || '',
                    startDate: classData.startDate ? classData.startDate.split('T')[0] : '',
                    endDate: classData.endDate ? classData.endDate.split('T')[0] : '',
                    status: classData.status || 'active',
                    // Map ScheduleSlots: dayOfWeek (0–6) → day label, keep times
                    scheduleSlots: (classData.scheduleSlots || []).map(s => ({
                        day: ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][s.dayOfWeek] || '',
                        startTime: s.startTime,
                        endTime: s.endTime
                    }))
                } : null}
                existingClasses={[]}
            />
        </div>
    );
};

export default ClassDetail;
