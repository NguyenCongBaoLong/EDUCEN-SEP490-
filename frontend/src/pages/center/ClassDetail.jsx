import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ChevronLeft, Pencil, Calendar, Clock,
    UserPlus, Upload, Search, X, Trash2,
    Plus, AlertTriangle, BookOpen, Info, Loader2,
    MessageSquare, FileText, Download, PlayCircle, MoreVertical,
    ChevronDown, ChevronUp, History, ClipboardCheck,
    CheckCircle, UserCheck, CalendarClock, FileSpreadsheet
} from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../../components/Sidebar';
import CreateClassModal from '../../components/CreateClassModal';
import AttendanceModal from '../../components/AttendanceModal';
import MaterialDetailModal from '../../components/MaterialDetailModal';
import AssignmentDetailModal from '../../components/AssignmentDetailModal';
import api from '../../services/api';
import '../../css/pages/center/ClassDetail.css';
import '../../css/components/AttendanceModal.css';
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

function formatScheduleRoom(slots) {
    if (!slots || slots.length === 0) return '';
    const uniqueRooms = [...new Set(slots.map(s => s.roomName).filter(Boolean))];
    if (uniqueRooms.length === 0) return '';
    return uniqueRooms.join(' & ');
}

function formatGrade(grade) {
    if (!grade || grade === '—' || grade === 'None' || grade === '') return '—';
    let g = String(grade).trim();
    if (g.endsWith('.0')) g = g.slice(0, -2);
    if (!g.toLowerCase().includes('khối')) return `Khối ${g}`;
    return g;
}

