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
    ChevronDown, ChevronUp, CheckSquare, Library, BookOpen, MapPin,
    History, ClipboardCheck
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

const DAY_LABELS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const SCHEDULE_CHANGE_TAG = '[SCHEDULE_CHANGE]';

function formatDateVN(isoDate) {
    const d = new Date(isoDate);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

function formatGrade(grade) {
    if (!grade || grade === '—' || grade === 'None' || grade === '') return '—';
    let g = String(grade).trim();
    if (g.endsWith('.0')) g = g.slice(0, -2);
    if (!g.toLowerCase().includes('khối')) return `Khối ${g}`;
    return g;
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

const LIBRARY_MATERIALS = [
    { id: 101, name: 'Giáo trình Toán Học Đại cương Tập 1.pdf', size: '5.2 MB', uploadDate: '01/09/2023', type: 'pdf', description: 'Sách giáo khoa điện tử chương trình cơ bản.' },
    { id: 102, name: 'Video Hướng dẫn Giải Phương trình Bậc 2.mp4', size: '125 MB', uploadDate: '05/09/2023', type: 'video', description: 'Cách bấm máy tính Casio để giải nhanh.' },
    { id: 103, name: 'Bài Tập Trắc Nghiệm Chương 1 (Bản gốc).docx', size: '1.2 MB', uploadDate: '10/09/2023', type: 'word', description: 'Dùng để soạn đề cho các lớp.' },
    { id: 104, name: 'Tài liệu Ôn Tập Giữa Kỳ.pdf', size: '3.4 MB', uploadDate: '12/10/2023', type: 'pdf', description: 'Các dạng toán thường ra trong đề thi.' },
];

const groupUnique = (list) => {
    return list.reduce((acc, curr) => {
        const isDup = acc.some(item => 
            item.title === curr.title && 
            item.fileUrl === curr.fileUrl
        );
        if (!isDup) acc.push(curr);
        return acc;
    }, []);
};

const mapMaterial = (m) => ({
    id: m.materialId || m.MaterialId,
    materialId: m.materialId || m.MaterialId,
    name: m.title || m.Title || '',
    title: m.title || m.Title || '',
    size: formatSize(m.fileSize || m.FileSize),
    fileSize: m.fileSize || m.FileSize,
    originalFileName: m.originalFileName || m.OriginalFileName || '',
    fileName: m.originalFileName || m.OriginalFileName || '',
    uploadDate: '',
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
    sessionId: m.sessionId || m.SessionId,
    classId: m.classId || m.ClassId,
    gradeId: m.gradeId || m.GradeId
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
        asmId: a.asmId || a.AsmId,
        title: a.title || a.Title || '',
        description: a.description || a.Description || '',
        type: type,
        dueDate: (a.endTime || a.EndTime) ? new Date(a.endTime || a.EndTime).toLocaleDateString('vi-VN') : 'Chưa thiết lập',
        endTime: a.endTime || a.EndTime,
        startTime: a.startTime || a.StartTime,
        submissionsCount: a.submissionsCount || a.SubmissionsCount || 0,
        fileUrl: a.fileUrl || a.FileUrl,
        fileSize: a.fileSize || a.FileSize,
        originalFileName: a.originalFileName || a.OriginalFileName || '',
        fileName: a.originalFileName || a.OriginalFileName || '',
        sessionId: a.sessionId || a.SessionId,
        classId: a.classId || a.ClassId,
        gradeId: a.gradeId || a.GradeId
    };
};

const TeacherClassDetail = ({ isTA = false }) => {
    const { classId } = useParams();

    const [classInfo, setClassInfo] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [libraryMaterials, setLibraryMaterials] = useState([]);
    const [libraryAssignments, setLibraryAssignments] = useState([]);
    const [grades, setGrades] = useState([]);

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

    const fetchClassData = async (isRefresh = false) => {
        if (!classId) return;
        if (!isRefresh) setLoading(true);
        try {
            const [classRes, sessionsRes, studentsRes, attendanceSummaryRes] = await Promise.all([
                api.get(`/Classes/${classId}`),
                api.get(`/Classes/${classId}/sessions`),
                api.get(`/Classes/${classId}/students`),
                api.get(`/attendance/class/${classId}/sessions-summary`),
            ]);

            const c = classRes.data;
            const rawSessions = sessionsRes.data || [];
            const rawStudents = studentsRes.data || [];
            const attendanceSummary = attendanceSummaryRes.data || [];

            const mappedSessions = rawSessions.map((s, idx) => {
                const summary = attendanceSummary.find(sum => sum.sessionId === s.sessionId);
                return {
                    sessionId: s.sessionId,
                    sessionNum: idx + 1,
                    date: formatDateVN(s.sessionDate),
                    dayLabel: s.dayLabel || DAY_LABELS[new Date(s.sessionDate).getDay()],
                    time: s.time || '',
                    title: s.title || `Buổi ${idx + 1}`,
                    status: s.status,
                    presentCount: summary?.presentCount || 0,
                    absentCount: summary?.absentCount || 0,
                    materials: [],
                    assignments: [],
                };
            });

            const mappedStudents = rawStudents.map(st => {
                const name = st.fullName || st.username || '';
                return {
                    id: Number(st.userId),
                    name: name,
                    avatar: name.trim().split(' ').map(w => w[0]).slice(-2).join('').toUpperCase(),
                    attendance: st.attendanceRate || 0,
                    grade: st.grade || '—',
                    averageScore: st.averageScore || '—',
                };
            });

            const scheduleSlots = c.scheduleSlots || [];
            const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
            const scheduleStr = scheduleSlots.map(s => dayNames[s.dayOfWeek]).join(' & ');
            const timeStr = scheduleSlots.length > 0
                ? `${scheduleSlots[0].startTime} - ${scheduleSlots[0].endTime}`
                : '';

            setClassInfo(c);
            setClassData(prev => ({
                ...prev,
                id: c.classId,
                name: c.className || '',
                subject: c.subjectName || '',
                gradeLevel: c.gradeName || '',
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
                    initials: (c.assistantName || '?').trim().split(' ').pop().charAt(0).toUpperCase(),
                    subject: '',
                } : prev.assistant,
                sessions: isRefresh ? prev.sessions.map(ps => {
                    const latest = mappedSessions.find(ls => ls.sessionId === ps.sessionId);
                    return latest ? { ...ps, ...latest, materials: ps.materials, assignments: ps.assignments } : ps;
                }) : mappedSessions,
                classesCompleted: mappedSessions.filter(s => isPast(s.date)).length,
                totalClasses: mappedSessions.length,
                roomName: c.roomName || (scheduleSlots.length > 0 ? scheduleSlots[0].roomName : 'Chưa gán phòng'),
            }));

            setStudents(mappedStudents);
            setSessions(isRefresh ? prevSessions => prevSessions.map(ps => {
                const latest = mappedSessions.find(ls => ls.sessionId === ps.sessionId);
                return latest ? { ...ps, ...latest } : ps;
            }) : mappedSessions);

            if (!isRefresh) {
                const sessionsWithItems = await Promise.all(
                    mappedSessions.map(async (s) => {
                        try {
                            const [matRes, asmRes] = await Promise.all([
                                api.get(`/Materials/Get-By-Session/${s.sessionId}`),
                                api.get(`/Assignments/Get-By-Session/${s.sessionId}`)
                            ]);
                            return { ...s, materials: (matRes.data || []).map(mapMaterial), assignments: (asmRes.data || []).map(mapAssignment) };
                        } catch { return s; }
                    })
                );
                setClassData(prev => ({ ...prev, sessions: sessionsWithItems }));
                setSessions(sessionsWithItems);

                const [libMatRes, libAsmRes, gradesRes] = await Promise.all([
                    api.get('/Materials'), api.get('/Assignments'), api.get('/Grades')
                ]);
                setLibraryMaterials(groupUnique((libMatRes.data || []).map(mapMaterial)));
                setLibraryAssignments(groupUnique((libAsmRes.data || []).map(mapAssignment)));
                setGrades(gradesRes.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch class detail:', err);
            if (!isRefresh) toast.error('Không thể tải thông tin lớp học.');
        } finally {
            if (!isRefresh) setLoading(false);
        }
    };

    useEffect(() => {
        fetchClassData();
    }, [classId]);

    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [uploadTargetSession, setUploadTargetSession] = useState(null);

    const [showAllStudents, setShowAllStudents] = useState(false);
    const [studentSearch, setStudentSearch] = useState('');

    const [activeTab, setActiveTab] = useState('overview');

    const [expandedSessionId, setExpandedSessionId] = useState(null);

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
    const [attendanceData, setAttendanceData] = useState({});
    const [canAttend, setCanAttend] = useState(true);
    const [lockMessage, setLockMessage] = useState('');

    const [importModal, setImportModal] = useState({ isOpen: false, type: 'material', targetSession: null });

    const [isCreateAssignmentOpen, setIsCreateAssignmentOpen] = useState(false);
    const [createAssignmentSession, setCreateAssignmentSession] = useState(null);
    const [editAssignment, setEditAssignment] = useState(null);
    const [detailAssignment, setDetailAssignment] = useState(null);

    useEffect(() => {
        setStudentPage(1);
    }, [studentSearch]);

    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [classRequests, setClassRequests] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(false);
    const [historyStatusFilter, setHistoryStatusFilter] = useState('All');

    const [requestOpen, setRequestOpen] = useState(false);
    const [requestInitialData, setRequestInitialData] = useState(null);

    const fetchClassRequests = async () => {
        setLoadingRequests(true);
        try {
            const res = await api.get('/attendance/modification-requests/my');
            const filtered = (res.data || []).filter(r => String(r.classId) === String(classId));
            setClassRequests(filtered);
        } catch (error) {
            console.error('Error fetching class attendance requests:', error);
            toast.error('Không thể tải lịch sử yêu cầu sửa điểm danh');
        } finally {
            setLoadingRequests(false);
        }
    };

    useEffect(() => {
        if (historyModalOpen) {
            fetchClassRequests();
        }
    }, [historyModalOpen]);

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
        const sessId = editTargetSession;
        
        setEditMaterial(null);
        setEditTargetSession(null);
        
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
            
            let defaultEndTime = null;
            if (type === 'assignment') {
                const currentIdx = classData.sessions.findIndex(s => Number(s.sessionId) === Number(targetSession));
                const nextSess = classData.sessions[currentIdx + 1];
                if (nextSess && nextSess.date) {
                    const [d, m, y] = nextSess.date.split('/');
                    defaultEndTime = new Date(`${y}-${m}-${d}T23:59:00`).toISOString();
                } else {
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
            const msg = err.response?.data?.message || 'Lỗi khi import từ thư viện.';
            toast.error(msg);
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

            if (targetSessionId) {
                await refreshSessionMaterials(targetSessionId);
                
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

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.id.toLowerCase().includes(studentSearch.toLowerCase())
    );

    const displayedStudentsOverview = showAllStudents ? filteredStudents : filteredStudents.slice(0, 5);

    const totalStudentPages = Math.ceil(filteredStudents.length / studentsPerPage);
    const currentStudentsPage = filteredStudents.slice((studentPage - 1) * studentsPerPage, studentPage * studentsPerPage);

    const avgAttendance = students.length
        ? Math.round(students.reduce((s, st) => s + st.attendance, 0) / students.length)
        : 0;

    const nextSession = classData.sessions.find(
        s => (s.presentCount === 0 && s.absentCount === 0) && isPast(s.date)
    );

    const handleOpen = async (session) => {
        setSelectedSession(session);
        
        if (session.sessionId) {
            try {
                const res = await api.get(`/attendance/session/${session.sessionId}/can-attend`);
                setCanAttend(res.data.canAttend !== false);
                setLockMessage(res.data.message || '');
            } catch (err) {
                console.error('Error checking canAttend:', err);
                setCanAttend(true);
                setLockMessage('');
            }
        } else {
            setCanAttend(true);
            setLockMessage('');
        }
        
        setAttendanceOpen(true);
    };
    const handleClose = () => { setAttendanceOpen(false); setSelectedSession(null); };
    
    const handleSave = async () => {
        handleClose();
        await fetchClassData(true);
    };

    const pastSessions = [...classData.sessions]
        .filter(s => isPast(s.date))
        .reverse();

    const futureSessions = classData.sessions.filter(s => isFuture(s.date));

    const materialsCount = classData.sessions.reduce((acc, s) => acc + (s.materials?.length || 0), 0);
    const assignmentsCount = classData.sessions.reduce((acc, s) => acc + (s.assignments?.length || 0), 0);

    if (loading && !classData.id) {
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
                <div className="cd-breadcrumb">
                    <Link to={isTA ? "/ta/classes" : "/teacher/classes"} className="cd-back">
                        <ChevronLeft size={16} /> Quay lại lớp của tôi
                    </Link>
                    <span className="cd-breadcrumb-sep">/</span>
                    <span className="cd-breadcrumb-current">{classData.name}</span>
                </div>

                <div className="cd-page-header">
                    <div className="cd-title-block">
                        <div className="cd-title-row">
                            <h1>{classData.name}</h1>
                            {(() => {
                                const hasStarted = classData.startDate ? new Date(classData.startDate) <= new Date() : false;
                                const statusKey = classData.status === 'active' 
                                    ? (classData.classesCompleted === 0 && !hasStarted ? 'notstarted' : 'active') 
                                    : 'inactive';
                                const statusLabel = classData.status === 'active' 
                                    ? (classData.classesCompleted === 0 && !hasStarted ? 'Chưa học' : 'Đang hoạt động') 
                                    : 'Tạm dừng';
                                return (
                                    <span className={`cd-status-badge ${statusKey}`}>
                                        {statusLabel}
                                    </span>
                                );
                            })()}
                        </div>
                        <p className="cd-title-meta">
                            Môn: {classData.subject} &nbsp;•&nbsp; Khối lớp: {classData.gradeLevel}
                        </p>
                    </div>
                    <button className="ts-btn-request" onClick={() => {
                        const rawSlots = classInfo?.scheduleSlots || classInfo?.ScheduleSlots || [];
                        setRequestInitialData({
                            type: 'reschedule',
                            classInfo: {
                                classId: classData.id,
                                name: classData.name,
                                code: classData.code,
                                time: classData.scheduleTime,
                                date: classData.schedule,
                                scheduleSlots: rawSlots.map(slot => ({
                                    dayOfWeek: slot.dayOfWeek ?? slot.DayOfWeek,
                                    startTime: slot.startTime ?? slot.StartTime,
                                    endTime: slot.endTime ?? slot.EndTime,
                                    roomName: slot.roomName || classData.roomName || ''
                                }))
                            }
                        });
                        setRequestOpen(true);
                    }}>
                        <MessageSquare size={18} />
                        Yêu cầu đổi lịch
                    </button>
                </div>

                <div className="cd-info-cards">
                    <div className="cd-info-card">
                        <div className="cd-info-card-label"><Calendar size={16} /> LỊCH HỌC</div>
                        <div className="cd-info-card-value">{classData.schedule}</div>
                        <div className="cd-info-card-sub" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span>{classData.scheduleTime}</span>
                            <span style={{ color: '#4f46e5', fontWeight: 600 }}>{classData.roomName}</span>
                        </div>
                    </div>
                    <div className="cd-info-card">
                        <div className="cd-info-card-label"><Clock size={16} /> THỜI GIAN</div>
                        <div className="cd-info-card-value">{classData.duration}</div>
                        <div className="cd-info-card-sub">Bắt đầu {classData.startDate}</div>
                    </div>
                </div>

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
                            <div className="cd-left">
                                <div className="cd-card">
                                    <div className="cd-card-header">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <h3>Lịch sử điểm danh</h3>
                                            <span style={{ fontSize: '0.8125rem', color: '#6b7280', fontWeight: 500 }}>
                                                {pastSessions.length} buổi đã qua
                                            </span>
                                        </div>
                                        <button 
                                            className="cd-view-all-btn" 
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', color: '#4f46e5', fontWeight: 600, border: '1px solid #e0e7ff', padding: '4px 10px', borderRadius: '6px', background: '#f5f7ff' }}
                                            onClick={() => setHistoryModalOpen(true)}
                                        >
                                            <History size={14} />
                                            Lịch sử sửa
                                        </button>
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
                                                        const hasAttendance = session.presentCount > 0 || session.absentCount > 0;
                                                        const { presentCount: present, absentCount: absent } = session;
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
                                                                    {hasAttendance
                                                                        ? <span className="att-badge present">{present}</span>
                                                                        : <span className="att-badge pending">—</span>
                                                                    }
                                                                </td>
                                                                <td style={{ textAlign: 'center' }}>
                                                                    {hasAttendance
                                                                        ? <span className={`att-badge ${absent > 0 ? 'absent' : 'present'}`}>{absent}</span>
                                                                        : <span className="att-badge pending">—</span>
                                                                    }
                                                                </td>
                                                                <td style={{ textAlign: 'right' }}>
                                                                    {hasAttendance ? (
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

                            <div className="cd-right">
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
                                                    <div className="cd-staff-role" style={{ color: '#6366f1' }}>Trợ giảng (TA)</div>
                                                    <div className="cd-staff-name">{classData.assistant.name}</div>
                                                    <div className="cd-staff-sub">{classData.assistant.subject}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="cd-card cd-overview-card">
                                    <div className="cd-card-header"><h3>Tổng quan lớp học</h3></div>
                                    <div className="cd-overview-stats">
                                        <div className="cd-overview-row">
                                            <span>Tổng học sinh</span>
                                            <span className="cd-overview-val">
                                                {students.length}{classData.maxStudents ? ` / ${classData.maxStudents}` : ''}
                                            </span>
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
                                                {pastSessions.filter(s => s.presentCount > 0 || s.absentCount > 0).length} / {pastSessions.length} buổi
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

                                    {nextSession && (
                                        <div className="cd-next-session-card">
                                            <div className="cd-next-info">
                                                <span className="cd-next-label">Buổi cần điểm danh:</span>
                                                <span className="cd-next-value">{nextSession.date}</span>
                                            </div>
                                            <button className="cd-btn-take" onClick={() => handleOpen(nextSession)}>
                                                <CheckCircle size={18} />
                                                <span>Điểm danh</span>
                                            </button>
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
                                        <th>KHỐI</th>
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
                                                <td>
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        padding: '2px 10px',
                                                        borderRadius: 12,
                                                        background: student.grade && student.grade !== '—' ? '#eff6ff' : '#f1f5f9',
                                                        color: student.grade && student.grade !== '—' ? '#2563eb' : '#94a3b8',
                                                        fontWeight: 600
                                                    }}>
                                                        {formatGrade(student.grade)}
                                                    </span>
                                                </td>
                                                <td><GradeBadge grade={student.averageScore} /></td>
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
                                                                <div key={item.id} className={`material-card ${item.type}`} onClick={() => setDetailMaterial(item)} style={{ cursor: 'pointer' }}>
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

                                                <div className="cd-session-section">
                                                    <div className="cd-session-section-header">
                                                        <h5><FileText size={16} /> Bài tập</h5>
                                                        {!isTA && (
                                                            <div style={{ display: 'flex' }}>
                                                                <button
                                                                    className="cd-btn-import-lib"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setImportModal({ isOpen: true, type: 'assignment', targetSession: session.sessionId });
                                                                    }}
                                                                >
                                                                    <Library size={14} /> Thêm từ Thư viện
                                                                </button>
                                                                <button className="cd-btn-add-item" style={{ marginLeft: 12 }} onClick={() => { setCreateAssignmentSession(session.sessionId); setIsCreateAssignmentOpen(true); }}>
                                                                    <Plus size={14} /> Thêm bài tập
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {asms.length > 0 ? (
                                                        <div className="assignment-items-grid">
                                                            {asms.map(asm => (
                                                                <div key={asm.id} className={`assignment-card ${asm.type}`} onClick={() => setDetailAssignment(asm)}>
                                                                    <div className={`assignment-icon ${asm.type}`}>
                                                                        {getFileIcon(asm.type)}
                                                                    </div>
                                                                    <div className="assignment-info">
                                                                        <h4 className="assignment-name">{asm.title}</h4>
                                                                        <div className="assignment-meta">
                                                                            <span>Hạn: {asm.dueDate}</span>
                                                                            <span className="dot">•</span>
                                                                            <span>{asm.submissionsCount} bài nộp</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="assignment-actions" onClick={(e) => e.stopPropagation()}>
                                                                        {!isTA && (
                                                                            <Link
                                                                                to={`/teacher/assignments/${asm.id}/grade`}
                                                                                className="btn-grade-primary"
                                                                                title="Chấm bài"
                                                                            >
                                                                                <CheckSquare size={14} />
                                                                                <span>Chấm bài</span>
                                                                            </Link>
                                                                        )}
                                                                        <div className="utility-actions">
                                                                            <button className="btn-icon-subtle" title="Tải xuống" onClick={() => handleDownloadMaterial(asm)}><Download size={14} /></button>
                                                                            {!isTA && (
                                                                                <>
                                                                                    <button className="btn-icon-subtle edit" title="Chỉnh sửa" onClick={() => handleEditAssignment({ ...asm, sessionId: session.sessionId }, session.sessionId)}><Edit2 size={14} /></button>
                                                                                    <button className="btn-icon-subtle delete" title="Xóa" onClick={() => { setDeleteTargetSession(session.sessionId); setDeleteAssignmentId(asm.id); }}><Trash2 size={14} /></button>
                                                                                </>
                                                                            )}
                                                                        </div>
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

                {attendanceOpen && selectedSession && (
                    <AttendanceModal
                        isOpen={attendanceOpen}
                        onClose={handleClose}
                        onSave={handleSave}
                        session={selectedSession}
                        students={students}
                        sessionId={selectedSession.sessionId}
                        classId={classData.id}
                        canAttend={canAttend}
                        lockMessage={lockMessage}
                        isTA={isTA}
                    />
                )}

                {requestOpen && (
                    <ScheduleRequestModal
                        isOpen={requestOpen}
                        onClose={() => setRequestOpen(false)}
                        onSubmit={async (payload) => {
                            try {
                                const targetSlot = payload?.requestedSlot;
                                const classInfoPayload = payload?.classInfo || {};
                                const classIdForValidation = classInfoPayload?.classId || classData.id || classId;

                                const validateRes = await api.post('/support-requests/validate-schedule-change', {
                                    classId: classIdForValidation,
                                    dayOfWeek: targetSlot?.dayOfWeek,
                                    startTime: targetSlot?.startTime,
                                    endTime: targetSlot?.endTime
                                });
                                if (!validateRes?.data?.isValid) {
                                    toast.error(validateRes?.data?.errors?.[0] || 'Slot đề xuất không hợp lệ.');
                                    return;
                                }

                                const title = `${SCHEDULE_CHANGE_TAG} [Đổi lịch dạy] ${classInfoPayload?.name || classData.name || 'Lớp học'}`;
                                const content = [
                                    'Type: schedule_change',
                                    `Lớp: ${classInfoPayload?.name || classData.name || ''} (${classInfoPayload?.code || classData.code || ''})`,
                                    `ClassId: ${classIdForValidation}`,
                                    `CurrentSlot: ${payload?.currentSlot?.label || 'Chưa xác định'}`,
                                    `Slot hiện tại: ${payload?.currentSlot?.label || 'Chưa xác định'}`,
                                    `RequestedSlot: ${targetSlot?.dayLabel || ''} (${targetSlot?.startTime || ''} - ${targetSlot?.endTime || ''})`,
                                    `Slot đề xuất: ${targetSlot?.dayLabel || ''} (${targetSlot?.startTime || ''} - ${targetSlot?.endTime || ''})`,
                                    `RequestedRoomId: ${payload?.requestedRoomId || ''}`,
                                    `ChangeType: ${payload?.changeType || ''}`,
                                    `TargetSessionDate: ${payload?.targetSessionDate || ''}`,
                                    `Lý do: ${payload?.reason || ''}`
                                ].join('\n');

                                await api.post('/support-requests', { title, content });
                                toast.success('Đã gửi yêu cầu đổi lịch dạy');
                                window.dispatchEvent(new Event('teacher-inbox-refresh'));
                            } catch (error) {
                                console.error('Submit schedule change request failed:', error);
                                toast.error('Không thể gửi yêu cầu đổi lịch');
                            } finally {
                                setRequestOpen(false);
                            }
                        }}
                        initialData={requestInitialData}
                    />
                )}

                {uploadModalOpen && (
                    <UploadMaterialModal
                        isOpen={uploadModalOpen}
                        onClose={() => setUploadModalOpen(false)}
                        onUpload={handleUploadMaterial}
                        sessionId={uploadTargetSession}
                        grades={grades}
                    />
                )}

                {editMaterial && (
                    <EditMaterialModal
                        isOpen={!!editMaterial}
                        onClose={() => { setEditMaterial(null); setEditTargetSession(null); }}
                        onUpdate={handleUpdateMaterial}
                        materialData={editMaterial}
                        grades={grades}
                    />
                )}

                {deleteMaterialId && (
                    <DeleteMaterialModal
                        isOpen={!!deleteMaterialId}
                        onClose={() => { setDeleteMaterialId(null); setDeleteTargetSession(null); }}
                        onDelete={handleDeleteMaterial}
                        itemName="tài liệu"
                    />
                )}

                {deleteAssignmentId && (
                    <DeleteMaterialModal
                        isOpen={!!deleteAssignmentId}
                        onClose={() => { setDeleteAssignmentId(null); setDeleteTargetSession(null); }}
                        onDelete={handleDeleteAssignment}
                        itemName="bài tập"
                    />
                )}

                {detailMaterial && (
                    <MaterialDetailModal
                        isOpen={!!detailMaterial}
                        onClose={() => setDetailMaterial(null)}
                        material={detailMaterial}
                        onDownload={handleDownloadMaterial}
                    />
                )}

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

                {isCreateAssignmentOpen && (
                    <CreateAssignmentModal
                        isOpen={isCreateAssignmentOpen}
                        onClose={() => { setIsCreateAssignmentOpen(false); setEditAssignment(null); setCreateAssignmentSession(null); }}
                        onSave={handleSaveAssignment}
                        sessionId={createAssignmentSession || editTargetSession}
                        initialData={editAssignment}
                        classes={[{ classId: classData.id, className: classData.name }]}
                        currentClassId={classData.id}
                        grades={grades}
                    />
                )}

                {detailAssignment && (
                    <AssignmentDetailModal
                        isOpen={!!detailAssignment}
                        onClose={() => setDetailAssignment(null)}
                        assignment={{ ...detailAssignment, className: classData.name }}
                        onDownload={handleDownloadMaterial}
                    />
                )}

                {historyModalOpen && (
                    <div className="atm-overlay">
                        <div className="atm-modal" style={{ width: '900px', maxWidth: '95vw' }}>
                            <div className="atm-header">
                                <div>
                                    <h3>Lịch sử sửa điểm danh</h3>
                                    <div className="atm-session-meta">
                                        <History size={14} /> 
                                        <span>Lớp: {classData.name}</span>
                                    </div>
                                </div>
                                <button className="atm-close" onClick={() => setHistoryModalOpen(false)}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ padding: '12px 24px', background: '#fcfdfe', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginRight: '8px', textTransform: 'uppercase' }}>Bộ lọc:</span>
                                {['All', 'Pending', 'Approved', 'Rejected'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setHistoryStatusFilter(status)}
                                        style={{
                                            padding: '4px 14px',
                                            borderRadius: '20px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            border: '1px solid',
                                            transition: 'all 0.15s',
                                            background: historyStatusFilter === status ? '#3b82f6' : 'white',
                                            color: historyStatusFilter === status ? 'white' : '#64748b',
                                            borderColor: historyStatusFilter === status ? '#3b82f6' : '#e2e8f0',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {status === 'All' ? 'Tất cả' : status === 'Pending' ? 'Đang chờ' : status === 'Approved' ? 'Đã duyệt' : 'Từ chối'}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="atm-body" style={{ padding: 0, overflow: 'hidden' }}>
                                {loadingRequests ? (
                                    <div style={{ textAlign: 'center', padding: '60px' }}>
                                        <div className="attendance-spinner" style={{ margin: '0 auto 16px' }}></div>
                                        <p style={{ color: '#64748b' }}>Đang tải dữ liệu...</p>
                                    </div>
                                ) : classRequests.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
                                        <ClipboardCheck size={64} style={{ margin: '0 auto 20px', opacity: 0.3 }} />
                                        <p style={{ fontSize: '1rem' }}>Không có lịch sử yêu cầu sửa cho lớp này.</p>
                                    </div>
                                ) : (
                                    <div className="atm-history-container" style={{ maxHeight: '60vh' }}>
                                        <table className="atm-table">
                                            <thead>
                                                <tr>
                                                    <th>Ngày gửi</th>
                                                    <th>Học sinh</th>
                                                    <th>Buổi học</th>
                                                    <th>Nội dung sửa</th>
                                                    <th>Trạng thái</th>
                                                    <th>Ghi chú / Phản hồi</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {classRequests
                                                    .filter(req => historyStatusFilter === 'All' || req.status === historyStatusFilter)
                                                    .map((req) => {
                                                    const statusKey = req.status?.toLowerCase() || 'pending';
                                                    return (
                                                        <tr key={req.requestId}>
                                                            <td style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                                                                {req.requestedAt?.split(' ')[0]}<br/>
                                                                <small>{req.requestedAt?.split(' ')[1]}</small>
                                                            </td>
                                                            <td>
                                                                <div className="atm-student-name-bold">{req.studentName}</div>
                                                            </td>
                                                            <td style={{ whiteSpace: 'nowrap' }}>
                                                                <div style={{ fontWeight: 500, fontSize: '0.8125rem' }}>{req.sessionDate}</div>
                                                            </td>
                                                            <td>
                                                                <div className="atm-change-preview">
                                                                    <span style={{ color: req.currentStatus?.toLowerCase() === 'present' ? '#16a34a' : '#ef4444', fontWeight: 600 }}>
                                                                        {req.currentStatus?.toLowerCase() === 'present' ? 'Có mặt' : 'Vắng mặt'}
                                                                    </span>
                                                                    <ChevronRight size={12} className="atm-change-arrow" />
                                                                    <span style={{ color: req.requestedStatus?.toLowerCase() === 'present' ? '#16a34a' : '#ef4444', fontWeight: 600 }}>
                                                                        {req.requestedStatus?.toLowerCase() === 'present' ? 'Có mặt' : 'Vắng mặt'}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <span className={`atm-status-badge atm-status-${statusKey}`}>
                                                                    {statusKey === 'pending' ? 'Chờ duyệt' : statusKey === 'approved' ? 'Đã duyệt' : 'Từ chối'}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <div className="atm-note-text" title={req.reviewNote || req.reason}>
                                                                    {req.status === 'Rejected' ? (
                                                                        <span style={{ color: '#dc2626' }}>{req.reviewNote || 'Bị từ chối'}</span>
                                                                    ) : (
                                                                        req.reason || '—'
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                            
                            <div className="atm-footer">
                                <button className="atm-btn-cancel" onClick={() => setHistoryModalOpen(false)}>Đóng</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default TeacherClassDetail;