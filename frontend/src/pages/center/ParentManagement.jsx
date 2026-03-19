import { useState, useEffect } from 'react';
import { Plus, Users, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../../components/Sidebar';
import ParentTable from '../../components/ParentTable';
import AddParentModal from '../../components/AddParentModal';
import ParentDetailModal from '../../components/ParentDetailModal';
import api from '../../services/api';
import '../../css/pages/center/ParentManagement.css';

const ParentManagement = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewingParent, setViewingParent] = useState(null);
    const [editingParent, setEditingParent] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedParentIds, setSelectedParentIds] = useState([]);
    const [parentList, setParentList] = useState([]);
    const [studentList, setStudentList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [parentsRes, studentsRes] = await Promise.all([
                api.get('/Parents'),
                api.get('/Students')
            ]);
            
            // Map Parent Data
            const parents = parentsRes.data.map(p => ({
                id: p.userId.toString(),
                username: p.username,
                name: p.fullName || p.username,
                email: p.email,
                phone: p.phoneNumber || '',
                gender: 'male',
                status: p.accountStatus === 'Active' ? 'active' : 'inactive',
                accountSent: p.accountStatus === 'Active',
                linkedStudentIds: p.studentIds?.map(id => id.toString()) || [],
                linkedStudentNames: p.studentNames || [],
                childrenCount: p.childrenCount || 0
            }));

            // Map Student Data for linking
            const students = studentsRes.data.map(s => ({
                id: s.userId.toString(),
                name: s.fullName
            }));

            setParentList(parents);
            setStudentList(students);
        } catch (error) {
            console.error("Fetch data error:", error);
            toast.error("Không thể tải dữ liệu phụ huynh");
        } finally {
            setIsLoading(false);
        }
    };

    const filteredParents = parentList.filter(p =>
        (p.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (p.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (p.phone || '').includes(searchQuery)
    );

    /* ─── Handlers ─── */
    const handleAdd = () => { setEditingParent(null); setIsModalOpen(true); };
    const handleEdit = (parent) => { setEditingParent(parent); setIsModalOpen(true); };
    const handleView = (parent) => { setViewingParent(parent); };

    const handleSubmit = async (data) => {
        try {
            if (data.id) {
                // Edit existing
                const updatePayload = {
                    fullName: data.name,
                    email: data.email,
                    phoneNumber: data.phone,
                    studentIds: data.linkedStudentIds?.map(id => parseInt(id))
                };

                await api.put(`/Parents/${data.id}`, updatePayload);
                toast.success('Cập nhật phụ huynh thành công!');
            } else {
                // Add new
                const payload = {
                    fullName: data.name,
                    email: data.email,
                    phoneNumber: data.phone,
                    studentIds: data.linkedStudentIds?.map(id => parseInt(id))
                };

                await api.post('/Parents', payload);
                toast.success('Thêm phụ huynh thành công!');
            }
            fetchData();
            setIsModalOpen(false);
            setEditingParent(null);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    const handleToggleStatus = async (id) => {
        const parent = parentList.find(p => p.id === id);
        if (!parent) return;

        try {
            const endpoint = parent.status === 'active'
                ? `/admin/users/${id}/lock`
                : `/admin/users/${id}/unlock`;

            await api.put(endpoint);
            
            setParentList(prev => prev.map(p =>
                p.id === id ? { ...p, status: p.status === 'active' ? 'inactive' : 'active' } : p
            ));
            toast.success("Đổi trạng thái thành công!");
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi đổi trạng thái');
        }
    };

    const handleSendAccount = async (id) => {
        const loadingToast = toast.loading("Đang gửi thông tin tài khoản...");
        try {
            await api.post(`/Parents/send-account/${id}`);
            
            setParentList(prev => prev.map(p =>
                p.id === id ? { ...p, accountSent: true, status: 'active' } : p
            ));
            toast.dismiss(loadingToast);
            toast.success("Đã gửi tài khoản phụ huynh thành công!");
        } catch (error) {
            toast.dismiss(loadingToast);
            toast.error(error.response?.data?.message || 'Lỗi khi gửi tài khoản');
        }
    };

    const handleBulkSendAccount = async () => {
        if (selectedParentIds.length === 0) return;
        
        const confirmBulk = window.confirm(`Bạn có chắc muốn gửi tài khoản cho ${selectedParentIds.length} phụ huynh đã chọn?`);
        if (!confirmBulk) return;

        const loadingToast = toast.loading(`Đang gửi ${selectedParentIds.length} tài khoản...`);
        try {
            await Promise.all(selectedParentIds.map(id => 
                api.post(`/Parents/send-account/${id}`)
            ));
            
            fetchData();
            setSelectedParentIds([]);
            toast.dismiss(loadingToast);
            toast.success(`Đã gửi thành công ${selectedParentIds.length} tài khoản!`);
        } catch (error) {
            toast.dismiss(loadingToast);
            toast.error("Một số tài khoản có thể chưa gửi được. Vui lòng kiểm tra lại.");
            fetchData();
        }
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
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {selectedParentIds.length > 0 && (
                            <button
                                className="btn-add-parent"
                                style={{ background: '#f59e0b', borderColor: '#f59e0b' }}
                                onClick={handleBulkSendAccount}
                            >
                                <Mail size={18} />
                                Gửi TK ({selectedParentIds.length})
                            </button>
                        )}
                        <button className="btn-add-parent" onClick={handleAdd}>
                            <Plus size={20} />
                            Thêm Phụ Huynh
                        </button>
                    </div>
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
                    selectedIds={selectedParentIds}
                    setSelectedIds={setSelectedParentIds}
                />
            </main>

            {/* Add/Edit Modal */}
            <AddParentModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingParent(null); }}
                onSubmit={handleSubmit}
                editingParent={editingParent}
                studentList={studentList}
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
