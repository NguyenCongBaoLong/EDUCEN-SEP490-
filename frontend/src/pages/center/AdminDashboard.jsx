import { useState, useEffect } from 'react';
import {
    Users, GraduationCap, UserCheck, Bell, Send, Clock,
    CheckCircle, AlertCircle, Info, ChevronRight, BookOpen,
    TrendingUp, MessageSquare, X, Inbox, Star, ShieldAlert,
    MessageCircle, ArrowLeft, Mail, MailOpen, HardDrive, Reply
} from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import RevenueReport from './RevenueReport';
import SubscriptionPlans from './SubscriptionPlans';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { CreditCard, DollarSign as DollarIcon, LayoutDashboard, FileText } from 'lucide-react';
import zaloOAService from '../../services/zaloOAService';
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
    const [inboxOpen, setInboxOpen] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [replying, setReplying] = useState(false);

    const inboxMessages = [
        ...supportRequests.map(sr => ({
            id: `sr-${sr.id}`,
            srId: sr.id,
            type: 'feedback',
            senderName: sr.senderName || 'Người dùng',
            senderRole: 'Yêu cầu hỗ trợ',
            subject: sr.title,
            preview: sr.content?.substring(0, 80) + (sr.content?.length > 80 ? '...' : ''),
            content: sr.content,
            sentAt: sr.createdAt,
            isRead: sr.isRead,
            priority: 'normal',
            adminResponse: sr.adminResponse,
            status: sr.status,
            receiverName: sr.receiverName,
        })),
    ].sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

    const unreadCount = inboxMessages.filter(m => !m.isRead).length;

    const fetchSupportRequests = async () => {
        try {
            const res = await api.get('/admin/support-requests');
            setSupportRequests(res.data);
        } catch (error) {
            console.error('Error fetching support requests:', error);
        }
    };

    useEffect(() => {
        fetchSupportRequests();
    }, []);

    const handleMarkAsRead = async (msg) => {
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

    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'revenue' | 'subscription'

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

    // Mapping dữ liệu cho Biểu đồ đường (Dữ liệu từ StudentRegistrationDto)
    const enrollmentData = studentRegistrationChart.map(item => ({
        month: `Tháng ${item.month}`,
        students: item.students
    }));

    // Mapping dữ liệu cho Biểu đồ tròn (Dữ liệu từ SubjectDistributionDto)
    const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
    const subjectData = studentsBySubject.map((item, index) => ({
        name: item.subject,
        value: item.percentage,
        count: item.totalStudents,
        color: COLORS[index % COLORS.length]
    }));
    return (
        <div className="admin-dashboard">
            <Sidebar />
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
                            <div className="kpi-card kpi-purple" style={{ flex: 1 }}>
                                <div className="kpi-icon-wrap"><HardDrive size={22} /></div>
                                <div className="kpi-info" style={{ flex: 1 }}>
                                    <div className="kpi-value">{loading ? '...' : `${(overview.currentStorageMB || 0).toFixed(1)} / ${((overview.maxStorageMB || 0) / 1024).toFixed(0)} GB`}</div>
                                    <div className="kpi-label">Dung Lượng</div>
                                    <div style={{
                                        marginTop: '8px', height: '8px', borderRadius: '4px',
                                        background: '#e5e7eb', overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            height: '100%', borderRadius: '4px', transition: 'width 0.5s',
                                            width: `${loading ? 0 : Math.min(((overview.currentStorageMB || 0) / ((overview.maxStorageMB || 1))) * 100, 100)}%`,
                                            background: ((overview.currentStorageMB || 0) / (overview.maxStorageMB || 1)) > 0.9 ? '#ef4444' :
                                                ((overview.currentStorageMB || 0) / (overview.maxStorageMB || 1)) > 0.7 ? '#f59e0b' : '#8b5cf6'
                                        }} />
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
                                            <YAxis tick={{ fontSize: 13, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Line
                                                type="monotone"
                                                dataKey="students"
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

                {activeTab === 'revenue' && <RevenueReport hideSidebar={true} />}
                {activeTab === 'subscription' && <SubscriptionPlans hideSidebar={true} />}

            </main>

            {/* ── Inbox Drawer Overlay ── */}
            {inboxOpen && (
                <div
                    className="inbox-overlay"
                    onClick={() => { setInboxOpen(false); setSelectedMessage(null); setReplyText(''); }}
                />
            )}

            {/* ── Inbox Drawer ── */}
            <div className={`inbox-drawer ${inboxOpen ? 'open' : ''}`}>
                {/* Header */}
                <div className="inbox-drawer-header">
                    {selectedMessage ? (
                        <button className="inbox-back-btn" onClick={() => { setSelectedMessage(null); setReplyText(''); }}>
                            <ArrowLeft size={16} /> Tất cả thông báo
                        </button>
                    ) : (
                        <div className="inbox-drawer-title">
                            <Inbox size={18} />
                            <span>Hộp Thư</span>
                            {unreadCount > 0 && (
                                <span className="drawer-unread-badge">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                    )}
                    <button
                        className="inbox-drawer-close"
                        onClick={() => { setInboxOpen(false); setSelectedMessage(null); setReplyText(''); }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                {selectedMessage ? (
                    <div className="inbox-drawer-detail">
                        <div className="drawer-detail-sender-row">
                            <div className={`inbox-avatar ${selectedMessage.type}`}>
                                {selectedMessage.senderName.charAt(0)}
                            </div>
                            <div className="drawer-detail-sender-info">
                                <div className="drawer-detail-sender-name">{selectedMessage.senderName}</div>
                                <div className="drawer-detail-sender-role">{selectedMessage.senderRole}</div>
                            </div>
                            <div className="drawer-detail-time">
                                <Clock size={12} />
                                {formatDateTime(selectedMessage.sentAt)}
                            </div>
                        </div>
                        <h3 className="drawer-detail-subject">{selectedMessage.subject}</h3>
                        <div className="drawer-detail-body">
                            {selectedMessage.content.split('\n').map((line, i) => (
                                <p key={i}>{line || '\u00a0'}</p>
                            ))}
                        </div>

                        {/* Admin response (if already replied) */}
                        {selectedMessage.adminResponse && (
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
                                    {selectedMessage.adminResponse}
                                </p>
                                {selectedMessage.receiverName && (
                                    <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                                        Bởi: {selectedMessage.receiverName}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Reply input (only for feedback/support requests) */}
                        {selectedMessage.type === 'feedback' && !selectedMessage.adminResponse && (
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
                                    onClick={() => handleReply(selectedMessage)}
                                >
                                    <Send size={14} />
                                    {replying ? 'Đang gửi...' : 'Gửi trả lời'}
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="inbox-drawer-list">
                        {inboxMessages.length === 0 ? (
                            <div className="inbox-empty">
                                <MailOpen size={36} />
                                <p>Không có tin nhắn nào</p>
                            </div>
                        ) : inboxMessages.map(msg => (
                            <div
                                key={msg.id}
                                className={`drawer-msg-item ${!msg.isRead ? 'unread' : ''}`}
                                onClick={() => {
                                    setSelectedMessage(msg);
                                    if (msg.srId) {
                                        handleMarkAsRead(msg);
                                    }
                                }}
                            >
                                <div className={`inbox-avatar ${msg.type}`}>
                                    {msg.senderName.charAt(0)}
                                </div>
                                <div className="drawer-msg-body">
                                    <div className="drawer-msg-top">
                                        <span className="drawer-msg-sender">{msg.senderName}</span>
                                        <span className="drawer-msg-time">{formatDateTime(msg.sentAt)}</span>
                                    </div>
                                    <div className="drawer-msg-subject">
                                        {!msg.isRead && <span className="unread-dot" />}
                                        {msg.priority === 'high' && <Star size={12} className="priority-star" />}
                                        {msg.subject}
                                    </div>
                                    <div className="drawer-msg-preview">{msg.preview}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
};

export default AdminDashboard;
