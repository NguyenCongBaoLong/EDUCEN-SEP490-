import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, X, AlertTriangle, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../../components/Sidebar';
import ClassCard from '../../components/ClassCard';
import CreateClassModal from '../../components/CreateClassModal';
import api from '../../services/api';
import { showValidationError } from '../../services/toastHelper';
import '../../css/pages/center/ClassesManagement.css';
import '../../css/components/DeleteModal.css';

const ClassesManagement = () => {
    // ── Primary state ─────────────────────────────────────────────────────────
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ show: false, classItem: null });
    const [searchQuery, setSearchQuery] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const [classes, setClasses] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [assistants, setAssistants] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [grades, setGrades] = useState([]);
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
            const reverseDayMap = { 0: 'CN', 1: 'Thứ 2', 2: 'Thứ 3', 3: 'Thứ 4', 4: 'Thứ 5', 5: 'Thứ 6', 6: 'Thứ 7' };

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

    const fetchData = useCallback(async () => {
        try {
            const [tRes, aRes, sRes, rRes, gRes] = await Promise.all([
                api.get('/Teachers'),
                api.get('/Assistants'),
                api.get('/tenantadmin/Subjects'),
                api.get('/Rooms'),
                api.get('/Grades')
            ]);

            const mapStaff = (staff, title) => ({
                id: staff.userId || staff.teacherId || staff.assistantId,
                name: staff.fullName,
                title: title,
                avatar: staff.fullName ? staff.fullName.substring(0, 2).toUpperCase() : 'ST'
            });

            setTeachers(tRes.data.map(t => mapStaff(t, 'Giáo viên')));
            setAssistants(aRes.data.map(a => mapStaff(a, 'Trợ giảng')));
            setSubjects(sRes.data);
            setRooms(rRes.data);
            setGrades(gRes.data);
        } catch (error) {
            console.error('Lỗi tải dữ liệu cơ sở', error);
        }
    }, []);

    useEffect(() => {
        fetchClasses();
        fetchData();
    }, [fetchClasses, fetchData]);

    // ── Handlers ──────────────────────────────────────────────────────────────
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

    const confirmDelete = async () => {
        if (!deleteModal.classItem) return;
        try {
            await api.delete(`/Classes/${deleteModal.classItem.id}`);
            fetchClasses();
            setDeleteModal({ show: false, classItem: null });
            toast.success(`Đã xóa lớp "${deleteModal.classItem.name}" thành công!`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Xóa lớp thất bại!');
        }
    };

    const handleSaveClass = async (classData) => {
        try {
            const subject = subjects.find(s => s.subjectName === classData.subject);
            if (!subject) {
                toast.error('Vui lòng chọn môn học hợp lệ!');
                return;
            }

            const dayMap = { 'CN': 0, 'Thứ 2': 1, 'Thứ 3': 2, 'Thứ 4': 3, 'Thứ 5': 4, 'Thứ 6': 5, 'Thứ 7': 6 };
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
            showValidationError(error, 'Có lỗi xảy ra khi lưu lớp học');
            throw error; // Re-throw to prevent modal from closing
        }
    };

    const filteredClasses = classes.filter(classItem => {
        const matchesSearch = classItem.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            classItem.mainTeacher.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSubject = !subjectFilter || classItem.subject === subjectFilter;
        const matchesStatus = !statusFilter || classItem.status === statusFilter;
        return matchesSearch && matchesSubject && matchesStatus;
    });

    return (
        <div className="classes-management">
            <Sidebar />

            <main className="classes-main">
                <div className="classes-header">
                    <div className="classes-header-top">
                        <div>
                            <h1>Quản lý lớp học</h1>
                            <p className="classes-subtitle">
                                Xem và điều chỉnh danh sách các lớp học đang hoạt động tại trung tâm
                            </p>
                        </div>
                        <button className="btn-create-class" onClick={handleCreateClass}>
                            <Plus size={20} />
                            Tạo lớp học mới
                        </button>
                    </div>
                </div>

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
                    <h2>Danh sách lớp ({filteredClasses.length})</h2>
                    {classesLoading ? (
                        <div className="classes-empty"><p>Đang tải dữ liệu...</p></div>
                    ) : filteredClasses.length === 0 ? (
                        <div className="classes-empty">
                            <GraduationCap size={48} color="#d1d5db" style={{ marginBottom: '1rem' }} />
                            <p>Không tìm thấy lớp học nào phù hợp.</p>
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
            </main>

            <CreateClassModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingClass(null); }}
                onSubmit={handleSaveClass}
                editingClass={editingClass}
                existingClasses={classes}
                subjects={subjects}
                teachersList={teachers}
                assistantsList={assistants}
                roomsList={rooms}
                gradesList={grades}
            />

            {deleteModal.show && (
                <div className="delete-modal-overlay" onClick={() => setDeleteModal({ show: false, classItem: null })}>
                    <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="delete-modal-header">
                            <h3>Xóa Lớp Học</h3>
                            <button className="delete-modal-close" onClick={() => setDeleteModal({ show: false, classItem: null })}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="delete-modal-body">
                            <div className="delete-modal-warning">
                                <div className="delete-modal-warning-icon">
                                    <AlertTriangle size={20} />
                                </div>
                                <div className="delete-modal-warning-content">
                                    Xác nhận xóa lớp học <strong>{deleteModal.classItem.name}</strong>? Hành động này không thể hoàn tác.
                                </div>
                            </div>
                        </div>
                        <div className="delete-modal-footer">
                            <button className="btn-delete-cancel" onClick={() => setDeleteModal({ show: false, classItem: null })}>Hủy</button>
                            <button className="btn-delete-confirm" onClick={confirmDelete}>Xác nhận xóa</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClassesManagement;