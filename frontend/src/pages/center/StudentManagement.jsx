import { useState, useEffect } from 'react';
import { Plus, Upload, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../../components/Sidebar';
import api from '../../services/api';
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

    const [isLoading, setIsLoading] = useState(false);
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
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);

    const [studentList, setStudentList] = useState([]);
    const [parentList, setParentList] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const parents = await fetchParents();
            await fetchStudents(parents);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchParents = async () => {
        try {
            const res = await api.get('/Parents');
            const data = res.data.map(p => ({
                id: p.userId.toString(),
                name: p.fullName || p.username,
                email: p.email,
                phone: p.phoneNumber || ''
            }));
            setParentList(data);
            return data;
        } catch (error) {
            console.error("Fetch parents error:", error);
            return [];
        }
    };

    const fetchStudents = async (parentsData = parentList) => {
        try {
            const res = await api.get('/Students');
            const data = res.data.map((student) => {
                const linkedParents = parentsData.filter(p => 
                    student.parentIds?.map(id => id.toString()).includes(p.id)
                );

                return {
                    id: student.userId.toString(),
                    name: student.fullName,
                    avatar: null,
                    email: student.email,
                    grade: student.grade || '',
                    class: student.className || 'Chưa xếp lớp',
                    dateOfBirth: student.dateOfBirth ? student.dateOfBirth.split('T')[0] : '',
                    gender: student.gender || 'male',
                    linkedParentIds: student.parentIds?.map(id => id.toString()) || [],
                    parentName: linkedParents.map(p => p.name).join(', ') || student.parentNames?.join(', ') || '',
                    parentPhone: linkedParents.map(p => p.phone).join(', '),
                    parentEmail: linkedParents.map(p => p.email).join(', '),
                    address: student.address || '',
                    enrollmentDate: student.createdAt,
                    status: student.isAccountSent
                        ? (student.accountStatus === 'Active' ? 'active' : 'inactive')
                        : 'inactive',
                    accountSent: student.isAccountSent ?? false,
                    notes: ''
                };
            });
            setStudentList(data);
        } catch (error) {
            console.error("Fetch students error:", error);
            toast.error("Không thể tải danh sách học sinh");
        }
    };

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
    // We pass parentList as parentListData to the StudentTable to display actual parent info
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

    const handleSubmitStudent = async (studentData) => {
        try {
            if (studentData.id && !studentData.id.toString().startsWith('STU')) {
                // Edit existing
                const updatePayload = {
                    fullName: studentData.name,
                    email: studentData.email || `${studentData.name.replace(/\s/g, '').toLowerCase()}@temp.com`,
                    enrollmentStatus: studentData.status,
                    grade: studentData.grade ? studentData.grade.toString() : null,
                    dateOfBirth: studentData.dateOfBirth || null,
                    gender: studentData.gender || null,
                    address: studentData.address || null,
                    parentIds: studentData.linkedParentIds?.map(id => parseInt(id)) || []
                };
                if (studentData.phone) updatePayload.phoneNumber = studentData.phone;

                await api.put(`/Students/${studentData.id}`, updatePayload);
                toast.success('Cập nhật học sinh thành công!');
            } else {
                // Add new
                const payload = {
                    fullName: studentData.name,
                    email: studentData.email || `${studentData.name.replace(/\s/g, '').toLowerCase()}${Date.now()}@temp.com`,
                    enrollmentStatus: studentData.status,
                    grade: studentData.grade ? studentData.grade.toString() : null,
                    dateOfBirth: studentData.dateOfBirth || null,
                    gender: studentData.gender || null,
                    address: studentData.address || null,
                    parentIds: studentData.linkedParentIds?.map(id => parseInt(id)) || []
                };
                if (studentData.phone) payload.phoneNumber = studentData.phone;

                await api.post('/Students', payload);
                toast.success('Thêm học sinh thành công!');
            }
            fetchStudents();
            setIsModalOpen(false);
            setEditingStudent(null);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    const handleToggleStatusStudent = async (studentId) => {
        const student = studentList.find(s => s.id === studentId);
        if (!student) return;
        try {
            const endpoint = student.status === 'active'
                ? `/admin/users/${studentId}/lock`
                : `/admin/users/${studentId}/unlock`;

            // Re-use logic for Lock/Unlock admin API
            await api.put(endpoint);

            setStudentList(studentList.map(s =>
                s.id === studentId
                    ? { ...s, status: s.status === 'active' ? 'inactive' : 'active' }
                    : s
            ));
            toast.success("Đổi trạng thái thành công!");
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Lỗi khi đổi trạng thái');
        }
    };

    const handleSendAccount = async (studentId) => {
        // Optimistic update: cập nhật UI ngay, gửi API sau
        setStudentList(prev => prev.map(s =>
            s.id === studentId
                ? { ...s, accountSent: true, status: 'active' }
                : s
        ));
        toast.success('Đã gửi tài khoản cho học sinh!');
        try {
            await api.post(`/Students/send-account/${studentId}`);
        } catch (error) {
            // Rollback nếu gửi thất bại
            setStudentList(prev => prev.map(s =>
                s.id === studentId
                    ? { ...s, accountSent: false, status: 'inactive' }
                    : s
            ));
            toast.error(error.response?.data?.message || error.response?.data || 'Gửi tài khoản thất bại');
        }
    };

    const handleBulkSendAccount = async () => {
        if (selectedStudentIds.length === 0) return;
        let successCount = 0;
        let failCount = 0;
        await Promise.allSettled(
            selectedStudentIds.map(id =>
                api.post(`/Students/send-account/${id}`)
                    .then(() => { successCount++; })
                    .catch(() => { failCount++; })
            )
        );
        fetchStudents(); // refresh để lấy trạng thái mới nhất
        setSelectedStudentIds([]);
        if (successCount > 0) toast.success(`Đã gửi tài khoản cho ${successCount} học sinh!`);
        if (failCount > 0) toast.error(`${failCount} tài khoản gửi thất bại (học sinh chưa có email?)`);
    };

    const handleImportStudents = (importResults) => {
        // Just refresh the student list - do NOT close modal here
        // User will manually close the modal after seeing results
        fetchStudents();
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
                            {selectedStudentIds.length > 0 && (
                                <button
                                    className="btn-add-student"
                                    style={{ background: '#f59e0b', borderColor: '#f59e0b' }}
                                    onClick={handleBulkSendAccount}
                                >
                                    <Mail size={18} />
                                    Gửi TK ({selectedStudentIds.length})
                                </button>
                            )}
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
                        parentListData={parentList}
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
                        selectedIds={selectedStudentIds}
                        setSelectedIds={setSelectedStudentIds}
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
                parentList={parentList}
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
