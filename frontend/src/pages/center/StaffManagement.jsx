import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../../components/Sidebar';
import api from '../../services/api';
import StaffTable from '../../components/StaffTable';
import AddStaffModal from '../../components/AddStaffModal';
import StaffDetailModal from '../../components/StaffDetailModal';
import '../../css/pages/center/StaffManagement.css';

const StaffManagement = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null);
    const [viewingStaff, setViewingStaff] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const [staffList, setStaffList] = useState([]);
    const [subjects, setSubjects] = useState([]);

    useEffect(() => {
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        try {
            const [teachersRes, assistantsRes, subjectsRes] = await Promise.all([
                api.get('/Teachers'),
                api.get('/Assistants'),
                api.get('/tenantadmin/Subjects')
            ]);

            setSubjects(subjectsRes.data);

            const teachers = teachersRes.data.map(t => ({
                id: t.teacherId.toString(),
                userId: t.userId,
                name: t.fullName,
                avatar: null,
                role: 'teacher',
                subject: t.specialization || 'Chưa cập nhật',
                email: t.email,
                phone: t.phoneNumber || '',
                dateOfBirth: '',
                address: '',
                notes: t.degree || '',
                status: t.accountStatus?.toLowerCase() === 'active' ? 'active' : 'inactive'
            }));

            const assistants = assistantsRes.data.map(a => ({
                id: a.assistantId.toString(),
                userId: a.userId,
                name: a.fullName,
                avatar: null,
                role: 'assistant',
                subject: a.supportLevel || 'Chưa cập nhật',
                email: a.email,
                phone: a.phoneNumber || '',
                dateOfBirth: '',
                address: '',
                notes: '',
                status: a.accountStatus?.toLowerCase() === 'active' ? 'active' : 'inactive'
            }));

            setStaffList([...teachers, ...assistants]);
        } catch (error) {
            console.error("Fetch staff error:", error);
            toast.error("Không thể tải danh sách nhân viên");
        }
    };

    const handleAddStaff = () => {
        setEditingStaff(null);
        setIsModalOpen(true);
    };

    const handleViewStaff = (staff) => {
        setViewingStaff(staff);
    };

    const handleEditStaff = (staff) => {
        setEditingStaff(staff);
        setIsModalOpen(true);
    };

    const handleToggleLockStaff = async (staffId) => {
        const staff = staffList.find(s => s.id === staffId);
        if (!staff) return;

        try {
            const endpoint = staff.status === 'active'
                ? `/admin/users/${staff.userId}/lock`
                : `/admin/users/${staff.userId}/unlock`;
            await api.put(endpoint);

            setStaffList(staffList.map(s =>
                s.id === staffId
                    ? { ...s, status: s.status === 'active' ? 'inactive' : 'active' }
                    : s
            ));
            toast.success("Đổi trạng thái thành công!");
        } catch (error) {
            console.error("Lỗi khi đổi trạng thái:", error);
            toast.error(error.response?.data?.message || "Không thể đổi trạng thái");
        }
    };

    const handleSubmitStaff = async (staffData) => {
        try {
            const isTeacher = staffData.role === 'teacher';
            const endpoint = isTeacher ? '/Teachers' : '/Assistants';

            let payload = {
                username: `staff_${Date.now()}`,
                password: `Staff123!`,
                fullName: staffData.name,
                email: staffData.email,
            };
            if (staffData.phone) payload.phoneNumber = staffData.phone;

            if (isTeacher) {
                payload.specialization = staffData.subject || 'General';
            } else {
                payload.supportLevel = staffData.subject || 'Basic';
            }

            if (editingStaff) {
                // Edit
                const editEndpoint = `${endpoint}/${staffData.id}`;
                const updatePayload = {
                    fullName: staffData.name,
                    email: staffData.email,
                };
                if (staffData.phone) updatePayload.phoneNumber = staffData.phone;
                if (isTeacher) {
                    updatePayload.specialization = staffData.subject || 'General';
                } else {
                    updatePayload.supportLevel = staffData.subject || 'Basic';
                }

                await api.put(editEndpoint, updatePayload);
                toast.success('Cập nhật nhân viên thành công!');
            } else {
                // Add
                await api.post(endpoint, payload);
                toast.success('Thêm nhân viên thành công!');
            }
            fetchStaff();
            setIsModalOpen(false);
            setEditingStaff(null);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    // Filter staff
    const filteredStaff = staffList.filter(staff => {
        const matchesSearch =
            staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            staff.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            staff.specialty.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSubject = !subjectFilter || staff.subject === subjectFilter;
        const matchesRole = !roleFilter || staff.role === roleFilter;
        const matchesStatus = !statusFilter || staff.status === statusFilter;

        return matchesSearch && matchesSubject && matchesRole && matchesStatus;
    });

    return (
        <div className="staff-management">
            <Sidebar />

            <main className="staff-main">
                {/* Header */}
                <div className="staff-header">
                    <div className="staff-header-content">
                        <div>
                            <h1>Quản Lý Nhân Viên</h1>
                            <p className="staff-subtitle">
                                Quản lý và giám sát {staffList.length} nhân viên tại trung tâm
                            </p>
                        </div>
                        <button className="btn-add-staff" onClick={handleAddStaff}>
                            <Plus size={20} />
                            Thêm Giáo Viên
                        </button>
                    </div>
                </div>

                {/* Staff Table */}
                <StaffTable
                    staffData={filteredStaff}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    subjectFilter={subjectFilter}
                    setSubjectFilter={setSubjectFilter}
                    roleFilter={roleFilter}
                    setRoleFilter={setRoleFilter}
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    onView={handleViewStaff}
                    onEdit={handleEditStaff}
                    onToggleLock={handleToggleLockStaff}
                    subjects={subjects}
                />
            </main>

            {/* Add/Edit Staff Modal */}
            <AddStaffModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingStaff(null);
                }}
                onSubmit={handleSubmitStaff}
                editingStaff={editingStaff}
                existingStaff={staffList}
                subjects={subjects}
            />

            {/* Staff Detail Modal */}
            <StaffDetailModal
                isOpen={!!viewingStaff}
                onClose={() => setViewingStaff(null)}
                staff={viewingStaff}
            />
        </div>
    );
};

export default StaffManagement;
