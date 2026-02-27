import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, BookOpen, Clock, FileText, CheckCircle, AlertCircle, Edit, Trash2, X, AlertTriangle } from 'lucide-react';
import TeacherSidebar from '../../components/TeacherSidebar';
import CreateAssignmentModal from '../../components/CreateAssignmentModal';
import AssignmentDetailModal from '../../components/AssignmentDetailModal';
import '../../css/pages/teacher/TeacherAssignments.css';
import '../../css/components/DeleteModal.css';

// Mock data cho danh sách lớp của giáo viên
const MY_CLASSES = [
    { id: 101, name: 'Đại Số Nâng Cao' },
    { id: 102, name: 'Giải Tích Cơ Bản' },
    { id: 103, name: 'Toán Nâng Cao Lớp 12' },
    { id: 104, name: 'Ôn Thi THPT Quốc Gia - Toán' },
];

// Mock data bài tập
const INITIAL_ASSIGNMENTS = [
    {
        id: 1,
        title: 'Bài tập về nhà Chương 1: Hàm số',
        classId: 101,
        className: 'Đại Số Nâng Cao',
        dueDate: '2023-10-15T23:59',
        description: 'Hoàn thành các bài tập từ 1 đến 15 trang 42 SGK.',
        status: 'active', // active, closed, draft
        submittedCount: 12,
        totalStudents: 15,
        createdAt: '2023-10-10T08:00'
    },
    {
        id: 2,
        title: 'Đề kiểm tra 15 phút - Đạo hàm',
        classId: 102,
        className: 'Giải Tích Cơ Bản',
        dueDate: '2023-10-18T10:00',
        description: 'Làm bài trực tuyến trên hệ thống, thời gian 15 phút.',
        status: 'active',
        submittedCount: 8,
        totalStudents: 10,
        createdAt: '2023-10-12T14:30'
    },
    {
        id: 3,
        title: 'Bài tập tự luyện: Tích phân',
        classId: 103,
        className: 'Toán Nâng Cao Lớp 12',
        dueDate: '2023-09-30T23:59',
        description: 'Giải 50 câu trắc nghiệm mức độ vận dụng cao.',
        status: 'closed',
        submittedCount: 8,
        totalStudents: 8,
        createdAt: '2023-09-25T09:00',
        fileUrl: '#',
        fileName: '50_cau_trac_nghiem_tich_phan.pdf'
    },
    {
        id: 4,
        title: 'Đề cương ôn tập giữa kì I',
        classId: 104,
        className: 'Ôn Thi THPT Quốc Gia - Toán',
        dueDate: '2023-10-25T23:59',
        description: 'Hoàn thiện đề cương theo file đính kèm.',
        status: 'draft',
        submittedCount: 0,
        totalStudents: 15,
        createdAt: '2023-10-15T16:00',
        fileUrl: '#',
        fileName: 'de_cuong_giua_ki_1.docx'
    }
];

