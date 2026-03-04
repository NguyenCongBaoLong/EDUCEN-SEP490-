import { useState } from 'react';
import { Search, Eye, Edit2, Lock, Unlock, X, AlertTriangle } from 'lucide-react';
import PropTypes from 'prop-types';
import '../css/components/StudentTable.css';
import '../css/components/DeleteModal.css';

const StudentTable = ({
    studentData,
    searchQuery,
    setSearchQuery,
    gradeFilter,
    setGradeFilter,
    classFilter,
    setClassFilter,
    statusFilter,
    setStatusFilter,
    onView,
    onEdit,
    onToggleStatus
}) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [lockModal, setLockModal] = useState({ show: false, student: null });
    const itemsPerPage = 6;

    const handleLockClick = (student) => {
        setLockModal({ show: true, student });
    };

    const confirmLock = () => {
        if (lockModal.student) {
            onToggleStatus(lockModal.student.id);
            setLockModal({ show: false, student: null });
        }
    };

    const cancelLock = () => {
        setLockModal({ show: false, student: null });
    };

    // Filter Logic is handled in parent, this component receives filtered data

    // Pagination Logic
    const totalPages = Math.ceil(studentData.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentStudents = studentData.slice(indexOfFirstItem, indexOfLastItem);

    const getInitials = (name) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'active': return 'Hoạt động';
            case 'inactive': return 'Không hoạt động';
            default: return status;
        }
    };

    return (
        <div className="student-table-container">
            {/* Filters Bar */}
            <div className="filters-bar">
                <div className="search-box">
                    <Search className="search-icon" size={20} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm học sinh..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                </div>

                <select
                    className="filter-select"
                    value={gradeFilter}
                    onChange={(e) => setGradeFilter(e.target.value)}
                >
                    <option value="">Tất cả khối</option>
                    <option value="6">Khối 6</option>
                    <option value="7">Khối 7</option>
                    <option value="8">Khối 8</option>
                    <option value="9">Khối 9</option>
                    <option value="10">Khối 10</option>
                    <option value="11">Khối 11</option>
                    <option value="12">Khối 12</option>
                </select>

                <select
                    className="filter-select"
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                >
                    <option value="">Tất cả lớp</option>
                    {/* Mock Filter Options */}
                    <option value="Toán 6A">Toán 6A</option>
                    <option value="Vật lý 7B">Vật lý 7B</option>
                    <option value="Hóa 8A">Hóa 8A</option>
                    <option value="Toán 9A">Toán 9A</option>
                    {/* In real app, generate from data */}
                </select>

                <select
                    className="filter-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="">Tất cả trạng thái</option>
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Không hoạt động</option>
                </select>
            </div>

            {/* Table */}
            <div className="table-wrapper">
                <table className="student-table">
                    <thead>
                        <tr>
                            <th>Học Sinh</th>
                            <th>Khối</th>
                            <th>Lớp</th>
                            <th>Phụ Huynh</th>
                            <th>Ngày Nhập Học</th>
                            <th>Trạng Thái</th>
                            <th className="text-right">Hành Động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentStudents.length > 0 ? (
                            currentStudents.map((student) => (
                                <tr key={student.id}>
                                    <td>
                                        <div className="student-info">
                                            <div className="student-avatar">
                                                {student.avatar ? (
                                                    <img src={student.avatar} alt={student.name} />
                                                ) : (
                                                    getInitials(student.name)
                                                )}
                                            </div>
                                            <div className="student-details">
                                                <h4>{student.name}</h4>
                                                <span>{student.id}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="grade-badge">Khối {student.grade}</span>
                                    </td>
                                    <td>
                                        <span className="class-badge">{student.class}</span>
                                    </td>
                                    <td>
                                        <div className="parent-info">
                                            <div style={{ fontWeight: 500 }}>{student.parentName}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{student.parentPhone}</div>
                                        </div>
                                    </td>
                                    <td>{new Date(student.enrollmentDate).toLocaleDateString('vi-VN')}</td>
                                    <td>
                                        <span className={`status-badge ${student.status}`}>
                                            {getStatusLabel(student.status)}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                className="action-btn view"
                                                title="Xem chi tiết"
                                                onClick={() => onView(student)}
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button
                                                className="action-btn edit"
                                                title="Sửa thông tin"
                                                onClick={() => onEdit(student)}
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                className={`action-btn ${student.status === 'active' ? 'lock' : 'unlock'}`}
                                                title={student.status === 'active' ? 'Tạm ngưng học' : 'Kích hoạt lại'}
                                                onClick={() => handleLockClick(student)}
                                            >
                                                {student.status === 'active' ? <Lock size={18} /> : <Unlock size={18} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" className="text-center py-8 text-gray-500">
                                    Không tìm thấy học sinh nào phù hợp.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="pagination">
                <span className="pagination-info">
                    Hiển thị {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, studentData.length)} trên tổng số {studentData.length} học sinh
                </span>
                <div className="pagination-controls">
                    <button
                        className="pagination-btn"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                    >
                        ‹
                    </button>
                    <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#4b5563' }}>
                        Trang {currentPage} / {totalPages}
                    </span>
                    <button
                        className="pagination-btn"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                    >
                        ›
                    </button>
                </div>
            </div>
            {/* Lock/Unlock Confirmation Modal */}
            {lockModal.show && (
                <div className="delete-modal-overlay" onClick={cancelLock}>
                    <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="delete-modal-header">
                            <h3>{lockModal.student?.status === 'active' ? 'Khóa tài khoản' : 'Kích Hoạt Lại'}</h3>
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
                                        {lockModal.student?.status === 'active'
                                            ? 'Bạn có chắc muốn tạm ngưng học sinh này?'
                                            : 'Bạn có chắc muốn kích hoạt lại học sinh này?'}
                                    </h4>
                                    <p>
                                        {lockModal.student?.status === 'active'
                                            ? <>Học sinh <strong>{lockModal.student?.name}</strong> (ID: {lockModal.student?.id}) sẽ chuyển sang trạng thái ngưng hoạt động.</>
                                            : <>Học sinh <strong>{lockModal.student?.name}</strong> (ID: {lockModal.student?.id}) sẽ được kích hoạt lại trạng thái hoạt động.</>
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
                                className={lockModal.student?.status === 'active' ? 'btn-delete-confirm' : 'btn-unlock-confirm'}
                                onClick={confirmLock}
                            >
                                {lockModal.student?.status === 'active' ? 'Xác Nhận Khóa' : 'Kích Hoạt'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

StudentTable.propTypes = {
    studentData: PropTypes.array.isRequired,
    searchQuery: PropTypes.string.isRequired,
    setSearchQuery: PropTypes.func.isRequired,
    gradeFilter: PropTypes.string.isRequired,
    setGradeFilter: PropTypes.func.isRequired,
    classFilter: PropTypes.string.isRequired,
    setClassFilter: PropTypes.func.isRequired,
    statusFilter: PropTypes.string.isRequired,
    setStatusFilter: PropTypes.func.isRequired,
    onView: PropTypes.func.isRequired,
    onEdit: PropTypes.func.isRequired,
    onToggleStatus: PropTypes.func.isRequired
};

export default StudentTable;
