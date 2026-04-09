import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, X, AlertTriangle, BookOpen, GraduationCap, Pencil, Trash2, MapPin, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../../components/Sidebar';
import ClassCard from '../../components/ClassCard';
import CreateClassModal from '../../components/CreateClassModal';
import SubjectModal from '../../components/SubjectModal';
import RoomModal from '../../components/RoomModal';
import GradeModal from '../../components/GradeModal';
import api from '../../services/api';
import { showValidationError } from '../../services/toastHelper';
import '../../css/pages/center/ClassesManagement.css';
import '../../css/components/DeleteModal.css';

const ClassesManagement = () => {
    // ── Tab state ─────────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState('classes'); // 'classes' | 'subjects' | 'rooms' | 'grades'

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

    // ── Rooms state ───────────────────────────────────────────────────────────
    const [rooms, setRooms] = useState([]);
    const [roomsLoading, setRoomsLoading] = useState(false);
    const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState(null);
    const [deleteRoomModal, setDeleteRoomModal] = useState({ show: false, room: null });

    // ── Grades state ──────────────────────────────────────────────────────────
    const [grades, setGrades] = useState([]);
    const [gradesLoading, setGradesLoading] = useState(false);
    const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
    const [editingGrade, setEditingGrade] = useState(null);
    const [deleteGradeModal, setDeleteGradeModal] = useState({ show: false, grade: null });

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
                mainTeacher: c.teacherName ? { id: c.teacherId, name: c.teacherName, initials: c.teacherName.substring(0, 2).toUpperCase() } : { name: '', initials: '' },
                assistantId: c.assistantId,
                assistant: c.assistantName ? { id: c.assistantId, name: c.assistantName, initials: c.assistantName.substring(0, 2).toUpperCase() } : null,
                currentStudents: c.studentCount,
                scheduleSlots: (c.scheduleSlots || c.ScheduleSlots || []).map(slot => ({
                    day: reverseDayMap[slot.dayOfWeek] || reverseDayMap[slot.DayOfWeek] || 'Thứ 2',
                    startTime: slot.startTime || slot.StartTime,
                    endTime: slot.endTime || slot.EndTime,
                    roomId: slot.roomId || slot.RoomId,
                    roomName: slot.roomName || slot.RoomName
                })),
                schedule: formatScheduleForDisplay((c.scheduleSlots || c.ScheduleSlots || []).map(slot => ({
                    day: reverseDayMap[slot.dayOfWeek] || reverseDayMap[slot.DayOfWeek] || 'Thứ 2',
                    startTime: slot.startTime || slot.StartTime,
                    endTime: slot.endTime || slot.EndTime
                }))),
                status: c.status?.toLowerCase() || 'active',
                startDate: c.startDate ? c.startDate.split('T')[0] : '',
                endDate: c.endDate ? c.endDate.split('T')[0] : '',
                totalSessions: c.totalSessions || 0,
                completedSessions: c.completedSessions || 0,
                gradeId: c.gradeId || c.GradeId,
                gradeName: c.gradeName || c.GradeName,
                roomId: c.roomId || c.RoomId,
                roomName: c.roomName || c.RoomName,
                pricePerSession: c.pricePerSession ?? c.PricePerSession ?? '',
                maxStudents: c.maxStudents || c.MaxStudents || 0
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
        } catch (error) {
            console.error('Lỗi tải danh sách staff', error);
        }
    }, []);

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

    const fetchRooms = useCallback(async () => {
        setRoomsLoading(true);
        try {
            const res = await api.get('/Rooms');
            setRooms(res.data);
        } catch (err) {
            console.error('Lỗi tải danh sách phòng', err);
        } finally {
            setRoomsLoading(false);
        }
    }, []);

    const fetchGrades = useCallback(async () => {
        setGradesLoading(true);
        try {
            const res = await api.get('/Grades');
            setGrades(res.data);
        } catch (err) {
            console.error('Lỗi tải danh sách khối lớp', err);
        } finally {
            setGradesLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSubjects();
        fetchClasses();
        fetchTeachersAndAssistants();
        fetchRooms();
        fetchGrades();
    }, [fetchSubjects, fetchClasses, fetchTeachersAndAssistants, fetchRooms, fetchGrades]);

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
            fetchTeachersAndAssistants();
            fetchRooms();
            setDeleteModal({ show: false, classItem: null });
            toast.success(`Đã xóa lớp "${deleteModal.classItem.name}" thành công!`);
        } catch (error) {
            console.error(error);
            showValidationError(error, 'Xóa lớp thất bại!');
        }
    };

    const handleSubmitClass = async (classData) => {
        try {
            const subject = subjects.find(s => s.subjectName === classData.subject);
            if (!subject) {
                showValidationError('Vui lòng chọn môn học hợp lệ!');
                return;
            }

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
                endTime: slot.endTime,
                roomId: slot.roomId
            }));

            const payload = {
                className: classData.name,
                description: classData.description || '',
                syllabusContent: classData.syllabusContent || '',
                subjectId: subject.subjectId,
                teacherId: classData.mainTeacher?.id || null,
                assistantId: classData.assistant?.id || null,
                startDate: classData.startDate ? new Date(classData.startDate).toISOString() : null,
                endDate: classData.endDate ? new Date(classData.endDate).toISOString() : null,
                status: classData.status === 'active' ? 'Active' : classData.status === 'completed' ? 'Completed' : 'Inactive',
                scheduleSlots: scheduleSlots,
                roomId: classData.roomId || null,
                gradeId: classData.gradeId || null,
                maxStudents: parseInt(classData.maxStudents) || 30,
                pricePerSession: classData.pricePerSession ? parseFloat(classData.pricePerSession) : null
            };

            console.log('[DEBUG] handleSubmitClass payload:', JSON.stringify(payload, null, 2));

            if (editingClass) {
                await api.put(`/Classes/${editingClass.id}`, payload);
                toast.success(`Đã cập nhật lớp "${classData.name}" thành công!`);
            } else {
                await api.post('/Classes', payload);
                toast.success(`Đã tạo lớp "${classData.name}" thành công!`);
            }

            fetchClasses();
            fetchTeachersAndAssistants();
            fetchRooms();
            setIsModalOpen(false);
            setEditingClass(null);
        } catch (error) {
            console.error(error);
            showValidationError(error, 'Có lỗi xảy ra khi lưu lớp học');
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

    const filteredSubjects = subjects.filter(s =>
        s.subjectName?.toLowerCase().includes(subjectSearchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(subjectSearchQuery.toLowerCase())
    );

    // ── Room handlers ─────────────────────────────────────────────────────────
    const handleAddRoom = () => {
        setEditingRoom(null);
        setIsRoomModalOpen(true);
    };

    const handleEditRoom = (room) => {
        setEditingRoom(room);
        setIsRoomModalOpen(true);
    };

    const handleDeleteRoomClick = (room) => {
        setDeleteRoomModal({ show: true, room });
    };

    const confirmDeleteRoom = async () => {
        if (!deleteRoomModal.room) return;
        try {
            await api.delete(`/Rooms/${deleteRoomModal.room.roomId}`);
            await fetchRooms();
            setDeleteRoomModal({ show: false, room: null });
            toast.success(`Đã xóa phòng "${deleteRoomModal.room.roomName}" thành công!`);
        } catch (err) {
            showValidationError(err, 'Không thể xóa phòng học này!');
        }
    };

    // ── Grade handlers ────────────────────────────────────────────────────────
    const handleAddGrade = () => {
        setEditingGrade(null);
        setIsGradeModalOpen(true);
    };

    const handleEditGrade = (grade) => {
        setEditingGrade(grade);
        setIsGradeModalOpen(true);
    };

    const handleDeleteGradeClick = (grade) => {
        setDeleteGradeModal({ show: true, grade });
    };

    const confirmDeleteGrade = async () => {
        if (!deleteGradeModal.grade) return;
        try {
            await api.delete(`/Grades/${deleteGradeModal.grade.gradeId}`);
            await fetchGrades();
            setDeleteGradeModal({ show: false, grade: null });
            toast.success(`Đã xóa khối lớp "${deleteGradeModal.grade.gradeName}" thành công!`);
        } catch (err) {
            showValidationError(err, 'Không thể xóa khối lớp này!');
        }
    };

    return (
        <div className="classes-management">
            <Sidebar />

            <main className="classes-main">
                {/* Header */}
                <div className="classes-header">
                    <div className="classes-header-top">
                        <div>
                            <h1>Quản lý trung tâm</h1>
                            <p className="classes-subtitle">
                                Quản lý lớp học, môn học, phòng học và khối lớp của trung tâm
                            </p>
                        </div>
                        {activeTab === 'classes' ? (
                            <button className="btn-create-class" onClick={handleCreateClass}>
                                <Plus size={20} />
                                Tạo lớp học mới
                            </button>
                        ) : activeTab === 'subjects' ? (
                            <button className="btn-create-class" onClick={handleAddSubject}>
                                <Plus size={20} />
                                Thêm môn học
                            </button>
                        ) : activeTab === 'rooms' ? (
                            <button className="btn-create-class" onClick={handleAddRoom}>
                                <Plus size={20} />
                                Thêm phòng mới
                            </button>
                        ) : (
                            <button className="btn-create-class" onClick={handleAddGrade}>
                                <Plus size={20} />
                                Thêm khối lớp
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
                        <button
                            className={`cm-tab ${activeTab === 'rooms' ? 'active' : ''}`}
                            onClick={() => setActiveTab('rooms')}
                        >
                            <MapPin size={17} />
                            Phòng học
                            <span className="cm-tab-badge">{rooms.length}</span>
                        </button>
                        <button
                            className={`cm-tab ${activeTab === 'grades' ? 'active' : ''}`}
                            onClick={() => setActiveTab('grades')}
                        >
                            <Layers size={17} />
                            Khối lớp
                            <span className="cm-tab-badge">{grades.length}</span>
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
                                <option value="completed">Đã hoàn thành</option>
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

                {/* ── ROOMS TAB ── */}
                {activeTab === 'rooms' && (
                    <div className="subjects-section">
                        {roomsLoading ? (
                            <div className="subjects-loading">
                                <div className="loading-spinner" />
                                <p>Đang tải danh sách phòng học...</p>
                            </div>
                        ) : rooms.length === 0 ? (
                            <div className="subjects-empty">
                                <MapPin size={48} />
                                <h3>Chưa có phòng học nào</h3>
                                <p>Thêm phòng học để quản lý cơ sở vật chất trung tâm.</p>
                                <button className="btn-create-class" onClick={handleAddRoom}>
                                    <Plus size={18} />
                                    Thêm phòng đầu tiên
                                </button>
                            </div>
                        ) : (
                            <div className="subjects-table-wrapper">
                                <table className="subjects-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Tên phòng</th>
                                            <th>Trạng thái</th>
                                            <th>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rooms.map((room, idx) => (
                                            <tr key={room.roomId}>
                                                <td className="subject-idx">{idx + 1}</td>
                                                <td><strong>{room.roomName}</strong></td>
                                                <td>
                                                    <span className={`status-badge ${room.status ? 'active' : 'inactive'}`}>
                                                        {room.status ? 'Sẵn sàng' : 'Bảo trì'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="subject-actions">
                                                        <button className="btn-subject-edit" onClick={() => handleEditRoom(room)}><Pencil size={15} /></button>
                                                        <button className="btn-subject-delete" onClick={() => handleDeleteRoomClick(room)}><Trash2 size={15} /></button>
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

                {/* ── GRADES TAB ── */}
                {activeTab === 'grades' && (
                    <div className="subjects-section">
                        {gradesLoading ? (
                            <div className="subjects-loading">
                                <div className="loading-spinner" />
                                <p>Đang tải danh sách khối lớp...</p>
                            </div>
                        ) : grades.length === 0 ? (
                            <div className="subjects-empty">
                                <Layers size={48} />
                                <h3>Chưa có khối lớp nào</h3>
                                <p>Thêm khối lớp để phân loại lớp học.</p>
                                <button className="btn-create-class" onClick={handleAddGrade}>
                                    <Plus size={18} />
                                    Thêm khối đầu tiên
                                </button>
                            </div>
                        ) : (
                            <div className="subjects-table-wrapper">
                                <table className="subjects-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Tên khối lớp</th>
                                            <th>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {grades.map((grade, idx) => (
                                            <tr key={grade.gradeId}>
                                                <td className="subject-idx">{idx + 1}</td>
                                                <td><strong>{grade.gradeName}</strong></td>
                                                <td>
                                                    <div className="subject-actions">
                                                        <button className="btn-subject-edit" onClick={() => handleEditGrade(grade)}><Pencil size={15} /></button>
                                                        <button className="btn-subject-delete" onClick={() => handleDeleteGradeClick(grade)}><Trash2 size={15} /></button>
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
                roomsList={rooms}
                gradesList={grades}
            />

            {/* ── ROOM MODAL ── */}
            <RoomModal
                isOpen={isRoomModalOpen}
                onClose={() => { setIsRoomModalOpen(false); setEditingRoom(null); }}
                onSuccess={fetchRooms}
                editingRoom={editingRoom}
            />

            {/* ── GRADE MODAL ── */}
            <GradeModal
                isOpen={isGradeModalOpen}
                onClose={() => { setIsGradeModalOpen(false); setEditingGrade(null); }}
                onSuccess={fetchGrades}
                editingGrade={editingGrade}
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

            {/* ── DELETE ROOM MODAL ── */}
            {deleteRoomModal.show && (
                <div className="delete-modal-overlay" onClick={() => setDeleteRoomModal({ show: false, room: null })}>
                    <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="delete-modal-header">
                            <h3>Xóa Phòng Học</h3>
                            <button className="delete-modal-close" onClick={() => setDeleteRoomModal({ show: false, room: null })}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="delete-modal-body">
                            <div className="delete-modal-warning">
                                <div className="delete-modal-warning-icon">
                                    <AlertTriangle size={20} />
                                </div>
                                <div className="delete-modal-warning-content">
                                    <h4>Bạn có chắc muốn xóa phòng này?</h4>
                                    <p>
                                        Phòng <strong>{deleteRoomModal.room?.roomName}</strong> sẽ bị xóa vĩnh viễn.
                                        Nếu có lớp học đang sử dụng phòng này, bạn không thể xóa.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="delete-modal-footer">
                            <button className="btn-delete-cancel" onClick={() => setDeleteRoomModal({ show: false, room: null })}>Hủy</button>
                            <button className="btn-delete-confirm" onClick={confirmDeleteRoom}>
                                Xóa Phòng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── DELETE GRADE MODAL ── */}
            {deleteGradeModal.show && (
                <div className="delete-modal-overlay" onClick={() => setDeleteGradeModal({ show: false, grade: null })}>
                    <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="delete-modal-header">
                            <h3>Xóa Khối Lớp</h3>
                            <button className="delete-modal-close" onClick={() => setDeleteGradeModal({ show: false, grade: null })}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="delete-modal-body">
                            <div className="delete-modal-warning">
                                <div className="delete-modal-warning-icon">
                                    <AlertTriangle size={20} />
                                </div>
                                <div className="delete-modal-warning-content">
                                    <h4>Bạn có chắc muốn xóa khối này?</h4>
                                    <p>
                                        Khối lớp <strong>{deleteGradeModal.grade?.gradeName}</strong> sẽ bị xóa vĩnh viễn.
                                        Nếu có lớp học đang thuộc khối này, bạn không thể xóa.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="delete-modal-footer">
                            <button className="btn-delete-cancel" onClick={() => setDeleteGradeModal({ show: false, grade: null })}>Hủy</button>
                            <button className="btn-delete-confirm" onClick={confirmDeleteGrade}>
                                Xóa Khối
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClassesManagement;
