import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
    ChevronLeft, Calendar, Clock, ChevronRight,
    Search, X,
    CheckCircle, UserCheck, CalendarClock,
    MessageSquare, Pencil, Lock, Edit2,
    FileText, Download, Plus, PlayCircle, MoreVertical, Trash2,
    ChevronDown, ChevronUp, CheckSquare, Library, BookOpen
} from 'lucide-react';
import TeacherSidebar from '../../components/TeacherSidebar';
import AttendanceModal from '../../components/AttendanceModal';
import ScheduleRequestModal from '../../components/ScheduleRequestModal';
import UploadMaterialModal from '../../components/UploadMaterialModal';
import EditMaterialModal from '../../components/EditMaterialModal';
import DeleteMaterialModal from '../../components/DeleteMaterialModal';
import MaterialDetailModal from '../../components/MaterialDetailModal';
import ImportLibraryModal from '../../components/ImportLibraryModal';
import CreateAssignmentModal from '../../components/CreateAssignmentModal';
import AssignmentDetailModal from '../../components/AssignmentDetailModal';
import '../../css/pages/center/ClassDetail.css';
import '../../css/components/AttendanceModal.css';

/* ─── Date helper ──────────────────────────────── */
const parseDate = (str) => {
    const [d, m, y] = str.split('/');
    return new Date(Number(y), Number(m) - 1, Number(d));
};
const today = new Date();
today.setHours(0, 0, 0, 0);

const isPast = (dateStr) => parseDate(dateStr) <= today;
const isFuture = (dateStr) => parseDate(dateStr) > today;

