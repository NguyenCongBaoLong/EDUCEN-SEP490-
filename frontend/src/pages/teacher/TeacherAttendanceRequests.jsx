import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, ClipboardCheck } from 'lucide-react';
import TeacherSidebar from '../../components/TeacherSidebar';
import api from '../../services/api';
import toast from 'react-hot-toast';
import '../../css/pages/teacher/TeacherAttendanceRequests.css';

const TeacherAttendanceRequests = ({ isTA = false }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, Pending, Approved, Rejected

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        setLoading(true);
        try {
            const res = await api.get('/attendance/modification-requests/my');
            setRequests(res.data || []);
        } catch (error) {
            console.error('Error loading attendance requests:', error);
            toast.error('Không thể tải yêu cầu sửa điểm danh');
        } finally {
            setLoading(false);
        }
    };

    const filteredRequests = requests.filter((req) => {
        if (filter === 'all') return true;
        return req.status === filter;
    });

    const getRequestStatusMeta = (status) => {
        switch (status) {
            case 'Pending':
                return { bg: '#fef3c7', color: '#92400e', label: 'Chờ duyệt', icon: Clock };
            case 'Approved':
                return { bg: '#d1fae5', color: '#065f46', label: 'Đã duyệt', icon: CheckCircle };
            case 'Rejected':
                return { bg: '#fee2e2', color: '#991b1b', label: 'Từ chối', icon: XCircle };
            default:
                return { bg: '#f3f4f6', color: '#6b7280', label: status, icon: ClipboardCheck };
        }
    };

    const getAttendanceStatusMeta = (status) => {
        switch ((status || '').toLowerCase()) {
            case 'present':
                return { label: 'Có mặt', className: 'present' };
            case 'absent':
                return { label: 'Vắng mặt', className: 'absent' };
            default:
                return { label: 'Chưa điểm danh', className: 'pending' };
        }
    };

    const pendingCount = requests.filter((r) => r.status === 'Pending').length;
    const approvedCount = requests.filter((r) => r.status === 'Approved').length;
    const rejectedCount = requests.filter((r) => r.status === 'Rejected').length;

    return (
        <div className="classes-management">
            <TeacherSidebar isTA={isTA} />

            <main className="classes-main">
                <div className="classes-header">
                    <div className="classes-header-top">
                        <div>
                            <h1>Yêu cầu sửa điểm danh</h1>
                            <p className="classes-subtitle">Theo dõi trạng thái yêu cầu sửa điểm danh của bạn</p>
                        </div>
                    </div>

                    <div className="cm-tabs">
                        <button className={`cm-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
                            <ClipboardCheck size={17} />
                            Tất cả
                            <span className="cm-tab-badge">{requests.length}</span>
                        </button>
                        <button className={`cm-tab ${filter === 'Pending' ? 'active' : ''}`} onClick={() => setFilter('Pending')}>
                            <Clock size={17} />
                            Chờ duyệt
                            <span className="cm-tab-badge" style={{ background: '#f59e0b', color: 'white' }}>{pendingCount}</span>
                        </button>
                        <button className={`cm-tab ${filter === 'Approved' ? 'active' : ''}`} onClick={() => setFilter('Approved')}>
                            <CheckCircle size={17} />
                            Đã duyệt
                            <span className="cm-tab-badge" style={{ background: '#10b981', color: 'white' }}>{approvedCount}</span>
                        </button>
                        <button className={`cm-tab ${filter === 'Rejected' ? 'active' : ''}`} onClick={() => setFilter('Rejected')}>
                            <XCircle size={17} />
                            Từ chối
                            <span className="cm-tab-badge" style={{ background: '#ef4444', color: 'white' }}>{rejectedCount}</span>
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="classes-empty">
                        <p>Đang tải yêu cầu...</p>
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <div className="classes-empty tar-empty">
                        <ClipboardCheck size={48} color="#9ca3af" style={{ marginBottom: '16px' }} />
                        <p style={{ color: '#6b7280' }}>
                            {filter === 'all'
                                ? 'Bạn chưa gửi yêu cầu sửa điểm danh nào'
                                : `Không có yêu cầu nào ở trạng thái "${filter === 'Pending' ? 'Chờ duyệt' : filter === 'Approved' ? 'Đã duyệt' : 'Từ chối'}"`}
                        </p>
                    </div>
                ) : (
                    <div className="tar-list-wrap">
                        {filteredRequests.map((req) => {
                            const requestStatus = getRequestStatusMeta(req.status);
                            const currentStatus = getAttendanceStatusMeta(req.currentStatus || req.originalStatus);
                            const requestedStatus = getAttendanceStatusMeta(req.requestedStatus);
                            const StatusIcon = requestStatus.icon;

                            return (
                                <article key={req.requestId} className="tar-card">
                                    <div className="tar-card-left">
                                        <div className="tar-card-icon" style={{ background: requestStatus.bg, color: requestStatus.color }}>
                                            <StatusIcon size={18} />
                                        </div>
                                        <div className="tar-content">
                                            <h3 className="tar-student">{req.studentName}</h3>
                                            <div className="tar-meta">{req.className} • Ngày {req.sessionDate}</div>

                                            <div className="tar-status-flow">
                                                <span className="tar-flow-label">Ban đầu:</span>
                                                <span className={`tar-attendance-badge ${currentStatus.className}`}>{currentStatus.label}</span>
                                                <span className="tar-flow-arrow">→</span>
                                                <span className="tar-flow-label">Yêu cầu sửa:</span>
                                                <span className={`tar-attendance-badge ${requestedStatus.className}`}>{requestedStatus.label}</span>
                                            </div>

                                            {req.reason && <div className="tar-reason">Lý do: {req.reason}</div>}
                                        </div>
                                    </div>

                                    <div className="tar-card-right">
                                        <span className="tar-request-badge" style={{ background: requestStatus.bg, color: requestStatus.color }}>
                                            {requestStatus.label}
                                        </span>
                                        <div className="tar-time">{req.requestedAt}</div>
                                        {req.status === 'Rejected' && req.reviewNote && (
                                            <div className="tar-reject-note">Lý do từ chối: {req.reviewNote}</div>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};

export default TeacherAttendanceRequests;
