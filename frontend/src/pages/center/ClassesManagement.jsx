import { useState } from 'react';
import { Plus, Search, X, AlertTriangle } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import ClassCard from '../../components/ClassCard';
import CreateClassModal from '../../components/CreateClassModal';
import '../../css/pages/center/ClassesManagement.css';
import '../../css/components/DeleteModal.css';

const ClassesManagement = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ show: false, classItem: null });
    const [searchQuery, setSearchQuery] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('');
    const [gradeFilter, setGradeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Mock data - replace with API call later
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
            // Update existing class
            setClasses(classes.map(c => c.id === classData.id ? classData : c));
        } else {
            // Create new class
            const newClass = {
                ...classData,
                id: Date.now(), // Simple ID generation
            };
            setClasses([...classes, newClass]);
        }
    };

    // Filter classes
    const filteredClasses = classes.filter(classItem => {
        const matchesSearch = classItem.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            classItem.mainTeacher.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSubject = !subjectFilter || classItem.subject === subjectFilter;
        const matchesGrade = !gradeFilter || classItem.gradeLevel === gradeFilter;
        const matchesStatus = !statusFilter || classItem.status === statusFilter;

        return matchesSearch && matchesSubject && matchesGrade && matchesStatus;
    });

    // Calculate stats
    const totalStudents = classes.reduce((sum, c) => sum + c.currentStudents, 0);
    const activeClasses = classes.filter(c => c.status === 'active').length;

    return (
        <div className="classes-management">
            <Sidebar />

            <main className="classes-main">
                <div className="classes-header">
                    <div className="classes-header-top">
                        <div>
                            <h1>Quản lý lớp học</h1>
                            <p className="classes-subtitle">
                                Quản lý và giám sát {filteredClasses.length} lớp học đang hoạt động trên {new Set(classes.map(cl => cl.subject)).size} môn học.
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
                            placeholder="Tìm kiếm theo tên lớp, giáo viên hoặc môn học..."
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
                        <option value="MATHEMATICS">Toán học</option>
                        <option value="SCIENCE">Khoa học</option>
                        <option value="ENGLISH">Tiếng Anh</option>
                        <option value="PHYSICS">Vật lý</option>
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

                {/* Plus button for creating new class */}
                <button className="btn-create-floating" onClick={handleCreateClass} title="Tạo lớp học mới">
                    <Plus size={24} />
                </button>
            </main>

            <CreateClassModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingClass(null);
                }}
                onSubmit={handleSubmitClass}
                editingClass={editingClass}
                existingClasses={classes}
            />

            {/* Delete Confirmation Modal */}
            {deleteModal.show && (
                <div className="delete-modal-overlay" onClick={cancelDelete}>
                    <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="delete-modal-header">
                            <h3>Xóa Lớp Học</h3>
                            <button className="delete-modal-close" onClick={cancelDelete}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="delete-modal-body">
                            {/* Warning Section */}
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

                        {/* Footer */}
                        <div className="delete-modal-footer">
                            <button className="btn-delete-cancel" onClick={cancelDelete}>
                                Hủy
                            </button>
                            <button className="btn-delete-confirm" onClick={confirmDelete}>
                                Xóa Lớp
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClassesManagement;
