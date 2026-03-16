import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, X, AlertTriangle, BookOpen, GraduationCap, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../../components/Sidebar';
import ClassCard from '../../components/ClassCard';
import CreateClassModal from '../../components/CreateClassModal';
import SubjectModal from '../../components/SubjectModal';
import api from '../../services/api';
import '../../css/pages/center/ClassesManagement.css';
import '../../css/components/DeleteModal.css';

const ClassesManagement = () => {
    // ── Tab state ─────────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState('classes'); // 'classes' | 'subjects'

    // ── Classes state ─────────────────────────────────────────────────────────
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ show: false, classItem: null });
    const [searchQuery, setSearchQuery] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const [classes, setClasses] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [assistants, setAssistants] = useState([]);
    const [classesLoading, setClassesLoading] = useState(false);

    // Helper function to format schedule slots for display
    const formatScheduleForDisplay = useCallback((slots) => {
        if (!slots || slots.length === 0) return 'Chưa có lịch';
        const dayMap = {
            'CN': 'CN', 'Thứ 2': 'T2', 'Thứ 3': 'T3', 'Thứ 4': 'T4',
            'Thứ 5': 'T5', 'Thứ 6': 'T6', 'Thứ 7': 'T7'
        };
        const groups = {};
        slots.forEach(slot => {
            const timeKey = `${slot.startTime} - ${slot.endTime}`;
            if (!groups[timeKey]) groups[timeKey] = [];
            groups[timeKey].push(dayMap[slot.day] || slot.day);
        });
        const groupEntries = Object.entries(groups);
        if (groupEntries.length === 1) {
            const [time, days] = groupEntries[0];
            return `${days.join(', ')} • ${time}`;
        }
        return slots.map(s => `${dayMap[s.day] || s.day}: ${s.startTime}-${s.endTime}`).join('; ');
    }, []);

    const fetchClasses = useCallback(async () => {
        setClassesLoading(true);
        try {
            const res = await api.get('/Classes');

            const reverseDayMap = {
                0: 'CN', 1: 'Thứ 2', 2: 'Thứ 3', 3: 'Thứ 4', 4: 'Thứ 5', 5: 'Thứ 6', 6: 'Thứ 7'
            };

            // Map backend ClassDto to frontend format
            const mappedClasses = res.data.map(c => ({
                id: c.classId,
                name: c.className,
                description: c.description || '',
                syllabusContent: c.syllabusContent || '',
                subjectId: c.subjectId,
                subject: c.subjectName,
                teacherId: c.teacherId,
                mainTeacher: c.teacherName ? { name: c.teacherName, initials: c.teacherName.substring(0, 2).toUpperCase() } : { name: '', initials: '' },
                assistantId: c.assistantId,
                assistant: c.assistantName ? { name: c.assistantName, initials: c.assistantName.substring(0, 2).toUpperCase() } : null,
                currentStudents: c.studentCount,
                scheduleSlots: (c.scheduleSlots || c.ScheduleSlots || []).map(slot => ({
                    day: reverseDayMap[slot.dayOfWeek] || reverseDayMap[slot.DayOfWeek] || 'Thứ 2',
                    startTime: slot.startTime || slot.StartTime,
                    endTime: slot.endTime || slot.EndTime
                })),
                schedule: formatScheduleForDisplay((c.scheduleSlots || c.ScheduleSlots || []).map(slot => ({
                    day: reverseDayMap[slot.dayOfWeek] || reverseDayMap[slot.DayOfWeek] || 'Thứ 2',
                    startTime: slot.startTime || slot.StartTime,
                    endTime: slot.endTime || slot.EndTime
                }))),
                status: c.status?.toLowerCase() === 'active' ? 'active' : 'inactive',
                startDate: c.startDate ? c.startDate.split('T')[0] : '',
                endDate: c.endDate ? c.endDate.split('T')[0] : ''
            }));
            setClasses(mappedClasses);
        } catch (error) {
            console.error(error);
        } finally {
            setClassesLoading(false);
        }
    }, [formatScheduleForDisplay]);

    const fetchTeachersAndAssistants = useCallback(async () => {
        try {
            const [tRes, aRes] = await Promise.all([
                api.get('/Teachers'),
                api.get('/Assistants')
            ]);

            const mapStaff = (staff, title) => ({
                id: staff.userId || staff.teacherId || staff.assistantId,
                name: staff.fullName,
                title: title,
                department: "All Departments",
                avatar: staff.fullName ? staff.fullName.substring(0, 2).toUpperCase() : 'ST',
                schedule: [] // Skipping schedule conflicts for now
            });

            setTeachers(tRes.data.map(t => mapStaff(t, 'Giáo viên')));
            setAssistants(aRes.data.map(a => mapStaff(a, 'Trợ giảng')));
        } catch (error) {
            console.error('Lỗi tải danh sách staff', error);
        }
    }, []);
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
            const res = await api.get('/tenantadmin/Subjects');
            setSubjects(res.data);
        } catch (err) {
            setSubjectsError(err.message || 'Lỗi kết nối server');
        } finally {
            setSubjectsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSubjects();
        fetchClasses();
        fetchTeachersAndAssistants();
    }, [fetchSubjects, fetchClasses, fetchTeachersAndAssistants]);

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

    const cancelDelete = () => {
        setDeleteModal({ show: false, classItem: null });
    };

    const confirmDelete = async () => {
        if (!deleteModal.classItem) return;
        try {
            await api.delete(`/Classes/${deleteModal.classItem.id}`);
            fetchClasses();
            setDeleteModal({ show: false, classItem: null });
            toast.success(`Đã xóa lớp "${deleteModal.classItem.name}" thành công!`);
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Xóa lớp thất bại!');
        }
    };

    const handleSubmitClass = async (classData) => {
        try {
            const subject = subjects.find(s => s.subjectName === classData.subject);
            if (!subject) {
                toast.error('Vui lòng chọn môn học hợp lệ!');
                return;
            }

            const teacher = teachers.find(t => t.name?.toLowerCase() === classData.mainTeacher?.name?.toLowerCase());
            const assistant = assistants.find(a => a.name?.toLowerCase() === classData.assistant?.name?.toLowerCase());

            const dayMap = {
                'CN': 0, 'Chủ nhật': 0,
                'Thứ 2': 1, 'T2': 1,
                'Thứ 3': 2, 'T3': 2,
                'Thứ 4': 3, 'T4': 3,
                'Thứ 5': 4, 'T5': 4,
                'Thứ 6': 5, 'T6': 5,
                'Thứ 7': 6, 'T7': 6
            };

            const scheduleSlots = (classData.scheduleSlots || []).map(slot => ({
                dayOfWeek: dayMap[slot.day] ?? 1,
                startTime: slot.startTime,
                endTime: slot.endTime
            }));

            const payload = {
                className: classData.name,
                description: classData.description || '',
                syllabusContent: classData.syllabusContent || '',
                subjectId: subject.subjectId,
                teacherId: teacher?.id || null,
                assistantId: assistant?.id || null,
                startDate: classData.startDate ? new Date(classData.startDate).toISOString() : null,
                endDate: classData.endDate ? new Date(classData.endDate).toISOString() : null,
                status: classData.status === 'active' ? 'Active' : 'Inactive',
                scheduleSlots: scheduleSlots
            };

            if (editingClass) {
                await api.put(`/Classes/${editingClass.id}`, payload);
                toast.success(`Đã cập nhật lớp "${classData.name}" thành công!`);
            } else {
                await api.post('/Classes', payload);
                toast.success(`Đã tạo lớp "${classData.name}" thành công!`);
            }

            fetchClasses();
            setIsModalOpen(false);
            setEditingClass(null);
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi lưu lớp học');
        }
    };

    // ── Filter classes ────────────────────────────────────────────────────────
    const filteredClasses = classes.filter(classItem => {
        const matchesSearch = classItem.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            classItem.mainTeacher.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSubject = !subjectFilter || classItem.subject === subjectFilter;
        const matchesStatus = !statusFilter || classItem.status === statusFilter;
        return matchesSearch && matchesSubject && matchesStatus;
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
            await api.delete(`/tenantadmin/Subjects/${deleteSubjectModal.subject.subjectId}`);
            await fetchSubjects();
            setDeleteSubjectModal({ show: false, subject: null });
            toast.success(`Đã xóa môn học "${deleteSubjectModal.subject.subjectName}" thành công!`);
        } catch (err) {
            if (err.response?.status === 400) {
                setDeleteSubjectError(err.response.data?.message || 'Môn học đang được sử dụng, không thể xóa!');
            } else {
                setDeleteSubjectError(err.message || 'Xóa môn học thất bại!');
            }
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
                teachersList={teachers}
                assistantsList={assistants}
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
