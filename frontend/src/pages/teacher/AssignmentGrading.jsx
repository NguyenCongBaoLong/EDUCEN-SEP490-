import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, Search, FileText, Download, Check, X, AlertCircle } from 'lucide-react';
import TeacherSidebar from '../../components/TeacherSidebar';
import '../../css/pages/teacher/AssignmentGrading.css';

// Mock data (in a real app, this would be fetched based on assignmentId)
const ASSIGNMENT_DATA = {
    id: 1,
    title: 'Bài tập về nhà Chương 1: Hàm số',
    className: 'Đại Số Nâng Cao',
    dueDate: '2023-10-15T23:59',
    description: 'Hoàn thành các bài tập từ 1 đến 15 trang 42 SGK. Trình bày rõ ràng các bước giải.',
    totalStudents: 15,
};

const STUDENTS_MOCK = [
    { id: 1, name: 'Nguyễn Văn A', avatar: 'NA', status: 'submitted', score: null, feedback: '', submittedAt: '2023-10-14T15:30:00', fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', fileType: 'pdf' },
    { id: 2, name: 'Trần Thị B', avatar: 'TB', status: 'late', score: 8.5, feedback: 'Thiếu bước kết luận bài 3', submittedAt: '2023-10-16T08:15:00', fileUrl: 'https://images.unsplash.com/photo-1633478062482-790e3b5dd810?auto=format&fit=crop&q=80&w=800', fileType: 'image' },
    { id: 3, name: 'Lê Hoàng C', avatar: 'LC', status: 'missing', score: null, feedback: '', submittedAt: null, fileUrl: null, fileType: null },
    { id: 4, name: 'Phạm Minh D', avatar: 'PD', status: 'submitted', score: 10, feedback: 'Làm bài rất tốt', submittedAt: '2023-10-15T20:00:00', fileUrl: '#', fileType: 'docx' },
    { id: 5, name: 'Đặng Thái E', avatar: 'DE', status: 'submitted', score: null, feedback: '', submittedAt: '2023-10-15T22:45:00', fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', fileType: 'pdf' },
];

const AssignmentGrading = () => {
    const { assignmentId } = useParams();
    const navigate = useNavigate();

    // State
    const [students, setStudents] = useState(STUDENTS_MOCK);
    const [selectedStudent, setSelectedStudent] = useState(STUDENTS_MOCK[0]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Form state for current selected student
    const [gradeInput, setGradeInput] = useState('');
    const [feedbackInput, setFeedbackInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Calculate if form is dirty (has changes)
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        if (!selectedStudent) return;

        const originalScore = selectedStudent.score !== null ? selectedStudent.score.toString() : '';
        const originalFeedback = selectedStudent.feedback || '';

        const scoreChanged = gradeInput.toString() !== originalScore;
        const feedbackChanged = feedbackInput !== originalFeedback;

        setIsDirty(scoreChanged || feedbackChanged);
    }, [gradeInput, feedbackInput, selectedStudent]);

    // Filter students
    const filteredStudents = students.filter(student => {
        const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Update form when selecting a new student
    useEffect(() => {
        if (selectedStudent) {
            setGradeInput(selectedStudent.score !== null ? selectedStudent.score : '');
            setFeedbackInput(selectedStudent.feedback || '');
            setShowSuccess(false); // Reset success message on student change
        }
    }, [selectedStudent]);

    const isScoreRequired = selectedStudent?.status !== 'missing' && selectedStudent?.score === null && gradeInput === '';

    const handleSaveGrade = () => {
        if (!isDirty || isScoreRequired) return;

        setIsSaving(true);
        setShowSuccess(false);
        // Simulate API call
        setTimeout(() => {
            const updatedStudents = students.map(s => {
                if (s.id === selectedStudent.id) {
                    return {
                        ...s,
                        score: gradeInput !== '' ? parseFloat(gradeInput) : null,
                        feedback: feedbackInput
                    };
                }
                return s;
            });
            setStudents(updatedStudents);

            // Update selected student ref
            setSelectedStudent({
                ...selectedStudent,
                score: gradeInput !== '' ? parseFloat(gradeInput) : null,
                feedback: feedbackInput
            });

            setIsSaving(false);
            setShowSuccess(true);
            setIsDirty(false); // Reset dirty state

            // Hide success message after 2.5s
            setTimeout(() => {
                setShowSuccess(false);
            }, 2500);

            // Auto select next student needing grading
            // const nextStudentIndex = students.findIndex(s => s.id === selectedStudent.id) + 1;
            // if (nextStudentIndex < students.length) {
            //    setSelectedStudent(students[nextStudentIndex]);
            // }
        }, 600);
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'submitted': return { text: 'Đã nộp', class: 'status-submitted', icon: <CheckCircle size={14} /> };
            case 'late': return { text: 'Nộp trễ', class: 'status-late', icon: <Clock size={14} /> };
            case 'missing': return { text: 'Chưa nộp', class: 'status-missing', icon: <AlertCircle size={14} /> };
            default: return { text: '', class: '', icon: null };
        }
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
        graded: students.filter(s => s.score !== null).length,
        submitted: students.filter(s => s.status === 'submitted' || s.status === 'late').length,
        total: students.length
    };

    return (
        <div className="assignment-grading-page">
            <TeacherSidebar />

            <main className="grading-main">
                {/* Header (Top Bar) */}
                <header className="grading-header">
                    <div className="grading-header-left">
                        <button className="btn-back" onClick={() => navigate('/teacher/assignments')}>
                            <ArrowLeft size={20} />
                            Trở về
                        </button>
                        <div className="grading-assignment-info">
                            <h1>{ASSIGNMENT_DATA.title}</h1>
                            <span className="class-badge">{ASSIGNMENT_DATA.className}</span>
                        </div>
                    </div>

                    <div className="grading-header-right">
                        <div className="grading-stats">
                            <div className="stat-item">
                                <span className="stat-label">Đã nộp:</span>
                                <span className="stat-value">{stats.submitted}/{stats.total}</span>
                            </div>
                            <div className="stat-divider"></div>
                            <div className="stat-item">
                                <span className="stat-label">Đã chấm:</span>
                                <span className="stat-value highlight">{stats.graded}/{stats.submitted}</span>
                            </div>
                        </div>
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
                                    <option value="submitted">Đã nộp đúng hạn</option>
                                    <option value="late">Nộp trễ</option>
                                    <option value="missing">Chưa nộp</option>
                                </select>
                            </div>
                        </div>

                        <div className="grading-student-list">
                            {filteredStudents.map(student => {
                                const statusInfo = getStatusText(student.status);
                                return (
                                    <div
                                        key={student.id}
                                        className={`grading-student-item ${selectedStudent?.id === student.id ? 'active' : ''} ${student.score !== null ? 'is-graded' : ''}`}
                                        onClick={() => setSelectedStudent(student)}
                                    >
                                        <div className="student-avatar">{student.avatar}</div>
                                        <div className="student-info">
                                            <div className="student-name-row">
                                                <span className="student-name">{student.name}</span>
                                                {student.score !== null && (
                                                    <span className="student-score-badge">{student.score}đ</span>
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
                                        <div className="workspace-avatar">{selectedStudent.avatar}</div>
                                        <div>
                                            <h2>{selectedStudent.name}</h2>
                                            <p className="submission-time">Nộp lúc: {formatDate(selectedStudent.submittedAt)}</p>
                                        </div>
                                    </div>
                                    <div className="workspace-actions">
                                        {selectedStudent.fileUrl && (
                                            <button className="btn-download">
                                                <Download size={16} /> Tải file về máy
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="workspace-body">
                                    {/* Submission Viewer */}
                                    <div className="submission-viewer">
                                        {selectedStudent.status === 'missing' ? (
                                            <div className="empty-submission">
                                                <AlertCircle size={48} />
                                                <p>Học sinh chưa nộp bài</p>
                                            </div>
                                        ) : (
                                            <div className="submission-file">
                                                {selectedStudent.fileType === 'pdf' ? (
                                                    <iframe
                                                        src={selectedStudent.fileUrl}
                                                        className="document-preview-iframe"
                                                        title="PDF Preview"
                                                    ></iframe>
                                                ) : selectedStudent.fileType === 'image' ? (
                                                    <div className="image-preview-container">
                                                        <img src={selectedStudent.fileUrl} alt="Bài làm" className="image-preview" />
                                                    </div>
                                                ) : (
                                                    <div className="unsupported-file-preview">
                                                        <FileText size={64} className="file-icon" />
                                                        <h4>Bài làm của {selectedStudent.name}.{selectedStudent.fileType}</h4>
                                                        <p>2.4 MB</p>
                                                        <div className="viewer-placeholder">
                                                            Trình duyệt không hỗ trợ xem trước định dạng file này.<br />
                                                            Vui lòng bấm <strong>Tải file về máy</strong> để xem chi tiết.
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Grading Form Panel */}
                                    <div className="grading-panel">
                                        <h3>Chấm điểm & Nhận xét</h3>

                                        <div className="grading-form">
                                            <div className="form-group">
                                                <label>Điểm số (Thang 10) <span className="req">*</span></label>
                                                <input
                                                    type="number"
                                                    min="0" max="10" step="0.25"
                                                    disabled={selectedStudent.status === 'missing'}
                                                    value={gradeInput}
                                                    onChange={(e) => setGradeInput(e.target.value)}
                                                    placeholder="VD: 8.5"
                                                    className="score-input"
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label>Nhận xét cho học sinh</label>
                                                <textarea
                                                    rows={4}
                                                    disabled={selectedStudent.status === 'missing'}
                                                    value={feedbackInput}
                                                    onChange={(e) => setFeedbackInput(e.target.value)}
                                                    placeholder="Nhập nhận xét chi tiết để học sinh rút kinh nghiệm..."
                                                ></textarea>
                                            </div>

                                            <div className="grading-actions">
                                                {showSuccess && (
                                                    <div className="save-success-msg">
                                                        <CheckCircle size={16} /> Lưu đánh giá thành công!
                                                    </div>
                                                )}
                                                <button
                                                    className={`btn-save-grade ${!isDirty && (selectedStudent.score !== null || selectedStudent.feedback) ? 'btn-saved' : ''}`}
                                                    onClick={handleSaveGrade}
                                                    disabled={selectedStudent.status === 'missing' || isScoreRequired || isSaving || (!isDirty && (selectedStudent.score !== null || selectedStudent.feedback))}
                                                >
                                                    {isSaving ? 'Đang lưu...' : (
                                                        <>
                                                            <Check size={18} /> {(!isDirty && (selectedStudent.score !== null || selectedStudent.feedback)) ? 'Đã lưu đánh giá' : 'Lưu đánh giá'}
                                                        </>
                                                    )}
                                                </button>
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
        </div>
    );
};

export default AssignmentGrading;
