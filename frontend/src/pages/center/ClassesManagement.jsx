import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, X, AlertTriangle, BookOpen, GraduationCap, Pencil, Trash2 } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import ClassCard from '../../components/ClassCard';
import CreateClassModal from '../../components/CreateClassModal';
import SubjectModal from '../../components/SubjectModal';
import '../../css/pages/center/ClassesManagement.css';
import '../../css/components/DeleteModal.css';

const API_BASE = 'http://localhost:5062/api/tenantadmin';
const authHeader = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
});

const ClassesManagement = () => {
    // ── Tab state ─────────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState('classes'); // 'classes' | 'subjects'

    // ── Classes state ─────────────────────────────────────────────────────────
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ show: false, classItem: null });
    const [searchQuery, setSearchQuery] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('');
    const [gradeFilter, setGradeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Mock data cho classes (giữ nguyên như cũ cho đến khi có classes API)
    const [classes, setClasses] = useState([
        {
            id: 1,
            name: 'Advanced Algebra II',
            subject: 'MATHEMATICS',
            gradeLevel: 'high',
            mainTeacher: { name: 'Mr. David Harrison', initials: 'DH' },
            assistant: { name: 'Elena Rodriguez', initials: 'ER' },
            currentStudents: 12,
            maxStudents: 15,
            schedule: 'Mon, Wed • 4:30 PM',
            status: 'active'
        },
        {
            id: 2,
            name: 'Biology: Cell Structures',
            subject: 'SCIENCE',
            gradeLevel: 'high',
            mainTeacher: { name: 'Dr. Amanda Lee', initials: 'AL' },
            assistant: null,
            currentStudents: 15,
            maxStudents: 15,
            schedule: 'Tue, Thu • 3:00 PM',
            status: 'active'
        },
        {
            id: 3,
            name: 'Creative Writing Workshop',
            subject: 'ENGLISH',
            gradeLevel: 'middle',
            mainTeacher: { name: 'Marcus Thorne', initials: 'MT' },
            assistant: { name: 'Lila Vance', initials: 'LV' },
            currentStudents: 8,
            maxStudents: 12,
            schedule: 'Friday • 5:00 PM',
            status: 'active'
        },
        {
            id: 4,
            name: 'Mechanics & Dynamics',
            subject: 'PHYSICS',
            gradeLevel: 'high',
            mainTeacher: { name: 'Dr. Robert Chen', initials: 'RC' },
            assistant: { name: 'Sarah Miller', initials: 'SM' },
            currentStudents: 10,
            maxStudents: 10,
            schedule: 'Wed, Fri • 4:00 PM',
            status: 'active'
        },
    ]);

    // ── Subjects state ────────────────────────────────────────────────────────
    const [subjects, setSubjects] = useState([]);
    const [subjectsLoading, setSubjectsLoading] = useState(false);
    const [subjectsError, setSubjectsError] = useState('');
    const [subjectSearchQuery, setSubjectSearchQuery] = useState('');

    const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);
    const [deleteSubjectModal, setDeleteSubjectModal] = useState({ show: false, subject: null });
    const [deleteSubjectError, setDeleteSubjectError] = useState('');
    const [deletingSubject, setDeletingSubject] = useState(false);

    // ── Fetch subjects from API ───────────────────────────────────────────────
    const fetchSubjects = useCallback(async () => {
        setSubjectsLoading(true);
        setSubjectsError('');
        try {
            const res = await fetch(`${API_BASE}/Subjects`, {
                headers: authHeader()
            });
            if (!res.ok) throw new Error('Không thể tải danh sách môn học');
            const data = await res.json();
            setSubjects(data);
        } catch (err) {
            setSubjectsError(err.message || 'Lỗi kết nối server');
        } finally {
            setSubjectsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSubjects();
    }, [fetchSubjects]);

    // ── Classes handlers ──────────────────────────────────────────────────────
    const handleCreateClass = () => {
        setEditingClass(null);
        setIsModalOpen(true);
    };

    const handleEditClass = (classData) => {
        setEditingClass(classData);
        setIsModalOpen(true);
    };

    const handleDeleteClass = (classData) => {
        setDeleteModal({ show: true, classItem: classData });
    };

    const confirmDelete = () => {
        if (deleteModal.classItem) {
            setClasses(classes.filter(c => c.id !== deleteModal.classItem.id));
            setDeleteModal({ show: false, classItem: null });
        }
    };

    const cancelDelete = () => {
        setDeleteModal({ show: false, classItem: null });
    };

    const handleSubmitClass = (classData) => {
        if (editingClass) {
            setClasses(classes.map(c => c.id === classData.id ? classData : c));
        } else {
            const newClass = { ...classData, id: Date.now() };
            setClasses([...classes, newClass]);
        }
    };

    // ── Filter classes ────────────────────────────────────────────────────────
    const filteredClasses = classes.filter(classItem => {
        const matchesSearch = classItem.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            classItem.mainTeacher.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSubject = !subjectFilter || classItem.subject === subjectFilter;
        const matchesGrade = !gradeFilter || classItem.gradeLevel === gradeFilter;
        const matchesStatus = !statusFilter || classItem.status === statusFilter;
        return matchesSearch && matchesSubject && matchesGrade && matchesStatus;
    });

    // ── Subject handlers ──────────────────────────────────────────────────────
    const handleAddSubject = () => {
        setEditingSubject(null);
        setIsSubjectModalOpen(true);
    };

    const handleEditSubject = (subject) => {
        setEditingSubject(subject);
        setIsSubjectModalOpen(true);
    };

    const handleDeleteSubjectClick = (subject) => {
        setDeleteSubjectError('');
        setDeleteSubjectModal({ show: true, subject });
    };

    const confirmDeleteSubject = async () => {
        if (!deleteSubjectModal.subject) return;
        setDeletingSubject(true);
        setDeleteSubjectError('');
        try {
            const res = await fetch(`${API_BASE}/Subjects/${deleteSubjectModal.subject.subjectId}`, {
                method: 'DELETE',
                headers: authHeader()
            });
            if (res.status === 400) {
                const text = await res.text();
                setDeleteSubjectError(text || 'Môn học đang được sử dụng, không thể xóa!');
                return;
            }
            if (!res.ok) throw new Error('Xóa môn học thất bại!');
            await fetchSubjects();
            setDeleteSubjectModal({ show: false, subject: null });
        } catch (err) {
            setDeleteSubjectError(err.message);
        } finally {
            setDeletingSubject(false);
        }
    };

    const cancelDeleteSubject = () => {
        setDeleteSubjectModal({ show: false, subject: null });
        setDeleteSubjectError('');
    };

    // ── Filter subjects ───────────────────────────────────────────────────────
    const filteredSubjects = subjects.filter(s =>
        s.subjectName?.toLowerCase().includes(subjectSearchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(subjectSearchQuery.toLowerCase())
    );

    return (
        <div className="classes-management">
            <Sidebar />

            <main className="classes-main">
                {/* Header */}
                <div className="classes-header">
                    <div className="classes-header-top">
                        <div>
                            <h1>Quản lý lớp học</h1>
                            <p className="classes-subtitle">
                                Quản lý lớp học và môn học của trung tâm
                            </p>
                        </div>
                        {activeTab === 'classes' ? (
                            <button className="btn-create-class" onClick={handleCreateClass}>
                                <Plus size={20} />
                                Tạo lớp học mới
                            </button>
                        ) : (
                            <button className="btn-create-class" onClick={handleAddSubject}>
                                <Plus size={20} />
                                Thêm môn học
                            </button>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className="cm-tabs">
                        <button
                            className={`cm-tab ${activeTab === 'classes' ? 'active' : ''}`}
                            onClick={() => setActiveTab('classes')}
                        >
                            <GraduationCap size={17} />
                            Lớp học
                            <span className="cm-tab-badge">{classes.length}</span>
                        </button>
                        <button
                            className={`cm-tab ${activeTab === 'subjects' ? 'active' : ''}`}
                            onClick={() => setActiveTab('subjects')}
                        >
                            <BookOpen size={17} />
                            Môn học
                            <span className="cm-tab-badge">{subjects.length}</span>
                        </button>
                    </div>
                </div>

                {/* ── CLASSES TAB ── */}
                {activeTab === 'classes' && (
                    <>
                        <div className="classes-filters">
                            <div className="filter-search">
                                <Search size={20} />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm theo tên lớp, giáo viên..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <select
                                className="filter-select"
                                value={subjectFilter}
                                onChange={(e) => setSubjectFilter(e.target.value)}
                            >
                                <option value="">Tất cả môn học</option>
                                {subjects.map(s => (
                                    <option key={s.subjectId} value={s.subjectName}>{s.subjectName}</option>
                                ))}
                            </select>

                            <select
                                className="filter-select"
                                value={gradeFilter}
                                onChange={(e) => setGradeFilter(e.target.value)}
                            >
                                <option value="">Cấp học</option>
                                <option value="elementary">Tiểu học</option>
                                <option value="middle">THCS</option>
                                <option value="high">THPT</option>
                                <option value="college">Luyện thi đại học</option>
                            </select>

                            <select
                                className="filter-select"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="">Trạng thái</option>
                                <option value="active">Đang hoạt động</option>
                                <option value="inactive">Tạm dừng</option>
                            </select>
                        </div>

                        <div className="classes-overview">
                            <h2>Tổng quan tất cả lớp học</h2>
                            {filteredClasses.length === 0 ? (
                                <div className="classes-empty">
                                    <p>Không tìm thấy lớp học phù hợp với bộ lọc.</p>
                                </div>
                            ) : (
                                <div className="classes-grid">
                                    {filteredClasses.map((classItem) => (
                                        <ClassCard
                                            key={classItem.id}
                                            classData={classItem}
                                            onEdit={handleEditClass}
                                            onDelete={handleDeleteClass}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        <button className="btn-create-floating" onClick={handleCreateClass} title="Tạo lớp học mới">
                            <Plus size={24} />
                        </button>
                    </>
                )}

                {/* ── SUBJECTS TAB ── */}
                {activeTab === 'subjects' && (
                    <div className="subjects-section">
                        {/* Search bar */}
                        <div className="subjects-search-bar">
                            <div className="filter-search">
                                <Search size={20} />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm môn học..."
                                    value={subjectSearchQuery}
                                    onChange={(e) => setSubjectSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        {subjectsLoading ? (
                            <div className="subjects-loading">
                                <div className="loading-spinner" />
                                <p>Đang tải danh sách môn học...</p>
                            </div>
                        ) : subjectsError ? (
                            <div className="subjects-error">
                                <p>⚠️ {subjectsError}</p>
                                <button onClick={fetchSubjects} className="btn-retry">Thử lại</button>
                            </div>
                        ) : filteredSubjects.length === 0 ? (
                            <div className="subjects-empty">
                                <BookOpen size={48} />
                                <h3>Chưa có môn học nào</h3>
                                <p>Thêm môn học để sử dụng khi tạo lớp học.</p>
                                <button className="btn-create-class" onClick={handleAddSubject}>
                                    <Plus size={18} />
                                    Thêm môn học đầu tiên
                                </button>
                            </div>
                        ) : (
                            <div className="subjects-table-wrapper">
                                <table className="subjects-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Tên môn học</th>
                                            <th>Mô tả</th>
                                            <th>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredSubjects.map((subject, idx) => (
                                            <tr key={subject.subjectId}>
                                                <td className="subject-idx">{idx + 1}</td>
                                                <td>
                                                    <div className="subject-name-cell">
                                                        <div className="subject-icon-badge">
                                                            <BookOpen size={16} />
                                                        </div>
                                                        <span className="subject-name">{subject.subjectName}</span>
                                                    </div>
                                                </td>
                                                <td className="subject-desc">
                                                    {subject.description || <span className="no-desc">Chưa có mô tả</span>}
                                                </td>
                                                <td>
                                                    <div className="subject-actions">
                                                        <button
                                                            className="btn-subject-edit"
                                                            onClick={() => handleEditSubject(subject)}
                                                            title="Chỉnh sửa"
                                                        >
                                                            <Pencil size={15} />
                                                        </button>
                                                        <button
                                                            className="btn-subject-delete"
                                                            onClick={() => handleDeleteSubjectClick(subject)}
                                                            title="Xóa"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* ── CREATE/EDIT CLASS MODAL ── */}
            <CreateClassModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingClass(null); }}
                onSubmit={handleSubmitClass}
                editingClass={editingClass}
                existingClasses={classes}
                subjects={subjects}
            />

            {/* ── CREATE/EDIT SUBJECT MODAL ── */}
            <SubjectModal
                isOpen={isSubjectModalOpen}
                onClose={() => { setIsSubjectModalOpen(false); setEditingSubject(null); }}
                onSuccess={fetchSubjects}
                editingSubject={editingSubject}
            />

            {/* ── DELETE CLASS MODAL ── */}
            {deleteModal.show && (
                <div className="delete-modal-overlay" onClick={cancelDelete}>
                    <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="delete-modal-header">
                            <h3>Xóa Lớp Học</h3>
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
                                    <h4>Bạn có chắc muốn xóa lớp này?</h4>
                                    <p>
                                        Hành động này sẽ xóa vĩnh viễn lớp <strong>{deleteModal.classItem?.name}</strong>.
                                        Tất cả dữ liệu liên quan đến lớp học này sẽ bị xóa.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="delete-modal-footer">
                            <button className="btn-delete-cancel" onClick={cancelDelete}>Hủy</button>
                            <button className="btn-delete-confirm" onClick={confirmDelete}>Xóa Lớp</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── DELETE SUBJECT MODAL ── */}
            {deleteSubjectModal.show && (
                <div className="delete-modal-overlay" onClick={cancelDeleteSubject}>
                    <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="delete-modal-header">
                            <h3>Xóa Môn Học</h3>
                            <button className="delete-modal-close" onClick={cancelDeleteSubject}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="delete-modal-body">
                            <div className="delete-modal-warning">
                                <div className="delete-modal-warning-icon">
                                    <AlertTriangle size={20} />
                                </div>
                                <div className="delete-modal-warning-content">
                                    <h4>Bạn có chắc muốn xóa môn học này?</h4>
                                    <p>
                                        Môn học <strong>{deleteSubjectModal.subject?.subjectName}</strong> sẽ bị xóa vĩnh viễn.
                                        Nếu môn học đang được dùng bởi lớp học, bạn không thể xóa.
                                    </p>
                                    {deleteSubjectError && (
                                        <div className="delete-subject-error">
                                            ⚠️ {deleteSubjectError}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="delete-modal-footer">
                            <button className="btn-delete-cancel" onClick={cancelDeleteSubject} disabled={deletingSubject}>Hủy</button>
                            <button className="btn-delete-confirm" onClick={confirmDeleteSubject} disabled={deletingSubject}>
                                {deletingSubject ? 'Đang xóa...' : 'Xóa Môn Học'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClassesManagement;
