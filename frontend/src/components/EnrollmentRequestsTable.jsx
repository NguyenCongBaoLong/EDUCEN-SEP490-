import { useState, useMemo } from 'react';
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
    onReject,
    processingIds = new Set()
}) => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
    const [sortOrder, setSortOrder] = useState('newest');
    const [requestTypeTab, setRequestTypeTab] = useState('GuestRegistration');

    // Robust type checking
    const isExistingType = (type) => type === 'ExistingStudentEnrollment';
    // If not existing, we treat as GuestRegistration (default)
    const isGuestType = (type) => !isExistingType(type);

    // Calculate pending counts for tabs
    const counts = useMemo(() => {
        return {
            guestPending: requestsData.filter(r => isGuestType(r.requestType) && r.status === 'pending').length,
            existingPending: requestsData.filter(r => isExistingType(r.requestType) && r.status === 'pending').length
        };
    }, [requestsData]);

    // Filter Logic
    const filteredRequests = requestsData.filter(request => {
        if (requestTypeTab === 'GuestRegistration') {
            return isGuestType(request.requestType) && (!statusFilter || request.status === statusFilter);
        } else {
            return isExistingType(request.requestType) && (!statusFilter || request.status === statusFilter);
        }
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
        <div className="student-table-container balanced-mgmt-mode">
            {/* Sub Tabs */}
            <div className="sc-tabs" style={{ marginBottom: '1.25rem' }}>
                <button
                    className={`sc-tab ${requestTypeTab === 'GuestRegistration' ? 'active' : ''}`}
                    onClick={() => { setRequestTypeTab('GuestRegistration'); setCurrentPage(1); }}
                >
                    Đăng ký tài khoản mới
                    {counts.guestPending > 0 && <span className="tab-count-badge">{counts.guestPending}</span>}
                </button>
                <button
                    className={`sc-tab ${requestTypeTab === 'ExistingStudentEnrollment' ? 'active' : ''}`}
                    onClick={() => { setRequestTypeTab('ExistingStudentEnrollment'); setCurrentPage(1); }}
                >
                    Đăng ký lớp học
                    {counts.existingPending > 0 && <span className="tab-count-badge">{counts.existingPending}</span>}
                </button>
            </div>

            {/* Filters Bar */}
            <div className="filters-bar" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
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
                </div>

                <div style={{ marginLeft: 'auto', fontSize: '0.9rem', color: '#6b7280' }}>
                    Tổng cộng: <strong>{filteredRequests.length}</strong> yêu cầu
                </div>
            </div>

            {/* Table */}
            <div className="table-wrapper">
                <table className="enrollment-requests-table">
                    <thead>
                        <tr>
                            <th>Học Sinh</th>
                            <th>Môn học / Lớp</th>
                            <th>Khối</th>
                            <th>Thông tin liên hệ</th>
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
                                        <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>{request.studentName}</div>
                                    </td>
                                    <td>
                                        <span style={{ fontWeight: 600, color: '#3b82f6' }}>{request.className || request.preferredCourse || '—'}</span>
                                    </td>
                                    <td>
                                        <span className="grade-badge">{request.gradeName || (request.gradeId ? `Khối ${request.gradeId}` : '—')}</span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>{request.phone || '—'}</span>
                                            <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{request.email}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ fontSize: '0.875rem' }}>
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
                                                disabled={processingIds.has(request.id)}
                                            >
                                                <Eye size={20} />
                                            </button>
                                            {request.status === 'pending' && (
                                                <>
                                                    <button
                                                        className={`action-btn approve${processingIds.has(request.id) ? ' processing' : ''}`}
                                                        title="Duyệt yêu cầu"
                                                        onClick={() => onApprove(request)}
                                                        disabled={processingIds.has(request.id)}
                                                    >
                                                        {processingIds.has(request.id) ? (
                                                            <div className="btn-spinner"></div>
                                                        ) : (
                                                            <Check size={20} />
                                                        )}
                                                    </button>
                                                    <button
                                                        className={`action-btn reject${processingIds.has(request.id) ? ' processing' : ''}`}
                                                        title="Từ chối yêu cầu"
                                                        onClick={() => onReject(request)}
                                                        disabled={processingIds.has(request.id)}
                                                    >
                                                        <X size={20} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" className="text-center py-12 text-gray-400">
                                    Không có yêu cầu nào phù hợp.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Balanced */}
            {totalPages > 1 && (
                <div className="pagination">
                    <span className="pagination-info">
                        Trang {currentPage} trên {totalPages}
                    </span>
                    <div className="pagination-controls">
                        <button
                            className={`pagination-btn${currentPage === 1 ? ' disabled' : ''}`}
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                        >
                            Trước
                        </button>
                        {[...Array(totalPages)].map((_, i) => (
                            <button
                                key={i + 1}
                                className={`pagination-btn ${currentPage === i + 1 ? 'active' : ''}`}
                                onClick={() => setCurrentPage(i + 1)}
                            >
                                {i + 1}
                            </button>
                        ))}
                        <button
                            className={`pagination-btn${currentPage === totalPages ? ' disabled' : ''}`}
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