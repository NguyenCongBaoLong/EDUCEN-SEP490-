import { useState, useEffect } from 'react';
import { Plus, Upload, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../../components/Sidebar';
import api, { parseValidationErrors } from '../../services/api';
import StudentTable from '../../components/StudentTable';
import AddStudentModal from '../../components/AddStudentModal';
import StudentDetailModal from '../../components/StudentDetailModal';
import ImportStudentModal from '../../components/ImportStudentModal';
import '../../css/pages/center/StudentManagement.css';

const StudentManagement = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [viewingStudent, setViewingStudent] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [gradeFilter, setGradeFilter] = useState('');
    const [classFilter, setClassFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // State for form validation errors
    const [errors, setErrors] = useState({});

    const [selectedStudentIds, setSelectedStudentIds] = useState([]);

    const [studentList, setStudentList] = useState([]);
    const [parentList, setParentList] = useState([]);
    const [gradeList, setGradeList] = useState([]);
    const [classList, setClassList] = useState([]);
    const [allUsers, setAllUsers] = useState([]); // For email validation across all roles

    useEffect(() => {
        fetchData();
    }, []);

    const fetchAllUsers = async () => {
        try {
            const usersRes = await api.get('/admin/users');
            setAllUsers(usersRes.data || []);
        } catch (error) {
            console.error("Fetch users error:", error);
        }
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [parentsRes, gradesRes, classesRes, usersRes] = await Promise.all([
                api.get('/Parents'),
                api.get('/Grades'),
                api.get('/Classes'),
                api.get('/admin/users')
            ]);
            
            const parents = parentsRes.data.map(p => ({
                id: p.userId.toString(),
                name: p.fullName || p.username,
                email: p.email,
                phone: p.phoneNumber || ''
            }));
            setParentList(parents);
            setGradeList(gradesRes.data);
            setClassList(classesRes.data);
            setAllUsers(usersRes.data || []);
            
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

    const fetchGrades = async () => {
        try {
            const res = await api.get('/Grades');
            setGradeList(res.data);
        } catch (error) {
            console.error("Fetch grades error:", error);
        }
    };

    const fetchClasses = async () => {
        try {
            const res = await api.get('/Classes');
            setClassList(res.data);
        } catch (error) {
            console.error("Fetch classes error:", error);
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
                    phone: student.phoneNumber || '',
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

    // Filter students
    const normalizeGrade = (grade) => {
        if (!grade) return '';
        const match = grade.toString().match(/\d+/);
        return match ? match[0] : grade.toString();
    };
    
    const filteredStudents = studentList
        .filter(student => student.name.toLowerCase().includes(searchQuery.toLowerCase()) || student.id.toLowerCase().includes(searchQuery.toLowerCase()))
        .filter(student => {
            if (!gradeFilter) return true;
            const studentGrade = normalizeGrade(student.grade);
            const filterGrade = normalizeGrade(gradeFilter);
            return studentGrade === filterGrade;
        })
        .filter(student => classFilter ? student.class === classFilter : true)
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
                    email: studentData.email,
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
                    email: studentData.email,
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
            const parsed = parseValidationErrors(error);
            if (parsed.hasErrors && parsed.details) {
                const formErrors = {};
                if (parsed.details['Email']) {
                    formErrors.email = parsed.details['Email'][0];
                }
                if (parsed.details['Họ tên']) {
                    formErrors.name = parsed.details['Họ tên'][0];
                }
                if (Object.keys(formErrors).length > 0) {
                    setEditingStudent(studentData);
                    setIsModalOpen(true);
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('set-form-errors', { 
                            detail: formErrors 
                        }));
                    }, 100);
                    return;
                }
            }
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
        try {
            await api.post(`/Students/send-account/${studentId}`);
            setStudentList(prev => prev.map(s =>
                s.id === studentId
                    ? { ...s, accountSent: true, status: 'active' }
                    : s
            ));
            toast.success('Đã gửi tài khoản cho học sinh!');
        } catch (error) {
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
        fetchStudents();
        setSelectedStudentIds([]);
        if (successCount > 0) toast.success(`Đã gửi tài khoản cho ${successCount} học sinh!`);
        if (failCount > 0) toast.error(`${failCount} tài khoản gửi thất bại (học sinh chưa có email?)`);
    };

    const handleImportStudents = (importResults) => {
        fetchStudents();
    };

    return (
        <div className="student-management">
            <Sidebar />
            <main className="student-content">
                <div className="student-header">
                    <div className="header-left">
                        <h1>Quản Lý Học Sinh</h1>
                        <p>
                            Hiện thị 1 đến {filteredStudents.length} của {studentList.length} học sinh
                        </p>
                    </div>
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
                </div>

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
                    gradeList={gradeList}
                    classList={classList}
                />
            </main>

            <AddStudentModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingStudent(null);
                    setErrors({});
                }}
                onSubmit={handleSubmitStudent}
                editingStudent={editingStudent}
                existingStudents={studentList}
                parentList={parentList}
                gradeList={gradeList}
                allUsers={allUsers}
                errors={errors}
                setErrors={setErrors}
            />

            <StudentDetailModal
                isOpen={!!viewingStudent}
                onClose={() => setViewingStudent(null)}
                student={viewingStudent}
            />

            <ImportStudentModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImportStudents}
            />
        </div>
    );
};

export default StudentManagement;