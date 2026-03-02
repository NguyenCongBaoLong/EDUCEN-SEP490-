import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    ChevronLeft, Calendar, Clock, Users, BookOpen,
    FileText, Download, PlayCircle, Upload, CheckCircle,
    AlertCircle, Clock as ClockIcon, Star, MessageSquare,
    X, Paperclip, Eye
} from 'lucide-react';
import StudentSidebar from '../../components/StudentSidebar';
import '../../css/pages/student/StudentClassDetail.css';

/* ─── Date helper ─── */
const parseDate = (str) => { const [d, m, y] = str.split('/'); return new Date(+y, +m - 1, +d); };
const today = new Date(); today.setHours(0, 0, 0, 0);
const isPast = (s) => parseDate(s) <= today;

/* ─── Mock Data ─── */
const STUDENT_CLASS_DATA = {
    201: {
        id: 201, code: 'TOÁN-G10-ADV', name: 'Đại Số Nâng Cao',
        subject: 'Toán học', gradeLevel: 'THPT', status: 'active',
        schedule: 'Thứ Hai & Thứ Tư', scheduleTime: '16:30 - 18:00 (90 phút)',
        startDate: '04/09/2023', duration: '12 tuần',
        classesCompleted: 8, totalClasses: 24,
        mainTeacher: { name: 'Thầy Nguyễn Minh', initials: 'NM', subject: 'Chuyên gia Toán học' },
        assistant: { name: 'Cô Lê Hoa', initials: 'LH', subject: 'Trợ giảng Toán' },
        currentStudents: 12, maxStudents: 15,
        myAttendance: 87,
        sessions: [
            { scheduleId: 1, date: '04/09/2023', dayLabel: 'Thứ Hai', time: '16:30 - 18:00', attended: true },
            { scheduleId: 2, date: '06/09/2023', dayLabel: 'Thứ Tư', time: '16:30 - 18:00', attended: true },
            { scheduleId: 3, date: '11/09/2023', dayLabel: 'Thứ Hai', time: '16:30 - 18:00', attended: false },
            { scheduleId: 4, date: '13/09/2023', dayLabel: 'Thứ Tư', time: '16:30 - 18:00', attended: true },
            { scheduleId: 5, date: '18/09/2023', dayLabel: 'Thứ Hai', time: '16:30 - 18:00', attended: true },
            { scheduleId: 6, date: '20/09/2023', dayLabel: 'Thứ Tư', time: '16:30 - 18:00', attended: true },
            { scheduleId: 7, date: '25/09/2023', dayLabel: 'Thứ Hai', time: '16:30 - 18:00', attended: true },
            { scheduleId: 8, date: '12/10/2023', dayLabel: 'Thứ Hai', time: '16:30 - 18:00', attended: true },
            { scheduleId: 9, date: '28/02/2026', dayLabel: 'Thứ Bảy', time: '16:30 - 18:00', attended: null },
            { scheduleId: 10, date: '04/03/2026', dayLabel: 'Thứ Tư', time: '16:30 - 18:00', attended: null },
        ],
        materials: [
            { id: 1, name: 'Slide Bài 1 - Giới thiệu.pdf', size: '2.4 MB', uploadDate: '01/09/2023', type: 'pdf', description: 'Tài liệu giới thiệu về phương trình bậc hai' },
            { id: 2, name: 'Bài tập trắc nghiệm C1.docx', size: '1.1 MB', uploadDate: '05/09/2023', type: 'word', description: 'Gồm 20 câu bài tập cơ bản' },
            { id: 3, name: 'Video hướng dẫn giải PT.mp4', size: '45.2 MB', uploadDate: '15/09/2023', type: 'video' },
            { id: 4, name: 'Đề kiểm tra 15p.pdf', size: '850 KB', uploadDate: '20/09/2023', type: 'pdf' },
        ],
        assignments: [
            {
                id: 'A1', title: 'Bài tập chương 1 - Phương trình bậc hai',
                dueDate: '20/09/2023', description: 'Làm các bài tập từ 1 đến 15 trong sách bài tập. Nộp file PDF hoặc ảnh bài làm.',
                hasFile: true, fileTemplate: 'BT_C1_Template.pdf',
                submissions: [
                    { id: 'S1', fileName: 'Bai_tap_C1_NV.pdf', submittedAt: '19/09/2023 20:45', grade: 9.5, comment: 'Bài làm tốt, trình bày rõ ràng! Cần chú ý thêm bước kiểm tra nghiệm.' },
                ],
            },
            {
                id: 'A2', title: 'Bài tập chương 2 - Bất phương trình',
                dueDate: '10/10/2023', description: 'Làm các bài tập số 1, 3, 5, 7 trang 45-48.',
                hasFile: false,
                submissions: [
                    { id: 'S2', fileName: 'BPT_chuong2.jpg', submittedAt: '09/10/2023 18:30', grade: 8.0, comment: 'Làm đúng phần lớn, cần xem lại bài 7.' },
                ],
            },
            {
                id: 'A3', title: 'Kiểm tra giữa kỳ - Ôn tập chương 1-2',
                dueDate: '28/02/2026', description: 'Đề kiểm tra giữa kỳ. Thời gian: 45 phút. Nộp bài làm scan hoặc chụp ảnh.',
                hasFile: true, fileTemplate: 'De_KT_GiuaKy.pdf',
                submissions: [],
            },
            {
                id: 'A4', title: 'Bài tập chương 3 - Hàm số',
                dueDate: '04/03/2026', description: 'Tìm hiểu về hàm số bậc hai và vẽ đồ thị.',
                hasFile: false,
                submissions: [],
            },
        ],
    },
    202: {
        id: 202, code: 'ANH-G10-INT', name: 'Tiếng Anh Giao Tiếp Nâng Cao',
        subject: 'Tiếng Anh', gradeLevel: 'THPT', status: 'active',
        schedule: 'Thứ Ba & Thứ Năm', scheduleTime: '17:00 - 18:30 (90 phút)',
        startDate: '05/09/2023', duration: '10 tuần',
        classesCompleted: 6, totalClasses: 20,
        mainTeacher: { name: 'Cô Trần Lan', initials: 'TL', subject: 'Giáo viên Tiếng Anh' },
        assistant: null,
        currentStudents: 10, maxStudents: 12,
        myAttendance: 100,
        sessions: [
            { scheduleId: 1, date: '05/09/2023', dayLabel: 'Thứ Ba', time: '17:00 - 18:30', attended: true },
            { scheduleId: 2, date: '07/09/2023', dayLabel: 'Thứ Năm', time: '17:00 - 18:30', attended: true },
            { scheduleId: 3, date: '04/03/2026', dayLabel: 'Thứ Tư', time: '17:00 - 18:30', attended: null },
        ],
        materials: [
            { id: 1, name: 'Unit 1 - Vocabulary.pdf', size: '1.2 MB', uploadDate: '05/09/2023', type: 'pdf' },
        ],
        assignments: [
            {
                id: 'B1', title: 'Writing Assignment - My Hometown',
                dueDate: '20/09/2023', description: 'Write a 200-word essay about your hometown.',
                hasFile: false,
                submissions: [
                    { id: 'SB1', fileName: 'My_hometown_essay.docx', submittedAt: '18/09/2023 22:00', grade: 8.5, comment: 'Good structure! Work on vocabulary variety.' },
                ],
            },
        ],
    },
    203: {
        id: 203, code: 'LÝ-G10-CB', name: 'Vật Lý Cơ Bản Lớp 10',
        subject: 'Vật lý', gradeLevel: 'THPT', status: 'inactive',
        schedule: 'Thứ Sáu', scheduleTime: '15:00 - 16:30 (90 phút)',
        startDate: '02/09/2023', duration: '8 tuần',
        classesCompleted: 16, totalClasses: 16,
        mainTeacher: { name: 'Thầy Lê Hoàng', initials: 'LH', subject: 'Giáo viên Vật lý' },
        assistant: null,
        currentStudents: 9, maxStudents: 15,
        myAttendance: 94,
        sessions: [],
        materials: [],
        assignments: [],
    },
};

