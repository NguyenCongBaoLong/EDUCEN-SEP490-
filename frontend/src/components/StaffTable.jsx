import { useEffect, useState } from 'react';

import { Search, Eye, Edit2, Lock, Unlock, X, AlertTriangle, Mail, CheckCircle } from 'lucide-react';

import PropTypes from 'prop-types';

import '../css/components/StaffTable.css';

import '../css/components/DeleteModal.css';



const StaffTable = ({

    staffData,

    searchQuery,

    setSearchQuery,

    roleFilter,

    setRoleFilter,

    statusFilter,

    setStatusFilter,

    onView,

    onEdit,

    onToggleLock,

    onSendAccount,

    selectedStaff = [],

    onToggleSelect = () => { },

    onSelectAll = () => { },

    onSendBulkAccounts = () => { }

}) => {

    const [currentPage, setCurrentPage] = useState(1);

    const [lockModal, setLockModal] = useState({ show: false, staff: null });

    const [sendModal, setSendModal] = useState({ show: false, staff: null });

    const itemsPerPage = 6;



    // Pagination

    const totalPages = Math.max(1, Math.ceil(staffData.length / itemsPerPage));

    const startIndex = (currentPage - 1) * itemsPerPage;

    const endIndex = startIndex + itemsPerPage;

    const currentItems = staffData.slice(startIndex, endIndex);



    const handlePrevPage = () => {

        setCurrentPage(prev => Math.max(prev - 1, 1));

    };



    const handleNextPage = () => {

        setCurrentPage(prev => Math.min(prev + 1, totalPages));

    };

    // Reset to first page whenever filtered dataset changes
    useEffect(() => {
        setCurrentPage(1);
    }, [staffData.length, searchQuery, roleFilter, statusFilter]);



    const handleLockClick = (staff) => {

        setLockModal({ show: true, staff });

    };



    const confirmLock = () => {

        if (lockModal.staff) {

            onToggleLock(lockModal.staff.id);

            setLockModal({ show: false, staff: null });

        }

    };



    const cancelLock = () => {

        setLockModal({ show: false, staff: null });

    };



    const getInitials = (name) => {

        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    };



    return (

        <>

            <div className="student-table-container">

                {/* Search and Filters */}

                <div className="staff-filters">

                    <div className="filter-search">

                        <Search size={20} />

                        <input

                            type="text"

                            placeholder="Tìm theo tên hoặc email"

                            value={searchQuery}

                            onChange={(e) => setSearchQuery(e.target.value)}

                        />

                    </div>



                    <div className="filter-controls">



                        <select

                            className="filter-select"

                            value={roleFilter}

                            onChange={(e) => setRoleFilter(e.target.value)}

                        >

                            <option value="">Vai trò</option>

                            <option value="teacher">Giáo Viên</option>

                            <option value="assistant">Trợ Giảng</option>

                        </select>



                        <select

                            className="filter-select"

                            value={statusFilter}

                            onChange={(e) => setStatusFilter(e.target.value)}

                        >

                            <option value="">Trạng thái</option>

                            <option value="active">Hoạt động</option>

                            <option value="inactive">Không hoạt động</option>

                        </select>

                    </div>

                </div>



                {/* Table */}

                <div className="staff-table-wrapper">

                    <table className="staff-table">

                        <thead>

                            <tr>

                                <th style={{ width: '40px' }}>
                                    <input
                                        type="checkbox"
                                        className="bulk-checkbox"
                                        checked={staffData.length > 0 && staffData.filter(s => !s.accountSent).length > 0 && selectedStaff.length === staffData.filter(s => !s.accountSent).length}
                                        onChange={onSelectAll}
                                        title="Chọn tất cả chưa gửi"
                                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#3b82f6' }}
                                    />
                                </th>

                                <th>Giáo Viên</th>
                                <th>Vai Trò</th>
                                <th>Email</th>
                                <th>Trạng Thái</th>
                                <th>Tài Khoản</th>
                                <th className="text-right">Hành Động</th>

                            </tr>

                        </thead>

                        <tbody>

                            {currentItems.map((staff) => (

                                <tr key={staff.id}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            className="bulk-checkbox"
                                            disabled={staff.accountSent}
                                            checked={selectedStaff.includes(staff.id)}
                                            onChange={(e) => {
                                                if (staff.accountSent) return;
                                                onToggleSelect(staff.id);
                                            }}
                                            style={{ width: '16px', height: '16px', cursor: staff.accountSent ? 'not-allowed' : 'pointer', accentColor: '#3b82f6' }}
                                        />
                                    </td>

                                    <td>

                                        <div className="staff-name-cell">

                                            <div className="staff-avatar">

                                                {staff.avatar ? (

                                                    <img src={staff.avatar} alt={staff.name} />

                                                ) : (

                                                    <div className="staff-avatar-initials">

                                                        {getInitials(staff.name)}

                                                    </div>

                                                )}

                                            </div>

                                            <div className="staff-info">

                                                <div className="staff-name">{staff.name}</div>


                                            </div>

                                        </div>

                                    </td>

                                    <td>

                                        <span className={`role-badge ${staff.role}`}>

                                            {staff.role === 'teacher' ? 'Giáo Viên' : 'Trợ Giảng'}

                                        </span>

                                    </td>

                                    <td>

                                        <div className="staff-contact">

                                            <div className="staff-email">{staff.email}</div>

                                        </div>

                                    </td>

                                    <td>

                                        <span className={`status-badge ${staff.status}`}>

                                            {staff.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}

                                        </span>

                                    </td>

                                    <td>
                                        {staff.accountSent
                                            ? <span className="account-badge sent">Đã gửi</span>
                                            : <span className="account-badge pending">Chưa gửi</span>
                                        }
                                    </td>

                                    <td style={{ textAlign: 'right' }}>

                                        <div className="action-buttons">

                                            <button

                                                className="action-btn view"

                                                title="Xem chi tiết"

                                                onClick={() => onView(staff)}

                                            >

                                                <Eye size={18} />

                                            </button>

                                            <button

                                                className="action-btn edit"

                                                title="Chỉnh sửa thông tin công việc"

                                                onClick={() => onEdit(staff)}

                                            >

                                                <Edit2 size={18} />

                                            </button>

                                            {!staff.accountSent && (
                                                <button
                                                    className="action-btn email"
                                                    title="Gửi email tài khoản"
                                                    onClick={() => onSendAccount(staff.id)}
                                                >
                                                    <Mail size={18} />
                                                </button>
                                            )}

                                            <button

                                                className={`action-btn ${staff.status === 'active' ? 'lock' : 'unlock'}`}

                                                title={staff.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}

                                                onClick={() => handleLockClick(staff)}

                                            >

                                                {staff.status === 'active' ? <Lock size={18} /> : <Unlock size={18} />}

                                            </button>

                                        </div>

                                    </td>

                                </tr>

                            ))}

                        </tbody>

                    </table>

                </div>



                {/* Pagination */}

                <div className="staff-pagination">

                    <div className="pagination-info">

                        Hiển thị {startIndex + 1}-{Math.min(endIndex, staffData.length)} trên tổng số {staffData.length} nhân viên

                    </div>

                    <div className="pagination-controls">

                        <button

                            className="pagination-btn"

                            onClick={handlePrevPage}

                            disabled={currentPage === 1}

                        >

                            ‹

                        </button>

                        <span className="pagination-text">

                            Trang {currentPage} / {totalPages}

                        </span>

                        <button

                            className="pagination-btn"

                            onClick={handleNextPage}

                            disabled={currentPage === totalPages}

                        >

                            ›

                        </button>

                    </div>

                </div>

            </div>



            {/* Lock/Unlock Confirmation Modal */}

            {lockModal.show && (

                <div className="delete-modal-overlay" onClick={cancelLock}>

                    <div className="delete-modal" onClick={(e) => e.stopPropagation()}>

                        {/* Header */}

                        <div className="delete-modal-header">

                            <h3>{lockModal.staff?.status === 'active' ? 'Khóa Tài Khoản' : 'Mở Khóa Tài Khoản'}</h3>

                            <button className="delete-modal-close" onClick={cancelLock}>

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

                                    <h4>

                                        {lockModal.staff?.status === 'active'

                                            ? 'Bạn có chắc muốn khóa tài khoản này?'

                                            : 'Bạn có chắc muốn mở khóa tài khoản này?'}

                                    </h4>

                                    <p>

                                        {lockModal.staff?.status === 'active'

                                            ? <>Tài khoản <strong>{lockModal.staff?.name}</strong> sẽ bị khóa và không thể đăng nhập.</>
                                            : <>Tài khoản <strong>{lockModal.staff?.name}</strong> sẽ được mở khóa và có thể đăng nhập trở lại.</>

                                        }

                                    </p>

                                </div>

                            </div>

                        </div>



                        {/* Footer */}

                        <div className="delete-modal-footer">

                            <button className="btn-delete-cancel" onClick={cancelLock}>

                                Hủy

                            </button>

                            <button

                                className={lockModal.staff?.status === 'active' ? 'btn-delete-confirm' : 'btn-unlock-confirm'}

                                onClick={confirmLock}

                            >

                                {lockModal.staff?.status === 'active' ? 'Khóa Tài Khoản' : 'Mở Khóa'}

                            </button>

                        </div>

                    </div>

                </div>

            )}

        </>

    );

};



StaffTable.propTypes = {

    staffData: PropTypes.array.isRequired,

    searchQuery: PropTypes.string.isRequired,

    setSearchQuery: PropTypes.func.isRequired,

    roleFilter: PropTypes.string.isRequired,

    setRoleFilter: PropTypes.func.isRequired,

    statusFilter: PropTypes.string.isRequired,

    setStatusFilter: PropTypes.func.isRequired,

    onView: PropTypes.func.isRequired,

    onEdit: PropTypes.func.isRequired,

    onToggleLock: PropTypes.func.isRequired,

    onSendAccount: PropTypes.func,

    selectedStaff: PropTypes.array,

    onToggleSelect: PropTypes.func,

    onSelectAll: PropTypes.func,

    onSendBulkAccounts: PropTypes.func

};



export default StaffTable;
