import { useState } from 'react';
import { Plus, Upload } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import StudentTable from '../../components/StudentTable';
import AddStudentModal from '../../components/AddStudentModal';
import StudentDetailModal from '../../components/StudentDetailModal';
import EnrollmentRequestsTable from '../../components/EnrollmentRequestsTable';
import EnrollmentDetailModal from '../../components/EnrollmentDetailModal';
import RejectEnrollmentModal from '../../components/RejectEnrollmentModal';
import ImportStudentModal from '../../components/ImportStudentModal';
import '../../css/pages/center/StudentManagement.css';

const StudentManagement = () => {
    // View Mode: 'list' (Student Management) or 'requests' (Enrollment Requests)
    const [viewMode, setViewMode] = useState('list');

    // Student Management States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [viewingStudent, setViewingStudent] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [gradeFilter, setGradeFilter] = useState('');
    const [classFilter, setClassFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Enrollment Request States
    const [viewingRequest, setViewingRequest] = useState(null);
    const [rejectingRequest, setRejectingRequest] = useState(null);
    const [requestStatusFilter, setRequestStatusFilter] = useState('');

    // Mock data - Parents (Must be defined before students)
    const MOCK_PARENTS = [
        { id: 'PAR-001', name: 'Nguyễn Văn Bình', phone: '0901234567', email: 'parent1@gmail.com' },
        { id: 'PAR-002', name: 'Trần Văn Cường', phone: '0912345678', email: 'parent2@gmail.com' },
        { id: 'PAR-003', name: 'Lê Thị Fang', phone: '0923456789', email: 'parent3@gmail.com' },
        { id: 'PAR-004', name: 'Phạm Văn Hùng', phone: '0934567890', email: 'parent4@gmail.com' },
        { id: 'PAR-005', name: 'Vũ Văn Nam', phone: '0956789012', email: 'parent6@gmail.com' }
    ];

    // Mock data - Students
    const [studentList, setStudentList] = useState([
        {
            id: 'STU-001',
            name: 'Nguyễn Văn An',
            avatar: null,
            email: 'an.nguyen@example.com',
            grade: 6,
            dateOfBirth: '2012-05-15',
            gender: 'male',
            linkedParentIds: ['PAR-001'],
            address: '123 Lê Lợi, Quận 1, TP.HCM',
            enrollmentDate: '2024-01-15',
            status: 'active',
            accountSent: true,
            notes: 'Học sinh giỏi toán'
        },
        {
            id: 'STU-002',
            name: 'Trần Thị Bình',
            avatar: null,
            email: '',
            grade: 7,
            dateOfBirth: '2011-08-20',
            gender: 'female',
            linkedParentIds: ['PAR-002'],
            address: '456 Nguyễn Huệ, Quận 3, TP.HCM',
            enrollmentDate: '2023-09-01',
            status: 'inactive',
            accountSent: false,
            notes: ''
        },
        {
            id: 'STU-003',
            name: 'Lê Minh Đức',
            avatar: null,
            email: 'duc.le@example.com',
            grade: 8,
            dateOfBirth: '2010-12-10',
            gender: 'male',
            linkedParentIds: ['PAR-003'],
            address: '789 Trần Hưng Đạo, Quận 5, TP.HCM',
            enrollmentDate: '2023-01-10',
            status: 'inactive',
            accountSent: false,
            notes: 'Thích học hóa'
        },
        {
            id: 'STU-004',
            name: 'Phạm Thị Giang',
            avatar: null,
            email: 'giang.pham@example.com',
            grade: 9,
            dateOfBirth: '2009-03-25',
            gender: 'female',
            linkedParentIds: ['PAR-004'],
            address: '321 Hai Bà Trưng, Quận 1, TP.HCM',
            enrollmentDate: '2022-09-05',
            status: 'active',
            accountSent: true,
            notes: ''
        },
        {
            id: 'STU-005',
            name: 'Hoàng Văn Khoa',
            avatar: null,
            email: '',
            grade: 10,
            dateOfBirth: '2008-07-18',
            gender: 'male',
            linkedParentIds: ['PAR-003'],
            address: '654 Võ Văn Tần, Quận 3, TP.HCM',
            enrollmentDate: '2022-01-20',
            status: 'inactive',
            accountSent: false,
            notes: 'Tạm nghỉ học'
        },
        {
            id: 'STU-006',
            name: 'Vũ Thị Mai',
            avatar: null,
            email: 'mai.vu@example.com',
            grade: 11,
            dateOfBirth: '2007-11-30',
            gender: 'female',
            linkedParentIds: ['PAR-005'],
            address: '987 Nguyễn Thị Minh Khai, Quận 3, TP.HCM',
            enrollmentDate: '2021-09-01',
            status: 'active',
            accountSent: true,
            notes: ''
        }
    ]);

    // Mock data - Enrollment Requests
    const [requestsList, setRequestsList] = useState([
        {
            id: 'REQ-001',
            studentName: 'Phạm Văn Long',
            dateOfBirth: '2012-09-15',
            gender: 'male',
            desiredGrade: 6,
            parentName: 'Phạm Văn Hùng',
            parentPhone: '0987654321',
            parentEmail: 'hungpham@gmail.com',
            address: '123 Đinh Tiên Hoàng, Quận 1, TP.HCM',
            requestDate: '2024-02-10',
            status: 'pending',
            notes: 'Học sinh chuyển trường từ Hà Nội vào'
        },
        {
            id: 'REQ-002',
            studentName: 'Lê Thị Mai',
            dateOfBirth: '2011-05-20',
            gender: 'female',
            desiredGrade: 7,
            parentName: 'Lê Văn Tuấn',
            parentPhone: '0976543210',
            parentEmail: 'tuanle@gmail.com',
            address: '456 Nguyễn Trãi, Quận 1, TP.HCM',
            requestDate: '2024-02-08',
            status: 'pending',
            notes: 'Muốn học lớp nâng cao'
        },
        {
            id: 'REQ-003',
            studentName: 'Trần Văn Nam',
            dateOfBirth: '2010-12-10',
            gender: 'male',
            desiredGrade: 8,
            parentName: 'Trần Văn Bình',
            parentPhone: '0965432109',
            parentEmail: 'binhtran@gmail.com',
            address: '789 Lý Thường Kiệt, Quận 10, TP.HCM',
            requestDate: '2024-02-05',
            status: 'approved',
            reviewedAt: '2024-02-06',
            notes: ''
        }
    ]);

    // Derived state for pending count
    const pendingCount = requestsList.filter(r => r.status === 'pending').length;

    // Filter students
    // We pass MOCK_PARENTS as parentListData to the StudentTable to display actual parent info
    const filteredStudents = studentList
        .filter(student => student.name.toLowerCase().includes(searchQuery.toLowerCase()) || student.id.toLowerCase().includes(searchQuery.toLowerCase()))
        .filter(student => gradeFilter ? student.grade.toString() === gradeFilter : true)
        .filter(student => statusFilter ? student.status === statusFilter : true);

    const handleAddStudent = () => {
        setEditingStudent(null);
        setIsModalOpen(true);
    };

    const handleViewStudent = (student) => {
        setViewingStudent(student);
    };

    const handleEditStudent = (student) => {
        setEditingStudent(student);
        setIsModalOpen(true);
    };

    const handleSubmitStudent = (studentData) => {
        if (studentData.id) {
            // Edit existing student
            setStudentList(studentList.map(s =>
                s.id === studentData.id ? studentData : s
            ));
        } else {
            // Add new student
            const newStudent = {
                ...studentData,
                id: `STU-${String(studentList.length + 1).padStart(3, '0')}`
            };
            setStudentList([...studentList, newStudent]);
        }
    };

    const handleToggleStatusStudent = (studentId) => {
        setStudentList(studentList.map(s =>
            s.id === studentId
                ? { ...s, status: s.status === 'active' ? 'inactive' : 'active' }
                : s
        ));
    };

    const handleSendAccount = (studentId) => {
        setStudentList(studentList.map(s =>
            s.id === studentId
                ? { ...s, accountSent: true, status: 'active' }
                : s
        ));
    };

    const handleImportStudents = (newStudents) => {
        const withIds = newStudents.map((s, i) => ({
            ...s,
            id: `STU-${String(studentList.length + i + 1).padStart(3, '0')}`,
            accountSent: false
        }));
        setStudentList(prev => [...prev, ...withIds]);
    };

    // Enrollment Request Handlers
    const handleViewRequest = (request) => {
        setViewingRequest(request);
    };

    const handleApproveClick = (requestData) => {
        // Direct approval without class assignment modal and no confirmation dialog (Instant Action)

        // 1. Update request status
        setRequestsList(requestsList.map(r =>
            r.id === requestData.id
                ? { ...r, status: 'approved', reviewedAt: new Date().toISOString() }
                : r
        ));

        // 2. Create new student
        const newStudent = {
            id: `STU-${String(studentList.length + 1).padStart(3, '0')}`,
            name: requestData.studentName,
            avatar: null,
            grade: requestData.desiredGrade,
            class: 'Chưa xếp lớp', // Default to unassigned
            dateOfBirth: requestData.dateOfBirth,
            gender: requestData.gender,
            parentName: requestData.parentName,
            parentPhone: requestData.parentPhone,
            parentEmail: requestData.parentEmail,
            address: requestData.address,
            enrollmentDate: new Date().toISOString().split('T')[0],
            status: 'active',
            notes: requestData.notes
        };

        setStudentList([...studentList, newStudent]);
        // No alert, just silent update
    };

    const handleRejectRequest = (request) => {
        setRejectingRequest(request);
    };

    const handleConfirmReject = (requestId, reason) => {
        setRequestsList(requestsList.map(r =>
            r.id === requestId
                ? { ...r, status: 'rejected', rejectionReason: reason }
                : r
        ));
        setRejectingRequest(null);
    };

    return (
        <div className="student-management">
            <Sidebar />
            <main className="student-content">
                {/* Header */}
                <div className="student-header">
                    <div className="header-left">
                        <h1>{viewMode === 'list' ? 'Quản Lý Học Sinh' : 'Yêu Cầu Đăng Ký'}</h1>
                        <p>
                            {viewMode === 'list'
                                ? `Hiện thị 1 đến ${filteredStudents.length} của ${studentList.length} học sinh`
                                : `Quản lý các yêu cầu nhập học từ phụ huynh`
                            }
                        </p>
                    </div>
                    {viewMode === 'list' && (
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                className="btn-import-student"
                                onClick={() => setIsImportModalOpen(true)}
                            >
                                <Upload size={18} />
                                Import File
                            </button>
                            <button className="btn-add-student" onClick={handleAddStudent}>
                                <Plus size={20} />
                                Thêm Học Sinh
                            </button>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="student-tabs">
                    <button
                        className={`tab-btn ${viewMode === 'list' ? 'active' : ''}`}
                        onClick={() => setViewMode('list')}
                    >
                        Danh Sách Học Sinh
                    </button>
                    <button
                        className={`tab-btn ${viewMode === 'requests' ? 'active' : ''}`}
                        onClick={() => setViewMode('requests')}
                    >
                        Yêu Cầu Đăng Ký
                        {pendingCount > 0 && <span className="request-badge">{pendingCount}</span>}
                    </button>
                </div>

                {/* Content */}
                {viewMode === 'list' ? (
                    <StudentTable
                        studentData={filteredStudents}
                        parentListData={MOCK_PARENTS}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        gradeFilter={gradeFilter}
                        setGradeFilter={setGradeFilter}
                        classFilter={classFilter}
                        setClassFilter={setClassFilter}
                        statusFilter={statusFilter}
                        setStatusFilter={setStatusFilter}
                        onView={handleViewStudent}
                        onEdit={handleEditStudent}
                        onToggleStatus={handleToggleStatusStudent}
                        onSendAccount={handleSendAccount}
                    />
                ) : (
                    <EnrollmentRequestsTable
                        requestsData={requestsList}
                        statusFilter={requestStatusFilter}
                        setStatusFilter={setRequestStatusFilter}
                        onView={handleViewRequest}
                        onApprove={handleApproveClick}
                        onReject={handleRejectRequest}
                    />
                )}
            </main>

            {/* Add/Edit Student Modal */}
            <AddStudentModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingStudent(null);
                }}
                onSubmit={handleSubmitStudent}
                editingStudent={editingStudent}
                existingStudents={studentList}
                parentList={MOCK_PARENTS}
            />

            {/* Student Detail Modal */}
            <StudentDetailModal
                isOpen={!!viewingStudent}
                onClose={() => setViewingStudent(null)}
                student={viewingStudent}
            />
            {/* Enrollment Request Modals */}
            <EnrollmentDetailModal
                isOpen={!!viewingRequest}
                onClose={() => setViewingRequest(null)}
                request={viewingRequest}
            />

            {/* Reject Confirmation Modal */}
            <RejectEnrollmentModal
                isOpen={!!rejectingRequest}
                onClose={() => setRejectingRequest(null)}
                onConfirm={handleConfirmReject}
                request={rejectingRequest}
            />

            {/* Import Students Modal */}
            <ImportStudentModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImportStudents}
            />
        </div >
    );
};

export default StudentManagement;