function formatDateVN(isoDate) {
    if (!isoDate) return '—';
    const d = new Date(isoDate);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

const formatSize = (bytes) => {
    if (!bytes) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const mapMaterial = (m) => ({
    id: m.materialId || m.MaterialId,
    name: m.title || m.Title || '',
    title: m.title || m.Title || '',
    size: formatSize(m.fileSize || m.FileSize),
    fileSize: m.fileSize || m.FileSize,
    fileName: m.originalFileName || m.OriginalFileName || '',
    originalFileName: m.originalFileName || m.OriginalFileName || '',
    type: (() => {
        const ct = (m.contentType || m.ContentType || '').toLowerCase();
        const fn = (m.originalFileName || m.OriginalFileName || '').toLowerCase();
        if (ct.includes('pdf') || fn.endsWith('.pdf')) return 'pdf';
        if (ct.includes('word') || fn.endsWith('.doc') || fn.endsWith('.docx')) return 'word';
        if (ct.includes('excel') || ct.includes('spreadsheet') || fn.endsWith('.xls') || fn.endsWith('.xlsx')) return 'excel';
        if (ct.includes('powerpoint') || ct.includes('presentation') || fn.endsWith('.ppt') || fn.endsWith('.pptx')) return 'ppt';
        if (ct.includes('video') || fn.endsWith('.mp4') || fn.endsWith('.mov') || fn.endsWith('.avi')) return 'video';
        return 'other';
    })(),
    fileUrl: m.fileUrl || m.FileUrl,
    description: m.description || m.Description || '',
    sessionId: m.sessionId || m.SessionId
});

const mapAssignment = (a) => {
    const fileName = (a.originalFileName || a.OriginalFileName || a.fileName || a.FileName || "").toLowerCase();
    const contentType = (a.contentType || a.ContentType || "").toLowerCase();
    const type = fileName.includes('.pdf') || contentType.includes('pdf') ? 'pdf'
               : (fileName.includes('.doc') || fileName.includes('.docx') || contentType.includes('word')) ? 'word'
               : (fileName.includes('.xls') || fileName.includes('.xlsx') || contentType.includes('excel') || contentType.includes('spreadsheet')) ? 'excel'
               : (fileName.includes('.ppt') || fileName.includes('.pptx') || contentType.includes('powerpoint') || contentType.includes('presentation')) ? 'ppt'
               : (fileName.includes('.mp4') || fileName.includes('.mov') || fileName.includes('.avi') || contentType.includes('video')) ? 'video'
               : 'other';

    return {
        id: a.asmId || a.AsmId,
        title: a.title || a.Title || '',
        description: a.description || a.Description || '',
        type: type,
        dueDate: (a.endTime || a.EndTime) ? new Date(a.endTime || a.EndTime).toLocaleDateString('vi-VN') : 'Chưa thiết lập',
        fileUrl: a.fileUrl || a.FileUrl,
        fileName: a.originalFileName || a.OriginalFileName || '',
        originalFileName: a.originalFileName || a.OriginalFileName || '',
        sessionId: a.sessionId || a.SessionId
    };
};

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

    // Lists for dropdowns
    const [subjects, setSubjects] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [assistants, setAssistants] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [grades, setGrades] = useState([]);

    // Modal states
    const [addStudentModal, setAddStudentModal] = useState(false);
    const [addMode, setAddMode] = useState('manual');
    const [studentSearch, setStudentSearch] = useState('');
    const [excelFile, setExcelFile] = useState(null);
    const [removeModal, setRemoveModal] = useState({ show: false, student: null });
    const [showAllStudents, setShowAllStudents] = useState(false);
    const [showAllSessions, setShowAllSessions] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [addingStudentId, setAddingStudentId] = useState(null);
    const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
    const [batchAdding, setBatchAdding] = useState(false);
    const [importResult, setImportResult] = useState(null); // { total, success, failed, errors[] }

    // New states for sessions and tabs
    const [activeTab, setActiveTab] = useState('overview');
    const [sessions, setSessions] = useState([]);
    const [attendanceSummary, setAttendanceSummary] = useState([]);
    const [expandedSessionId, setExpandedSessionId] = useState(null);
    
    // Modal states for sessions
    const [attendanceOpen, setAttendanceOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState(null);
    const [detailMaterial, setDetailMaterial] = useState(null);
    const [detailAssignment, setDetailAssignment] = useState(null);
    const [isAttendanceEdit, setIsAttendanceEdit] = useState(false);
    const [loadingItems, setLoadingItems] = useState({}); // Tracking loading state for each session: { sessionId: true/false }

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

    const fetchSubjects = async () => {
        try {
            const res = await api.get('/tenantadmin/Subjects');
            setSubjects(res.data);
        } catch (err) { console.error('Lỗi tải môn học:', err); }
    };

    const fetchTeachersAndAssistants = async () => {
        try {
            const [tRes, aRes] = await Promise.all([
                api.get('/Teachers'),
                api.get('/Assistants')
            ]);
            
            const mapStaff = (staff, title) => {
                const dayMap = {
                    1: 'Thứ 2', 2: 'Thứ 3', 3: 'Thứ 4', 4: 'Thứ 5', 5: 'Thứ 6', 6: 'Thứ 7', 0: 'CN'
                };
                
                return {
                    id: staff.userId || staff.teacherId || staff.assistantId,
                    name: staff.fullName,
                    title: title,
                    department: staff.specialization || staff.supportLevel || "Tất cả bộ môn",
                    avatar: staff.fullName ? staff.fullName.substring(0, 2).toUpperCase() : 'ST',
                    schedule: (staff.schedule || []).map(s => ({
                        day: dayMap[s.dayOfWeek] || s.dayOfWeek,
                        startTime: s.startTime,
                        endTime: s.endTime
                    }))
                };
            };

            setTeachers(tRes.data.map(t => mapStaff(t, 'Giáo viên')));
            setAssistants(aRes.data.map(a => mapStaff(a, 'Trợ giảng')));
        } catch (err) { console.error('Lỗi tải nhân viên:', err); }
    };

    const fetchRooms = async () => {
        try {
            const res = await api.get('/Rooms');
            setRooms(res.data);
        } catch (err) { console.error('Lỗi tải phòng học:', err); }
    };

    const fetchGrades = async () => {
        try {
            const res = await api.get('/Grades');
            setGrades(res.data);
        } catch (err) { console.error('Lỗi tải khối lớp:', err); }
    };

    const fetchSessionsAndAttendance = async () => {
        try {
            const [sessionsRes, attendanceRes] = await Promise.all([
                api.get(`/Classes/${classId}/sessions`),
                api.get(`/attendance/class/${classId}/sessions-summary`)
            ]);
            
            const rawSessions = sessionsRes.data || [];
            const summaryData = attendanceRes.data || [];
            
            setAttendanceSummary(summaryData);
            
            const mappedSessions = rawSessions.map((s, idx) => {
                const summary = summaryData.find(sum => sum.sessionId === s.sessionId);
                return {
                    sessionId: s.sessionId,
                    sessionNum: idx + 1,
                    date: formatDateVN(s.sessionDate),
                    dayLabel: DAY_NAMES_FULL[new Date(s.sessionDate).getDay()],
                    time: s.time || '',
                    title: s.title || `Buổi ${idx + 1}`,
                    status: s.status,
                    presentCount: summary?.presentCount || 0,
                    absentCount: summary?.absentCount || 0,
                    sessionDate: s.sessionDate, // Raw ISO date for sorting
                    materials: [],
                    assignments: [],
                };
            });
            
            setSessions(mappedSessions);
        } catch (err) {
            console.error('Lỗi tải thông tin buổi học:', err);
        }
    };

    const fetchSessionItems = async (sessionId) => {
        if (loadingItems[sessionId]) return;
        setLoadingItems(prev => ({ ...prev, [sessionId]: true }));
        try {
            const [matRes, asmRes] = await Promise.all([
                api.get(`/Materials/Get-By-Session/${sessionId}`),
                api.get(`/Assignments/Get-By-Session/${sessionId}`)
            ]);

            setSessions(prev => prev.map(s => {
                if (s.sessionId === sessionId) {
                    return {
                        ...s,
                        materials: (matRes.data || []).map(mapMaterial),
                        assignments: (asmRes.data || []).map(mapAssignment),
                        itemsLoaded: true
                    };
                }
                return s;
            }));
        } catch (err) {
            console.error(`Lỗi khi tải dữ liệu cho buổi ${sessionId}:`, err);
            toast.error('Không thể tải tài liệu của buổi học này.');
        } finally {
            setLoadingItems(prev => ({ ...prev, [sessionId]: false }));
        }
    };

    const handleToggleExpand = (sessionId) => {
        if (expandedSessionId === sessionId) {
            setExpandedSessionId(null);
        } else {
            setExpandedSessionId(sessionId);
            const session = sessions.find(s => s.sessionId === sessionId);
            if (session && !session.itemsLoaded) {
                fetchSessionItems(sessionId);
            }
        }
    };

    useEffect(() => {
        if (!classId) return;
        setLoading(true);
        Promise.all([
            fetchClassData(),
            fetchStudents(),
            fetchCenterStudents(),
            fetchSubjects(),
            fetchTeachersAndAssistants(),
            fetchRooms(),
            fetchGrades(),
            fetchSessionsAndAttendance()
        ]).finally(() => setLoading(false));
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
        setAddingStudentId(student.userId);
        try {
            await api.post(`/Classes/${classId}/students/${student.userId}`);
            // Keep modal open and clear search for better batch UX
            setStudentSearch('');
            toast.success(`Đã thêm ${student.fullName} vào lớp thành công!`);
            // Fetch list in the background
            fetchStudents();
            // Clear from selection if it was there
            setSelectedStudentIds(prev => {
                const next = new Set(prev);
                next.delete(student.userId);
                return next;
            });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể thêm học sinh.');
        } finally {
            setAddingStudentId(null);
        }
    };

    const handleBatchAdd = async () => {
        if (selectedStudentIds.size === 0) return;
        
        setBatchAdding(true);
        const ids = Array.from(selectedStudentIds);
        let successCount = 0;
        let failCount = 0;

        for (const studentId of ids) {
            try {
                await api.post(`/Classes/${classId}/students/${studentId}`);
                successCount++;
            } catch (err) {
                console.error(`Failed to add student ${studentId}:`, err);
                failCount++;
            }
        }

        if (successCount > 0) {
            toast.success(`Đã thêm ${successCount} học sinh vào lớp!`);
            fetchStudents();
            setSelectedStudentIds(new Set());
        }
        if (failCount > 0) {
            toast.error(`Thất bại ${failCount} học sinh.`);
        }
        setBatchAdding(false);
    };

    const toggleStudentSelection = (studentId) => {
        setSelectedStudentIds(prev => {
            const next = new Set(prev);
            if (next.has(studentId)) next.delete(studentId);
            else next.add(studentId);
            return next;
        });
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
            const subject = subjects.find(s => s.subjectName === modalData.subject);
            const teacherId = modalData.mainTeacher?.id;
            const assistantId = modalData.assistant?.id;

            const updateDto = {
                className: modalData.name,
                description: modalData.description || null,
                syllabusContent: modalData.syllabusContent || null,
                subjectId: subject?.subjectId || classData.subjectId,
                teacherId: teacherId || null,
                assistantId: assistantId || null,
                roomId: modalData.roomId || null,
                gradeId: modalData.gradeId || null,
                startDate: modalData.startDate || null,
                endDate: modalData.endDate || null,
                maxStudents: Number(modalData.maxStudents),
                status: modalData.status === 'active' ? 'Active' : modalData.status === 'completed' ? 'Completed' : 'Inactive',
                pricePerSession: modalData.pricePerSession ? Number(modalData.pricePerSession) : null,
                scheduleSlots: (modalData.scheduleSlots || [])
                    .filter(s => s.day && s.startTime && s.endTime)
                    .map(s => ({
                        dayOfWeek: DAY_NAME_TO_NUMBER[s.day] ?? 1,
                        startTime: s.startTime,
                        endTime: s.endTime,
                        roomId: s.roomId
                    }))
            };
            await api.put(`/Classes/${classId}`, updateDto);
            await fetchClassData();
            await fetchTeachersAndAssistants();
            await fetchRooms();
            setEditModalOpen(false);
            toast.success('Đã cập nhật thông tin lớp học thành công!');
        } catch (err) {
            console.error("Lỗi khi cập nhật lớp học:", err);
            toast.error(err.response?.data?.message || 'Không thể cập nhật lớp học.');
        }
    };

    // ── Helpers ──
    const getFileIcon = (type) => {
        switch (type) {
            case 'pdf':   return <FileText size={20} color="#ef4444" />;
            case 'word':  return <FileText size={20} color="#2563eb" />;
            case 'excel': return <FileText size={20} color="#16a34a" />;
            case 'ppt':   return <FileText size={20} color="#ea580c" />;
            case 'video': return <PlayCircle size={20} color="#8b5cf6" />;
            default:      return <FileText size={20} color="#64748b" />;
        }
    };

    const handleDownload = (item) => {
        const downloadUrl = item.fileUrl || item.url;
        if (downloadUrl) {
            toast.success(`Đang tải xuống: ${item.title}`);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = item.title;
            a.target = "_blank";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            toast.error("Không có đường dẫn tải về");
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
    const roomLabel = formatScheduleRoom(classData.scheduleSlots);
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
                            Môn: {classData.subjectName} &nbsp;•&nbsp; Khối: {classData.gradeName || 'Chưa rõ'} &nbsp;•&nbsp; {classData.status}
                        </p>
                        
                        {(classData.description || classData.syllabusContent) && (
                            <div className="cd-header-more-info">
                                {classData.description && (
                                    <div className="cd-header-info-box">
                                        <div className="cd-info-box-label">Mô tả lớp học</div>
                                        <div className="cd-info-box-content">{classData.description}</div>
                                    </div>
                                )}
                                {classData.syllabusContent && (
                                    <div className="cd-header-info-box">
                                        <div className="cd-info-box-label">Nội dung giáo trình</div>
                                        <div className="cd-info-box-content">{classData.syllabusContent}</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="cd-header-actions">
                        <button className="cd-btn-primary" onClick={() => setEditModalOpen(true)}>
                            <Pencil size={16} /> Chỉnh sửa lớp
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="cd-tabs-nav">
                    <button
                        className={`cd-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        Tổng quan
                    </button>
                    <button
                        className={`cd-tab-btn ${activeTab === 'academic' ? 'active' : ''}`}
                        onClick={() => setActiveTab('academic')}
                    >
                        Tài liệu & Bài tập ({sessions.reduce((acc, s) => acc + (s.materials?.length || 0) + (s.assignments?.length || 0), 0)})
                    </button>
                </div>

                {/* Tab Content */}
                <div className="cd-tab-content">
                    {activeTab === 'overview' ? (
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
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="cd-last-attended">{st.email || '—'}</td>
                                                        <td>
                                                            <span style={{
                                                                fontSize: '0.75rem',
                                                                padding: '2px 10px',
                                                                borderRadius: 12,
                                                                background: st.grade && st.grade !== '—' ? '#eff6ff' : '#f1f5f9',
                                                                color: st.grade && st.grade !== '—' ? '#2563eb' : '#94a3b8',
                                                                fontWeight: 600
                                                            }}>
                                                                {formatGrade(st.grade)}
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

                                {/* Attendance History */}
                                <div className="cd-card">
                                    <div className="cd-card-header">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <h3>Lịch sử điểm danh</h3>
                                            <span style={{ fontSize: '0.8125rem', color: '#6b7280', fontWeight: 500 }}>
                                                {sessions.filter(s => new Date(s.sessionDate) <= new Date()).length} buổi đã diễn ra
                                            </span>
                                        </div>
                                    </div>

                                    {sessions.length === 0 ? (
                                        <p style={{ color: '#9ca3af', fontSize: '0.875rem', textAlign: 'center', padding: '1.5rem 0' }}>
                                            Chưa có buổi học nào được tạo.
                                        </p>
                                    ) : (
                                        <>
                                            <div style={{ overflowX: 'auto' }}>
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
                                                        {[...sessions]
                                                            .filter(s => new Date(s.sessionDate) <= new Date())
                                                            .sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate))
                                                            .slice(0, showAllSessions ? sessions.length : 5)
                                                            .map((session) => {
                                                                const hasAttendance = session.presentCount > 0 || session.absentCount > 0;
                                                                return (
                                                                    <tr key={session.sessionId}>
                                                                        <td>
                                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                                <span style={{ fontWeight: 600, color: '#1e293b' }}>{session.date}</span>
                                                                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{session.dayLabel} • {session.time}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td style={{ textAlign: 'center' }}>
                                                                            {hasAttendance ? (
                                                                                <span style={{ fontWeight: 700, color: '#16a34a' }}>{session.presentCount}</span>
                                                                            ) : (
                                                                                <span style={{ color: '#cbd5e1' }}>—</span>
                                                                            )}
                                                                        </td>
                                                                        <td style={{ textAlign: 'center' }}>
                                                                            {hasAttendance ? (
                                                                                <span style={{ fontWeight: 700, color: '#dc2626' }}>{session.absentCount}</span>
                                                                            ) : (
                                                                                <span style={{ color: '#cbd5e1' }}>—</span>
                                                                            )}
                                                                        </td>
                                                                        <td style={{ textAlign: 'right' }}>
                                                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                                                <button 
                                                                                    className="att-action-btn view"
                                                                                    onClick={() => {
                                                                                        setSelectedSession(session);
                                                                                        setIsAttendanceEdit(false);
                                                                                        setAttendanceOpen(true);
                                                                                    }}
                                                                                    title="Xem chi tiết"
                                                                                >
                                                                                    <Search size={14} />
                                                                                    <span>Chi tiết</span>
                                                                                </button>
                                                                                <button 
                                                                                    className="att-action-btn edit"
                                                                                    onClick={() => {
                                                                                        setSelectedSession(session);
                                                                                        setIsAttendanceEdit(true);
                                                                                        setAttendanceOpen(true);
                                                                                    }}
                                                                                    title="Chỉnh sửa điểm danh"
                                                                                >
                                                                                    <Pencil size={14} />
                                                                                    <span>Sửa</span>
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {sessions.filter(s => new Date(s.sessionDate) <= new Date()).length > 5 && (
                                                <button className="cd-view-all" onClick={() => setShowAllSessions(p => !p)}>
                                                    {showAllSessions ? 'Thu gọn' : `Xem tất cả ${sessions.filter(s => new Date(s.sessionDate) <= new Date()).length} buổi đã diễn ra`}
                                                </button>
                                            )}
                                        </>
                                    )}
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
                                            <span>Sĩ số hiện tại</span>
                                            <span className="cd-overview-val">{students.length} / {classData.maxStudents || 30}</span>
                                        </div>
                                        <div className="cd-overview-row">
                                             <span>Sĩ số tối đa</span>
                                             <span className="cd-overview-val">{classData.maxStudents || 30}</span>
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
                                        <div className="cd-schedule-box">
                                            <CalendarClock size={16} className="cd-schedule-icon" />
                                            <div className="cd-schedule-info">
                                                <div className="cd-schedule-title">Lịch học:</div>
                                                {classData.scheduleSlots.map((s, idx) => (
                                                    <div key={idx} className="cd-schedule-item">
                                                        {DAY_NAMES[s.dayOfWeek]} ({s.startTime}–{s.endTime})
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* ACADEMIC TAB */
                        <div className="cd-academic-tab">
                            {sessions.length === 0 ? (
                                <div className="cd-card" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                                    <BookOpen size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                                    <p>Chưa có dữ liệu buổi học cho lớp này.</p>
                                </div>
                            ) : (
                                <div className="cd-session-list">
                                    {sessions.map((session) => (
                                        <div key={session.sessionId} className={`cd-session-item ${expandedSessionId === session.sessionId ? 'expanded' : ''}`}>
                                            <div 
                                                className="cd-session-header"
                                                onClick={() => handleToggleExpand(session.sessionId)}
                                            >
                                                <div className="cd-session-idx">Buổi {session.sessionNum}</div>
                                                <div className="cd-session-main">
                                                    <div className="cd-session-title-row">
                                                        <h4>{session.title}</h4>
                                                        <span className="cd-session-date-tag">{session.date}</span>
                                                    </div>
                                                    <div className="cd-session-meta-row">
                                                        <span>{session.dayLabel} • {session.time}</span>
                                                        <span className="cd-dot">•</span>
                                                        <span style={{ color: '#2563eb', fontWeight: 500 }}>
                                                            {loadingItems[session.sessionId] ? (
                                                                <Loader2 size={12} className="cd-spinner" style={{ display: 'inline', marginRight: '4px' }} />
                                                            ) : (
                                                                (session.materials?.length || 0) + (session.assignments?.length || 0)
                                                            )} tệp đính kèm
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="cd-session-toggle">
                                                    {expandedSessionId === session.sessionId ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                </div>
                                            </div>

                                            {expandedSessionId === session.sessionId && (
                                                <div className="cd-session-body">
                                                    {loadingItems[session.sessionId] ? (
                                                        <div className="cd-loading-inline" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                                                            <Loader2 size={24} className="cd-spinner" style={{ margin: '0 auto 10px' }} />
                                                            <p style={{ fontSize: '0.875rem' }}>Đang tải tài liệu...</p>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {/* Materials */}
                                                            <div className="cd-session-section">
                                                                <div className="cd-session-section-title">
                                                                    <BookOpen size={16} />
                                                                    <span>Tài liệu bài học ({(session.materials || []).length})</span>
                                                                </div>
                                                                <div className="cd-item-grid">
                                                                    {(session.materials || []).length === 0 ? (
                                                                        <p className="cd-empty-inner">Không có tài liệu.</p>
                                                                    ) : (
                                                                        session.materials.map(mat => (
                                                                            <div key={mat.id} className="cd-resource-card">
                                                                                <div className="cd-resource-icon">{getFileIcon(mat.type)}</div>
                                                                                <div className="cd-resource-info" onClick={() => setDetailMaterial(mat)}>
                                                                                    <div className="cd-resource-name">{mat.title}</div>
                                                                                    <div className="cd-resource-meta">{mat.size} • {mat.fileName}</div>
                                                                                </div>
                                                                                <button 
                                                                                    className="cd-resource-download"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleDownload(mat);
                                                                                    }}
                                                                                    title="Tải xuống"
                                                                                >
                                                                                    <Download size={16} />
                                                                                </button>
                                                                            </div>
                                                                        ))
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Assignments */}
                                                            <div className="cd-session-section">
                                                                <div className="cd-session-section-title">
                                                                    <ClipboardCheck size={16} />
                                                                    <span>Bài tập về nhà ({(session.assignments || []).length})</span>
                                                                </div>
                                                                <div className="cd-item-grid">
                                                                    {(session.assignments || []).length === 0 ? (
                                                                        <p className="cd-empty-inner">Không có bài tập.</p>
                                                                    ) : (
                                                                        session.assignments.map(asm => (
                                                                            <div key={asm.id} className="cd-resource-card assignment">
                                                                                <div className="cd-resource-icon">{getFileIcon(asm.type)}</div>
                                                                                <div className="cd-resource-info" onClick={() => setDetailAssignment(asm)}>
                                                                                    <div className="cd-resource-name">{asm.title}</div>
                                                                                    <div className="cd-resource-meta">Hạn: {asm.dueDate} • {asm.fileName}</div>
                                                                                </div>
                                                                                <button 
                                                                                    className="cd-resource-download"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleDownload(asm);
                                                                                    }}
                                                                                    title="Tải xuống"
                                                                                >
                                                                                    <Download size={16} />
                                                                                </button>
                                                                            </div>
                                                                        ))
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
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

                                    {selectedStudentIds.size > 0 && (
                                        <div className="cd-batch-actions" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Đã chọn <strong>{selectedStudentIds.size}</strong> học sinh</span>
                                            <button 
                                                className="cd-btn-primary" 
                                                style={{ padding: '6px 16px', fontSize: '0.85rem' }}
                                                onClick={handleBatchAdd}
                                                disabled={batchAdding}
                                            >
                                                {batchAdding ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Thêm các bạn đã chọn'}
                                            </button>
                                        </div>
                                    )}

                                    {filteredAvailable.length === 0 ? (
                                        <div className="cd-add-empty">
                                            {availableStudents.length === 0
                                                ? 'Tất cả học sinh trong trung tâm đã có trong lớp này.'
                                                : 'Không tìm thấy học sinh phù hợp.'}
                                        </div>
                                    ) : (
                                        <div className="cd-student-pick-list">
                                            {filteredAvailable.map(s => (
                                                <div 
                                                    key={s.userId} 
                                                    className={`cd-student-pick-item${selectedStudentIds.has(s.userId) ? ' selected' : ''}`}
                                                    onClick={() => toggleStudentSelection(s.userId)}
                                                    style={{ cursor: 'pointer', transition: 'all 0.2s', background: selectedStudentIds.has(s.userId) ? '#f0f9ff' : 'transparent' }}
                                                >
                                                    <div className="cd-pick-checkbox" style={{ marginRight: '10px' }}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedStudentIds.has(s.userId)} 
                                                            onChange={() => {}} // Controlled by parent div click
                                                            style={{ cursor: 'pointer' }}
                                                        />
                                                    </div>
                                                    <div className="cd-avatar">{getInitials(s.fullName)}</div>
                                                    <div className="cd-pick-info">
                                                        <div className="cd-student-name">{s.fullName}</div>
                                                    </div>
                                                    <button
                                                        className="cd-btn-pick"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleAddStudent(s);
                                                        }}
                                                        disabled={addingStudentId === s.userId || actionLoading || batchAdding}
                                                    >
                                                        {addingStudentId === s.userId ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <><Plus size={14} /> Thêm</>}
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
                                <div className="delete-modal-warning-text">
                                    Hàn động này sẽ xóa <strong>{removeModal.student?.fullName}</strong> khỏi danh sách lớp. Kết quả học tập và điểm danh (nếu có) sẽ bị ảnh hưởng.
                                </div>
                            </div>
                        </div>
                        <div className="delete-modal-footer">
                            <button className="btn-delete-cancel" onClick={() => setRemoveModal({ show: false, student: null })}>Hủy</button>
                            <button className="btn-delete-confirm" onClick={handleRemoveStudent} disabled={actionLoading}>
                                {actionLoading ? 'Đang xóa...' : 'Xác nhận xóa'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Attendance Modal */}
            {attendanceOpen && selectedSession && (
                <AttendanceModal
                    isOpen={attendanceOpen}
                    onClose={() => setAttendanceOpen(false)}
                    session={{
                        ...selectedSession,
                        dayLabel: selectedSession.dayLabel,
                        date: selectedSession.date,
                        time: selectedSession.time
                    }}
                    sessionId={selectedSession.sessionId}
                    students={students.map(s => ({
                        id: String(s.userId),
                        name: s.fullName,
                        avatar: getInitials(s.fullName)
                    }))}
                    canAttend={isAttendanceEdit}
                    isAdmin={true}
                    lockMessage={!isAttendanceEdit ? "Bạn đang ở chế độ xem chi tiết điểm danh." : ""}
                    onSave={async () => {
                        await fetchSessionsAndAttendance();
                    }}
                />
            )}

            {/* Material Detail Modal */}
            {detailMaterial && (
                <MaterialDetailModal
                    isOpen={!!detailMaterial}
                    onClose={() => setDetailMaterial(null)}
                    material={detailMaterial}
                />
            )}

            {/* Assignment Detail Modal */}
            {detailAssignment && (
                <AssignmentDetailModal
                    isOpen={!!detailAssignment}
                    onClose={() => setDetailAssignment(null)}
                    assignment={detailAssignment}
                />
            )}

            {/* Edit Class Modal */}
            {editModalOpen && (
                <CreateClassModal
                    isOpen={editModalOpen}
                    onClose={() => setEditModalOpen(false)}
                    onSubmit={handleEditSubmit}
                    editingClass={classData ? {
                        id: classData.classId,
                        name: classData.className,
                        subject: classData.subjectName,
                        mainTeacher: classData.teacherName ? { id: classData.teacherId, name: classData.teacherName } : null,
                        assistant: classData.assistantName ? { id: classData.assistantId, name: classData.assistantName } : null,
                        roomName: classData.roomName || '',
                        roomId: classData.roomId,
                        gradeId: classData.gradeId,
                        description: classData.description || '',
                        syllabusContent: classData.syllabusContent || '',
                        pricePerSession: classData.pricePerSession ?? '',
                        startDate: classData.startDate ? classData.startDate.split('T')[0] : '',
                        endDate: classData.endDate ? classData.endDate.split('T')[0] : '',
                        maxStudents: classData.maxStudents ?? 30,
                        status: classData.status?.toLowerCase() || 'active',
                        scheduleSlots: (classData.scheduleSlots || []).map(s => ({
                            day: ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][s.dayOfWeek] || '',
                            startTime: s.startTime,
                            endTime: s.endTime,
                            roomId: s.roomId,
                            roomName: s.roomName
                        }))
                    } : null}
                    subjects={subjects}
                    teachersList={teachers}
                    assistantsList={assistants}
                    roomsList={rooms}
                    gradesList={grades}
                />
            )}
        </div>
    );
};

export default ClassDetail;
