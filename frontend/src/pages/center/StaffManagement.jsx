import { useState } from 'react';
import { Plus } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
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

    // Mock data - All staff combined with role field
    const [staffList, setStaffList] = useState([
        {
            id: 'T-1024',
            name: 'Nguyễn Văn An',
            avatar: null,
            role: 'teacher',
            subject: 'Toán học',
            email: 'nguyenvanan@trungcam.edu.vn',
            phone: '0901234567',
            dateOfBirth: '1985-03-15',
            address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
            notes: 'Giảng viên giỏi, nhiều kinh nghiệm',
            status: 'active'
        },
        {
            id: 'T-1025',
            name: 'Trần Thị Bình',
            avatar: null,
            role: 'teacher',
            subject: 'Vật lý',
            email: 'tranthib@trungcam.edu.vn',
            phone: '0912345678',
            dateOfBirth: '1988-07-22',
            address: '456 Lê Lợi, Quận 3, TP.HCM',
            notes: '',
            status: 'active'
        },
        {
            id: 'T-1026',
            name: 'Lê Văn Cường',
            avatar: null,
            role: 'teacher',
            subject: 'Tiếng Anh',
            email: 'levanc@trungcam.edu.vn',
            phone: '0923456789',
            dateOfBirth: '1990-11-05',
            address: '789 Trần Hưng Đạo, Quận 5, TP.HCM',
            notes: 'Tạm nghỉ phép',
            status: 'inactive'
        },
        {
            id: 'T-1027',
            name: 'Phạm Thị Dùng',
            avatar: null,
            role: 'teacher',
            subject: 'Hóa học',
            email: 'phamthid@trungcam.edu.vn',
            phone: '0934567890',
            dateOfBirth: '1987-04-18',
            address: '321 Hai Bà Trưng, Quận 1, TP.HCM',
            notes: '',
            status: 'active'
        },
        {
            id: 'A-2001',
            name: 'Hoàng Văn Em',
            avatar: null,
            role: 'assistant',
            subject: 'Toán học',
            email: 'hoangvane@trungcam.edu.vn',
            phone: '0934567890',
            dateOfBirth: '1995-09-10',
            address: '654 Võ Văn Tần, Quận 3, TP.HCM',
            notes: 'Trợ giảng nhiệt tình',
            status: 'active'
        },
        {
            id: 'A-2002',
            name: 'Phạm Thị Giang',
            avatar: null,
            role: 'assistant',
            subject: 'Vật lý',
            email: 'phamthig@trungcam.edu.vn',
            phone: '0945678901',
            dateOfBirth: '1996-12-25',
            address: '987 Nguyễn Thị Minh Khai, Quận 3, TP.HCM',
            notes: '',
            status: 'active'
        }
    ]);

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

    const handleToggleLockStaff = (staffId) => {
        setStaffList(staffList.map(s =>
            s.id === staffId
                ? { ...s, status: s.status === 'active' ? 'inactive' : 'active' }
                : s
        ));
    };

    const handleSubmitStaff = (staffData) => {
        if (editingStaff) {
            // Update existing staff
            setStaffList(staffList.map(s => s.id === staffData.id ? staffData : s));
        } else {
            // Create new staff
            const prefix = staffData.role === 'teacher' ? 'T-' : 'A-';
            const newId = prefix + Math.floor(Math.random() * 9000 + 1000);
            const newStaff = {
                ...staffData,
                id: newId,
                avatar: null
            };
            setStaffList([...staffList, newStaff]);
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
                            Thêm Nhân Viên
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
