import { useState, useEffect, useMemo } from 'react';
import {
    Users, GraduationCap, UserCheck, Bell, Send, Clock,
    CheckCircle, XCircle, AlertCircle, Info, ChevronRight, BookOpen,
    TrendingUp, MessageSquare, Inbox, ShieldAlert,
    MessageCircle, Mail, HardDrive, Reply, ClipboardCheck
} from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import RevenueReport from './RevenueReport';
import SubscriptionPlans from './SubscriptionPlans';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import api from '../../services/api';
import EnrollmentRequestsTable from '../../components/EnrollmentRequestsTable';
import EnrollmentDetailModal from '../../components/EnrollmentDetailModal';
import RejectEnrollmentModal from '../../components/RejectEnrollmentModal';
import { useAuth } from '../../context/AuthContext';
import { CreditCard, DollarSign as DollarIcon, LayoutDashboard, FileText, Wallet } from 'lucide-react';
import zaloOAService from '../../services/zaloOAService';
import notificationService from '../../services/notificationService';
import creditService from '../../services/creditService';
import NotificationMailbox from '../../components/NotificationMailbox';
import toast from 'react-hot-toast';
import '../../css/pages/center/AdminDashboard.css';



/* ─── Helpers ────────────────────────────────────────── */
function formatDateTime(iso) {
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="chart-tooltip">
                <p className="chart-tooltip-label">{label}</p>
                <p className="chart-tooltip-value">{payload[0].value} học sinh</p>
            </div>
        );
    }
    return null;
};

const normalizeNotifications = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== 'object') return [];
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.notifications)) return payload.notifications;
    if (Array.isArray(payload.items)) return payload.items;
    return [];
};