/* ─── Helpers ─── */
const getFileIcon = (type) => {
    if (type === 'pdf') return <FileText size={22} color="#ef4444" />;
    if (type === 'word') return <FileText size={22} color="#2563eb" />;
    if (type === 'video') return <PlayCircle size={22} color="#8b5cf6" />;
    return <FileText size={22} color="#64748b" />;
};

const getAssignmentStatus = (assignment) => {
    const due = parseDate(assignment.dueDate);
    const hasSub = assignment.submissions.length > 0;
    if (hasSub) return 'submitted';
    if (due < today) return 'overdue';
    return 'pending';
};

const statusConfig = {
    submitted: { label: 'Đã nộp', cls: 'submitted', icon: <CheckCircle size={14} /> },
    pending: { label: 'Chưa nộp', cls: 'pending', icon: <ClockIcon size={14} /> },
    overdue: { label: 'Quá hạn', cls: 'overdue', icon: <AlertCircle size={14} /> },
};

/* ─── Submission Modal ─── */
const SubmitModal = ({ assignment, onClose, onSubmit }) => {
    const fileRef = useRef(null);
    const [file, setFile] = useState(null);
    const [note, setNote] = useState('');

    const handleFileChange = (e) => setFile(e.target.files[0] || null);

    const handleSubmit = () => {
        if (!file) return alert('Vui lòng chọn file để nộp bài.');
        onSubmit({ file, note });
        onClose();
    };

    return (
        <div className="scd-modal-overlay" onClick={onClose}>
            <div className="scd-modal" onClick={e => e.stopPropagation()}>
                <div className="scd-modal-header">
                    <div>
                        <h2>Nộp bài tập</h2>
                        <p>{assignment.title}</p>
                    </div>
                    <button className="scd-modal-close" onClick={onClose}><X size={20} /></button>
                </div>
                <div className="scd-modal-body">
                    <div className="scd-modal-field">
                        <label>File bài làm <span className="req">*</span></label>
                        <div
                            className="scd-upload-zone"
                            onClick={() => fileRef.current.click()}
                        >
                            {file ? (
                                <>
                                    <Paperclip size={20} />
                                    <span className="scd-upload-filename">{file.name}</span>
                                    <span className="scd-upload-size">{(file.size / 1024).toFixed(0)} KB</span>
                                </>
                            ) : (
                                <>
                                    <Upload size={24} />
                                    <span>Nhấp để chọn file hoặc kéo thả vào đây</span>
                                    <span className="scd-upload-hint">PDF, DOC, DOCX, JPG, PNG (tối đa 10MB)</span>
                                </>
                            )}
                        </div>
                        <input ref={fileRef} type="file" hidden onChange={handleFileChange}
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
                    </div>
                    <div className="scd-modal-field">
                        <label>Ghi chú (tuỳ chọn)</label>
                        <textarea
                            className="scd-modal-textarea"
                            placeholder="Thêm ghi chú cho giáo viên..."
                            rows={3}
                            value={note}
                            onChange={e => setNote(e.target.value)}
                        />
                    </div>
                </div>
                <div className="scd-modal-footer">
                    <button className="scd-btn-cancel" onClick={onClose}>Hủy</button>
                    <button className="scd-btn-submit" onClick={handleSubmit}>
                        <Upload size={16} /> Nộp bài
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ─── Main Component ─── */
const StudentClassDetail = () => {
    const { classId } = useParams();
    const classData = STUDENT_CLASS_DATA[classId] || STUDENT_CLASS_DATA[201];

    const [activeTab, setActiveTab] = useState('overview');
    const [materials] = useState(classData.materials || []);
    const [assignments, setAssignments] = useState(classData.assignments || []);
    const [submitTarget, setSubmitTarget] = useState(null);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [selectedAssignment, setSelectedAssignment] = useState(null);

    const pastSessions = [...classData.sessions].filter(s => isPast(s.date)).reverse();
    const futureSessions = classData.sessions.filter(s => !isPast(s.date));
    const progress = Math.round((classData.classesCompleted / classData.totalClasses) * 100);
    const attendedCount = pastSessions.filter(s => s.attended === true).length;

    const handleDownload = (item) => {
        if (item.rawFile) {
            const url = URL.createObjectURL(item.rawFile);
            const a = document.createElement('a');
            a.href = url; a.download = item.name;
            document.body.appendChild(a); a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } else {
            alert(`Đang tải xuống: ${item.name}\n(Chức năng thực tế hoạt động khi có Backend)`);
        }
    };

    const handleSubmit = (assignmentId, { file, note }) => {
        const now = new Date();
        const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        setAssignments(prev => prev.map(a => {
            if (a.id !== assignmentId) return a;
            return {
                ...a,
                submissions: [
                    ...a.submissions,
                    { id: `S_${Date.now()}`, fileName: file.name, submittedAt: dateStr, grade: null, comment: null },
                ],
            };
        }));
    };

    const subjectColors = {
        'Toán học': '#3b82f6',
        'Tiếng Anh': '#10b981',
        'Vật lý': '#f59e0b',
    };
    const accent = subjectColors[classData.subject] || '#3b82f6';

    return (
        <div className="scd-page">
            <StudentSidebar />

            <main className="scd-main">
                {/* Breadcrumb */}
                <div className="scd-breadcrumb">
                    <Link to="/student/classes" className="scd-back">
                        <ChevronLeft size={16} /> Quay lại lớp của tôi
                    </Link>
                    <span className="scd-breadcrumb-sep">/</span>
                    <span className="scd-breadcrumb-current">{classData.name}</span>
                </div>

                {/* Page Header */}
                <div className="scd-page-header" style={{ '--accent': accent }}>
                    <div className="scd-header-accent" style={{ background: accent }} />
                    <div className="scd-title-block">
                        <div className="scd-title-row">
                            <h1>{classData.name}</h1>
                            <span className={`scd-status-badge ${classData.status}`}>
                                {classData.status === 'active' ? 'Đang học' : 'Đã kết thúc'}
                            </span>
                        </div>
                        <p className="scd-title-meta">
                            Môn: {classData.subject} &nbsp;•&nbsp; Mã lớp: {classData.code} &nbsp;•&nbsp; {classData.gradeLevel}
                        </p>
                    </div>
                </div>

                {/* Info Cards */}
                <div className="scd-info-cards">
                    <div className="scd-info-card">
                        <div className="scd-info-label"><Calendar size={15} /> LỊCH HỌC</div>
                        <div className="scd-info-value">{classData.schedule}</div>
                        <div className="scd-info-sub">{classData.scheduleTime}</div>
                    </div>
                    <div className="scd-info-card">
                        <div className="scd-info-label"><Clock size={15} /> THỜI GIAN</div>
                        <div className="scd-info-value">{classData.duration}</div>
                        <div className="scd-info-sub">Bắt đầu {classData.startDate}</div>
                    </div>
                    <div className="scd-info-card">
                        <div className="scd-info-label"><Users size={15} /> SĨ SỐ</div>
                        <div className="scd-info-value">{classData.currentStudents}/{classData.maxStudents}</div>
                        <div className="scd-info-sub">học sinh</div>
                    </div>
                    <div className="scd-info-card highlight" style={{ '--accent': accent }}>
                        <div className="scd-info-label"><BookOpen size={15} /> CHUYÊN CẦN</div>
                        <div className="scd-info-value" style={{ color: classData.myAttendance >= 80 ? '#16a34a' : '#dc2626' }}>
                            {classData.myAttendance}%
                        </div>
                        <div className="scd-info-sub">{attendedCount}/{pastSessions.length} buổi</div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="scd-tabs-nav">
                    {[
                        { key: 'overview', label: 'Tổng quan' },
                        { key: 'materials', label: `Tài liệu (${materials.length})` },
                        { key: 'assignments', label: `Bài tập (${assignments.length})` },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            className={`scd-tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.key)}
                            style={activeTab === tab.key ? { '--accent': accent } : {}}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="scd-tab-content">

                    {/* ─── TAB: OVERVIEW ─── */}
                    {activeTab === 'overview' && (
                        <div className="scd-content-grid">
                            <div className="scd-left">
                                {/* Lịch sử điểm danh */}
                                <div className="scd-card">
                                    <div className="scd-card-header">
                                        <h3>Lịch sử điểm danh của tôi</h3>
                                        <span className="scd-card-meta">{attendedCount}/{pastSessions.length} buổi đã qua</span>
                                    </div>
                                    {pastSessions.length === 0 ? (
                                        <p className="scd-empty-msg">Chưa có buổi học nào.</p>
                                    ) : (
                                        <div className="att-history-scroll">
                                            <table className="att-history-table">
                                                <thead>
                                                    <tr>
                                                        <th>BUỔI</th>
                                                        <th style={{ textAlign: 'center' }}>TRẠNG THÁI</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {pastSessions.map((s, idx) => (
                                                        <tr key={s.scheduleId}>
                                                            <td>
                                                                <div className="att-date-cell">
                                                                    <span className="att-session-num">Buổi {pastSessions.length - idx}</span>
                                                                    <span className="att-session-date">{s.dayLabel}, {s.date} • {s.time}</span>
                                                                </div>
                                                            </td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                {s.attended === true && <span className="scd-att-badge present"><CheckCircle size={13} /> Có mặt</span>}
                                                                {s.attended === false && <span className="scd-att-badge absent"><AlertCircle size={13} /> Vắng</span>}
                                                                {s.attended === null && <span className="scd-att-badge upcoming"><ClockIcon size={13} /> Sắp tới</span>}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    {futureSessions.length > 0 && (
                                        <div className="att-future-notice">
                                            <Clock size={13} />
                                            <span>{futureSessions.length} buổi sắp tới &nbsp;(gần nhất: {futureSessions[0].dayLabel}, {futureSessions[0].date})</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="scd-right">
                                {/* Giáo viên */}
                                <div className="scd-card">
                                    <div className="scd-card-header"><h3>Giáo viên phụ trách</h3></div>
                                    <div className="cd-staff-list">
                                        <div className="cd-staff-item">
                                            <div className="cd-staff-avatar" style={{ background: accent }}>{classData.mainTeacher.initials}</div>
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

                                {/* Tiến độ */}
                                <div className="scd-card scd-progress-card">
                                    <div className="scd-card-header"><h3>Tiến độ khóa học</h3></div>
                                    <div className="cd-overview-stats">
                                        <div className="cd-overview-row">
                                            <span>Buổi đã học</span>
                                            <span className="cd-overview-val">{classData.classesCompleted} / {classData.totalClasses}</span>
                                        </div>
                                        <div className="cd-overview-row">
                                            <span>Chuyên cần của tôi</span>
                                            <span className="cd-overview-val green">{classData.myAttendance}%</span>
                                        </div>
                                        <div className="cd-overview-row">
                                            <span>Bài đã nộp</span>
                                            <span className="cd-overview-val">{assignments.filter(a => a.submissions.length > 0).length} / {assignments.length}</span>
                                        </div>
                                    </div>
                                    <div className="cd-progress-wrap">
                                        <div className="cd-progress-label">
                                            <span>Tiến độ khóa học</span>
                                            <span>{progress}%</span>
                                        </div>
                                        <div className="cd-progress-track">
                                            <div className="cd-progress-fill" style={{ width: `${progress}%`, background: accent }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ─── TAB: MATERIALS ─── */}
                    {activeTab === 'materials' && (
                        <div className="scd-materials-tab">
                            <div className="scd-materials-header">
                                <h2>Tài liệu học tập</h2>
                                <p className="scd-materials-hint">{materials.length} tài liệu — nhấn vào card để xem chi tiết</p>
                            </div>
                            {materials.length === 0 ? (
                                <div className="scd-empty-state">
                                    <FileText size={48} />
                                    <h3>Chưa có tài liệu nào</h3>
                                    <p>Giáo viên chưa tải lên tài liệu cho lớp này.</p>
                                </div>
                            ) : (
                                <div className="scd-card-grid">
                                    {materials.map(item => (
                                        <div
                                            key={item.id}
                                            className="scd-item-card"
                                            onClick={() => setSelectedMaterial(item)}
                                        >
                                            <div className="scd-item-card-icon">{getFileIcon(item.type)}</div>
                                            <div className="scd-item-card-body">
                                                <h4 className="scd-item-card-title">{item.name}</h4>
                                                <div className="scd-item-card-meta">
                                                    <span>{item.size}</span>
                                                    <span className="dot">•</span>
                                                    <span>{item.uploadDate}</span>
                                                </div>
                                                {item.description && (
                                                    <p className="scd-item-card-desc">{item.description}</p>
                                                )}
                                            </div>
                                            <div className="scd-item-card-action">
                                                <Eye size={15} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── TAB: ASSIGNMENTS ─── */}
                    {activeTab === 'assignments' && (
                        <div className="scd-assignments-tab">
                            <div className="scd-assignments-header">
                                <h2>Bài tập</h2>
                                <div className="scd-asm-summary">
                                    <span className="scd-asm-chip submitted">{assignments.filter(a => a.submissions.length > 0).length} đã nộp</span>
                                    <span className="scd-asm-chip pending">{assignments.filter(a => a.submissions.length === 0 && parseDate(a.dueDate) >= today).length} chưa nộp</span>
                                    <span className="scd-asm-chip overdue">{assignments.filter(a => a.submissions.length === 0 && parseDate(a.dueDate) < today).length} quá hạn</span>
                                </div>
                            </div>

                            {assignments.length === 0 ? (
                                <div className="scd-empty-state">
                                    <BookOpen size={48} />
                                    <h3>Chưa có bài tập nào</h3>
                                    <p>Giáo viên chưa giao bài tập cho lớp này.</p>
                                </div>
                            ) : (
                                <div className="scd-card-grid">
                                    {assignments.map(asm => {
                                        const status = getAssignmentStatus(asm);
                                        const cfg = statusConfig[status];
                                        const lastSub = asm.submissions[asm.submissions.length - 1];
                                        return (
                                            <div
                                                key={asm.id}
                                                className={`scd-item-card scd-asm-item-card ${status}`}
                                                onClick={() => setSelectedAssignment(asm)}
                                            >
                                                <div className="scd-item-card-body">
                                                    <div className="scd-item-card-toprow">
                                                        <span className={`scd-status-chip ${status}`}>
                                                            {cfg.icon} {cfg.label}
                                                        </span>
                                                        {lastSub?.grade !== null && lastSub?.grade !== undefined && (
                                                            <span className="scd-grade-badge">
                                                                <Star size={12} /> {lastSub.grade}/10
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h4 className="scd-item-card-title">{asm.title}</h4>
                                                    <div className="scd-item-card-meta">
                                                        <ClockIcon size={12} />
                                                        <span>Hạn: {asm.dueDate}</span>
                                                    </div>
                                                </div>
                                                <div className="scd-item-card-action">
                                                    <Eye size={15} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Submit Modal */}
            {submitTarget && (
                <SubmitModal
                    assignment={submitTarget}
                    onClose={() => setSubmitTarget(null)}
                    onSubmit={(payload) => {
                        handleSubmit(submitTarget.id, payload);
                        setSubmitTarget(null);
                    }}
                />
            )}

            {/* Material Detail Modal */}
            {selectedMaterial && (
                <div className="scd-modal-overlay" onClick={() => setSelectedMaterial(null)}>
                    <div className="scd-modal scd-detail-modal" onClick={e => e.stopPropagation()}>
                        <div className="scd-modal-header">
                            <div className="scd-detail-modal-icon">{getFileIcon(selectedMaterial.type)}</div>
                            <div>
                                <h2>{selectedMaterial.name}</h2>
                                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>{selectedMaterial.size} • Tải lên {selectedMaterial.uploadDate}</p>
                            </div>
                            <button className="scd-modal-close" onClick={() => setSelectedMaterial(null)}><X size={20} /></button>
                        </div>
                        <div className="scd-modal-body">
                            {selectedMaterial.description && (
                                <div className="scd-detail-desc">
                                    <label>Mô tả</label>
                                    <p>{selectedMaterial.description}</p>
                                </div>
                            )}
                        </div>
                        <div className="scd-modal-footer">
                            <button className="scd-btn-cancel" onClick={() => setSelectedMaterial(null)}>Đóng</button>
                            <button className="scd-btn-submit" onClick={() => handleDownload(selectedMaterial)}>
                                <Download size={16} /> Tải xuống
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assignment Detail Modal */}
            {selectedAssignment && (() => {
                const asm = selectedAssignment;
                const status = getAssignmentStatus(asm);
                const cfg = statusConfig[status];
                const lastSub = asm.submissions[asm.submissions.length - 1];
                return (
                    <div className="scd-modal-overlay" onClick={() => setSelectedAssignment(null)}>
                        <div className="scd-modal scd-detail-modal scd-asm-detail-modal" onClick={e => e.stopPropagation()}>
                            <div className="scd-modal-header">
                                <div>
                                    <span className={`scd-status-chip ${status}`} style={{ marginBottom: '6px', display: 'inline-flex' }}>
                                        {cfg.icon} {cfg.label}
                                    </span>
                                    <h2>{asm.title}</h2>
                                    <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px' }}>
                                        <ClockIcon size={13} style={{ verticalAlign: 'middle' }} /> Hạn nộp: {asm.dueDate}
                                    </p>
                                </div>
                                <button className="scd-modal-close" onClick={() => setSelectedAssignment(null)}><X size={20} /></button>
                            </div>
                            <div className="scd-modal-body">
                                <div className="scd-detail-desc">
                                    <label>Mô tả bài tập</label>
                                    <p>{asm.description}</p>
                                </div>
                                {asm.hasFile && (
                                    <button
                                        className="scd-btn-template" style={{ marginTop: '10px' }}
                                        onClick={() => handleDownload({ name: asm.fileTemplate, type: 'pdf' })}
                                    >
                                        <Download size={14} /> Tải file đề bài ({asm.fileTemplate})
                                    </button>
                                )}
                                {asm.submissions.length > 0 && (
                                    <div className="scd-sub-history" style={{ marginTop: '18px' }}>
                                        <h4>Lịch sử nộp bài</h4>
                                        <table className="scd-sub-table">
                                            <thead><tr>
                                                <th>File</th><th>Thời gian nộp</th>
                                                <th style={{ textAlign: 'center' }}>Điểm</th><th>Nhận xét</th>
                                            </tr></thead>
                                            <tbody>
                                                {asm.submissions.map(sub => (
                                                    <tr key={sub.id}>
                                                        <td><div className="scd-sub-file"><Paperclip size={14} /><span>{sub.fileName}</span></div></td>
                                                        <td className="scd-sub-date">{sub.submittedAt}</td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            {sub.grade !== null
                                                                ? <span className={`scd-score ${sub.grade >= 8 ? 'high' : sub.grade >= 6.5 ? 'mid' : 'low'}`}>{sub.grade}/10</span>
                                                                : <span className="scd-score-pending">Chờ chấm</span>}
                                                        </td>
                                                        <td>
                                                            {sub.comment
                                                                ? <div className="scd-sub-comment"><MessageSquare size={13} /><span>{sub.comment}</span></div>
                                                                : <span className="scd-no-comment">—</span>}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                            <div className="scd-modal-footer">
                                <button className="scd-btn-cancel" onClick={() => setSelectedAssignment(null)}>Đóng</button>
                                {status !== 'overdue' && (
                                    <button
                                        className="scd-btn-submit"
                                        style={{ background: accent }}
                                        onClick={() => { setSelectedAssignment(null); setSubmitTarget(asm); }}
                                    >
                                        <Upload size={16} /> {status === 'submitted' ? 'Nộp lại' : 'Nộp bài'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default StudentClassDetail;