const formatSize = (bytes) => {
    if (!bytes) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/* ─── Helpers format ngày từ API ─────────────────── */
const DAY_LABELS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

function formatDateVN(isoDate) {
    const d = new Date(isoDate);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}



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

// Mock Library Data (would be fetched from API)
const LIBRARY_MATERIALS = [
    { id: 101, name: 'Giáo trình Toán Học Đại cương Tập 1.pdf', size: '5.2 MB', uploadDate: '01/09/2023', type: 'pdf', description: 'Sách giáo khoa điện tử chương trình cơ bản.' },
    { id: 102, name: 'Video Hướng dẫn Giải Phương trình Bậc 2.mp4', size: '125 MB', uploadDate: '05/09/2023', type: 'video', description: 'Cách bấm máy tính Casio để giải nhanh.' },
    { id: 103, name: 'Bài Tập Trắc Nghiệm Chương 1 (Bản gốc).docx', size: '1.2 MB', uploadDate: '10/09/2023', type: 'word', description: 'Dùng để soạn đề cho các lớp.' },
    { id: 104, name: 'Tài liệu Ôn Tập Giữa Kỳ.pdf', size: '3.4 MB', uploadDate: '12/10/2023', type: 'pdf', description: 'Các dạng toán thường ra trong đề thi.' },
];

// Centralized mapping functions to ensure consistency
const mapMaterial = (m) => ({
    id: m.materialId || m.MaterialId,
    materialId: m.materialId || m.MaterialId,
    name: m.title || m.Title || '',
    title: m.title || m.Title || '', // Added title for EditMaterialModal consumption
    size: formatSize(m.fileSize || m.FileSize),
    fileSize: m.fileSize || m.FileSize,
    originalFileName: m.originalFileName || m.OriginalFileName || '',
    fileName: m.originalFileName || m.OriginalFileName || '', // For modal consistency
    uploadDate: '',
    type: (m.contentType || m.ContentType)?.toLowerCase().includes('pdf') ? 'pdf'
        : (m.contentType || m.ContentType)?.toLowerCase().includes('word') ? 'word'
        : (m.contentType || m.ContentType)?.toLowerCase().includes('video') ? 'video' : 'other',
    fileUrl: m.fileUrl || m.FileUrl,
    description: m.description || m.Description || '',
    sessionId: m.sessionId || m.SessionId,
    classId: m.classId || m.ClassId
});

const mapAssignment = (a) => ({
    id: a.asmId || a.AsmId,
    asmId: a.asmId || a.AsmId,
    title: a.title || a.Title || '',
    description: a.description || a.Description || '',
    dueDate: (a.endTime || a.EndTime) ? new Date(a.endTime || a.EndTime).toLocaleDateString('vi-VN') : 'Chưa thiết lập',
    endTime: a.endTime || a.EndTime,
    startTime: a.startTime || a.StartTime,
    submissionsCount: 0,
    fileUrl: a.fileUrl || a.FileUrl,
    fileSize: a.fileSize || a.FileSize,
    originalFileName: a.originalFileName || a.OriginalFileName || '',
    fileName: a.originalFileName || a.OriginalFileName || '', // For modal consistency
    sessionId: a.sessionId || a.SessionId,
    classId: a.classId || a.ClassId
});

/* ─── Main Component ────────────────────────────── */
const TeacherClassDetail = ({ isTA = false }) => {
    const { classId } = useParams();

    // API data state
    const [classInfo, setClassInfo] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [libraryMaterials, setLibraryMaterials] = useState([]);
    const [libraryAssignments, setLibraryAssignments] = useState([]);

    // classData dùng trong UI — gộp từ API + defaults
    const [classData, setClassData] = useState({
        id: null, name: '', subject: '', gradeLevel: '', status: 'active',
        schedule: '', scheduleTime: '', startDate: '', duration: '',
        mainTeacher: { name: '', initials: '?' },
        assistant: null,
        sessions: [],
        activities: [],
        classesCompleted: 0,
        totalClasses: 0,
    });

    // Fetch class info
    useEffect(() => {
        if (!classId) return;
        const fetchAll = async () => {
            setLoading(true);
            try {
                const [classRes, sessionsRes, studentsRes] = await Promise.all([
                    api.get(`/Classes/${classId}`),
                    api.get(`/Classes/${classId}/sessions`),
                    api.get(`/Classes/${classId}/students`),
                ]);

                const c = classRes.data;
                const rawSessions = sessionsRes.data || [];
                const rawStudents = studentsRes.data || [];

                // Map sessions từ BE sang format UI
                const mappedSessions = rawSessions.map((s, idx) => ({
                    sessionId: s.sessionId,
                    sessionNum: idx + 1,
                    date: formatDateVN(s.sessionDate),
                    dayLabel: s.dayLabel || DAY_LABELS[new Date(s.sessionDate).getDay()],
                    time: s.time || '',
                    title: s.title || `Buổi ${idx + 1}`,
                    status: s.status,
                    materials: [],
                    assignments: [],
                }));

                // Map students từ BE
                const mappedStudents = rawStudents.map(st => ({
                    id: Number(st.userId),
                    name: st.fullName || st.username || '',
                    avatar: (st.fullName || st.username || '?').split(' ').map(w => w[0]).slice(-2).join('').toUpperCase(),
                    attendance: 0,
                    lastAttended: '',
                    grade: '',
                }));

                // Build schedule display string
                const scheduleSlots = c.scheduleSlots || [];
                const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                const scheduleStr = scheduleSlots.map(s => dayNames[s.dayOfWeek]).join(' & ');
                const timeStr = scheduleSlots.length > 0
                    ? `${scheduleSlots[0].startTime} - ${scheduleSlots[0].endTime}`
                    : '';

                setClassData({
                    id: c.classId,
                    name: c.className || '',
                    subject: c.subjectName || '',
                    gradeLevel: '',
                    status: (c.status || 'Active').toLowerCase() === 'active' ? 'active' : 'inactive',
                    schedule: scheduleStr,
                    scheduleTime: timeStr,
                    startDate: c.startDate ? formatDateVN(c.startDate) : '',
                    duration: c.startDate && c.endDate
                        ? `${Math.ceil((new Date(c.endDate) - new Date(c.startDate)) / (1000 * 60 * 60 * 24 * 7))} tuần`
                        : '',
                    mainTeacher: {
                        name: c.teacherName || '',
                        initials: (c.teacherName || '?').split(' ').pop().charAt(0),
                        subject: '',
                    },
                    assistant: c.assistantName ? {
                        name: c.assistantName,
                        initials: c.assistantName.split(' ').pop().charAt(0),
                        subject: '',
                    } : null,
                    sessions: mappedSessions,
                    activities: [],
                    classesCompleted: mappedSessions.filter(s => isPast(s.date)).length,
                    totalClasses: mappedSessions.length,
                });

                setStudents(mappedStudents);
                setSessions(mappedSessions);

                // Fetch materials and assignments per session
                const sessionsWithItems = await Promise.all(
                    mappedSessions.map(async (s) => {
                        try {
                            const [matRes, asmRes] = await Promise.all([
                                api.get(`/Materials/Get-By-Session/${s.sessionId}`),
                                api.get(`/Assignments/Get-By-Session/${s.sessionId}`)
                            ]);
                            
                            const mats = (matRes.data || []).map(mapMaterial);
                            const asms = (asmRes.data || []).map(mapAssignment);

                            return { ...s, materials: mats, assignments: asms };
                        } catch {
                            return { ...s, materials: [], assignments: [] };
                        }
                    })
                );

                setClassData(prev => ({ ...prev, sessions: sessionsWithItems }));

                // Fetch libraries
                try {
                    const [libMatRes, libAsmRes] = await Promise.all([
                        api.get('/Materials'),
                        api.get('/Assignments')
                    ]);
                    
                    const allMaterials = libMatRes.data || [];
                    setLibraryMaterials(allMaterials.map(mapMaterial));

                    const allAssignments = libAsmRes.data || [];
                    setLibraryAssignments(allAssignments.map(mapAssignment));
                } catch {
                    setLibraryMaterials([]);
                    setLibraryAssignments([]);
                }
            } catch (err) {
                console.error('Failed to fetch class detail:', err);
                toast.error('Không thể tải thông tin lớp học.');
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [classId]);


    // Modals state
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [uploadTargetSession, setUploadTargetSession] = useState(null); // know which session getting the upload

    const [showAllStudents, setShowAllStudents] = useState(false);
    const [studentSearch, setStudentSearch] = useState('');

    // Tab State
    const [activeTab, setActiveTab] = useState('overview');

    // Expand/Collapse sessions
    const [expandedSessionId, setExpandedSessionId] = useState(null);

    // Pagination for students tab
    const [studentPage, setStudentPage] = useState(1);
    const studentsPerPage = 10;

    const [deleteMaterialId, setDeleteMaterialId] = useState(null);
    const [deleteAssignmentId, setDeleteAssignmentId] = useState(null);
    const [deleteTargetSession, setDeleteTargetSession] = useState(null);

    const [editMaterial, setEditMaterial] = useState(null);
    const [editTargetSession, setEditTargetSession] = useState(null);

    const [detailMaterial, setDetailMaterial] = useState(null);

    const [attendanceOpen, setAttendanceOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState(null);
    const [attendanceData, setAttendanceData] = useState(INITIAL_ATTENDANCE);

    // Import Modal
    const [importModal, setImportModal] = useState({ isOpen: false, type: 'material', targetSession: null });

    // Assignment Modals
    const [isCreateAssignmentOpen, setIsCreateAssignmentOpen] = useState(false);
    const [createAssignmentSession, setCreateAssignmentSession] = useState(null);
    const [editAssignment, setEditAssignment] = useState(null);
    const [detailAssignment, setDetailAssignment] = useState(null);

    // Reset page when searching
    useEffect(() => {
        setStudentPage(1);
    }, [studentSearch]);

    // State cho Modal yêu cầu thay đổi
    const [requestOpen, setRequestOpen] = useState(false);
    const [requestInitialData, setRequestInitialData] = useState(null);

    const getFileIcon = (type) => {
        switch (type) {
            case 'pdf': return <FileText size={24} color="#ef4444" />;
            case 'word': return <FileText size={24} color="#2563eb" />;
            case 'video': return <PlayCircle size={24} color="#8b5cf6" />;
            default: return <FileText size={24} color="#64748b" />;
        }
    };

    // Fetch materials/assignments for a single session (re-fetch sau khi upload/import)
    const refreshSessionMaterials = async (sessionId) => {
        try {
            const [matRes, asmRes] = await Promise.all([
                api.get(`/Materials/Get-By-Session/${sessionId}`),
                api.get(`/Assignments/Get-By-Session/${sessionId}`)
            ]);
            
            const mats = (matRes.data || []).map(mapMaterial);
            const asms = (asmRes.data || []).map(mapAssignment);

            setClassData(prev => ({
                ...prev,
                sessions: prev.sessions.map(s =>
                    Number(s.sessionId) === Number(sessionId) ? { ...s, materials: mats, assignments: asms } : s
                ),
            }));
        } catch {
            /* ignore */ 
        }
    };

    const handleUploadMaterial = async () => {
        // UploadMaterialModal đã tự gọi API và upload xong → chỉ cần refresh
        if (uploadTargetSession) {
            await refreshSessionMaterials(uploadTargetSession);
        }
        setUploadModalOpen(false);
        setUploadTargetSession(null);
    };

    const handleDeleteMaterial = async () => {
        if (!deleteMaterialId || !deleteTargetSession) return;
        try {
            await api.delete(`/Materials/${deleteMaterialId}`);
            setClassData(prev => {
                const newSessions = prev.sessions.map(s => {
                    if (s.sessionId !== deleteTargetSession) return s;
                    return {
                        ...s,
                        materials: s.materials.filter(m => m.id !== deleteMaterialId)
                    };
                });
                return { ...prev, sessions: newSessions };
            });
            toast.success("Đã xóa tài liệu khỏi buổi học!");
        } catch (err) {
            console.error('Delete material error:', err);
            toast.error('Không thể xóa tài liệu. Vui lòng thử lại.');
        } finally {
            setDeleteMaterialId(null);
            setDeleteTargetSession(null);
        }
    };

    const handleDeleteAssignment = async () => {
        if (!deleteAssignmentId || !deleteTargetSession) return;
        try {
            await api.delete(`/Assignments/${deleteAssignmentId}`);
            setClassData(prev => {
                const newSessions = prev.sessions.map(s => {
                    if (s.sessionId !== deleteTargetSession) return s;
                    return {
                        ...s,
                        assignments: s.assignments.filter(a => a.id !== deleteAssignmentId)
                    };
                });
                return { ...prev, sessions: newSessions };
            });
            toast.success("Đã xóa bài tập khỏi buổi học!");
        } catch (err) {
            console.error('Delete assignment error:', err);
            toast.error('Không thể xóa bài tập. Vui lòng thử lại.');
        } finally {
            setDeleteAssignmentId(null);
            setDeleteTargetSession(null);
        }
    };

    const handleUpdateMaterial = (updatedData) => {
        // updatedData có thể là null nếu modal gọi onClose/onUpdate() không kèm tham số
        // Chúng ta vẫn cần refresh nếu có editTargetSession
        const sessId = editTargetSession;
        
        setEditMaterial(null);
        setEditTargetSession(null);
        
        // Luôn refresh để đảm bảo ID và meta chuẩn từ server
        if (sessId) {
            refreshSessionMaterials(sessId);
        }
    };

    const handleEditAssignment = (asm, sessionId) => {
        setEditTargetSession(sessionId);
        setEditAssignment(asm);
        setIsCreateAssignmentOpen(true);
    };

    const handleImportFromLibrary = async (selectedItems) => {
        const targetSession = importModal.targetSession;
        const type = importModal.type;
        try {
            const endpoint = type === 'material' ? '/Materials/import' : '/Assignments/import';
            
            // Tìm buổi tiếp theo để làm hạn nộp mặc định (nếu là assignment)
            let defaultEndTime = null;
            if (type === 'assignment') {
                const currentIdx = classData.sessions.findIndex(s => Number(s.sessionId) === Number(targetSession));
                const nextSess = classData.sessions[currentIdx + 1];
                if (nextSess && nextSess.date) {
                    // Chuyển format DD/MM/YYYY sang YYYY-MM-DD để tạo Date object
                    const [d, m, y] = nextSess.date.split('/');
                    defaultEndTime = new Date(`${y}-${m}-${d}T23:59:00`).toISOString();
                } else {
                    // Mặc định 7 ngày sau buổi hiện tại
                    const currSess = classData.sessions[currentIdx];
                    if (currSess && currSess.date) {
                        const [d, m, y] = currSess.date.split('/');
                        const dt = new Date(`${y}-${m}-${d}`);
                        dt.setDate(dt.getDate() + 7);
                        defaultEndTime = dt.toISOString();
                    }
                }
            }

            await Promise.all(selectedItems.map(item =>
                api.post(endpoint, {
                    sourceId: item.id,
                    targetSessionId: targetSession,
                    endTime: defaultEndTime
                })
            ));

            toast.success(`Đã import ${selectedItems.length} mục vào buổi học!`);
            await refreshSessionMaterials(targetSession);
        } catch (err) {
            console.error('Import error:', err);
            toast.error('Lỗi khi import từ thư viện.');
        }
        setImportModal({ isOpen: false, type: 'material', targetSession: null });
    };

    const handleDownloadMaterial = (item) => {
        const downloadUrl = item.fileUrl || item.url;
        if (item.rawFile) {
            const url = URL.createObjectURL(item.rawFile);
            const a = document.createElement('a');
            a.href = url;
            a.download = item.name || item.title;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } else if (downloadUrl) {
            toast.success(`Đang tải xuống: ${item.name || item.title}`);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = item.name || item.title;
            a.target = "_blank";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            toast.error("Không có đường dẫn tải về");
        }
    };


    const handleSaveAssignment = async (assignmentFormData) => {
        try {
            let savedAsm = null;
            if (editAssignment) {
                const res = await api.put(`/Assignments/${editAssignment.id}`, assignmentFormData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                savedAsm = res.data;
                toast.success("Cập nhật bài tập thành công!");
            } else {
                const res = await api.post('/Assignments/Create-Assignments', assignmentFormData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                savedAsm = res.data;
                toast.success("Tạo bài tập thành công!");
            }

            const targetSessionId = editTargetSession || createAssignmentSession || (savedAsm && (savedAsm.sessionId || savedAsm.SessionId));
            
            setIsCreateAssignmentOpen(false);
            setEditAssignment(null);
            setEditTargetSession(null);
            setCreateAssignmentSession(null);

            // Cập nhật state local ngay lập tức hoặc refresh
            if (targetSessionId) {
                await refreshSessionMaterials(targetSessionId);
                
                // Nếu đang xem chi tiết bài tập này -> cập nhật luôn detail
                if (savedAsm && detailAssignment && (detailAssignment.id === (savedAsm.asmId || savedAsm.AsmId || savedAsm.id || savedAsm.Id))) {
                    setDetailAssignment(mapAssignment({ ...savedAsm, sessionId: targetSessionId, classId: classData.id }));
                }
            }
        } catch (error) {
            console.error('Error saving assignment:', error);
            const msg = error.response?.data?.message || error.message || 'Có lỗi xảy ra khi lưu bài tập.';
            toast.error(msg);
        }
    };

    const handleToggleSession = (id) => {
        setExpandedSessionId(prev => prev === id ? null : id);
    };

    /* --- derived --- */
    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.id.toLowerCase().includes(studentSearch.toLowerCase())
    );

    // Filter students cho tab Overview (chỉ show max 5)
    const displayedStudentsOverview = showAllStudents ? filteredStudents : filteredStudents.slice(0, 5);

    // Pagination students cho tab Học Sinh
    const totalStudentPages = Math.ceil(filteredStudents.length / studentsPerPage);
    const currentStudentsPage = filteredStudents.slice((studentPage - 1) * studentsPerPage, studentPage * studentsPerPage);

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

    // Stats
    const materialsCount = classData.sessions.reduce((acc, s) => acc + (s.materials?.length || 0), 0);
    const assignmentsCount = classData.sessions.reduce((acc, s) => acc + (s.assignments?.length || 0), 0);

    if (loading) {
        return (
            <div className="class-detail">
                <TeacherSidebar isTA={isTA} />
                <main className="cd-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                    <p style={{ color: '#64748b', fontSize: '1rem' }}>Đang tải thông tin lớp học...</p>
                </main>
            </div>
        );
    }

    return (
        <div className="class-detail">
            <TeacherSidebar isTA={isTA} />

            <main className="cd-main">
                {/* Breadcrumb */}
                <div className="cd-breadcrumb">
                    <Link to={isTA ? "/ta/classes" : "/teacher/classes"} className="cd-back">
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

                {/* Tabs Nav */}
                <div className="cd-tabs-nav">
                    <button
                        className={`cd-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        Tổng quan
                    </button>
                    <button
                        className={`cd-tab-btn ${activeTab === 'students' ? 'active' : ''}`}
                        onClick={() => setActiveTab('students')}
                    >
                        Học sinh ({students.length})
                    </button>
                    <button
                        className={`cd-tab-btn ${activeTab === 'roadmap' ? 'active' : ''}`}
                        onClick={() => setActiveTab('roadmap')}
                    >
                        Lộ trình học ({classData.sessions.length} buổi)
                    </button>
                </div>

                <div className="cd-tab-content">
                    {activeTab === 'overview' && (
                        <div className="cd-content-grid">
                            {/* LEFT */}
                            <div className="cd-left">


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
                                                        const done = !!attendanceData[session.sessionId];
                                                        const { present, absent } = getSessionSummary(session.sessionId);
                                                        return (
                                                            <tr key={session.sessionId}>
                                                                <td>
                                                                    <div className="att-date-cell">
                                                                        <span className="att-session-num">Buổi {session.sessionNum} - {session.title}</span>
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
                                                &nbsp;(buổi gần nhất: Buổi {futureSessions[0].sessionNum})
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
                                                <span>Buổi tiếp theo: Buổi {futureSessions[0].sessionNum} - {futureSessions[0].date}</span>
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
                    )}

                    {activeTab === 'students' && (
                        <div className="cd-students-tab">
                            <div className="cd-section-header">
                                <h2>Danh sách học sinh của lớp</h2>
                                <div className="student-search-box">
                                    <Search size={16} />
                                    <input
                                        type="text"
                                        placeholder="Tìm học sinh theo tên/mã..."
                                        value={studentSearch}
                                        onChange={(e) => setStudentSearch(e.target.value)}
                                    />
                                </div>
                            </div>

                            <table className="cd-roster-table">
                                <thead>
                                    <tr>
                                        <th>HỌ VÀ TÊN</th>
                                        <th>MÃ SỐ</th>
                                        <th>ĐIỂM TRUNG BÌNH</th>
                                        <th>CHUYÊN CẦN</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentStudentsPage.length > 0 ? (
                                        currentStudentsPage.map(student => (
                                            <tr key={student.id}>
                                                <td>
                                                    <div className="cd-student-cell">
                                                        <div className="cd-avatar">{student.avatar}</div>
                                                        <div className="cd-student-name">{student.name}</div>
                                                    </div>
                                                </td>
                                                <td><span className="cd-student-id">ID: #{student.id}</span></td>
                                                <td><GradeBadge grade={student.grade} /></td>
                                                <td><AttendanceBar value={student.attendance} /></td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="text-center py-4 text-gray-500">
                                                Không tìm thấy học sinh nào phù hợp.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                            {/* Pagination Controls */}
                            {totalStudentPages > 1 && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderTop: '1px solid #e2e8f0', background: 'white', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                                        Hiển thị <strong>{(studentPage - 1) * studentsPerPage + 1}</strong> - <strong>{Math.min(studentPage * studentsPerPage, filteredStudents.length)}</strong> trong <strong>{filteredStudents.length}</strong> học sinh
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button
                                            onClick={() => setStudentPage(p => Math.max(1, p - 1))}
                                            disabled={studentPage === 1}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', border: '1px solid #cbd5e1', borderRadius: '4px', background: studentPage === 1 ? '#f8fafc' : 'white', color: studentPage === 1 ? '#94a3b8' : '#334155', cursor: studentPage === 1 ? 'not-allowed' : 'pointer' }}
                                        >
                                            <ChevronLeft size={14} />
                                        </button>

                                        {Array.from({ length: totalStudentPages }, (_, i) => i + 1).map(page => (
                                            <button
                                                key={page}
                                                onClick={() => setStudentPage(page)}
                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', border: page === studentPage ? 'none' : '1px solid #cbd5e1', borderRadius: '4px', background: page === studentPage ? '#3b82f6' : 'white', color: page === studentPage ? 'white' : '#334155', fontSize: '12px', fontWeight: page === studentPage ? '600' : '400', cursor: 'pointer' }}
                                            >
                                                {page}
                                            </button>
                                        ))}

                                        <button
                                            onClick={() => setStudentPage(p => Math.min(totalStudentPages, p + 1))}
                                            disabled={studentPage === totalStudentPages}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', border: '1px solid #cbd5e1', borderRadius: '4px', background: studentPage === totalStudentPages ? '#f8fafc' : 'white', color: studentPage === totalStudentPages ? '#94a3b8' : '#334155', cursor: studentPage === totalStudentPages ? 'not-allowed' : 'pointer' }}
                                        >
                                            <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'roadmap' && (
                        <div className="cd-roadmap-tab" style={{ '--accent': '#3b82f6' }}>
                            <div style={{ marginBottom: 16 }}>
                                <h2>Lộ trình học & Tài liệu</h2>
                                <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: 4 }}>Quản lý bài giảng và bài tập theo từng buổi học. Gồm {materialsCount} tài liệu và {assignmentsCount} bài tập.</p>
                            </div>

                            {classData.sessions.map((session) => {
                                const isExpanded = expandedSessionId === session.sessionId;
                                const mats = session.materials || [];
                                const asms = session.assignments || [];
                                const hasContent = mats.length > 0 || asms.length > 0;

                                return (
                                    <div key={session.sessionId} className="cd-session-card">
                                        <div className="cd-session-header" onClick={() => handleToggleSession(session.sessionId)}>
                                            <div className="cd-session-info">
                                                <div className="cd-session-num">Buổi {session.sessionNum}</div>
                                                <div className="cd-session-title">
                                                    <h4>{session.title || `Buổi học ${session.date}`}</h4>
                                                    <div className="cd-session-meta">
                                                        <Calendar size={13} /> {session.dayLabel}, {session.date}
                                                        <span className="dot">•</span>
                                                        <Clock size={13} /> {session.time}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="cd-session-status">
                                                {hasContent && (
                                                    <span className="cd-session-item-badge">
                                                        {mats.length > 0 && <><FileText size={12} style={{ marginRight: 4 }} /> {mats.length}</>}
                                                        {mats.length > 0 && asms.length > 0 && <span style={{ margin: '0 4px', color: '#cbd5e1' }}>|</span>}
                                                        {asms.length > 0 && <><CheckSquare size={12} style={{ marginRight: 4 }} /> {asms.length}</>}
                                                    </span>
                                                )}
                                                {isExpanded ? <ChevronUp size={20} color="#64748b" /> : <ChevronDown size={20} color="#64748b" />}
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="cd-session-content">
                                                {/* Materials Section */}
                                                <div className="cd-session-section">
                                                    <div className="cd-session-section-header">
                                                        <h5><BookOpen size={16} /> Tài liệu bài giảng</h5>
                                                        {!isTA && (
                                                            <div style={{ display: 'flex' }}>
                                                                <button
                                                                    className="cd-btn-import-lib"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setImportModal({ isOpen: true, type: 'material', targetSession: session.sessionId });
                                                                    }}
                                                                >
                                                                    <Library size={14} /> Thêm từ Thư viện
                                                                </button>
                                                                <button className="cd-btn-add-item" style={{ marginLeft: 12 }} onClick={() => {
                                                                    setUploadTargetSession(session.sessionId);
                                                                    setUploadModalOpen(true);
                                                                }}>
                                                                    <Plus size={14} /> Tải lên mới
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {mats.length > 0 ? (
                                                        <div className="material-items-grid">
                                                            {mats.map(item => (
                                                                <div key={item.id} className="material-card" onClick={() => setDetailMaterial(item)} style={{ cursor: 'pointer' }}>
                                                                    <div className="material-icon">{getFileIcon(item.type)}</div>
                                                                    <div className="material-info">
                                                                        <h4 className="material-name">{item.name}</h4>
                                                                        <div className="material-meta"><span>{item.size}</span><span className="dot">•</span><span>{item.uploadDate}</span></div>
                                                                    </div>
                                                                    <div className="material-actions" onClick={(e) => e.stopPropagation()}>
                                                                        <button className="btn-icon" title="Tải xuống" onClick={() => handleDownloadMaterial(item)}><Download size={16} /></button>
                                                                        {!isTA && (
                                                                            <>
                                                                                <button className="btn-icon text-blue-600" title="Chỉnh sửa" onClick={() => { setEditTargetSession(session.sessionId); setEditMaterial({ ...item, sessionId: session.sessionId, classId: classData.id }); }}><Edit2 size={16} /></button>
                                                                                <button className="btn-icon text-red-600" title="Xóa" onClick={() => { setDeleteTargetSession(session.sessionId); setDeleteMaterialId(item.id); }}><Trash2 size={16} /></button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: '4px 0 0' }}>Chưa có tài liệu đính kèm.</p>
                                                    )}
                                                </div>

                                                {/* Assignments Section */}
                                                <div className="cd-session-section" style={{ marginTop: 32 }}>
                                                    <div className="cd-session-section-header">
                                                        <h5><CheckSquare size={16} /> Bài tập về nhà</h5>
                                                        {!isTA && (
                                                            <div style={{ display: 'flex' }}>
                                                                <button
                                                                    className="cd-btn-import-lib"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setImportModal({ isOpen: true, type: 'assignment', targetSession: session.sessionId });
                                                                    }}
                                                                >
                                                                    <Library size={14} /> Thêm từ Bộ đề
                                                                </button>
                                                                <button
                                                                    className="cd-btn-add-item"
                                                                    style={{ marginLeft: 12 }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setCreateAssignmentSession(session.sessionId);
                                                                        setIsCreateAssignmentOpen(true);
                                                                    }}
                                                                >
                                                                    <Plus size={14} /> Tạo bài tập
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {asms.length > 0 ? (
                                                        <div className="material-items-grid">
                                                            {asms.map(asm => (
                                                                <div key={asm.id} className="material-card" style={{ borderLeft: '3px solid #f59e0b', cursor: 'pointer' }} onClick={() => setDetailAssignment(asm)}>
                                                                    <div className="material-icon" style={{ color: '#f59e0b' }}><CheckSquare size={24} /></div>
                                                                    <div className="material-info">
                                                                        <h4 className="material-name">{asm.title}</h4>
                                                                        <div className="material-meta"><Clock size={12} /> Hạn: {asm.dueDate} &nbsp;•&nbsp; {asm.submissionsCount} bài nộp</div>
                                                                    </div>
                                                                    <div className="material-actions" onClick={(e) => e.stopPropagation()}>
                                                                        <Link to={isTA ? `/ta/assignments/${asm.id}/grade` : `/teacher/assignments/${asm.id}/grade`} className="btn-icon text-blue-600" title="Chấm bài" style={{ width: 'auto', padding: '0 10px', fontSize: '0.8125rem', fontWeight: 600 }}>
                                                                            Chấm bài
                                                                        </Link>
                                                                        {!isTA && (
                                                                            <>
                                                                                <button className="btn-icon text-blue-600" title="Chỉnh sửa" onClick={() => handleEditAssignment({ ...asm, sessionId: session.sessionId, classId: classData.id }, session.sessionId)}><Edit2 size={16} /></button>
                                                                                <button className="btn-icon text-red-600" title="Xóa" onClick={() => { setDeleteTargetSession(session.sessionId); setDeleteAssignmentId(asm.id); }}><Trash2 size={16} /></button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: '4px 0 0' }}>Chưa có bài tập đính kèm.</p>
                                                    )}
                                                </div>

                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            {/* Attendance Modal */}
            {
                attendanceOpen && selectedSession && (
                    <AttendanceModal
                        isOpen={attendanceOpen}
                        onClose={handleClose}
                        onSave={handleSave}
                        session={selectedSession}
                        students={students}
                        existingRecords={attendanceData[selectedSession.scheduleId]}
                    />
                )
            }

            {/* Request Change Modal */}
            {
                requestOpen && (
                    <ScheduleRequestModal
                        isOpen={requestOpen}
                        onClose={() => setRequestOpen(false)}
                        onSend={(payload) => {
                            console.log("Schedule Request Sent from Detail:", payload);
                            setRequestOpen(false);
                        }}
                        initialData={requestInitialData}
                    />
                )
            }

            {/* Upload Material Modal */}
            {
                uploadModalOpen && (
                    <UploadMaterialModal
                        isOpen={uploadModalOpen}
                        onClose={() => setUploadModalOpen(false)}
                        onUpload={handleUploadMaterial}
                        sessionId={uploadTargetSession}
                    />
                )
            }

            {/* Edit Material Modal */}
            {
                editMaterial && (
                    <EditMaterialModal
                        isOpen={!!editMaterial}
                        onClose={() => { setEditMaterial(null); setEditTargetSession(null); }}
                        onUpdate={handleUpdateMaterial}
                        materialData={editMaterial}
                    />
                )
            }

            {/* Delete Material Modal */}
            {
                deleteMaterialId && (
                    <DeleteMaterialModal
                        isOpen={!!deleteMaterialId}
                        onClose={() => { setDeleteMaterialId(null); setDeleteTargetSession(null); }}
                        onDelete={handleDeleteMaterial}
                        itemName="tài liệu"
                    />
                )
            }

            {/* Delete Assignment Modal */}
            {
                deleteAssignmentId && (
                    <DeleteMaterialModal
                        isOpen={!!deleteAssignmentId}
                        onClose={() => { setDeleteAssignmentId(null); setDeleteTargetSession(null); }}
                        onDelete={handleDeleteAssignment}
                        itemName="bài tập"
                    />
                )
            }

            {/* Material Detail Modal */}
            {
                detailMaterial && (
                    <MaterialDetailModal
                        isOpen={!!detailMaterial}
                        onClose={() => setDetailMaterial(null)}
                        material={detailMaterial}
                        onDownload={handleDownloadMaterial}
                    />
                )
            }

            {/* Import Library Modal */}
            {importModal.isOpen && (
                <ImportLibraryModal
                    isOpen={importModal.isOpen}
                    onClose={() => setImportModal({ isOpen: false, type: 'material', targetSession: null })}
                    onImport={handleImportFromLibrary}
                    type={importModal.type}
                    libraryItems={importModal.type === 'material' ? libraryMaterials : libraryAssignments}
                    existingItems={
                        classData.sessions.find(s => Number(s.sessionId) === Number(importModal.targetSession))?.[importModal.type === 'material' ? 'materials' : 'assignments'] || []
                    }
                />
            )}

            {/* Create Assignment Modal */}
            {isCreateAssignmentOpen && (
                <CreateAssignmentModal
                    isOpen={isCreateAssignmentOpen}
                    onClose={() => { setIsCreateAssignmentOpen(false); setEditAssignment(null); setCreateAssignmentSession(null); }}
                    onSave={handleSaveAssignment}
                    sessionId={createAssignmentSession || editTargetSession}
                    initialData={editAssignment}
                    classes={[{ classId: classData.id, className: classData.name }]}
                    currentClassId={classData.id}
                />
            )}

            {/* Assignment Detail Modal */}
            {detailAssignment && (
                <AssignmentDetailModal
                    isOpen={!!detailAssignment}
                    onClose={() => setDetailAssignment(null)}
                    assignment={{ ...detailAssignment, className: classData.name }}
                    onDownload={handleDownloadMaterial}
                />
            )}
        </div>
    );
};

export default TeacherClassDetail;
