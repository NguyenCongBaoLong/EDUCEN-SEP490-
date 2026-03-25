import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, Search, FileText, Download, Check, X, AlertCircle, Send, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import TeacherSidebar from '../../components/TeacherSidebar';
import api from '../../services/api';
import '../../css/pages/teacher/AssignmentGrading.css';
import '../../css/components/DeleteModal.css';

const AssignmentGrading = ({ isTA = false }) => {
    const { assignmentId } = useParams();
    const navigate = useNavigate();

    // Data State
    const [assignmentInfo, setAssignmentInfo] = useState(null);
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Filter/Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Form state for current selected student
    const [gradeInput, setGradeInput] = useState('');
    const [feedbackInput, setFeedbackInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isPublishingAll, setIsPublishingAll] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [gradeError, setGradeError] = useState('');
    const [isDirty, setIsDirty] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        return localStorage.getItem('teacher-sidebar-collapsed') === 'true';
    });

    const fetchGradingData = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await api.get(`/Assignments/${assignmentId}/grading`);
            const { assignment, students: studentList } = response.data;
            
            setAssignmentInfo(assignment);
            setStudents(studentList);
            
            if (studentList.length > 0 && !selectedStudent) {
                setSelectedStudent(studentList[0]);
            } else if (selectedStudent) {
                // Refresh the currently selected student data
                const updatedSelected = studentList.find(s => s.studentId === selectedStudent.studentId);
                if (updatedSelected) setSelectedStudent(updatedSelected);
            }
        } catch (error) {
            console.error('Error fetching grading data:', error);
            toast.error('Không thể tải dữ liệu chấm điểm');
        } finally {
            setIsLoading(false);
        }
    }, [assignmentId, selectedStudent]);

    useEffect(() => {
        fetchGradingData();
    }, [assignmentId]);

    // Calculate if form is dirty
    useEffect(() => {
        if (!selectedStudent || !selectedStudent.submission) {
            setIsDirty(false);
            return;
        }

        const originalScore = selectedStudent.submission.score != null ? selectedStudent.submission.score.toString() : '';
        const originalFeedback = selectedStudent.submission.teacherComment || '';

        const scoreChanged = gradeInput.toString() !== originalScore;
        const feedbackChanged = feedbackInput !== originalFeedback;

        setIsDirty(scoreChanged || feedbackChanged);
    }, [gradeInput, feedbackInput, selectedStudent]);

    // Update form when selecting a new student
    useEffect(() => {
        if (selectedStudent) {
            if (selectedStudent.submission) {
                setGradeInput(selectedStudent.submission.score != null ? selectedStudent.submission.score : '');
                setFeedbackInput(selectedStudent.submission.teacherComment || '');
            } else {
                setGradeInput('');
                setFeedbackInput('');
            }
            setGradeError('');
        }
    }, [selectedStudent]);

    // Filter students
    const filteredStudents = students.filter(student => {
        const matchesSearch = student.fullName.toLowerCase().includes(searchQuery.toLowerCase());
        
        let status = 'NotSubmitted';
        if (student.submission) {
            status = student.submission.status;
        }

        const matchesStatus = statusFilter === 'all' || 
            (statusFilter === 'missing' && (status === 'NotSubmitted' || status === 'Chưa nộp')) ||
            (statusFilter === 'submitted' && (status === 'Đã nộp' || status === 'Nộp muộn' || status === 'Graded' || status === 'Published' || status === 'Submitted' || status === 'LateSubmitted')) ||
            (statusFilter === 'graded' && (status === 'Graded' || status === 'Published' || status === 'Đã chấm' || status === 'Công bố'));

        return matchesSearch && matchesStatus;
    });

    const isScoreRequired = selectedStudent?.submission && selectedStudent?.submission?.score === null && gradeInput === '';

    const handleSaveGrade = async () => {
        if (!isDirty || isScoreRequired || !selectedStudent?.submission) return;

        if (gradeInput !== '') {
            const numGrade = parseFloat(gradeInput);
            if (numGrade < 0 || numGrade > 10) {
                setGradeError('Điểm số phải từ 0 đến 10');
                return;
            }
        }

        try {
            setGradeError('');
            setIsSaving(true);
            
            await api.put(`/Submissions/${selectedStudent.submission.subId}/grade`, {
                score: parseFloat(gradeInput),
                teacherComment: feedbackInput
            });

            toast.success('Đã lưu điểm thành công');
            setIsDirty(false);
            
            // Refresh data to get updated status and database state
            await fetchGradingData();
        } catch (error) {
            console.error('Error saving grade:', error);
            toast.error(error.response?.data?.message || 'Có lỗi khi lưu điểm');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePublishAll = async (isPublish) => {
        const gradedCount = students.filter(s => s.submission && s.submission.score != null).length;
        if (gradedCount === 0) {
            toast.error('Không có bài nào đã chấm để công bố');
            return;
        }

        try {
            setIsPublishingAll(true);
            await api.put(`/Submissions/assignment/${assignmentId}/publish-all`, {
                isPublished: isPublish
            });

            toast.success(isPublish ? 'Đã công bố tất cả điểm' : 'Đã hủy công bố tất cả điểm');
            await fetchGradingData();
        } catch (error) {
            console.error('Error publishing all grades:', error);
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi công bố hàng loạt');
        } finally {
            setIsPublishingAll(false);
        }
    };

    const handleResetGrade = async () => {
        if (!selectedStudent?.submission) return;
        setShowResetModal(true);
    };

    const confirmResetGrade = async () => {
        try {
            setShowResetModal(false);
            setIsResetting(true);
            await api.put(`/Submissions/${selectedStudent.submission.subId}/reset`);
            
            toast.success('Đã hủy đánh giá. Học sinh có thể nộp lại bài.');
            
            // Clear local inputs
            setGradeInput('');
            setFeedbackInput('');
            setIsDirty(false);
            
            await fetchGradingData();
        } catch (error) {
            console.error('Error resetting grade:', error);
            toast.error(error.response?.data?.message || 'Có lỗi khi hủy đánh giá');
        } finally {
            setIsResetting(false);
        }
    };

    const getStatusInfo = (student) => {
        const sub = student.submission;
        if (!sub) return { text: 'Chưa nộp', class: 'status-missing', icon: <AlertCircle size={14} /> };
        
        const status = sub.status || 'Submitted';
        
        if (status === 'Published' || status === 'Công bố') {
            return { text: 'Đã công bố', class: 'status-published', icon: <CheckCircle size={14} /> };
        }
        if (status === 'Graded' || status === 'Đã chấm') {
            return { text: 'Đã chấm', class: 'status-graded', icon: <CheckCircle size={14} />, isGraded: true };
        }

        // Dynamic check for late submission
        if (assignmentInfo?.endTime && sub.submittedAt) {
            const submittedAt = new Date(sub.submittedAt);
            const dueDate = new Date(assignmentInfo.endTime);
            if (submittedAt > dueDate) {
                return { text: 'Nộp trễ', class: 'status-late', icon: <Clock size={14} /> };
            }
        }
        
        return { text: 'Đã nộp', class: 'status-submitted', icon: <CheckCircle size={14} /> };
    };

    const formatDate = (dateString) => {
        if (!dateString) return '--/--/----';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const stats = {
        graded: students.filter(s => s.submission && (s.submission.status === 'Graded' || s.submission.status === 'Published')).length,
        submitted: students.filter(s => s.submission).length,
        total: students.length
    };

    const getFileType = (url) => {
        if (!url) return null;
        const ext = url.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'image';
        if (ext === 'pdf') return 'pdf';
        return ext;
    };

    if (isLoading && !assignmentInfo) {
        return (
            <div className="assignment-grading-page">
                <TeacherSidebar isTA={isTA} />
                <div className="loading-container">
                    <Loader2 className="animate-spin" size={48} />
                    <p>Đang tải dữ liệu chấm điểm...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`assignment-grading-page ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            <TeacherSidebar isTA={isTA} onCollapseChange={setIsSidebarCollapsed} />

            <main className={`grading-main ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                {/* Header (Top Bar) */}
                <header className="grading-header">
                    <div className="grading-header-left">
                        <button className="btn-back" onClick={() => navigate(isTA ? '/ta/assignments' : '/teacher/assignments')}>
                            <ArrowLeft size={20} />
                            Trở về
                        </button>
                        <div className="grading-assignment-info">
                            <h1>{assignmentInfo?.title}</h1>
                            {assignmentInfo?.originalFileName && (
                                <span className="class-badge">{assignmentInfo.originalFileName}</span>
                            )}
                        </div>
                    </div>

                    <div className="grading-header-right">
                        <div className="grading-stats">
                            <div className="stat-item">
                                <span className="stat-label">Tổng sĩ số:</span>
                                <span className="stat-value">{stats.total}</span>
                            </div>
                            <div className="stat-divider"></div>
                            <div className="stat-item">
                                <span className="stat-label">Đã nộp:</span>
                                <span className="stat-value">{stats.submitted}</span>
                            </div>
                            <div className="stat-divider"></div>
                            <div className="stat-item">
                                <span className="stat-label">Đã chấm:</span>
                                <span className="stat-value highlight">{stats.graded}/{stats.submitted}</span>
                            </div>
                        </div>

                        <button 
                            className={`btn-publish-all ${stats.graded === 0 ? 'disabled' : ''}`}
                            onClick={() => handlePublishAll(true)}
                            disabled={isPublishingAll || stats.graded === 0}
                        >
                            {isPublishingAll ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <>
                                    <Send size={18} /> Công bố tất cả
                                </>
                            )}
                        </button>
                    </div>
                </header>

                <div className="grading-content">
                    {/* Left Column - Student List */}
                    <div className="grading-sidebar">
                        <div className="grading-sidebar-header">
                            <h3>Danh sách học sinh</h3>

                            <div className="grading-filters">
                                <div className="search-box">
                                    <Search size={16} />
                                    <input
                                        type="text"
                                        placeholder="Tìm học sinh..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <select
                                    className="status-filter"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="all">Tất cả trạng thái</option>
                                    <option value="submitted">Đã nộp bài</option>
                                    <option value="graded">Đã chấm điểm</option>
                                    <option value="missing">Chưa nộp</option>
                                </select>
                            </div>
                        </div>

                        <div className="grading-student-list">
                            {filteredStudents.map(student => {
                                const statusInfo = getStatusInfo(student);
                                const initials = student.fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
                                
                                return (
                                    <div
                                        key={student.studentId}
                                        className={`grading-student-item ${selectedStudent?.studentId === student.studentId ? 'active' : ''} ${student.submission?.score != null ? 'is-graded' : ''}`}
                                        onClick={() => setSelectedStudent(student)}
                                    >
                                        <div className="student-avatar">{initials}</div>
                                        <div className="student-info">
                                            <div className="student-name-row">
                                                <span className="student-name">{student.fullName}</span>
                                                {student.submission?.score != null && (
                                                    <span className="student-score-badge">{student.submission.score}đ</span>
                                                )}
                                            </div>
                                            <div className="student-meta">
                                                <span className={`student-status ${statusInfo.class}`}>
                                                    {statusInfo.icon} {statusInfo.text}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Column - Work & Grading Interface */}
                    <div className="grading-workspace">
                        {selectedStudent ? (
                            <>
                                {/* Workspace Header */}
                                <div className="workspace-header">
                                    <div className="workspace-student">
                                        <div className="workspace-avatar">
                                            {selectedStudent.fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                                        </div>
                                        <div>
                                            <h2>{selectedStudent.fullName}</h2>
                                            <p className="submission-time">
                                                {selectedStudent.submission 
                                                    ? `Nộp lúc: ${formatDate(selectedStudent.submission.submittedAt)}`
                                                    : 'Chưa có bài nộp'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="workspace-actions">
                                        {selectedStudent.submission?.fileUrl && (
                                            <a 
                                                href={selectedStudent.submission.fileUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="btn-download"
                                                style={{ textDecoration: 'none' }}
                                            >
                                                <Download size={16} /> Tải file bài làm
                                            </a>
                                        )}
                                    </div>
                                </div>

                                <div className="workspace-body">
                                    {/* Submission Viewer */}
                                    <div className="submission-viewer">
                                        {!selectedStudent.submission ? (
                                            <div className="empty-submission">
                                                <AlertCircle size={48} />
                                                <p>Học sinh chưa nộp bài</p>
                                            </div>
                                        ) : (
                                            <div className="submission-file">
                                                {getFileType(selectedStudent.submission.fileUrl) === 'pdf' ? (
                                                    <iframe
                                                        src={selectedStudent.submission.fileUrl}
                                                        className="document-preview-iframe"
                                                        title="PDF Preview"
                                                    ></iframe>
                                                ) : getFileType(selectedStudent.submission.fileUrl) === 'image' ? (
                                                    <div className="image-preview-container">
                                                        <img src={selectedStudent.submission.fileUrl} alt="Bài làm" className="image-preview" />
                                                    </div>
                                                ) : (
                                                    <div className="unsupported-file-preview">
                                                        <FileText size={64} className="file-icon" />
                                                        <h4>Bài làm của {selectedStudent.fullName}</h4>
                                                        <p>Định dạng không hỗ trợ xem trực tiếp</p>
                                                        <div className="viewer-placeholder">
                                                            Trình duyệt không hỗ trợ xem trước định dạng file này.<br />
                                                            Vui lòng bấm <strong>Tải file bài làm</strong> để xem chi tiết.
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Grading Form Panel */}
                                    <div className="grading-panel">
                                        <div className="panel-header">
                                            <h3>Chấm điểm & Nhận xét</h3>
                                            {selectedStudent.submission?.isPublished && (
                                                <span className="published-badge">
                                                    <Send size={12} /> Đã công bố
                                                </span>
                                            )}
                                        </div>

                                        <div className="grading-form">
                                            <div className="form-group">
                                                <label>Điểm số (Thang 10) <span className="req">*</span></label>
                                                <input
                                                    type="number"
                                                    min="0" max="10" step="0.25"
                                                    disabled={!selectedStudent.submission || isSaving}
                                                    value={gradeInput}
                                                    onChange={(e) => {
                                                        setGradeInput(e.target.value);
                                                        setGradeError('');
                                                    }}
                                                    placeholder="VD: 8.5"
                                                    className={`score-input ${gradeError ? 'error-border' : ''}`}
                                                />
                                                {gradeError && <span className="error-text">{gradeError}</span>}
                                            </div>

                                            <div className="form-group">
                                                <label>Nhận xét cho học sinh</label>
                                                <textarea
                                                    rows={4}
                                                    disabled={!selectedStudent.submission || isSaving}
                                                    value={feedbackInput}
                                                    onChange={(e) => setFeedbackInput(e.target.value)}
                                                    placeholder="Nhập nhận xét chi tiết..."
                                                ></textarea>
                                            </div>

                                            <div className="grading-actions">
                                                <button
                                                    className="btn-save-grade"
                                                    onClick={handleSaveGrade}
                                                    disabled={!selectedStudent.submission || !isDirty || isSaving || isScoreRequired}
                                                >
                                                    {isSaving ? (
                                                        <>
                                                            <Loader2 size={18} className="animate-spin" /> Đang lưu...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Check size={18} /> Lưu đánh giá
                                                        </>
                                                    )}
                                                </button>

                                                {selectedStudent.submission?.score != null && (
                                                    <div className="btn-group-row" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                        <button
                                                            className={`btn-publish ${selectedStudent.submission?.isPublished ? 'published' : ''}`}
                                                            onClick={() => handlePublishGrade(!selectedStudent.submission.isPublished)}
                                                            disabled={isPublishing || isSaving || isResetting}
                                                        >
                                                            {isPublishing ? (
                                                                <Loader2 size={18} className="animate-spin" />
                                                            ) : selectedStudent.submission.isPublished ? (
                                                                <>
                                                                    <X size={18} /> Hủy công bố
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Send size={18} /> Công bố điểm
                                                                </>
                                                            )}
                                                        </button>

                                                        {!selectedStudent.submission.isPublished && (
                                                            <button
                                                                className="btn-reset-grade"
                                                                onClick={handleResetGrade}
                                                                disabled={isResetting || isSaving || isPublishing}
                                                                title="Hủy kết quả chấm để học sinh nộp lại"
                                                            >
                                                                {isResetting ? (
                                                                    <Loader2 size={18} className="animate-spin" />
                                                                ) : (
                                                                    <>
                                                                        <X size={18} /> Hủy đánh giá
                                                                    </>
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="workspace-empty">
                                <Search size={48} />
                                <p>Chọn một học sinh từ danh sách bên trái để bắt đầu chấm bài.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Reset Grade Confirmation Modal */}
            {showResetModal && (
                <div className="delete-modal-overlay" onClick={() => setShowResetModal(false)}>
                    <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="delete-modal-header">
                            <h3>Hủy Kết Quả Đánh Giá</h3>
                            <button className="delete-modal-close" onClick={() => setShowResetModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="delete-modal-body">
                            <div className="delete-modal-warning">
                                <div className="delete-modal-warning-icon">
                                    <AlertTriangle size={20} />
                                </div>
                                <div className="delete-modal-warning-content">
                                    <h4>Bạn có chắc chắn muốn hủy đánh giá này?</h4>
                                    <p>
                                        Học sinh <strong>{selectedStudent?.fullName}</strong> sẽ có thể nộp lại bản mới. 
                                        Điểm số và nhận xét hiện tại sẽ bị xóa hoàn toàn.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="delete-modal-footer">
                            <button className="btn-delete-cancel" onClick={() => setShowResetModal(false)}>
                                Hủy bỏ
                            </button>
                            <button
                                className="btn-delete-confirm"
                                onClick={confirmResetGrade}
                                disabled={isResetting}
                            >
                                {isResetting ? <Loader2 size={18} className="animate-spin" /> : 'Xác Nhận Hủy'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssignmentGrading;
