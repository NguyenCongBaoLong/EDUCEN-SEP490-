import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    ChevronLeft, Calendar, Clock, Users, BookOpen,
    FileText, Download, PlayCircle, Upload, CheckCircle,
    AlertCircle, Clock as ClockIcon, Star, MessageSquare,
    X, Paperclip, Eye, ChevronDown, ChevronUp, CheckSquare, Loader2, RefreshCw,
    Award, TrendingUp, TrendingDown, MinusCircle
} from 'lucide-react';
import StudentSidebar from '../../components/StudentSidebar';
import '../../css/pages/student/StudentClassDetail.css';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

/* ─── Helpers ─── */
const formatDate = (dateStr, includeTime = false) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (includeTime) {
        return date.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    return date.toLocaleDateString('vi-VN');
};

const getFileIcon = (contentType, fileUrl) => {
    const url = fileUrl?.toLowerCase() || '';
    if (contentType?.includes('pdf') || url.endsWith('.pdf')) return <FileText size={22} color="#ef4444" />;
    if (contentType?.includes('word') || url.endsWith('.doc') || url.endsWith('.docx')) return <FileText size={22} color="#2563eb" />;
    if (contentType?.includes('video') || url.endsWith('.mp4')) return <PlayCircle size={22} color="#8b5cf6" />;
    if (contentType?.includes('image') || url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.png')) return <Eye size={22} color="#10b981" />;
    return <FileText size={22} color="#64748b" />;
};

const getAssignmentStatus = (assignment) => {
    const sub = assignment.currentSubmission;
    if (sub) {
        if (sub.isPublished || sub.score != null) return 'graded';
        
        // Dynamic check against latest dueDate
        if (assignment.dueDate && sub.submittedAt) {
            const submittedAt = new Date(sub.submittedAt);
            const dueDate = new Date(assignment.dueDate);
            if (submittedAt > dueDate) return 'late';
        }
        
        return 'submitted';
    }
    const due = new Date(assignment.dueDate);
    if (due < new Date()) return 'overdue';
    return 'pending';
};

const statusConfig = {
    graded: { label: 'Đã chấm', cls: 'graded', icon: <Star size={14} /> },
    submitted: { label: 'Đã nộp', cls: 'submitted', icon: <CheckCircle size={14} /> },
    late: { label: 'Nộp muộn', cls: 'late', icon: <ClockIcon size={14} /> },
    pending: { label: 'Chưa nộp', cls: 'pending', icon: <ClockIcon size={14} /> },
    overdue: { label: 'Quá hạn', cls: 'overdue', icon: <AlertCircle size={14} /> },
};

/* ─── Submission Modal ─── */
const SubmitModal = ({ assignment, onClose, onSubmit, isSubmitting }) => {
    const fileRef = useRef(null);
    const [files, setFiles] = useState([]);

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length > 0) {
            setFiles(prev => [...prev, ...selectedFiles]);
        }
    };

    const removeFile = (index, e) => {
        e.stopPropagation();
        setFiles(prev => prev.filter((_, i) => i !== index));
    }

    const handleSubmit = () => {
        if (files.length === 0) return toast.error('Vui lòng chọn ít nhất một file để nộp bài.');
        onSubmit({ files });
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
                            <Upload size={24} />
                            <span>Nhấp để chọn file hoặc kéo thả vào đây</span>
                            <span className="scd-upload-hint">Bạn có thể chọn nhiều file cùng lúc (tối đa 10MB/file)</span>
                        </div>
                        <input 
                            ref={fileRef} 
                            type="file" 
                            hidden 
                            multiple
                            onChange={handleFileChange}
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" 
                        />

                        {files.length > 0 && (
                            <div className="scd-file-list" style={{ marginTop: '1rem' }}>
                                {files.map((f, idx) => (
                                    <div key={idx} className="scd-file-item" style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '0.75rem',
                                        padding: '0.5rem',
                                        background: '#f8fafc',
                                        borderRadius: '8px',
                                        marginBottom: '0.5rem'
                                    }}>
                                        <Paperclip size={18} color="#64748b" />
                                        <span style={{ 
                                            flex: 1, 
                                            fontSize: '0.9rem',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>{f.name}</span>
                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{(f.size / 1024).toFixed(0)} KB</span>
                                        <button 
                                            onClick={(e) => removeFile(idx, e)}
                                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="scd-modal-footer">
                    <button className="scd-btn-cancel" onClick={onClose} disabled={isSubmitting}>Hủy</button>
                    <button className="scd-btn-submit" onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />} 
                        {isSubmitting ? ' Đang nộp...' : ' Nộp bài'}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ─── Main Component ─── */
const StudentClassDetail = () => {
    const { classId } = useParams();
    const { user } = useAuth();
    const [classData, setClassData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [expandedSessionId, setExpandedSessionId] = useState(null);
    const [submitTarget, setSubmitTarget] = useState(null);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchClassDetail = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/Classes/student/${classId}/detail`);
            setClassData(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching class detail:', err);
            setError('Không thể tải thông tin lớp học. Vui lòng thử lại sau.');
            toast.error('Lỗi khi tải thông tin lớp học');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (classId) {
            fetchClassDetail();
        }
    }, [classId]);

    const handleToggleSession = (id) => {
        setExpandedSessionId(prev => prev === id ? null : id);
    };

    const handleDownload = (fileUrl, fileName) => {
        if (!fileUrl) return toast.error('Không tìm thấy tệp tin');
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = fileName || 'download';
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSubmitSubmission = async (payload) => {
        if (!submitTarget || !user) return;
        
        try {
            setIsSubmitting(true);
            const formData = new FormData();
            
            // Append multiple files
            if (payload.files && payload.files.length > 0) {
                payload.files.forEach(f => {
                    formData.append('Files', f);
                });
            }

            let response;
            if (submitTarget.asm.currentSubmission) { // Check if a submission already exists for this assignment
                // Nếu đã nộp rồi thì dùng API Update (PUT)
                response = await api.put(`/Submissions/${submitTarget.asm.currentSubmission.subId}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                toast.success('Cập nhật bài nộp thành công!');
            } else {
                // Nếu chưa nộp thì dùng API Create (POST)
                formData.append('AsmId', submitTarget.asm.asmId);
                formData.append('StudentId', user.userId);
                response = await api.post('/Submissions', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                toast.success('Nộp bài thành công!');
            }
            setSubmitTarget(null);
            fetchClassDetail(); // Refresh data
        } catch (err) {
            console.error('Submission error:', err);
            toast.error(err.response?.data?.message || 'Có lỗi khi nộp bài');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="scd-page">
                <StudentSidebar />
                <div className="scd-main scd-loading-container">
                    <Loader2 className="animate-spin" size={40} />
                    <p>Đang tải thông tin lớp học...</p>
                </div>
            </div>
        );
    }

    if (error || !classData) {
        return (
            <div className="scd-page">
                <StudentSidebar />
                <div className="scd-main scd-error-container">
                    <AlertCircle size={40} color="#ef4444" />
                    <p>{error}</p>
                    <button className="scd-btn-retry" onClick={fetchClassDetail}>
                        <RefreshCw size={16} /> Thử lại
                    </button>
                </div>
            </div>
        );
    }

    const { classInfo, sessions } = classData;
    const accent = '#3b82f6'; // Default color

    const pastSessions = sessions.filter(s => new Date(s.sessionDate) <= new Date()).reverse();
    const futureSessions = sessions.filter(s => new Date(s.sessionDate) > new Date());
    const totalSessions = sessions.length;
    // User wants progress based on sessions that have passed (pastSessions)
    const passedSessionsCount = pastSessions.length;
    const progress = totalSessions > 0 ? Math.round((passedSessionsCount / totalSessions) * 100) : 0;
    
    // Check-in progress (mock for now or inferred from sessions)
    const attendedCount = sessions.filter(s => s.status === 'Attended').length; 
    const attendanceRate = pastSessions.length > 0 ? Math.round((attendedCount / pastSessions.length) * 100) : 100;

    const allAssignments = sessions.flatMap(s => s.assignments || []);
    const submittedAsmsCount = allAssignments.filter(a => a.currentSubmission != null).length;
    const totalMaterials = sessions.reduce((acc, s) => acc + (s.materials?.length || 0), 0);
    
    // Calculate GPA and Progress
    const gradedAsms = allAssignments.filter(a => a.currentSubmission?.isPublished && a.currentSubmission?.score != null);
    const gpa = gradedAsms.length > 0 
        ? (gradedAsms.reduce((acc, a) => acc + a.currentSubmission.score, 0) / gradedAsms.length).toFixed(1) 
        : '—';

    let progressTrend = { label: 'Chưa đủ dữ liệu', icon: <MinusCircle size={14} />, color: '#94a3b8' };
    if (gradedAsms.length >= 2) {
        const sortedByDate = [...gradedAsms].sort((a, b) => new Date(b.currentSubmission.submittedAt || b.currentSubmission.createdAt) - new Date(a.currentSubmission.submittedAt || a.currentSubmission.createdAt));
        const recentAvg = sortedByDate.slice(-2).reduce((acc, a) => acc + a.currentSubmission.score, 0) / 2;
        const overallAvg = parseFloat(gpa);
        const diff = recentAvg - overallAvg;

        if (diff > 0.5) progressTrend = { label: 'Tiến bộ vượt bậc', icon: <TrendingUp size={14} />, color: '#16a34a' };
        else if (diff >= -0.5) progressTrend = { label: 'Duy trì ổn định', icon: <TrendingUp size={14} />, color: '#3b82f6' };
        else progressTrend = { label: 'Cần nỗ lực hơn', icon: <TrendingDown size={14} />, color: '#dc2626' };
    }

    const renderMaterialCard = (item) => (
        <div key={item.materialId} className="scd-item-card" onClick={() => setSelectedMaterial(item)}>
            <div className="scd-item-card-icon">{getFileIcon(item.contentType, item.fileUrl)}</div>
            <div className="scd-item-card-body">
                <h4 className="scd-item-card-title">{item.title}</h4>
                <div className="scd-item-card-meta">
                    {item.fileSize && <span>{(item.fileSize / 1024).toFixed(0)} KB</span>}
                    {item.fileSize && <span className="dot">•</span>}
                    <span>Tài liệu học tập</span>
                </div>
            </div>
            <div className="scd-item-card-action"><Eye size={15} /></div>
        </div>
    );

    const renderAssignmentCard = (asm, sessionId) => {
        const status = getAssignmentStatus(asm);
        const cfg = statusConfig[status];
        const sub = asm.currentSubmission;
        return (
            <div key={asm.asmId} className={`scd-item-card scd-asm-item-card ${status}`} onClick={() => setSelectedAssignment({ asm, sessionId })}>
                <div className="scd-item-card-body">
                    <div className="scd-item-card-toprow">
                        <span className={`scd-status-chip ${status}`}>{cfg.icon} {cfg.label}</span>
                        {sub?.isPublished && sub?.score != null && (
                            <span className="scd-grade-badge"><Star size={12} /> {sub.score}/10</span>
                        )}
                    </div>
                    <h4 className="scd-item-card-title">{asm.title}</h4>
                    <div className="scd-item-card-meta">
                        <ClockIcon size={12} /><span>Hạn: {formatDate(asm.dueDate, true)}</span>
                    </div>
                </div>
                <div className="scd-item-card-action"><Eye size={15} /></div>
            </div>
        );
    };

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
                    <span className="scd-breadcrumb-current">{classInfo.className}</span>
                </div>

                {/* Page Header */}
                <div className="scd-page-header" style={{ '--accent': accent }}>
                    <div className="scd-header-accent" style={{ background: accent }} />
                    <div className="scd-title-block">
                        <div className="scd-title-row">
                        <h1>{classInfo.className}</h1>
                        {(() => {
                            const hasStarted = classInfo.startDate ? new Date(classInfo.startDate) <= new Date() : false;
                            const statusKey = classInfo.status === 'Active' 
                                ? (passedSessionsCount === 0 && !hasStarted ? 'notstarted' : 'active') 
                                : 'inactive';
                            const statusLabel = classInfo.status === 'Active' 
                                ? (passedSessionsCount === 0 && !hasStarted ? 'Chưa học' : 'Đang học') 
                                : 'Đã kết thúc';
                            return (
                                <span className={`scd-status-badge ${statusKey}`}>
                                    {statusLabel}
                                </span>
                            );
                        })()}
                    </div>
                        <p className="scd-title-meta">
                            Môn: {classInfo.subjectName} &nbsp;•&nbsp; {classInfo.teacherName ? `GV: ${classInfo.teacherName}` : 'Chưa có GV'}
                        </p>
                    </div>
                </div>

                {/* Info Cards */}
                <div className="scd-info-cards">
                    <div className="scd-info-card">
                        <div className="scd-info-label"><Calendar size={15} /> LỊCH HỌC</div>
                        <div className="scd-info-value">
                            {classInfo.scheduleSlots?.length > 0 
                                ? classInfo.scheduleSlots.map(s => {
                                    const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
                                    return days[s.dayOfWeek];
                                  }).join(", ")
                                : "N/A"}
                        </div>
                        <div className="scd-info-sub">
                            {classInfo.scheduleSlots?.[0]?.startTime} - {classInfo.scheduleSlots?.[0]?.endTime}
                        </div>
                    </div>
                    <div className="scd-info-card">
                        <div className="scd-info-label"><Clock size={15} /> THỜI GIAN</div>
                        <div className="scd-info-value">{formatDate(classInfo.startDate)}</div>
                        <div className="scd-info-sub">Đến {formatDate(classInfo.endDate)}</div>
                    </div>
                    <div className="scd-info-card">
                        <div className="scd-info-label"><Users size={15} /> LỚP HỌC</div>
                        <div className="scd-info-value">{classInfo.studentCount}</div>
                        <div className="scd-info-sub">học sinh</div>
                    </div>
                    <div className="scd-info-card highlight" style={{ '--accent': accent }}>
                        <div className="scd-info-label"><BookOpen size={15} /> CHUYÊN CẦN</div>
                        <div className="scd-info-value" style={{ color: attendanceRate >= 80 ? '#16a34a' : '#dc2626' }}>
                            {attendanceRate}%
                        </div>
                        <div className="scd-info-sub">{attendedCount}/{pastSessions.length} buổi đã qua</div>
                    </div>
                    {/* New GPA & Progress cards in top bar */}
                    <div className="scd-info-card highlight" style={{ '--accent': '#f59e0b' }}>
                        <div className="scd-info-label"><Award size={15} /> ĐIỂM TRUNG BÌNH</div>
                        <div className="scd-info-value" style={{ color: '#f59e0b' }}>{gpa}</div>
                        <div className="scd-info-sub">điểm trung bình (GPA)</div>
                    </div>
                    <div className="scd-info-card highlight" style={{ '--accent': progressTrend.color }}>
                        <div className="scd-info-label">{progressTrend.icon} TIẾN BỘ</div>
                        <div className="scd-info-value" style={{ color: progressTrend.color, fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
                            {progressTrend.label}
                        </div>
                        <div className="scd-info-sub">Xu hướng học tập</div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="scd-tabs-nav">
                    {[
                        { key: 'overview', label: 'Tổng quan' },
                        { key: 'roadmap', label: 'Lộ trình học (Tài liệu & Bài tập)' },
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
                                        <p className="scd-empty-msg">Chưa có buổi học nào đã diễn ra.</p>
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
                                                        <tr key={s.sessionId}>
                                                            <td>
                                                                <div className="att-date-cell">
                                                                    <span className="att-session-num">{s.title}</span>
                                                                    <span className="att-session-date">{s.dayLabel}, {formatDate(s.sessionDate)} • {s.time}</span>
                                                                </div>
                                                            </td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                {s.status === 'Attended' && <span className="scd-att-badge present"><CheckCircle size={13} /> Có mặt</span>}
                                                                {s.status === 'Absent' && <span className="scd-att-badge absent"><AlertCircle size={13} /> Vắng</span>}
                                                                {(s.status === 'Scheduled' || s.status === 'Ongoing') && new Date(s.sessionDate) > new Date() && (
                                                                    <span className="scd-att-badge upcoming"><ClockIcon size={13} /> Chưa học</span>
                                                                )}
                                                                {((s.status === 'Scheduled' || s.status === 'Ongoing') && new Date(s.sessionDate) <= new Date()) || (s.status === 'Completed' && !s.status) ? (
                                                                    <span className="scd-att-badge missing"><AlertCircle size={13} /> Chưa điểm danh</span>
                                                                ) : null}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
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
                                            <div className="cd-staff-avatar" style={{ background: accent }}>{classInfo.teacherName?.charAt(0) || 'G'}</div>
                                            <div className="cd-staff-info">
                                                <div className="cd-staff-role">GIÁO VIÊN CHÍNH</div>
                                                <div className="cd-staff-name">{classInfo.teacherName || 'Chưa phân công'}</div>
                                                <div className="cd-staff-sub">{classInfo.subjectName}</div>
                                            </div>
                                        </div>
                                        {classInfo.assistantName && (
                                            <div className="cd-staff-item">
                                                <div className="cd-staff-avatar assistant">{classInfo.assistantName.charAt(0)}</div>
                                                <div className="cd-staff-info">
                                                    <div className="cd-staff-role" style={{ color: '#6366f1' }}>TRỢ GIẢNG</div>
                                                    <div className="cd-staff-name">{classInfo.assistantName}</div>
                                                    <div className="cd-staff-sub">Trợ giảng lớp học</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Thống kê học tập (Dạng cột bổ trợ) */}
                                <div className="scd-card scd-stats-card">
                                    <div className="scd-card-header"><h3>Thống kê học tập</h3></div>
                                    <div className="cd-overview-stats">
                                        <div className="cd-overview-row">
                                            <span>Buổi đã diễn ra</span>
                                            <span className="cd-overview-val">{passedSessionsCount} / {totalSessions}</span>
                                        </div>
                                        <div className="cd-overview-row">
                                            <span>Chuyên cần</span>
                                            <span className={`cd-overview-val ${attendanceRate >= 80 ? 'green' : 'red'}`}>{attendanceRate}%</span>
                                        </div>
                                        <div className="cd-overview-row">
                                            <span>Bài tập đã nộp</span>
                                            <span className="cd-overview-val">{submittedAsmsCount} / {allAssignments.length}</span>
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

                    {/* ─── TAB: ROADMAP (SESSIONS) ─── */}
                    {activeTab === 'roadmap' && (
                        <div className="scd-roadmap-tab" style={{ '--accent': accent }}>
                            {sessions.map((session) => {
                                const isExpanded = expandedSessionId === session.sessionId;
                                const mats = session.materials || [];
                                const asms = session.assignments || [];
                                const hasContent = mats.length > 0 || asms.length > 0;
                                const isFuture = new Date(session.sessionDate) > new Date();

                                return (
                                    <div key={session.sessionId} className="scd-session-card">
                                        <div className="scd-session-header" onClick={() => handleToggleSession(session.sessionId)}>
                                            <div className="scd-session-info">
                                                <div className="scd-session-num">Buổi {sessions.indexOf(session) + 1}</div>
                                                <div className="scd-session-title">
                                                    <h4>{session.title}</h4>
                                                    <div className="scd-session-meta">
                                                        <Calendar size={13} /> {session.dayLabel}, {formatDate(session.sessionDate)}
                                                        <span className="dot">•</span>
                                                        <Clock size={13} /> {session.time}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="scd-session-status">
                                                {session.status === 'Attended' && <span className="scd-att-badge present"><CheckCircle size={13} /> Có mặt</span>}
                                                {session.status === 'Absent' && <span className="scd-att-badge absent"><AlertCircle size={13} /> Vắng</span>}
                                                {isFuture && <span className="scd-att-badge upcoming"><ClockIcon size={13} /> Chưa học</span>}
                                                {!isFuture && session.status !== 'Attended' && session.status !== 'Absent' && (
                                                    <span className="scd-att-badge missing"><AlertCircle size={13} /> Chưa điểm danh</span>
                                                )}
                                                {hasContent && (
                                                    <span className="scd-session-item-badge">
                                                        {mats.length > 0 && <><FileText size={12} style={{ marginRight: 4 }} /> {mats.length}</>}
                                                        {mats.length > 0 && asms.length > 0 && <span style={{ margin: '0 4px', color: '#cbd5e1' }}>|</span>}
                                                        {asms.length > 0 && <><CheckSquare size={12} style={{ marginRight: 4 }} /> {asms.length}</>}
                                                    </span>
                                                )}
                                                {isExpanded ? <ChevronUp size={20} color="#64748b" /> : <ChevronDown size={20} color="#64748b" />}
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="scd-session-content">
                                                {mats.length === 0 && asms.length === 0 && (
                                                    <p className="scd-empty-msg">Chưa có tài liệu hay bài tập nào cho buổi học này.</p>
                                                )}

                                                {mats.length > 0 && (
                                                    <div className="scd-session-section">
                                                        <h5><BookOpen size={16} /> Tài liệu bài giảng</h5>
                                                        <div className="scd-session-grid">
                                                            {mats.map(renderMaterialCard)}
                                                        </div>
                                                    </div>
                                                )}

                                                {asms.length > 0 && (
                                                    <div className="scd-session-section">
                                                        <h5><CheckSquare size={16} /> Bài tập ({asms.length})</h5>
                                                        <div className="scd-session-grid">
                                                            {asms.map(asm => renderAssignmentCard(asm, session.sessionId))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            {/* Submit Modal */}
            {submitTarget && (
                <SubmitModal
                    assignment={submitTarget.asm}
                    isSubmitting={isSubmitting}
                    onClose={() => setSubmitTarget(null)}
                    onSubmit={(payload) => {
                        handleSubmitSubmission(payload);
                    }}
                />
            )}

            {/* Material Detail Modal */}
            {selectedMaterial && (
                <div className="scd-modal-overlay" onClick={() => setSelectedMaterial(null)}>
                    <div className="scd-modal scd-detail-modal" onClick={e => e.stopPropagation()}>
                        <div className="scd-modal-header">
                            <div className="scd-detail-modal-icon">{getFileIcon(selectedMaterial.contentType, selectedMaterial.fileUrl)}</div>
                            <div>
                                <h2>{selectedMaterial.title}</h2>
                                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                                    {selectedMaterial.fileSize ? `${(selectedMaterial.fileSize / 1024).toFixed(0)} KB • ` : ''} 
                                    Tài liệu học tập
                                </p>
                            </div>
                            <button className="scd-modal-close" onClick={() => setSelectedMaterial(null)}><X size={20} /></button>
                        </div>
                        <div className="scd-modal-body">
                            <div className="scd-detail-desc">
                                <label>Tên tệp tin gốc</label>
                                <p>{selectedMaterial.originalFileName || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="scd-modal-footer">
                            <button className="scd-btn-cancel" onClick={() => setSelectedMaterial(null)}>Đóng</button>
                            {selectedMaterial.fileUrl && (
                                <button className="scd-btn-submit" onClick={() => handleDownload(selectedMaterial.fileUrl, selectedMaterial.originalFileName)}>
                                    <Download size={16} /> Tải xuống
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Assignment Detail Modal */}
            {selectedAssignment && (() => {
                const asm = selectedAssignment.asm;
                const status = getAssignmentStatus(asm);
                const cfg = statusConfig[status];
                const sub = asm.currentSubmission;
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
                                        <ClockIcon size={13} style={{ verticalAlign: 'middle' }} /> Hạn nộp: {formatDate(asm.dueDate, true)}
                                    </p>
                                </div>
                                <button className="scd-modal-close" onClick={() => setSelectedAssignment(null)}><X size={20} /></button>
                            </div>
                            <div className="scd-modal-body">
                                <div className="scd-detail-desc">
                                    <label>Mô tả bài tập</label>
                                    <p>{asm.description || 'Không có mô tả chi tiết.'}</p>
                                </div>
                                {asm.fileUrl && (
                                    <button
                                        className="scd-btn-template" style={{ marginTop: '10px' }}
                                        onClick={() => handleDownload(asm.fileUrl, "De_bai_tap.pdf")}
                                    >
                                        <Download size={14} /> Tải file đề bài (PDF)
                                    </button>
                                )}
                                {sub && (
                                    <div className="scd-sub-history" style={{ marginTop: '18px' }}>
                                        <h4>Thông tin nộp bài</h4>
                                        <table className="scd-sub-table">
                                            <thead><tr>
                                                <th>File</th><th>Thời gian nộp</th>
                                                <th style={{ textAlign: 'center' }}>Điểm</th><th>Nhận xét</th>
                                            </tr></thead>
                                            <tbody>
                                                <tr>
                                                    <td>
                                                        <div className="scd-sub-files-list">
                                                            {sub.fileUrls && sub.fileUrls.length > 0 ? (
                                                                sub.fileUrls.map((url, i) => (
                                                                    <div 
                                                                        key={i} 
                                                                        className="scd-sub-file" 
                                                                        onClick={() => handleDownload(url, `File_${i+1}`)} 
                                                                        style={{ cursor: 'pointer', color: '#3b82f6', marginBottom: '4px' }}
                                                                    >
                                                                        <Paperclip size={14} /><span>File {i + 1}</span>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div className="scd-sub-file" onClick={() => handleDownload(sub.fileUrl, "Bai_lam.pdf")} style={{ cursor: 'pointer', color: '#3b82f6' }}>
                                                                    <Paperclip size={14} /><span>Xem bài làm</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="scd-sub-date">{formatDate(sub.submittedAt, true)}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        {sub.isPublished && sub.score != null
                                                            ? <span className={`scd-score ${sub.score >= 8 ? 'high' : sub.score >= 6.5 ? 'mid' : 'low'}`}>{sub.score}/10</span>
                                                            : <span className="scd-score-pending">Chờ chấm</span>}
                                                    </td>
                                                    <td>
                                                        {sub.isPublished && sub.teacherComment
                                                            ? <div className="scd-sub-comment"><MessageSquare size={13} /><span>{sub.teacherComment}</span></div>
                                                            : <span className="scd-no-comment">—</span>}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                            <div className="scd-modal-footer">
                                <button className="scd-btn-cancel" onClick={() => setSelectedAssignment(null)}>Đóng</button>
                                {status === 'graded' && !sub.isPublished && (
                                    <div className="scd-grading-msg">
                                        <AlertCircle size={14} /> 
                                        Giáo viên đang trong quá trình chấm bài, bạn không thể nộp lại lúc này.
                                    </div>
                                )}
                                {status !== 'graded' && (
                                    <button
                                        className="scd-btn-submit"
                                        style={{ background: accent }}
                                        onClick={() => { 
                                            setSelectedAssignment(null); 
                                            setSubmitTarget({ asm, sessionId: selectedAssignment.sessionId }); 
                                        }}
                                    >
                                        <Upload size={16} /> 
                                        {status === 'overdue' ? 'Nộp bài trễ' : (status === 'submitted' || status === 'late' ? 'Nộp lại bài' : 'Nộp bài ngay')}
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