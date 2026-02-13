import { useState } from 'react';
import { Eye, Check, X } from 'lucide-react';
import PropTypes from 'prop-types';
import '../css/components/EnrollmentRequestsTable.css';
import '../css/components/StudentTable.css'; // Reuse filter styles

const EnrollmentRequestsTable = ({
    requestsData,
    statusFilter,
    setStatusFilter,
    onView,
    onApprove,
    onReject
}) => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;
    const [sortOrder, setSortOrder] = useState('newest');

    // Filter Logic
    const filteredRequests = requestsData.filter(request => {
        if (statusFilter && request.status !== statusFilter) return false;
        return true;
    }).sort((a, b) => {
        const dateA = new Date(a.requestDate);
        const dateB = new Date(b.requestDate);
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentRequests = filteredRequests.slice(indexOfFirstItem, indexOfLastItem);

    const getStatusLabel = (status) => {
        switch (status) {
            case 'pending': return 'Chờ duyệt';
            case 'approved': return 'Đã duyệt';
            case 'rejected': return 'Từ chối';
            default: return status;
        }
    };

    return (
        <div className="student-table-container">
            {/* Filters Bar */}
            <div className="filters-bar">
                <select
                    className="filter-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="">Tất cả trạng thái</option>
                    <option value="pending">Chờ duyệt</option>
                    <option value="approved">Đã duyệt</option>
                    <option value="rejected">Từ chối</option>
                </select>

                <select
                    className="filter-select"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                >
                    <option value="newest">Mới nhất</option>
                    <option value="oldest">Cũ nhất</option>
                </select>

                <div style={{ marginLeft: 'auto', fontSize: '0.9rem', color: '#6b7280' }}>
                    Tổng số: <strong>{filteredRequests.length}</strong> yêu cầu
                </div>
            </div>

            {/* Table */}
            <div className="table-wrapper">
                <table className="enrollment-requests-table">
                    <thead>
                        <tr>
                            <th>Học Sinh</th>
                            <th>Khối Đăng Ký</th>
                            <th>Phụ Huynh</th>
                            <th>Ngày Gửi</th>
                            <th>Trạng Thái</th>
                            <th className="text-right">Hành Động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentRequests.length > 0 ? (
                            currentRequests.map((request) => (
                                <tr key={request.id}>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{request.studentName}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                            {new Date(request.dateOfBirth).toLocaleDateString('vi-VN')}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="grade-badge">Khối {request.desiredGrade}</span>
                                    </td>
                                    <td>
                                        <div className="parent-info">
                                            <div style={{ fontWeight: 500 }}>{request.parentName}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{request.parentPhone}</div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="request-date">
                                            {new Date(request.requestDate).toLocaleDateString('vi-VN')}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`enrollment-status-badge ${request.status}`}>
                                            {getStatusLabel(request.status)}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="status-actions">
                                            <button
                                                className="action-btn view"
                                                title="Xem chi tiết"
                                                onClick={() => onView(request)}
                                            >
                                                <Eye size={18} />
                                            </button>
                                            {request.status === 'pending' && (
                                                <>
                                                    <button
                                                        className="action-btn approve"
                                                        title="Duyệt yêu cầu"
                                                        onClick={() => onApprove(request)}
                                                    >
                                                        <Check size={18} />
                                                    </button>
                                                    <button
                                                        className="action-btn reject"
                                                        title="Từ chối yêu cầu"
                                                        onClick={() => onReject(request)}
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="text-center py-8 text-gray-500">
                                    Không có yêu cầu đăng ký nào.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="pagination">
                    <span className="pagination-info">
                        Hiển thị {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredRequests.length)} trên tổng số {filteredRequests.length}
                    </span>
                    <div className="pagination-controls">
                        <button
                            className="pagination-btn"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                        >
                            Trước
                        </button>
                        {[...Array(totalPages)].map((_, index) => (
                            <button
                                key={index + 1}
                                className={`pagination-btn ${currentPage === index + 1 ? 'active' : ''}`}
                                onClick={() => setCurrentPage(index + 1)}
                            >
                                {index + 1}
                            </button>
                        ))}
                        <button
                            className="pagination-btn"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                        >
                            Sau
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

EnrollmentRequestsTable.propTypes = {
    requestsData: PropTypes.array.isRequired,
    statusFilter: PropTypes.string.isRequired,
    setStatusFilter: PropTypes.func.isRequired,
    onView: PropTypes.func.isRequired,
    onApprove: PropTypes.func.isRequired,
    onReject: PropTypes.func.isRequired
};

export default EnrollmentRequestsTable;