/* ─── Main Component ─────────────────────────────────── */
const AdminDashboard = () => {
    const { user, centerBranding } = useAuth();
    const [dashboardData, setDashboardData] = useState({
        overview: {
            totalStudents: 0,
            newStudentsThisMonth: 0,
            totalClasses: 0,
            upcomingClasses: 0,
            totalStaff: 0,
            activeStaff: 0,
            currentUsers: 0,
            maxUsers: 0,
            currentStorageMB: 0,
            maxStorageMB: 0
        },
        studentRegistrationChart: [],
        studentsBySubject: [],
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [notifications, setNotifications] = useState([]);
    const [form, setForm] = useState({ title: '', content: '', target: 'all' });
    const [sending, setSending] = useState(false);
    const [sendSuccess, setSendSuccess] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [oaStatus, setOaStatus] = useState(null);
    const [classes, setClasses] = useState([]);
    const [sendError, setSendError] = useState('');

    // Inbox state
    const [supportRequests, setSupportRequests] = useState([]);
    const [systemNotifications, setSystemNotifications] = useState([]);
    const [inboxOpen, setInboxOpen] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [replying, setReplying] = useState(false);

    // Credit state
    const [creditBalance, setCreditBalance] = useState(null);
    const [creditLoading, setCreditLoading] = useState(false);
    const [creditLedger, setCreditLedger] = useState([]);
    const [ledgerLoading, setLedgerLoading] = useState(false);
    const [showLedger, setShowLedger] = useState(false);

    // Enrollment Request States
    const [requestsList, setRequestsList] = useState([]);
    const [viewingRequest, setViewingRequest] = useState(null);
    const [rejectingRequest, setRejectingRequest] = useState(null);
    const [requestStatusFilter, setRequestStatusFilter] = useState('');

    const tenantId = useMemo(() => {
        const isValidTenantId = (value) => (
            !!value && value !== 'undefined' && value !== 'null'
        );

        if (isValidTenantId(user?.tenantId)) return user.tenantId;

        const storedTenantId = localStorage.getItem('tenantId');
        if (isValidTenantId(storedTenantId)) return storedTenantId;

        return null;
    }, [user?.tenantId]);

    const inboxMessages = [
        // System notifications (Subscription expiration, etc.)
        ...systemNotifications.map(n => {
            const message = n.message || '';
            return {
                id: `notif-${n.notificationId}`,
                notificationId: n.notificationId,
                type: 'system',
                senderName: 'Hệ thống',
                senderRole: n.category === 'Subscription' ? 'Thông báo gói dịch vụ' : 'Thông báo',
                subject: n.title || 'Thông báo',
                preview: message.substring(0, 80) + (message.length > 80 ? '...' : ''),
                content: message,
                sentAt: n.createdAt,
                isRead: n.isRead,
                priority: n.type === 'Warning' ? 'high' : 'normal',
                category: n.category,
                referenceId: n.referenceId,
                canDelete: true,
            };
        }),
        // Support requests
        ...supportRequests.map(sr => {
            const content = sr.content || '';
            const isParent = sr.senderRoleName?.toLowerCase().includes('parent') || sr.senderRoleName?.toLowerCase().includes('phụ huynh');
            const msgType = isParent ? 'feedback' : 'support';
            const roleLabel = isParent ? 'Nhận xét / Đánh giá' : 'Yêu cầu hỗ trợ';

            return {
                id: `sr-${sr.id}`,
                srId: sr.id,
                type: msgType,
                senderName: sr.senderName || 'Người dùng',
                senderRole: sr.senderRoleName ? `${roleLabel} (${sr.senderRoleName})` : roleLabel,
                subject: sr.title || roleLabel,
                preview: content.substring(0, 80) + (content.length > 80 ? '...' : ''),
                content,
                sentAt: sr.createdAt,
                isRead: sr.isRead,
                priority: 'normal',
                adminResponse: sr.adminResponse,
                status: sr.status,
                receiverName: sr.receiverName,
                canDelete: false,
            };
        }),
    ].sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

    const unreadCount = inboxMessages.filter(m => !m.isRead).length;

    const fetchEnrollmentRequests = async () => {
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
        } catch (error) {
            console.error("Fetch enrollment requests error:", error);
        }
    };

    const pendingRequestsCount = requestsList.filter(r => r.status === 'pending').length;

    const fetchSupportRequests = async () => {
        try {
            const res = await api.get('/admin/support-requests');
            setSupportRequests(res.data);
        } catch (error) {
            console.error('Error fetching support requests:', error);
        }
    };

    const fetchSystemNotifications = async () => {
        if (!tenantId) return;
        try {
            const res = await notificationService.getNotifications(tenantId);
            setSystemNotifications(normalizeNotifications(res));
        } catch (error) {
            console.error('Error fetching system notifications:', error);
        }
    };

    useEffect(() => {
        fetchSupportRequests();
        fetchSystemNotifications();
        fetchEnrollmentRequests();
    }, [tenantId]);

    const handleMarkAsRead = async (msg) => {
        // Handle system notifications
        if (msg.type === 'system' && msg.notificationId && !msg.isRead) {
            try {
                await notificationService.markAsRead(msg.notificationId);
                setSystemNotifications(prev =>
                    prev.map(n => n.notificationId === msg.notificationId ? { ...n, isRead: true } : n)
                );
            } catch (error) {
                console.error('Error marking notification as read:', error);
            }
            return;
        }
        // Handle support requests
        if (msg.type !== 'feedback' || !msg.srId || msg.isRead) return;
        try {
            await api.put(`/admin/support-requests/${msg.srId}/read`);
            setSupportRequests(prev =>
                prev.map(sr => sr.id === msg.srId ? { ...sr, isRead: true } : sr)
            );
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const handleDeleteNotification = async (msg) => {
        if (!msg?.notificationId) return false;
        try {
            await notificationService.deleteNotification(msg.notificationId);
            setSystemNotifications(prev =>
                prev.filter(n => n.notificationId !== msg.notificationId)
            );
            return true;
        } catch (error) {
            console.error('Error deleting notification:', error);
            return false;
        }
    };

    const handleReply = async (msg) => {
        if (!replyText.trim() || !msg.srId) return;
        setReplying(true);
        try {
            await api.put(`/admin/support-requests/${msg.srId}/reply`, { AdminResponse: replyText });
            toast.success('Đã trả lời phản hồi!');
            setReplyText('');
            await fetchSupportRequests();
            // Refresh selected message
            const updated = supportRequests.find(sr => sr.id === msg.srId);
            if (updated) {
                setSelectedMessage(prev => prev ? { ...prev, adminResponse: replyText, status: 'Answered' } : null);
            }
        } catch (error) {
            console.error('Error replying:', error);
            toast.error(error.response?.data?.message || 'Gửi trả lời thất bại.');
        } finally {
            setReplying(false);
        }
    };

    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'revenue' | 'subscription' | 'attendance-modifications'

    // State for attendance modification requests
    const [attendanceRequests, setAttendanceRequests] = useState([]);
    const [attendanceRequestsLoading, setAttendanceRequestsLoading] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [processingRequest, setProcessingRequest] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await api.get('/CenterDashboard');
                // Cập nhật toàn bộ object vào state
                if (res.data) {
                    setDashboardData(res.data);
                }
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        const fetchZaloData = async () => {
            try {
                const [statusRes, historyRes, classesRes] = await Promise.allSettled([
                    zaloOAService.getStatus(),
                    zaloOAService.getMessageHistory(),
                    api.get('/Classes'),
                ]);

                if (statusRes.status === 'fulfilled') {
                    setOaStatus(statusRes.value.data);
                }
                if (historyRes.status === 'fulfilled') {
                    const historyData = historyRes.value.data || [];
                    setNotifications(historyData.map(h => ({
                        id: h.notificationId,
                        title: h.title,
                        content: h.message,
                        sentAt: h.createdAt,
                        recipients: 0,
                        status: 'sent',
                        target: 'all',
                    })));
                }
                if (classesRes.status === 'fulfilled') {
                    setClasses(classesRes.value.data || []);
                }
            } catch (error) {
                console.error('Error fetching Zalo OA data:', error);
            }
        };

        fetchData();
        fetchZaloData();
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Load credit data when subscription tab is active
    useEffect(() => {
        if (activeTab === 'subscription' && tenantId && !creditBalance) {
            const loadCredit = async () => {
                setCreditLoading(true);
                try {
                    const balanceData = await creditService.getCreditBalance(tenantId);
                    setCreditBalance(balanceData);
                } catch (error) {
                    console.error('Error loading credit balance:', error);
                } finally {
                    setCreditLoading(false);
                }
            };
            loadCredit();
        }
    }, [activeTab, tenantId]);

    // Load credit ledger when showLedger is toggled
    useEffect(() => {
        if (showLedger && tenantId && creditLedger.length === 0) {
            const loadLedger = async () => {
                setLedgerLoading(true);
                try {
                    const ledgerData = await creditService.getCreditLedger(tenantId, 1, 20);
                    setCreditLedger(ledgerData || []);
                } catch (error) {
                    console.error('Error loading credit ledger:', error);
                } finally {
                    setLedgerLoading(false);
                }
            };
            loadLedger();
        }
    }, [showLedger, tenantId]);

    // Load attendance modification requests when tab is active
    useEffect(() => {
        if (activeTab === 'attendance-modifications') {
            const loadAttendanceRequests = async () => {
                setAttendanceRequestsLoading(true);
                setSelectedRequest(null);
                try {
                    const res = await api.get('/attendance/modification-requests/pending');
                    console.log('Attendance requests response:', res.data);
                    
                    // Ensure data is an array
                    let data = res.data;
                    if (!Array.isArray(data)) {
                        data = data?.data || [];
                    }
                    
                    setAttendanceRequests(data);
                } catch (error) {
                    console.error('Error loading attendance requests:', error);
                    toast.error('Không thể tải yêu cầu sửa điểm danh');
                } finally {
                    setAttendanceRequestsLoading(false);
                }
            };
            loadAttendanceRequests();
        }
    }, [activeTab]);

    // Handle approve attendance modification request
    const handleApproveAttendanceRequest = async (requestId, newStatus) => {
        setProcessingRequest(true);
        try {
            await api.put(`/attendance/modification-requests/${requestId}/approve`, { newStatus });
            toast.success('Đã duyệt yêu cầu và cập nhật điểm danh');
            // Refresh list
            const res = await api.get('/attendance/modification-requests/pending');
            setAttendanceRequests(res.data || []);
            setSelectedRequest(null);
        } catch (error) {
            console.error('Error approving request:', error);
            toast.error(error.response?.data?.message || 'Lỗi khi duyệt yêu cầu');
        } finally {
            setProcessingRequest(false);
        }
    };

    // Handle reject attendance modification request
    const handleRejectAttendanceRequest = async (requestId, note) => {
        setProcessingRequest(true);
        try {
            await api.put(`/attendance/modification-requests/${requestId}/reject`, { reviewNote: note });
            toast.success('Đã từ chối yêu cầu');
            // Refresh list
            const res = await api.get('/attendance/modification-requests/pending');
            setAttendanceRequests(res.data || []);
            setSelectedRequest(null);
        } catch (error) {
            console.error('Error rejecting request:', error);
            toast.error(error.response?.data?.message || 'Lỗi khi từ chối yêu cầu');
        } finally {
            setProcessingRequest(false);
        }
    };

    const handleSend = async () => {
        if (!form.title.trim() || !form.content.trim()) return;
        setSending(true);
        setSendError('');
        try {
            const res = await zaloOAService.sendBatch(form.title, form.content, form.target);
            const result = res.data;

            const newNotif = {
                id: Date.now(),
                title: form.title,
                content: form.content,
                sentAt: new Date().toISOString(),
                recipients: result.sent,
                status: result.failed > 0 ? 'partial' : 'sent',
                target: form.target,
            };
            setNotifications([newNotif, ...notifications]);
            setForm({ title: '', content: '', target: 'all' });
            setSendSuccess(true);
            setTimeout(() => setSendSuccess(false), 3000);
        } catch (error) {
            const msg = error.response?.data?.message || 'Gửi thông báo thất bại.';
            setSendError(msg);
        } finally {
            setSending(false);
        }
    };

    const formattedDate = currentTime.toLocaleDateString('vi-VN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const { overview, studentRegistrationChart, studentsBySubject } = dashboardData;
    // Mapping dữ liệu cho KPI Cards (Dùng camelCase theo JSON trả về từ C#)
    const kpiData = [
        { label: 'Tổng học sinh', value: overview.totalStudents, icon: Users, color: 'blue', change: `+${overview.newStudentsThisMonth} tháng này` },
        { label: 'Lớp đang học', value: overview.totalClasses, icon: BookOpen, color: 'purple', change: 'Hoạt động' },
        { label: 'Sắp khai giảng', value: overview.upcomingClasses, icon: Bell, color: 'green', change: 'Đang tuyển sinh' },
        { label: 'Nhân viên', value: overview.totalStaff, icon: UserCheck, color: 'orange', change: `${overview.activeStaff} đang làm việc` },
    ];

    // Mapping dữ liệu cho Biểu đồ học sinh đăng ký (7 tháng gần đây)
    const enrollmentData = useMemo(() => {
        const dataMap = {};
        const now = new Date();
        // Khởi tạo 7 tháng gần nhất với 0 học sinh
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthLabel = `Tháng ${d.getMonth() + 1}`;
            dataMap[d.getMonth() + 1] = { month: monthLabel, students: 0, sortKey: d.getTime() };
        }

        // Đắp số liệu thật từ API vào
        if (studentRegistrationChart) {
            studentRegistrationChart.forEach(item => {
                if (dataMap[item.month]) {
                    dataMap[item.month].students = item.students;
                }
            });
        }

        return Object.values(dataMap).sort((a, b) => a.sortKey - b.sortKey).map(item => ({
            month: item.month,
            students: item.students
        }));
    }, [studentRegistrationChart]);

    // Mapping dữ liệu cho Biểu đồ tròn (Dữ liệu từ SubjectDistributionDto)
    const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
    const subjectData = studentsBySubject.map((item, index) => ({
        name: item.subject,
        value: item.percentage,
        count: item.totalStudents,
        color: COLORS[index % COLORS.length]
    }));

    const renderInboxDetailExtra = (message) => {
        if (!message) return null;
        return (
            <>
                {message.adminResponse && (
                    <div style={{
                        marginTop: '16px',
                        padding: '12px',
                        background: '#f0fdf4',
                        borderRadius: '8px',
                        border: '1px solid #bbf7d0'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#16a34a', fontWeight: 600, fontSize: '0.85rem' }}>
                            <CheckCircle size={14} /> Đã trả lời
                        </div>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e293b' }}>
                            {message.adminResponse}
                        </p>
                        {message.receiverName && (
                            <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                                Bởi: {message.receiverName}
                            </p>
                        )}
                    </div>
                )}

                {message.type === 'feedback' && !message.adminResponse && (
                    <div style={{
                        marginTop: '16px',
                        padding: '12px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontWeight: 600, fontSize: '0.85rem', color: '#475569' }}>
                            <Reply size={14} /> Trả lời
                        </div>
                        <textarea
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.9rem',
                                resize: 'vertical',
                                minHeight: '80px',
                                boxSizing: 'border-box',
                                outline: 'none',
                            }}
                            placeholder="Nhập phản hồi của bạn..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                        />
                        <button
                            style={{
                                marginTop: '8px',
                                padding: '8px 16px',
                                background: '#3b82f6',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                opacity: !replyText.trim() || replying ? 0.5 : 1,
                            }}
                            disabled={!replyText.trim() || replying}
                            onClick={() => handleReply(message)}
                        >
                            <Send size={14} />
                            {replying ? 'Đang gửi...' : 'Gửi trả lời'}
                        </button>
                    </div>
                )}
            </>
        );
    };

    // Enrollment Request Handlers
    const handleViewRequest = (request) => {
        setViewingRequest(request);
    };

    const handleApproveClick = async (requestData) => {
        try {
            const res = await api.put(`/enrollment-requests/${requestData.id}/approve`);
            if (res.status === 200 || res.status === 204) {
                setRequestsList(requestsList.map(r =>
                    r.id === requestData.id ? { ...r, status: 'approved' } : r
                ));
                toast.success('Đã duyệt yêu cầu và tạo tài khoản học sinh!');
            }
        } catch (error) {
            console.error('Approve error:', error);
            toast.error(error.response?.data?.message || 'Lỗi khi duyệt yêu cầu');
        }
    };

    const handleRejectRequest = (request) => {
        setRejectingRequest(request);
    };

    const handleConfirmReject = async (requestId) => {
        try {
            const res = await api.put(`/enrollment-requests/${requestId}/reject`);
            if (res.status === 200 || res.status === 204) {
                setRequestsList(requestsList.map(r =>
                    r.id === requestId ? { ...r, status: 'rejected' } : r
                ));
                toast.success('Đã từ chối yêu cầu');
            }
        } catch (error) {
            console.error('Reject error:', error);
            toast.error(error.response?.data?.message || 'Lỗi khi từ chối yêu cầu');
        }
        setRejectingRequest(null);
    };

    return (
        <div className="admin-dashboard">
            <Sidebar showNotifications={false} />
            <main className="dashboard-main">

                {/* ── Header ── */}
                <div className="dashboard-header">
                    <div>
                        <h1 className="dashboard-title">Tổng Quan</h1>
                        <p className="dashboard-date">{formattedDate}</p>
                    </div>
                    <div className="dashboard-header-actions">
                        {/* Hộp thư button */}
                        <button
                            className="inbox-trigger-btn"
                            onClick={() => { setInboxOpen(true); }}
                        >
                            <Inbox size={18} />
                            Hộp Thư
                            {unreadCount > 0 && (
                                <span className="inbox-trigger-badge">
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                        <div className="dashboard-center-badge">
                            <GraduationCap size={18} />
                            {centerBranding.name}
                        </div>
                    </div>
                </div>

                {/* ── Tabs Navigation ── */}
                <div className="dashboard-tabs">
                    <button
                        className={`dashboard-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        <LayoutDashboard size={18} />
                        Tổng quan
                    </button>
                    <button
                        className={`dashboard-tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
                        onClick={() => setActiveTab('requests')}
                    >
                        <FileText size={18} />
                        Yêu cầu đăng ký
                        {pendingRequestsCount > 0 && <span className="inbox-trigger-badge" style={{ position: 'relative', top: '0', right: '-4px', marginLeft: '4px' }}>{pendingRequestsCount}</span>}
                    </button>
                    <button
                        className={`dashboard-tab-btn ${activeTab === 'revenue' ? 'active' : ''}`}
                        onClick={() => setActiveTab('revenue')}
                    >
                        <DollarIcon size={18} />
                        Doanh thu
                    </button>
                    <button
                        className={`dashboard-tab-btn ${activeTab === 'subscription' ? 'active' : ''}`}
                        onClick={() => setActiveTab('subscription')}
                    >
                        <CreditCard size={18} />
                        Gói dịch vụ
                    </button>
                    <button
                        className={`dashboard-tab-btn ${activeTab === 'attendance-modifications' ? 'active' : ''}`}
                        onClick={() => setActiveTab('attendance-modifications')}
                    >
                        <ClipboardCheck size={18} />
                        Sửa điểm danh
                    </button>
                </div>

                {activeTab === 'overview' && (
                    <>
                        {/* ── KPI Cards ── */}
                        <div className="kpi-grid">
                            {kpiData.map((kpi) => {
                                const Icon = kpi.icon;
                                return (
                                    <div key={kpi.label} className={`kpi-card kpi-${kpi.color}`}>
                                        <div className="kpi-icon-wrap">
                                            <Icon size={22} />
                                        </div>
                                        <div className="kpi-info">
                                            <div className="kpi-value">{kpi.value}</div>
                                            <div className="kpi-label">{kpi.label}</div>
                                            <div className="kpi-change">{kpi.change}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* ── Resource Usage ── */}
                        <div className="kpi-grid" style={{ marginTop: '1rem' }}>
                            {/* Users Usage */}
                            <div className="kpi-card kpi-blue" style={{ flex: 1 }}>
                                <div className="kpi-icon-wrap"><Users size={22} /></div>
                                <div className="kpi-info" style={{ flex: 1 }}>
                                    <div className="kpi-value">{loading ? '...' : `${overview.currentUsers || 0} / ${overview.maxUsers || 0}`}</div>
                                    <div className="kpi-label">Người Dùng</div>
                                    <div style={{
                                        marginTop: '8px', height: '8px', borderRadius: '4px',
                                        background: '#e5e7eb', overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            height: '100%', borderRadius: '4px', transition: 'width 0.5s',
                                            width: `${loading ? 0 : Math.min(((overview.currentUsers || 0) / (overview.maxUsers || 1)) * 100, 100)}%`,
                                            background: ((overview.currentUsers || 0) / (overview.maxUsers || 1)) > 0.9 ? '#ef4444' :
                                                ((overview.currentUsers || 0) / (overview.maxUsers || 1)) > 0.7 ? '#f59e0b' : '#3b82f6'
                                        }} />
                                    </div>
                                </div>
                            </div>

                            {/* Storage Usage */}
                            <div className="kpi-card storage-card">
                                <div className="storage-icon-container">
                                    <HardDrive size={24} />
                                </div>
                                <div className="storage-content">
                                    <div className="storage-value">
                                        <span className="storage-number">
                                            {loading ? '...' : (
                                                <>
                                                    {overview.currentStorageMB < 1024 
                                                        ? `${parseFloat((overview.currentStorageMB || 0).toFixed(1))} MB` 
                                                        : `${parseFloat(((overview.currentStorageMB || 0) / 1024).toFixed(1))} GB`
                                                    }
                                                    <span style={{ fontSize: '0.9rem', color: '#9ca3af', fontWeight: 500, margin: '0 8px' }}>/</span>
                                                    {`${((overview.maxStorageMB || 0) / 1024).toFixed(0)} GB`}
                                                </>
                                            )}
                                        </span>
                                    </div>
                                    <div className="storage-label">Dung Lượng</div>
                                    <div className="storage-progress-container">
                                        <div 
                                            className="storage-progress-bar" 
                                            style={{ 
                                                width: `${loading ? 0 : Math.min(((overview.currentStorageMB || 0) / (overview.maxStorageMB || 1)) * 100, 100)}%`,
                                                background: ((overview.currentStorageMB || 0) / (overview.maxStorageMB || 1)) > 0.9 ? '#ef4444' :
                                                           ((overview.currentStorageMB || 0) / (overview.maxStorageMB || 1)) > 0.7 ? '#f59e0b' : '#8b5cf6'
                                            }} 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Content Grid ── */}
                        <div className="dashboard-content-grid">

                            {/* Left column – Charts */}
                            <div className="dashboard-charts-col">

                                {/* Line Chart */}
                                <div className="chart-card">
                                    <div className="chart-card-header">
                                        <h2 className="chart-card-title">
                                            <TrendingUp size={18} />
                                            Học Sinh Đăng Ký Theo Tháng
                                        </h2>
                                        <span className="chart-card-badge">7 tháng gần đây</span>
                                    </div>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <LineChart data={enrollmentData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                            <XAxis dataKey="month" tick={{ fontSize: 13, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                            <YAxis allowDecimals={false} tick={{ fontSize: 13, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Line
                                                type="monotone"
                                                dataKey="students"
                                                name="Học sinh mới"
                                                stroke="#3b82f6"
                                                strokeWidth={2.5}
                                                dot={{ fill: '#3b82f6', r: 4 }}
                                                activeDot={{ r: 6 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Pie Chart */}
                                <div className="chart-card">
                                    <div className="chart-card-header">
                                        <h2 className="chart-card-title">
                                            <BookOpen size={18} />
                                            Phân Bố Học Sinh Theo Môn
                                        </h2>
                                    </div>
                                    <div className="pie-chart-wrap">
                                        <ResponsiveContainer width="55%" height={200}>
                                            <PieChart>
                                                <Pie
                                                    data={subjectData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={85}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                >
                                                    {subjectData.map((entry) => (
                                                        <Cell key={entry.name} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(v) => `${v}%`} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="pie-legend">
                                            {subjectData.map((item) => (
                                                <div key={item.name} className="pie-legend-item">
                                                    <span className="pie-legend-dot" style={{ background: item.color }} />
                                                    <span className="pie-legend-name">{item.name}</span>
                                                    <span className="pie-legend-pct">{item.value}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right column – Zalo OA */}
                            <div className="zalo-col">
                                <div className="zalo-card">
                                    {/* Header */}
                                    <div className="zalo-card-header">
                                        <div className="zalo-title-row">
                                            <div className="zalo-icon">
                                                <MessageSquare size={18} />
                                            </div>
                                            <h2 className="zalo-title">Gửi Thông Báo</h2>
                                        </div>
                                        <span className="zalo-oa-badge">Zalo OA</span>
                                    </div>

                                    {/* Form */}
                                    <div className="zalo-form">
                                        {oaStatus && !oaStatus.isConfigured && (
                                            <div className="zalo-error-banner">
                                                <AlertCircle size={16} />
                                                Zalo OA chưa được cấu hình. Vui lòng liên hệ quản trị hệ thống.
                                            </div>
                                        )}
                                        {oaStatus && oaStatus.isConfigured && !oaStatus.isActive && (
                                            <div className="zalo-error-banner">
                                                <AlertCircle size={16} />
                                                Zalo OA chưa được kích hoạt. Vui lòng kiểm tra kết nối.
                                            </div>
                                        )}
                                        {oaStatus && oaStatus.isActive && (
                                            <div className="zalo-status-info">
                                                <CheckCircle size={14} />
                                                <span>{oaStatus.followerCount} người theo dõi</span>
                                            </div>
                                        )}
                                        <div className="zalo-field">
                                            <label className="zalo-label">Tiêu đề</label>
                                            <input
                                                className="zalo-input"
                                                type="text"
                                                placeholder="Nhập tiêu đề thông báo..."
                                                value={form.title}
                                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                            />
                                        </div>
                                        <div className="zalo-field">
                                            <label className="zalo-label">Đối tượng nhận</label>
                                            <select
                                                className="zalo-select"
                                                value={form.target}
                                                onChange={(e) => setForm({ ...form, target: e.target.value })}
                                            >
                                                <option value="all">Tất cả học sinh &amp; phụ huynh</option>
                                                {classes.map((c) => (
                                                    <option key={c.classId || c.ClassId} value={c.className || c.ClassName}>
                                                        {c.className || c.ClassName}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="zalo-field">
                                            <label className="zalo-label">Nội dung</label>
                                            <textarea
                                                className="zalo-textarea"
                                                placeholder="Nhập nội dung thông báo..."
                                                rows={4}
                                                value={form.content}
                                                onChange={(e) => setForm({ ...form, content: e.target.value })}
                                            />
                                        </div>

                                        {sendSuccess && (
                                            <div className="zalo-success-banner">
                                                <CheckCircle size={16} />
                                                Thông báo đã được gửi thành công!
                                            </div>
                                        )}

                                        {sendError && (
                                            <div className="zalo-error-banner">
                                                <AlertCircle size={16} />
                                                {sendError}
                                            </div>
                                        )}

                                        <button
                                            className="zalo-send-btn"
                                            onClick={handleSend}
                                            disabled={sending || !form.title.trim() || !form.content.trim() || !oaStatus?.isActive}
                                        >
                                            {sending ? (
                                                <span className="zalo-sending-dot" />
                                            ) : (
                                                <Send size={16} />
                                            )}
                                            {sending ? 'Đang gửi...' : 'Gửi qua Zalo OA'}
                                        </button>
                                    </div>

                                    {/* History */}
                                    <div className="zalo-history">
                                        <h3 className="zalo-history-title">Lịch Sử Đã Gửi</h3>
                                        <div className="zalo-history-list">
                                            {notifications.map((n) => (
                                                <div key={n.id} className="zalo-history-item">
                                                    <div className="zalo-history-item-header">
                                                        <span className="zalo-history-title-text">{n.title}</span>
                                                        <span className="zalo-status-badge sent">
                                                            <CheckCircle size={11} /> Đã gửi
                                                        </span>
                                                    </div>
                                                    <div className="zalo-history-meta">
                                                        <span className="zalo-meta-time">
                                                            <Clock size={12} />
                                                            {formatDateTime(n.sentAt)}
                                                        </span>
                                                        <span className="zalo-meta-recipients">
                                                            <Users size={12} />
                                                            {n.recipients} người
                                                        </span>
                                                        {n.target !== 'all' && (
                                                            <span className="zalo-meta-target">{n.target}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'requests' && (
                    <div className="dashboard-requests-container">
                        <EnrollmentRequestsTable
                            requestsData={requestsList}
                            statusFilter={requestStatusFilter}
                            setStatusFilter={setRequestStatusFilter}
                            onView={handleViewRequest}
                            onApprove={handleApproveClick}
                            onReject={handleRejectRequest}
                        />
                    </div>
                )}

                {activeTab === 'revenue' && <RevenueReport hideSidebar={true} />}

                {activeTab === 'subscription' && (
                    <SubscriptionPlans hideSidebar={true} />
                )}

                {activeTab === 'attendance-modifications' && (
                    <div style={{ padding: '20px' }}>
                        <div style={{ marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>Yêu cầu sửa điểm danh</h2>
                            <p style={{ color: '#6b7280', fontSize: '14px' }}>Danh sách yêu cầu sửa điểm danh từ Giáo viên chờ duyệt</p>
                        </div>

                        {attendanceRequestsLoading ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Đang tải...</div>
                        ) : attendanceRequests.length === 0 ? (
                            <div style={{ 
                                textAlign: 'center', 
                                padding: '60px', 
                                background: '#f9fafb', 
                                borderRadius: '12px',
                                border: '1px dashed #d1d5db'
                            }}>
                                <ClipboardCheck size={48} color="#9ca3af" style={{ marginBottom: '16px' }} />
                                <h3 style={{ fontSize: '16px', color: '#374151', marginBottom: '8px' }}>Không có yêu cầu nào</h3>
                                <p style={{ color: '#6b7280', fontSize: '14px' }}>Tất cả yêu cầu sửa điểm danh đã được xử lý</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: '20px' }}>
                                {/* Request List */}
                                <div style={{ flex: 1, background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                                    <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                                        <span style={{ fontWeight: '600' }}>Danh sách yêu cầu ({attendanceRequests.length})</span>
                                    </div>
                                    <div style={{ maxHeight: '600px', overflow: 'auto' }}>
                                        {attendanceRequests.map((req) => (
                                            <div 
                                                key={req?.requestId}
                                                onClick={() => setSelectedRequest(req)}
                                                style={{
                                                    padding: '16px',
                                                    borderBottom: '1px solid #e5e7eb',
                                                    cursor: 'pointer',
                                                    background: selectedRequest?.requestId === req?.requestId ? '#eff6ff' : 'white',
                                                    transition: 'background 0.2s'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                    <div>
                                                        <div style={{ fontWeight: '500', fontSize: '14px' }}>{req?.studentName || 'Không xác định'}</div>
                                                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{req?.className || 'Không xác định'}</div>
                                                    </div>
                                                    <span style={{
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '12px',
                                                        background: '#fef3c7',
                                                        color: '#92400e'
                                                    }}>
                                                        Chờ duyệt
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                                    Ngày: {req?.sessionDate || 'N/A'} | Yêu cầu: <strong>{req?.requestedStatus === 'present' ? 'Có mặt' : 'Vắng'}</strong>
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                                    Từ: {req?.requestedByUserName || 'N/A'} | {req?.requestedAt || ''}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Request Detail */}
                                <div style={{ flex: 1, background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px' }}>
                                    {selectedRequest && selectedRequest.requestId ? (
                                        <>
                                            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px' }}>Chi tiết yêu cầu</h3>
                                            
                                            <div style={{ marginBottom: '16px' }}>
                                                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Học sinh</div>
                                                <div style={{ fontSize: '14px', fontWeight: '500' }}>{selectedRequest?.studentName || 'Không xác định'}</div>
                                            </div>
                                            
                                            <div style={{ marginBottom: '16px' }}>
                                                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Lớp</div>
                                                <div style={{ fontSize: '14px' }}>{selectedRequest?.className || 'Không xác định'}</div>
                                            </div>
                                            
                                            <div style={{ marginBottom: '16px' }}>
                                                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Ngày học</div>
                                                <div style={{ fontSize: '14px' }}>{selectedRequest?.sessionDate || 'Không xác định'}</div>
                                            </div>
                                            
                                            <div style={{ marginBottom: '16px' }}>
                                                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Trạng thái hiện tại</div>
                                                <div style={{ fontSize: '14px' }}>
                                                    <span style={{
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '12px',
                                                        background: selectedRequest?.currentStatus === 'present' ? '#d1fae5' : selectedRequest?.currentStatus === 'absent' ? '#fee2e2' : '#f3f4f6',
                                                        color: selectedRequest?.currentStatus === 'present' ? '#065f46' : selectedRequest?.currentStatus === 'absent' ? '#991b1b' : '#6b7280'
                                                    }}>
                                                        {selectedRequest?.currentStatus === 'present' ? 'Có mặt' : selectedRequest?.currentStatus === 'absent' ? 'Vắng' : 'Chưa điểm danh'}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div style={{ marginBottom: '16px' }}>
                                                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Yêu cầu sửa thành</div>
                                                <div style={{ fontSize: '14px' }}>
                                                    <span style={{
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '12px',
                                                        background: selectedRequest?.requestedStatus === 'present' ? '#d1fae5' : '#fee2e2',
                                                        color: selectedRequest?.requestedStatus === 'present' ? '#065f46' : '#991b1b'
                                                    }}>
                                                        {selectedRequest?.requestedStatus === 'present' ? 'Có mặt' : 'Vắng'}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div style={{ marginBottom: '16px' }}>
                                                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Lý do</div>
                                                <div style={{ fontSize: '14px', background: '#f9fafb', padding: '12px', borderRadius: '6px' }}>
                                                    {selectedRequest?.reason || 'Không có'}
                                                </div>
                                            </div>
                                            
                                            <div style={{ marginBottom: '20px' }}>
                                                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Người gửi yêu cầu</div>
                                                <div style={{ fontSize: '14px' }}>{selectedRequest?.requestedByUserName || 'Không xác định'} - {selectedRequest?.requestedAt || ''}</div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
                                                <button 
                                                    onClick={() => selectedRequest && handleApproveAttendanceRequest(selectedRequest.requestId, 'present')}
                                                    disabled={processingRequest || !selectedRequest}
                                                    style={{
                                                        flex: 1,
                                                        padding: '12px',
                                                        background: '#10b981',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        fontWeight: '500',
                                                        cursor: processingRequest || !selectedRequest ? 'not-allowed' : 'pointer',
                                                        opacity: processingRequest || !selectedRequest ? 0.7 : 1
                                                    }}
                                                >
                                                    <CheckCircle size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                                                    Duyệt (Có mặt)
                                                </button>
                                                <button 
                                                    onClick={() => selectedRequest && handleApproveAttendanceRequest(selectedRequest.requestId, 'absent')}
                                                    disabled={processingRequest || !selectedRequest}
                                                    style={{
                                                        flex: 1,
                                                        padding: '12px',
                                                        background: '#ef4444',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        fontWeight: '500',
                                                        cursor: processingRequest || !selectedRequest ? 'not-allowed' : 'pointer',
                                                        opacity: processingRequest || !selectedRequest ? 0.7 : 1
                                                    }}
                                                >
                                                    <XCircle size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                                                    Duyệt (Vắng)
                                                </button>
                                                <button 
                                                    onClick={() => selectedRequest && handleRejectAttendanceRequest(selectedRequest.requestId, 'Yêu cầu không hợp lệ')}
                                                    disabled={processingRequest || !selectedRequest}
                                                    style={{
                                                        flex: 1,
                                                        padding: '12px',
                                                        background: 'white',
                                                        color: '#6b7280',
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '8px',
                                                        fontWeight: '500',
                                                        cursor: processingRequest || !selectedRequest ? 'not-allowed' : 'pointer',
                                                        opacity: processingRequest || !selectedRequest ? 0.7 : 1
                                                    }}
                                                >
                                                    Từ chối
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                                            <ClipboardCheck size={48} style={{ marginBottom: '12px' }} />
                                            <div>Chọn một yêu cầu để xem chi tiết</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </main>

            <NotificationMailbox
                variant="drawer"
                open={inboxOpen}
                showOverlay={inboxOpen}
                onOverlayClick={() => { setInboxOpen(false); setSelectedMessage(null); setReplyText(''); }}
                onClose={() => { setInboxOpen(false); setSelectedMessage(null); setReplyText(''); }}
                messages={inboxMessages}
                selectedMessage={selectedMessage}
                onSelectedMessageChange={(msg) => { setSelectedMessage(msg); if (!msg) setReplyText(''); }}
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDeleteNotification}
                renderDetailExtra={renderInboxDetailExtra}
            />

            {/* Enrollment Request Modals */}
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

export default AdminDashboard;
