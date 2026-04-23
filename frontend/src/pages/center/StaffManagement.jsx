import { useState, useEffect } from 'react';

import { Plus, Mail, CheckSquare, Square } from 'lucide-react';

import toast from 'react-hot-toast';

import Sidebar from '../../components/Sidebar';

import api, { parseValidationErrors } from '../../services/api';

import accountService from '../../services/accountService';

import StaffTable from '../../components/StaffTable';

import AddStaffModal from '../../components/AddStaffModal';

import StaffDetailModal from '../../components/StaffDetailModal';
import ConfirmModal from '../../components/ConfirmModal';

import '../../css/pages/center/StaffManagement.css';



const StaffManagement = () => {

    // Function để generate password ngẫu nhiên an toàn
    const generatePassword = () => {
        const length = 12;
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return password;
    };

    const [isModalOpen, setIsModalOpen] = useState(false);

    const [editingStaff, setEditingStaff] = useState(null);

    const [viewingStaff, setViewingStaff] = useState(null);

    const [searchQuery, setSearchQuery] = useState('');

    const [roleFilter, setRoleFilter] = useState('');

    const [statusFilter, setStatusFilter] = useState('');

    // State cho email gửi tài khoản
    const [selectedStaff, setSelectedStaff] = useState([]);
    const [sendAccountModal, setSendAccountModal] = useState({ show: false, staff: null });
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        type: 'warning'
    });

    const [staffList, setStaffList] = useState([]);
    const [allUsers, setAllUsers] = useState([]); // For email validation across all roles

    // Fix filter - ensure state is properly initialized
    const [filterRole, setFilterRole] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // State for form validation errors
    const [errors, setErrors] = useState({});



    useEffect(() => {

        fetchStaff();

    }, []);

    const fetchAllUsers = async () => {
        try {
            const usersRes = await api.get('/admin/users');
            setAllUsers(usersRes.data || []);
        } catch (error) {
            console.error("Fetch users error:", error);
        }
    };

