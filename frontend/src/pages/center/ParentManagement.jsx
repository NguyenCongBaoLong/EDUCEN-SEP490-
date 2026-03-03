import { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import ParentTable from '../../components/ParentTable';
import AddParentModal from '../../components/AddParentModal';
import ParentDetailModal from '../../components/ParentDetailModal';
import '../../css/pages/center/ParentManagement.css';

// Mock student list — in production this would come from API
const MOCK_STUDENTS = [
    { id: 'STU-001', name: 'Nguyễn Văn An', grade: 6 },
    { id: 'STU-002', name: 'Trần Thị Bình', grade: 7 },
    { id: 'STU-003', name: 'Lê Minh Đức', grade: 8 },
    { id: 'STU-004', name: 'Phạm Thị Giang', grade: 9 },
    { id: 'STU-005', name: 'Hoàng Văn Khoa', grade: 10 },
    { id: 'STU-006', name: 'Vũ Thị Mai', grade: 11 },
];

const ParentManagement = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewingParent, setViewingParent] = useState(null);
    const [editingParent, setEditingParent] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [parentList, setParentList] = useState([
        {
            id: 'PAR-001',
            name: 'Nguyễn Văn Bình',
            email: 'parent1@gmail.com',
            phone: '0901234567',
            gender: 'male',
            address: '123 Lê Lợi, Quận 1, TP.HCM',
            linkedStudentIds: ['STU-001'],
            linkedStudentNames: ['Nguyễn Văn An'],
            status: 'active',
            accountSent: true,
        },
        {
            id: 'PAR-002',
            name: 'Trần Văn Cường',
            email: 'parent2@gmail.com',
            phone: '0912345678',
            gender: 'male',
            address: '456 Nguyễn Huệ, Quận 3, TP.HCM',
            linkedStudentIds: ['STU-002'],
            status: 'inactive',
            accountSent: false,
        },
        {
            id: 'PAR-003',
            name: 'Lê Thị Fang',
            email: 'parent3@gmail.com',
            phone: '0923456789',
            gender: 'female',
            address: '789 Trần Hưng Đạo, Quận 5, TP.HCM',
            linkedStudentIds: ['STU-003', 'STU-005'],
            linkedStudentNames: ['Lê Minh Đức', 'Hoàng Văn Khoa'],
            status: 'inactive',
            accountSent: false,
        },
        {
            id: 'PAR-004',
            name: 'Phạm Văn Hùng',
            email: 'parent4@gmail.com',
            phone: '0934567890',
            gender: 'male',
            address: '321 Hai Bà Trưng, Quận 1, TP.HCM',
            linkedStudentIds: ['STU-004'],
            linkedStudentNames: ['Phạm Thị Giang'],
            status: 'active',
            accountSent: true,
        },
        {
            id: 'PAR-005',
            name: 'Vũ Văn Nam',
            email: 'parent6@gmail.com',
            phone: '0956789012',
            gender: 'male',
            address: '987 Nguyễn Thị Minh Khai, Quận 3, TP.HCM',
            linkedStudentIds: ['STU-006'],
            linkedStudentNames: ['Vũ Thị Mai'],
            status: 'active',
            accountSent: true,
        },
    ]);

    const filteredParents = parentList.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.phone.includes(searchQuery)
    );

    /* ─── Handlers ─── */
    const handleAdd = () => { setEditingParent(null); setIsModalOpen(true); };
    const handleEdit = (parent) => { setEditingParent(parent); setIsModalOpen(true); };
    const handleView = (parent) => { setViewingParent(parent); };

    const handleSubmit = (data) => {
        // Resolve linked student names from IDs
        const linkedStudentNames = (data.linkedStudentIds || [])
            .map(id => MOCK_STUDENTS.find(s => s.id === id)?.name)
            .filter(Boolean);

        if (data.id) {
            setParentList(prev => prev.map(p =>
                p.id === data.id ? { ...p, ...data, linkedStudentNames } : p
            ));
        } else {
            const newParent = {
                ...data,
                id: `PAR-${String(parentList.length + 1).padStart(3, '0')}`,
                linkedStudentNames,
                status: 'inactive',
                accountSent: false
            };
            setParentList(prev => [...prev, newParent]);
        }
    };

    const handleToggleStatus = (id) => {
        setParentList(prev => prev.map(p =>
            p.id === id ? { ...p, status: p.status === 'active' ? 'inactive' : 'active' } : p
        ));
    };

    const handleSendAccount = (id) => {
        setParentList(prev => prev.map(p =>
            p.id === id ? { ...p, accountSent: true, status: 'active' } : p
        ));
    };

    const totalParents = parentList.length;
    const activeParents = parentList.filter(p => p.status === 'active').length;
    const unsent = parentList.filter(p => !p.accountSent).length;

    return (
        <div className="parent-management">
            <Sidebar />
            <main className="parent-content">
                {/* Header */}
                <div className="parent-header">
                    <div className="header-left">
                        <h1>Quản Lý Phụ Huynh</h1>
                        <p>{totalParents} phụ huynh · {activeParents} đang hoạt động · {unsent} chưa gửi tài khoản</p>
                    </div>
                    <button className="btn-add-parent" onClick={handleAdd}>
                        <Plus size={20} />
                        Thêm Phụ Huynh
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="parent-stats-row">
                    <div className="parent-stat-card">
                        <div className="stat-icon blue"><Users size={22} /></div>
                        <div>
                            <div className="stat-value">{totalParents}</div>
                            <div className="stat-label">Tổng phụ huynh</div>
                        </div>
                    </div>
                    <div className="parent-stat-card">
                        <div className="stat-icon green"><Users size={22} /></div>
                        <div>
                            <div className="stat-value">{activeParents}</div>
                            <div className="stat-label">Đang hoạt động</div>
                        </div>
                    </div>
                    <div className="parent-stat-card">
                        <div className="stat-icon orange"><Users size={22} /></div>
                        <div>
                            <div className="stat-value">{unsent}</div>
                            <div className="stat-label">Chưa gửi tài khoản</div>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <ParentTable
                    parentData={filteredParents}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    onView={handleView}
                    onEdit={handleEdit}
                    onToggleStatus={handleToggleStatus}
                    onSendAccount={handleSendAccount}
                />
            </main>

            {/* Add/Edit Modal */}
            <AddParentModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingParent(null); }}
                onSubmit={handleSubmit}
                editingParent={editingParent}
                studentList={MOCK_STUDENTS}
            />

            {/* Parent Detail Modal */}
            <ParentDetailModal
                isOpen={!!viewingParent}
                onClose={() => setViewingParent(null)}
                parent={viewingParent}
            />
        </div>
    );
};

export default ParentManagement;