const TeacherAssignments = ({ isTA = false }) => {
    const navigate = useNavigate();
    const [assignments, setAssignments] = useState(INITIAL_ASSIGNMENTS);
    const [searchQuery, setSearchQuery] = useState('');
    const [classFilter, setClassFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ show: false, assignment: null });
    const [detailAssignment, setDetailAssignment] = useState(null);

    // Lọc danh sách
    const filteredAssignments = assignments.filter(assignment => {
        const matchesSearch = assignment.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesClass = !classFilter || assignment.classId.toString() === classFilter;
        const matchesStatus = !statusFilter || assignment.status === statusFilter;
        return matchesSearch && matchesClass && matchesStatus;
    });

    const getStatusBadge = (status) => {
        switch (status) {
            case 'active':
                return <span className="ta-status-badge active"><AlertCircle size={14} /> Đang mở</span>;
            case 'closed':
                return <span className="ta-status-badge closed"><CheckCircle size={14} /> Đã đóng</span>;
            case 'draft':
                return <span className="ta-status-badge draft"><FileText size={14} /> Bản nháp</span>;
            default:
                return null;
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const handleCreate = () => {
        setEditingAssignment(null);
        setIsModalOpen(true);
    };

    const handleEdit = (assignment) => {
        setEditingAssignment(assignment);
        setIsModalOpen(true);
    };

    const handleDelete = (assignment) => {
        setDeleteModal({ show: true, assignment });
    };

    const confirmDelete = () => {
        if (deleteModal.assignment) {
            setAssignments(assignments.filter(a => a.id !== deleteModal.assignment.id));
            setDeleteModal({ show: false, assignment: null });
        }
    };

    const cancelDelete = () => {
        setDeleteModal({ show: false, assignment: null });
    };

    const handleSaveAssignment = (assignmentData) => {
        if (editingAssignment) {
            // Update
            setAssignments(assignments.map(a =>
                a.id === editingAssignment.id ? { ...a, ...assignmentData, className: MY_CLASSES.find(c => c.id.toString() === assignmentData.classId.toString())?.name } : a
            ));
        } else {
            // Create
            const newId = Math.max(...assignments.map(a => a.id), 0) + 1;
            const newAssignment = {
                ...assignmentData,
                id: newId,
                className: MY_CLASSES.find(c => c.id.toString() === assignmentData.classId.toString())?.name,
                submittedCount: 0,
                totalStudents: 15, // Mock
                createdAt: new Date().toISOString()
            };
            setAssignments([...assignments, newAssignment]);
        }
        setIsModalOpen(false);
    };

    const handleDownloadAssignment = (assignment) => {
        // In real app: create anchor link or call API to download file
        console.log("Downloading assignment file for:", assignment.title);
        alert(`Đang tải xuống bài tập: ${assignment.title}`);
    };

    return (
        <div className="teacher-assignments">
            <TeacherSidebar isTA={isTA} />

            <main className="ta-main">
                {/* Header */}
                <div className="ta-header">
                    <div className="ta-header-text">
                        <h1>Quản lý bài tập</h1>
                        <p>Theo dõi, tạo mới và chấm điểm bài tập cho tất cả các lớp của bạn.</p>
                    </div>
                    {!isTA && (
                        <button className="btn-create-assignment" onClick={handleCreate}>
                            <Plus size={18} />
                            Tạo bài tập mới
                        </button>
                    )}
                </div>

                {/* Tiện ích lọc */}
                <div className="ta-filters">
                    <div className="filter-search">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm bài tập..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <select
                        className="filter-select"
                        value={classFilter}
                        onChange={e => setClassFilter(e.target.value)}
                    >
                        <option value="">Tất cả các lớp</option>
                        {MY_CLASSES.map(cls => (
                            <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                    </select>

                    <select
                        className="filter-select"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="active">Đang mở (Cần nộp)</option>
                        <option value="closed">Đã đóng (Hết hạn)</option>
                        <option value="draft">Bản nháp</option>
                    </select>
                </div>

                {/* Danh sách bài tập */}
                <div className="ta-list-container">
                    {filteredAssignments.length === 0 ? (
                        <div className="ta-empty-state">
                            <BookOpen size={48} />
                            <h3>Không tìm thấy bài tập nào</h3>
                            <p>Hãy thử thay đổi bộ lọc hoặc tạo một bài tập mới.</p>
                            <button className="btn-outline-primary" onClick={handleCreate}>
                                Tạo bài tập ngay
                            </button>
                        </div>
                    ) : (
                        <div className="ta-grid">
                            {filteredAssignments.map(assignment => (
                                <div
                                    key={assignment.id}
                                    className="ta-card"
                                    onClick={() => setDetailAssignment(assignment)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="ta-card-header">
                                        {getStatusBadge(assignment.status)}
                                        {!isTA && (
                                            <div className="ta-card-actions" onClick={(e) => e.stopPropagation()}>
                                                <button className="btn-icon edit" onClick={() => handleEdit(assignment)} title="Chỉnh sửa">
                                                    <Edit size={16} />
                                                </button>
                                                <button className="btn-icon delete" onClick={() => handleDelete(assignment)} title="Xóa">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <h3 className="ta-card-title">{assignment.title}</h3>
                                    <div className="ta-card-class">{assignment.className}</div>

                                    <p className="ta-card-desc">{assignment.description}</p>

                                    <div className="ta-card-meta">
                                        <div className="meta-item deadline">
                                            <Clock size={14} />
                                            Hạn: {formatDate(assignment.dueDate)}
                                        </div>
                                    </div>

                                    <div className="ta-card-footer" onClick={(e) => e.stopPropagation()}>
                                        <div className="ta-progress-wrap">
                                            <div className="ta-progress-text">
                                                <span>Tiến độ nộp bài</span>
                                                <span className="ta-progress-count">
                                                    {assignment.submittedCount} / {assignment.totalStudents}
                                                </span>
                                            </div>
                                            <div className="ta-progress-bar">
                                                <div
                                                    className={`ta-progress-fill ${assignment.submittedCount === assignment.totalStudents ? 'complete' : ''}`}
                                                    style={{ width: `${(assignment.submittedCount / assignment.totalStudents) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                        <button
                                            className={`btn-grade ${assignment.status === 'draft' ? 'disabled' : ''}`}
                                            onClick={() => assignment.status !== 'draft' && navigate(isTA ? `/ta/assignments/${assignment.id}/grade` : `/teacher/assignments/${assignment.id}/grade`)}
                                            disabled={assignment.status === 'draft'}
                                            style={{ opacity: assignment.status === 'draft' ? 0.5 : 1, cursor: assignment.status === 'draft' ? 'not-allowed' : 'pointer' }}
                                        >
                                            {assignment.status === 'draft' ? 'Chưa thể chấm' : 'Chấm bài'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Modal Tạo/Sửa */}
            {isModalOpen && (
                <CreateAssignmentModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveAssignment}
                    initialData={editingAssignment}
                    classes={MY_CLASSES}
                />
            )}

            {/* Modal Xác Nhận Xóa */}
            {deleteModal.show && (
                <div className="delete-modal-overlay" onClick={cancelDelete}>
                    <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="delete-modal-header">
                            <h3>Xóa Bài Tập</h3>
                            <button className="delete-modal-close" onClick={cancelDelete}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="delete-modal-body">
                            <div className="delete-modal-warning">
                                <div className="delete-modal-warning-icon">
                                    <AlertTriangle size={20} />
                                </div>
                                <div className="delete-modal-warning-content">
                                    <h4>Bạn có chắc muốn xóa bài tập này?</h4>
                                    <p>
                                        Hành động này sẽ xóa vĩnh viễn bài tập <strong>{deleteModal.assignment?.title}</strong>.
                                        Học sinh sẽ không thể nộp bài hoặc xem lại bài tập này nữa.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="delete-modal-footer">
                            <button className="btn-delete-cancel" onClick={cancelDelete}>Hủy</button>
                            <button className="btn-delete-confirm" onClick={confirmDelete}>Xóa Bài Tập</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Chi tiết Bài tập */}
            {detailAssignment && (
                <AssignmentDetailModal
                    isOpen={!!detailAssignment}
                    onClose={() => setDetailAssignment(null)}
                    assignment={detailAssignment}
                    onDownload={handleDownloadAssignment}
                />
            )}
        </div>
    );
};

export default TeacherAssignments;