const fetchStaff = async () => {

        try {

            const [teachersRes, assistantsRes, usersRes] = await Promise.all([

                api.get('/Teachers'),

                api.get('/Assistants'),

                api.get('/admin/users').catch(() => ({ data: [] }))

            ]);


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

                address: t.address || '',

                notes: t.degree || '',

                status: t.accountStatus?.toLowerCase() === 'active' ? 'active' : 'inactive',

                accountSent: t.isAccountSent ?? false

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

                address: a.address || '',

                notes: '',

                status: a.accountStatus?.toLowerCase() === 'active' ? 'active' : 'inactive',

                accountSent: a.isAccountSent ?? false

            }));



            setStaffList([...teachers, ...assistants]);

            setAllUsers(usersRes.data || []);

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



    // Xử lý gửi email tài khoản cho một nhân viên
    const executeSendAccount = async (staffId) => {
        const staff = staffList.find(s => s.id === staffId);
        if (!staff) return;

        // Kiểm tra xem userId có tồn tại không
        if (!staff.userId) {
            toast.error(`Không thể gửi email tài khoản cho ${staff.name}: Không tìm thấy thông tin user. Vui lòng xóa và tạo lại nhân viên.`);
            return;
        }

        const loadingToast = toast.loading('Đang gửi thông tin...');
        try {
            const isTeacher = staff.role === 'teacher';
            const sendFn = isTeacher
                ? accountService.sendTeacherAccount
                : accountService.sendAssistantAccount;

            // Generate username và password từ frontend
            const username = staff.email;
            const password = generatePassword();

            console.log('Gửi email tài khoản cho:', staff.name, 'ID:', staff.id, 'Role:', staff.role, 'UserID:', staff.userId);
            console.log('Username:', username, 'Password:', password);
            const numericId = parseInt(staff.id);
            console.log('Numeric ID:', numericId, 'Is NaN:', isNaN(numericId));

            if (isNaN(numericId)) {
                toast.error(`ID nhân viên không hợp lệ: ${staff.id}`);
                return;
            }

            await sendFn(numericId, username, password);

            // Refresh lại danh sách để lấy trạng thái mới từ backend
            await fetchStaff();

            toast.dismiss(loadingToast);
            toast.success(`Đã gửi email tài khoản cho ${staff.name}`);
        } catch (error) {
            toast.dismiss(loadingToast);
            console.error("Lỗi khi gửi email:", error);
            console.error("Error response:", error.response);
            console.error("Error message:", error.response?.data?.message);
            console.error("Error status:", error.response?.status);
            toast.error(error.response?.data?.message || 'Không thể gửi email tài khoản');
        }
    };

    const handleSendAccount = async (staffId) => {
        const staff = staffList.find(s => s.id === staffId);
        if (!staff) return;

        setConfirmModal({
            isOpen: true,
            title: 'Gửi tài khoản',
            message: `Bạn có chắc muốn gửi thông tin tài khoản cho <strong>${staff.name}</strong>?`,
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                await executeSendAccount(staffId);
            },
            type: 'info'
        });
    };

    // Xử lý gửi email cho nhiều nhân viên được chọn
    const executeBulkSendAccounts = async () => {
        if (selectedStaff.length === 0) {
            toast.error('Vui lòng chọn ít nhất một nhân viên');
            return;
        }

        let successCount = 0;
        let failCount = 0;
        const loadingToast = toast.loading('Đang gửi thông tin...');

        for (const staffId of selectedStaff) {
            const staff = staffList.find(s => s.id === staffId);
            if (!staff) continue;

            try {
                const isTeacher = staff.role === 'teacher';
                const sendFn = isTeacher
                    ? accountService.sendTeacherAccount
                    : accountService.sendAssistantAccount;

                // Generate username và password cho mỗi nhân viên
                const username = staff.email;
                const password = generatePassword();

                await sendFn(parseInt(staff.id), username, password);
                successCount++;
            } catch (error) {
                failCount++;
                console.error(`Lỗi gửi email cho ${staff.name}:`, error);
            }
        }

        // Refresh lại danh sách để lấy trạng thái mới từ backend
        await fetchStaff();
        toast.dismiss(loadingToast);

        if (successCount > 0) {
            toast.success(`Đã gửi email thành công cho ${successCount} nhân viên`);
        }
        if (failCount > 0) {
            toast.error(`Gửi thất bại cho ${failCount} nhân viên`);
        }

        setSelectedStaff([]);
    };

    const handleSendBulkAccounts = async () => {
        if (selectedStaff.length === 0) {
            toast.error('Vui lòng chọn ít nhất một nhân viên');
            return;
        }

        setConfirmModal({
            isOpen: true,
            title: 'Gửi tài khoản hàng loạt',
            message: `Bạn có chắc muốn gửi thông tin tài khoản cho <strong>${selectedStaff.length}</strong> nhân viên đã chọn?`,
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                await executeBulkSendAccounts();
            },
            type: 'info'
        });
    };



    // Toggle chọn một nhân viên
    const handleToggleSelect = (staffId) => {
        setSelectedStaff(prev =>
            prev.includes(staffId)
                ? prev.filter(id => id !== staffId)
                : [...prev, staffId]
        );
    };



    // Chọn tất cả - chỉ chọn những người chưa gửi tài khoản (giống StudentTable)
    const handleSelectAll = () => {
        const unsentStaff = filteredStaff.filter(s => !s.accountSent).map(s => s.id);
        if (selectedStaff.length === unsentStaff.length && selectedStaff.length > 0) {
            setSelectedStaff([]);
        } else {
            setSelectedStaff(unsentStaff);
        }
    };



    const handleSubmitStaff = async (staffData) => {

        try {

            const isTeacher = staffData.role === 'teacher';

            const endpoint = isTeacher ? '/Teachers' : '/Assistants';



            let payload = {

                fullName: staffData.name,

                email: staffData.email,

                address: staffData.address,

            };

            if (staffData.phone) payload.phoneNumber = staffData.phone;



            if (isTeacher) {

                payload.specialization = 'General';

                payload.degree = staffData.degree || '';

            } else {

                payload.supportLevel = 'Basic';

            }



            if (editingStaff) {

                // Edit

                const editEndpoint = `${endpoint}/${staffData.id}`;

                const updatePayload = {

                    fullName: staffData.name,

                    email: staffData.email,

                    address: staffData.address,

                };

                if (staffData.phone) updatePayload.phoneNumber = staffData.phone;

                if (isTeacher) {

                    updatePayload.specialization = editingStaff?.subject || 'General';

                    updatePayload.degree = staffData.degree || '';

                } else {

                    updatePayload.supportLevel = editingStaff?.subject || 'Basic';

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
            // Parse validation errors and show on form
            const parsed = parseValidationErrors(error);
            if (parsed.hasErrors && parsed.details) {
                // Show errors on form fields
                const formErrors = {};
                if (parsed.details['Email']) {
                    formErrors.email = parsed.details['Email'][0];
                }
                if (parsed.details['Họ tên']) {
                    formErrors.name = parsed.details['Họ tên'][0];
                }
                if (Object.keys(formErrors).length > 0) {
                    setErrors(formErrors);
                    return;
                }
            }
            // Fallback: show toast
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        }

    };



    // Filter staff
    const filteredStaff = staffList.filter(staff => {

        const matchesSearch =

            staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||

            staff.email.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesRole = !filterRole || staff.role === filterRole;

        const matchesStatus = !filterStatus || staff.status === filterStatus;



        return matchesSearch && matchesRole && matchesStatus;

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

                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            {selectedStaff.length > 0 && (
                                <button
                                    className="btn-add-staff"
                                    style={{ background: '#f59e0b', borderColor: '#f59e0b' }}
                                    onClick={handleSendBulkAccounts}
                                >
                                    <Mail size={18} />
                                    Gửi TK ({selectedStaff.length})
                                </button>
                            )}
                            <button className="btn-add-staff" onClick={handleAddStaff}>
                                <Plus size={20} />
                                Thêm Giáo Viên
                            </button>
                        </div>

                    </div>

                </div>



                {/* Staff Table */}
                <StaffTable

                    staffData={filteredStaff}

                    searchQuery={searchQuery}

                    setSearchQuery={setSearchQuery}

                    roleFilter={filterRole}
                    setRoleFilter={setFilterRole}
                    statusFilter={filterStatus}
                    setStatusFilter={setFilterStatus}

                    selectedStaff={selectedStaff}
                    onToggleSelect={handleToggleSelect}
                    onSelectAll={handleSelectAll}
                    onSendAccount={handleSendAccount}
                    onSendBulkAccounts={handleSendBulkAccounts}

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
                    setErrors({});

                }}

                onSubmit={handleSubmitStaff}

                editingStaff={editingStaff}

                existingStaff={staffList}

                allUsers={allUsers}

                errors={errors}

                setErrors={setErrors}

            />

            {/* Staff Detail Modal */}

            <StaffDetailModal

                isOpen={!!viewingStaff}

                onClose={() => setViewingStaff(null)}

                staff={viewingStaff}

            />
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                type={confirmModal.type}
            />

        </div>

    );

};



export default StaffManagement;

