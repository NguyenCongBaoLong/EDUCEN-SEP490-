import { useState, useEffect, useMemo, useCallback } from 'react';
import Sidebar from '../../components/Sidebar';
import EnrollmentRequestsTable from '../../components/EnrollmentRequestsTable';
import EnrollmentDetailModal from '../../components/EnrollmentDetailModal';
import RejectEnrollmentModal from '../../components/RejectEnrollmentModal';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { UserPlus, AlertCircle } from 'lucide-react';
import '../../css/pages/center/EnrollmentManagement.css';

const EnrollmentManagement = () => {
    const [requestsList, setRequestsList] = useState([]);
    // Default to 'pending' as requested by user
    const [requestStatusFilter, setRequestStatusFilter] = useState('pending');
    const [viewingRequest, setViewingRequest] = useState(null);
    const [rejectingRequest, setRejectingRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processingIds, setProcessingIds] = useState(new Set());

    const fetchEnrollmentRequests = useCallback(async (reason = 'manual') => {
        setLoading(true);
        try {
            const res = await api.get('/enrollment-requests');
            const data = res.data.map(r => ({
                id: r.requestId?.toString() || '',
                studentName: `${r.firstName || ''} ${r.lastName || ''}`.trim(),
                firstName: r.firstName,
                lastName: r.lastName,
                email: r.email,
                phone: r.phone,
                address: r.address || '',
                preferredCourse: r.preferredCourse || '',
                gradeName: r.gradeName || '',
                gradeId: r.gradeId,
                classId: r.classId,
                className: r.className,
                requestType: r.requestType,
                requestDate: r.requestDate ? new Date(r.requestDate).toISOString().split('T')[0] : '',
                status: r.status?.toLowerCase() || 'pending',
                createdStudentId: r.createdStudentId,
                parentName: r.parentName || '',
                parentPhone: r.parentPhone || '',
                parentEmail: r.parentEmail || '',
                dateOfBirth: r.dateOfBirth,
                gender: r.gender,
                notes: r.message || r.notes || ''
            }));
            setRequestsList(data);
            console.debug('[EnrollmentManagement] refreshed requests', { reason, total: data.length });
        } catch (error) {
            console.error('Error fetching enrollment requests:', error);
            toast.error('Không thể tải danh sách yêu cầu đăng ký');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEnrollmentRequests('mount');

        const intervalId = window.setInterval(() => {
            fetchEnrollmentRequests('interval-30s');
        }, 30000);

        const handleFocus = () => fetchEnrollmentRequests('window-focus');
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                fetchEnrollmentRequests('tab-visible');
            }
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [fetchEnrollmentRequests]);

    const pendingCount = useMemo(() => {
        return requestsList.filter(r => r.status === 'pending').length;
    }, [requestsList]);

    const handleViewRequest = (req) => setViewingRequest(req);
    const handleRejectRequest = (req) => setRejectingRequest(req);

    const handleConfirmReject = async (requestId, reason) => {
        setProcessingIds(prev => new Set(prev).add(requestId));
        try {
            await api.put(`/enrollment-requests/${requestId}/reject`, { reason });
            toast.success('Đã từ chối yêu cầu đăng ký');
            setRejectingRequest(null);
            setRequestsList(prev => prev.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r));
            window.dispatchEvent(new Event('center-sidebar-badge-refresh'));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Từ chối thất bại');
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(requestId);
                return next;
            });
        }
    };

    const handleApproveClick = async (req) => {
        setProcessingIds(prev => new Set(prev).add(req.id));
        try {
            await api.put(`/enrollment-requests/${req.id}/approve`);
            toast.success('Đã duyệt yêu cầu đăng ký thành công');
            setRequestsList(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved' } : r));
            window.dispatchEvent(new Event('center-sidebar-badge-refresh'));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Duyệt thất bại');
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(req.id);
                return next;
            });
        }
    };

    return (
        <div className="admin-dashboard">
            <Sidebar />
            <main className="dashboard-main">
                <div className="enrollment-mgmt-container">
                    <header className="mgmt-header">
                        <div className="mgmt-title-area">
                            <div className="mgmt-title-row">
                                <h1 className="mgmt-page-title">Yêu cầu đăng ký</h1>
                                {pendingCount > 0 && (
                                    <span className="mgmt-badge">
                                        <AlertCircle size={14} />
                                        {pendingCount} chờ duyệt
                                    </span>
                                )}
                            </div>
                            <p className="mgmt-subtitle">
                                Quản lý và phê duyệt danh sách học viên mới đăng ký tham gia các khóa học tại trung tâm.
                            </p>
                        </div>
                    </header>

                    <div className="mgmt-content-card">
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>
                                <div className="loading-spinner"></div>
                                <p style={{ marginTop: '1rem' }}>Đang tải dữ liệu yêu cầu...</p>
                            </div>
                        ) : (
                            <EnrollmentRequestsTable
                                requestsData={requestsList}
                                statusFilter={requestStatusFilter}
                                setStatusFilter={setRequestStatusFilter}
                                onView={handleViewRequest}
                                onApprove={handleApproveClick}
                                onReject={handleRejectRequest}
                                processingIds={processingIds}
                            />
                        )}
                    </div>
                </div>
            </main>

            <EnrollmentDetailModal
                isOpen={!!viewingRequest}
                onClose={() => setViewingRequest(null)}
                request={viewingRequest}
            />

            <RejectEnrollmentModal
                isOpen={!!rejectingRequest}
                onClose={() => setRejectingRequest(null)}
                onConfirm={handleConfirmReject}
                request={rejectingRequest}
            />
        </div>
    );
};

export default EnrollmentManagement;