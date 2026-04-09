import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, ClipboardCheck } from 'lucide-react';
import TeacherSidebar from '../../components/TeacherSidebar';
import api from '../../services/api';
import toast from 'react-hot-toast';

const TeacherAttendanceRequests = ({ isTA = false }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, pending, approved, rejected

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

    const filteredRequests = requests.filter(req => {
        if (filter === 'all') return true;
        return req.status === filter;
    });

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Pending':
                return { bg: '#fef3c7', color: '#92400e', label: 'Chờ duyệt' };
            case 'Approved':
                return { bg: '#d1fae5', color: '#065f46', label: 'Đã duyệt' };
            case 'Rejected':
                return { bg: '#fee2e2', color: '#991b1b', label: 'Từ chối' };
            default:
                return { bg: '#f3f4f6', color: '#6b7280', label: status };
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Pending':
                return <Clock size={16} />;
            case 'Approved':
                return <CheckCircle size={16} />;
            case 'Rejected':
                return <XCircle size={16} />;
            default:
                return <ClipboardCheck size={16} />;
        }
    };

    const pendingCount = requests.filter(r => r.status === 'Pending').length;
    const approvedCount = requests.filter(r => r.status === 'Approved').length;
    const rejectedCount = requests.filter(r => r.status === 'Rejected').length;

    return (
        <div className="classes-management">
            <TeacherSidebar isTA={isTA} />

            <main className="classes-main">
                {/* Header */}
                <div className="classes-header">
                    <div className="classes-header-top">
                        <div>
                            <h1>Yêu cầu sửa điểm danh</h1>
                            <p className="classes-subtitle">
                                Theo dõi trạng thái yêu cầu sửa điểm danh của bạn
                            </p>
                        </div>
                    </div>

                    <div className="cm-tabs">
                        <button 
                            className={`cm-tab ${filter === 'all' ? 'active' : ''}`}
                            onClick={() => setFilter('all')}
                        >
                            <ClipboardCheck size={17} />
                            Tất cả
                            <span className="cm-tab-badge">{requests.length}</span>
                        </button>
                        <button 
                            className={`cm-tab ${filter === 'Pending' ? 'active' : ''}`}
                            onClick={() => setFilter('Pending')}
                        >
                            <Clock size={17} />
                            Chờ duyệt
                            <span className="cm-tab-badge" style={{ background: '#f59e0b', color: 'white' }}>{pendingCount}</span>
                        </button>
                        <button 
                            className={`cm-tab ${filter === 'Approved' ? 'active' : ''}`}
                            onClick={() => setFilter('Approved')}
                        >
                            <CheckCircle size={17} />
                            Đã duyệt
                            <span className="cm-tab-badge" style={{ background: '#10b981', color: 'white' }}>{approvedCount}</span>
                        </button>
                        <button 
                            className={`cm-tab ${filter === 'Rejected' ? 'active' : ''}`}
                            onClick={() => setFilter('Rejected')}
                        >
                            <XCircle size={17} />
                            Từ chối
                            <span className="cm-tab-badge" style={{ background: '#ef4444', color: 'white' }}>{rejectedCount}</span>
                        </button>
                    </div>
                </div>

                {/* Requests List */}
                {loading ? (
                    <div className="classes-empty">
                        <p>Đang tải yêu cầu...</p>
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <div className="classes-empty" style={{ padding: '60px 20px' }}>
                        <ClipboardCheck size={48} color="#9ca3af" style={{ marginBottom: '16px' }} />
                        <p style={{ color: '#6b7280' }}>
                            {filter === 'all' 
                                ? 'Bạn chưa gửi yêu cầu sửa điểm danh nào' 
                                : `Không có yêu cầu nào ở trạng thái "${filter === 'Pending' ? 'Chờ duyệt' : filter === 'Approved' ? 'Đã duyệt' : 'Từ chối'}"`
                            }
                        </p>
                    </div>
                ) : (
                    <div style={{ padding: '0 20px' }}>
                        <div style={{ 
                            display: 'grid', 
                            gap: '12px',
                            maxWidth: '1000px'
                        }}>
                            {filteredRequests.map((req) => {
                                const statusInfo = getStatusBadge(req.status);
                                return (
                                    <div 
                                        key={req.requestId}
                                        style={{
                                            background: 'white',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '12px',
                                            padding: '16px 20px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <div style={{
                                                width: '44px',
                                                height: '44px',
                                                borderRadius: '10px',
                                                background: statusInfo.bg,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: statusInfo.color
                                            }}>
                                                {getStatusIcon(req.status)}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '500', fontSize: '15px', marginBottom: '4px' }}>
                                                    {req.studentName}
                                                </div>
                                                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                                                    {req.className} - Ngày {req.sessionDate}
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                                                    Yêu cầu: <strong style={{ color: req.requestedStatus === 'present' ? '#10b981' : '#ef4444' }}>
                                                        {req.requestedStatus === 'present' ? 'Có mặt' : 'Vắng mặt'}
                                                    </strong>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                background: statusInfo.bg,
                                                color: statusInfo.color,
                                                fontSize: '13px',
                                                fontWeight: '500',
                                                display: 'inline-block',
                                                marginBottom: '8px'
                                            }}>
                                                {statusInfo.label}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                                                {req.requestedAt}
                                            </div>
                                            {req.status === 'Rejected' && req.reviewNote && (
                                                <div style={{ 
                                                    fontSize: '12px', 
                                                    color: '#991b1b', 
                                                    marginTop: '8px',
                                                    padding: '8px',
                                                    background: '#fef2f2',
                                                    borderRadius: '6px'
                                                }}>
                                                    Lý do từ chối: {req.reviewNote}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default TeacherAttendanceRequests;