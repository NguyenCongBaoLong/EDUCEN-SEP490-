import { useState, useEffect, useCallback } from 'react';
import { ClipboardCheck, CheckCircle, AlertCircle } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import api from '../../services/api';
import toast from 'react-hot-toast';
import '../../css/pages/center/AttendanceModifications.css';

const AttendanceModifications = () => {
    const [attendanceRequests, setAttendanceRequests] = useState([]);
    const [processedAttendanceRequests, setProcessedAttendanceRequests] = useState([]);
    const [attendanceRequestsLoading, setAttendanceRequestsLoading] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [processingRequest, setProcessingRequest] = useState(false);

    const getAttendanceStatusMeta = (status) => {
        const normalized = (status || '').toLowerCase();
        if (normalized === 'present') return { label: 'Có mặt', className: 'present' };
        if (normalized === 'absent') return { label: 'Vắng mặt', className: 'absent' };
        return { label: 'Chưa điểm danh', className: 'pending' };
    };

    const loadAttendanceRequests = useCallback(async (reason = 'manual') => {
        setAttendanceRequestsLoading(true);
        try {
            const res = await api.get('/attendance/modification-requests');
            let data = res.data;
            if (!Array.isArray(data)) {
                data = data?.data || [];
            }
            const pending = data.filter((item) => (item?.status || '').toLowerCase() === 'pending');
            const processed = data.filter((item) => (item?.status || '').toLowerCase() !== 'pending');
            setAttendanceRequests(pending);
            setProcessedAttendanceRequests(processed);
            setSelectedRequest((prev) => {
                if (!prev?.requestId) return null;
                const updated = data.find((r) => r?.requestId === prev.requestId);
                return updated || null;
            });
            console.debug('[AttendanceModifications] refreshed requests', {
                reason,
                total: data.length,
                pending: pending.length,
                processed: processed.length
            });
        } catch (error) {
            console.error('Error loading attendance requests:', error);
            toast.error('Không thể tải yêu cầu sửa điểm danh');
        } finally {
            setAttendanceRequestsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAttendanceRequests('mount');

        const intervalId = window.setInterval(() => {
            loadAttendanceRequests('interval-30s');
        }, 30000);

        const handleFocus = () => loadAttendanceRequests('window-focus');
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                loadAttendanceRequests('tab-visible');
            }
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [loadAttendanceRequests]);

    const handleApproveAttendanceRequest = async (requestId, newStatus) => {
        setProcessingRequest(true);
        try {
            await api.put(`/attendance/modification-requests/${requestId}/approve`, { newStatus });
            toast.success('Đã duyệt yêu cầu và cập nhật điểm danh');
            loadAttendanceRequests('approve');
            window.dispatchEvent(new Event('center-sidebar-badge-refresh'));
        } catch (error) {
            console.error('Error approving request:', error);
            toast.error(error.response?.data?.message || 'Lỗi khi duyệt yêu cầu');
        } finally {
            setProcessingRequest(false);
        }
    };

    const handleRejectAttendanceRequest = async (requestId, note) => {
        setProcessingRequest(true);
        try {
            await api.put(`/attendance/modification-requests/${requestId}/reject`, { reviewNote: note });
            toast.success('Đã từ chối yêu cầu');
            loadAttendanceRequests('reject');
            window.dispatchEvent(new Event('center-sidebar-badge-refresh'));
        } catch (error) {
            console.error('Error rejecting request:', error);
            toast.error(error.response?.data?.message || 'Lỗi khi từ chối yêu cầu');
        } finally {
            setProcessingRequest(false);
        }
    };

    const getRequestedStatusDisplay = (status) => {
        const normalized = (status || '').toLowerCase();
        if (normalized === 'present') return 'CÓ MẶT';
        if (normalized === 'absent') return 'VẮNG MẶT';
        return 'CHƯA ĐIỂM DANH';
    };

    const pendingCount = attendanceRequests.length;
    const totalRequestCount = pendingCount + processedAttendanceRequests.length;

    return (
        <div className="admin-dashboard">
            <Sidebar />
            <main className="dashboard-main">
                <div className="attendance-mgmt-container">
                    <header className="mgmt-header">
                        <div className="mgmt-title-area">
                            <div className="mgmt-title-row">
                                <h1 className="mgmt-page-title">Sửa điểm danh</h1>
                                {pendingCount > 0 && (
                                    <span className="mgmt-badge">
                                        <AlertCircle size={14} />
                                        {pendingCount} chờ duyệt
                                    </span>
                                )}
                            </div>
                            <p className="mgmt-subtitle">
                                Phê duyệt các yêu cầu thay đổi điểm danh từ giáo viên.
                            </p>
                        </div>
                    </header>

                    <div className="adm-attendance-wrap">
                        {attendanceRequestsLoading ? (
                            <div className="adm-attendance-loading" style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>
                                <div className="loading-spinner"></div>
                                <p style={{ marginTop: '1rem' }}>Đang tải dữ liệu...</p>
                            </div>
                        ) : totalRequestCount === 0 ? (
                            <div className="adm-attendance-empty" style={{ textAlign: 'center', padding: '5rem', background: 'white', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <div style={{ background: '#f9fafb', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                    <ClipboardCheck size={40} color="#3b82f6" />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>Hoàn thành công việc!</h3>
                                <p style={{ color: '#6b7280' }}>Hiện tại không có yêu cầu sửa điểm danh nào cần xử lý.</p>
                            </div>
                        ) : (
                            <div className="adm-attendance-grid">
                                <section className="adm-attendance-list-panel">
                                    <div className="adm-attendance-list-head">
                                        <span>DANH SÁCH YÊU CẦU</span>
                                    </div>
                                    <div className="adm-attendance-sections">
                                        <div className="adm-attendance-section">
                                            <div className="adm-attendance-section-head">YÊU CẦU MỚI</div>
                                            <div className="adm-attendance-list">
                                                {attendanceRequests.map((req) => (
                                                    <div
                                                        key={req?.requestId}
                                                        onClick={() => setSelectedRequest(req)}
                                                        className={`adm-attendance-item ${selectedRequest?.requestId === req?.requestId ? 'active' : ''}`}
                                                    >
                                                        <div className="adm-attendance-item-top">
                                                            <div>
                                                                <div className="adm-attendance-student">{req?.studentName || 'Không xác định'}</div>
                                                                <div className="adm-attendance-class">{req?.className || 'Lớp: ' + (req?.classId || 'N/A')}</div>
                                                            </div>
                                                            <span className="adm-attendance-pending">Mới</span>
                                                        </div>
                                                        <div className="adm-attendance-meta">
                                                            <strong>Buổi:</strong> {req?.sessionDate || 'N/A'}
                                                        </div>
                                                        <div className="adm-attendance-meta" style={{ marginTop: '4px' }}>
                                                            <strong>Yêu cầu:</strong> <span style={{ color: req?.requestedStatus === 'present' ? '#059669' : '#dc2626' }}>{req?.requestedStatus === 'present' ? 'CÓ MẶT' : 'VẮNG'}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="adm-attendance-section">
                                            <div className="adm-attendance-section-head">ĐÃ XỬ LÝ</div>
                                            <div className="adm-attendance-list">
                                                {processedAttendanceRequests.map((req) => (
                                                    <div
                                                        key={req?.requestId}
                                                        onClick={() => setSelectedRequest(req)}
                                                        className={`adm-attendance-item ${selectedRequest?.requestId === req?.requestId ? 'active' : ''}`}
                                                    >
                                                        <div className="adm-attendance-item-top">
                                                            <div>
                                                                <div className="adm-attendance-student">{req?.studentName || 'Không xác định'}</div>
                                                                <div className="adm-attendance-class">{req?.className || 'Lớp: ' + (req?.classId || 'N/A')}</div>
                                                            </div>
                                                            <span className={req?.status === 'Approved' ? 'adm-attendance-processed-approved' : 'adm-attendance-processed-rejected'}>
                                                                {req?.status === 'Approved' ? 'Đã duyệt' : 'Đã từ chối'}
                                                            </span>
                                                        </div>
                                                        <div className="adm-attendance-meta">
                                                            <strong>Buổi:</strong> {req?.sessionDate || 'N/A'}
                                                        </div>
                                                        <div className="adm-attendance-meta" style={{ marginTop: '4px' }}>
                                                            <strong>Yêu cầu:</strong> <span style={{ color: req?.requestedStatus === 'present' ? '#059669' : '#dc2626' }}>{req?.requestedStatus === 'present' ? 'CÓ MẶT' : 'VẮNG'}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section className="adm-attendance-detail-panel">
                                    {selectedRequest && selectedRequest.requestId ? (
                                        <div className="compact-detail-content" style={{ animation: 'fade-in 0.3s ease-out', height: '100%', display: 'flex', flexDirection: 'column' }}>
                                            <div className="detail-header">
                                                <h3 className="adm-attendance-detail-title">
                                                    <AlertCircle size={20} color="#3b82f6" />
                                                    Chi Tiết Yêu Cầu
                                                </h3>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                                <div className="adm-attendance-field compact">
                                                    <div className="adm-attendance-field-label">Học sinh</div>
                                                    <div className="adm-attendance-field-value" style={{ fontSize: '0.85rem' }}>{selectedRequest?.studentName}</div>
                                                </div>
                                                <div className="adm-attendance-field compact">
                                                    <div className="adm-attendance-field-label">Lớp & Buổi</div>
                                                    <div className="adm-attendance-field-value" style={{ fontSize: '0.85rem' }}>
                                                        {selectedRequest?.className && selectedRequest.className.length > 20 ? selectedRequest.className.substring(0, 17) + '...' : selectedRequest?.className} &bull; {selectedRequest?.sessionDate}
                                                    </div>
                                                </div>
                                                <div className="adm-attendance-field compact">
                                                    <div className="adm-attendance-field-label">Người gửi & Lúc gửi</div>
                                                    <div className="adm-attendance-field-value" style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                                        {selectedRequest?.requestedByUserName} &bull; {selectedRequest?.requestedAt}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="adm-attendance-field-label">Thay đổi trạng thái</div>
                                            <div className="adm-attendance-flow compact">
                                                <div style={{ textAlign: 'center' }}>
                                                    <div className="adm-attendance-flow-label" style={{ marginBottom: '0.25rem' }}>Hiện tại</div>
                                                    <span className={`adm-attendance-status-badge ${getAttendanceStatusMeta(selectedRequest?.currentStatus || selectedRequest?.originalStatus).className}`}>
                                                        {getAttendanceStatusMeta(selectedRequest?.currentStatus || selectedRequest?.originalStatus).label}
                                                    </span>
                                                </div>
                                                <span className="adm-attendance-flow-arrow" style={{ fontSize: '1.25rem' }}>&rarr;</span>
                                                <div style={{ textAlign: 'center' }}>
                                                    <div className="adm-attendance-flow-label" style={{ marginBottom: '0.25rem' }}>Yêu cầu mới</div>
                                                    <span className={`adm-attendance-status-badge ${getAttendanceStatusMeta(selectedRequest?.requestedStatus).className}`} style={{ boxShadow: '0 0 10px rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6' }}>
                                                        {getAttendanceStatusMeta(selectedRequest?.requestedStatus).label}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="adm-attendance-field compact">
                                                <div className="adm-attendance-field-label">Lý do</div>
                                                <div className="adm-attendance-reason compact">{selectedRequest?.reason || 'Không có lý do.'}</div>
                                            </div>

                                            {!selectedRequest?.status || selectedRequest?.status === 'Pending' ? (
                                                <div className="adm-attendance-actions compact">
                                                    <button
                                                        onClick={() => handleApproveAttendanceRequest(selectedRequest.requestId, selectedRequest?.requestedStatus)}
                                                        disabled={processingRequest}
                                                        className="adm-attendance-btn approve"
                                                    >
                                                        <CheckCircle size={18} />
                                                        Duyệt ({getRequestedStatusDisplay(selectedRequest?.requestedStatus)})
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectAttendanceRequest(selectedRequest.requestId, 'Yêu cầu không được chấp nhận')}
                                                        disabled={processingRequest}
                                                        className="adm-attendance-btn deny"
                                                    >
                                                        Từ chối
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="adm-attendance-field compact" style={{ marginTop: '1rem' }}>
                                                    <div className="adm-attendance-field-label">Trạng thái xử lý</div>
                                                    <div className="adm-attendance-field-value">
                                                        {selectedRequest?.status === 'Approved' ? 'Đã duyệt' : 'Đã từ chối'}
                                                        {selectedRequest?.reviewedAt ? ` • ${selectedRequest.reviewedAt}` : ''}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="adm-attendance-empty-selection">
                                            <div style={{ background: '#eef2ff', width: '84px', height: '84px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                                                <ClipboardCheck size={36} color="#3b82f6" />
                                            </div>
                                            <h3 style={{ fontWeight: 700, color: '#334155' }}>Chưa chọn yêu cầu</h3>
                                            <p>Vui lòng chọn một yêu cầu từ danh sách bên trái để xem chi tiết và xử lý.</p>
                                        </div>
                                    )}
                                </section>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AttendanceModifications;
