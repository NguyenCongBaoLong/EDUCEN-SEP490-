import { useState, useEffect, useMemo } from 'react';
import {
    Users, GraduationCap, UserCheck, Bell, Send, Clock,
    CheckCircle, XCircle, AlertCircle, TrendingUp, MessageSquare, 
    BookOpen, HardDrive, Inbox, ClipboardCheck, FileText, X
} from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import ContractViewer from '../../components/ContractViewer';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import zaloOAService from '../../services/zaloOAService';
import notificationService from '../../services/notificationService';
import NotificationMailbox from '../../components/NotificationMailbox';
import toast from 'react-hot-toast';
import '../../css/pages/center/AdminDashboard.css';

/* ─── Helpers ────────────────────────────────────────────────────────────────────────── */
function formatDateTime(iso) {
    if (!iso) return '';
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
    const possibleArrays = [payload.data, payload.notifications, payload.items];
    for (const arr of possibleArrays) {
        if (Array.isArray(arr)) return arr;
    }
    return [];
};

const isScheduleChange = (request) => {
    const title = (request?.title || request?.Title || '').toLowerCase();
    const content = (request?.content || request?.Content || '').toLowerCase();
    return title.includes('[schedule_change]')
        || content.includes('type: schedule_change')
        || title.includes('đổi lịch dạy')
        || content.includes('slot đề xuất')
        || content.includes('requestedslot:');
};

/* ─── Main Component ─────────────────────────────────────────────────────────────────────────── */
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
    const [showContracts, setShowContracts] = useState(false);
    const [contracts, setContracts] = useState([]);
    const [loadingContracts, setLoadingContracts] = useState(false);
    const [viewContractTarget, setViewContractTarget] = useState(null);

    const tenantId = useMemo(() => {
        const isValidTenantId = (value) => (
            !!value && value !== 'undefined' && value !== 'null'
        );
        if (isValidTenantId(user?.tenantId)) return user.tenantId;
        const storedTenantId = localStorage.getItem('tenantId');
        return isValidTenantId(storedTenantId) ? storedTenantId : null;
    }, [user?.tenantId]);

    const inboxMessages = useMemo(() => [
        ...systemNotifications.map(n => ({
            id: `notif-${n.notificationId}`,
            notificationId: n.notificationId,
            type: n.category === 'Subscription' ? 'subscription' : 'system',
            senderName: 'Hệ thống',
            senderRole: n.category === 'Subscription' ? 'Thông báo gói dịch vụ' : 'Thông báo',
            subject: n.title || 'Thông báo',
            content: n.message || '',
            sentAt: n.createdAt,
            isRead: n.isRead,
            priority: n.type === 'Warning' ? 'high' : 'normal',
        })),
        ...supportRequests.map(sr => ({
            id: `sr-${sr.id}`,
            srId: sr.id,
            type: isScheduleChange(sr)
                ? 'schedule_change'
                : (sr.senderRoleName?.toLowerCase().includes('parent') ? 'feedback' : 'support'),
            senderName: sr.senderName || 'Người dùng',
            senderRole: sr.senderRoleName || 'Yêu cầu',
            subject: sr.title || 'Hỗ trợ',
            content: sr.content || '',
            sentAt: sr.createdAt,
            isRead: sr.isRead,
            priority: 'normal',
            adminResponse: sr.adminResponse,
        }))
    ].sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt)), [systemNotifications, supportRequests]);

    const unreadCount = inboxMessages.filter(m => !m.isRead).length;

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const [dashboardRes, zaloStatusRes, zaloHistoryRes, classesRes] = await Promise.all([
                    api.get('/CenterDashboard'),
                    zaloOAService.getStatus().catch(() => ({ data: null })),
                    zaloOAService.getMessageHistory().catch(() => ({ data: [] })),
                    api.get('/Classes').catch(() => ({ data: [] })),
                ]);

                if (dashboardRes.data) setDashboardData(dashboardRes.data);
                if (zaloStatusRes.data) setOaStatus(zaloStatusRes.data);
                if (zaloHistoryRes.data) {
                    setNotifications((zaloHistoryRes.data || []).map(h => ({
                        id: h.notificationId,
                        title: h.title,
                        content: h.message,
                        sentAt: h.createdAt,
                        recipients: 0,
                    })));
                }
                if (classesRes.data) setClasses(classesRes.data || []);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const fetchInbox = async () => {
        try {
            const [srRes, snRes] = await Promise.all([
                notificationService.getSupportRequests(),
                notificationService.getSystemNotifications(tenantId)
            ]);
            setSupportRequests(normalizeNotifications(srRes.data));
            setSystemNotifications(normalizeNotifications(snRes.data));
        } catch (error) {
            console.error('Lỗi khi tải inbox:', error);
        }
    };

    useEffect(() => { if (inboxOpen) fetchInbox(); }, [inboxOpen]);

    const loadContracts = async () => {
        setLoadingContracts(true);
        try {
            const res = await api.get('/admin/subscription/contracts');
            setContracts(res.data || []);
            setShowContracts(true);
        } catch (error) {
            console.error('Load contracts error:', error?.response?.data || error);
            toast.error('Không thể tải danh sách hợp đồng');
        } finally {
            setLoadingContracts(false);
        }
    };

    const handleViewContract = (contract) => {
        setViewContractTarget(contract);
    };

    const handleSend = async () => {
        if (!form.title.trim() || !form.content.trim()) return;
        setSending(true);
        setSendError('');
        try {
            const res = await zaloOAService.sendBatch(form.title, form.content, form.target);
            const result = res.data;
            setNotifications([{
                id: Date.now(),
                title: form.title,
                content: form.content,
                sentAt: new Date().toISOString(),
                recipients: result.sent,
            }, ...notifications]);
            setForm({ title: '', content: '', target: 'all' });
            setSendSuccess(true);
            setTimeout(() => setSendSuccess(false), 3000);
        } catch (error) {
            setSendError(error.response?.data?.message || 'Gửi thông báo thất bại.');
        } finally {
            setSending(false);
        }
    };

    const handleMarkAsRead = async (message) => {
        try {
            if (message.type === 'feedback' || message.type === 'support') {
                await notificationService.markSupportRequestAsRead(message.srId);
            } else {
                await notificationService.markAsRead(message.notificationId);
            }
            fetchInbox();
        } catch (error) {
            console.error('Lỗi khi đánh dấu đã đọc:', error);
        }
    };

    const handleReply = async (message) => {
        if (!replyText.trim()) return;
        setReplying(true);
        try {
            await notificationService.replyToSupportRequest(message.srId, replyText);
            toast.success('Đã gửi phản hồi!');
            setReplyText('');
            setSelectedMessage(null);
            fetchInbox();
        } catch (error) {
            toast.error('Gửi phản hồi thất bại');
        } finally {
            setReplying(false);
        }
    };

    const handleScheduleReview = async (message, action) => {
        if (!message?.srId) return;
        if (action === 'reject' && !replyText.trim()) {
            toast.error('Vui lòng nhập lý do từ chối');
            return;
        }

        setReplying(true);
        try {
            if (action === 'approve') {
                await notificationService.approveSupportRequest(message.srId, replyText.trim());
                toast.success('Đã duyệt yêu cầu đổi lịch');
            } else {
                await notificationService.rejectSupportRequest(message.srId, replyText.trim());
                toast.success('Đã từ chối yêu cầu đổi lịch');
            }
            setReplyText('');
            setSelectedMessage(null);
            fetchInbox();
        } catch (error) {
            toast.error('Xử lý yêu cầu đổi lịch thất bại');
        } finally {
            setReplying(false);
        }
    };

    const formattedDate = currentTime.toLocaleDateString('vi-VN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    const { overview, studentRegistrationChart, studentsBySubject } = dashboardData;
    const kpiData = [
        { label: 'Tổng học sinh', value: overview.totalStudents, icon: Users, color: 'blue', change: `+${overview.newStudentsThisMonth} tháng này` },
        { label: 'Lớp đang học', value: overview.totalClasses, icon: BookOpen, color: 'purple', change: 'Hoạt động' },
        { label: 'Sắp khai giảng', value: overview.upcomingClasses, icon: Bell, color: 'green', change: 'Đang tuyển sinh' },
        { label: 'Nhân viên', value: overview.totalStaff, icon: UserCheck, color: 'orange', change: `${overview.activeStaff} đang làm việc` },
    ];

    const enrollmentData = useMemo(() => {
        const dataMap = {};
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthLabel = `Tháng ${d.getMonth() + 1}`;
            dataMap[d.getMonth() + 1] = { month: monthLabel, students: 0, sortKey: d.getTime() };
        }
        if (studentRegistrationChart) {
            studentRegistrationChart.forEach(item => { if (dataMap[item.month]) dataMap[item.month].students = item.students; });
        }
        return Object.values(dataMap).sort((a, b) => a.sortKey - b.sortKey).map(item => ({ month: item.month, students: item.students }));
    }, [studentRegistrationChart]);

    const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
    const subjectData = studentsBySubject.map((item, index) => ({
        name: item.subject,
        value: item.percentage,
        count: item.totalStudents,
        color: COLORS[index % COLORS.length]
    }));

    return (
        <div className="admin-dashboard">
            <Sidebar showNotifications={false} />
            <main className="dashboard-main">
                <div className="dashboard-header">
                    <div>
                        <h1 className="dashboard-title">Tổng Quan</h1>
                        <p className="dashboard-date">{formattedDate}</p>
                    </div>
                    <div className="dashboard-header-actions">
                        <button className="inbox-trigger-btn" onClick={() => setInboxOpen(true)}>
                            <Inbox size={18} />
                            Hộp Thư
                            {unreadCount > 0 && <span className="inbox-trigger-badge">{unreadCount}</span>}
                        </button>
                        <button className="inbox-trigger-btn" onClick={loadContracts}>
                            <FileText size={18} />
                            Hợp Đồng
                        </button>
                        <div className="dashboard-center-badge">
                            <GraduationCap size={18} />
                            {centerBranding.name}
                        </div>
                    </div>
                </div>

                <div className="kpi-grid">
                    {kpiData.map((kpi) => {
                        const Icon = kpi.icon;
                        return (
                            <div key={kpi.label} className={`kpi-card kpi-${kpi.color}`}>
                                <div className="kpi-icon-wrap"><Icon size={22} /></div>
                                <div className="kpi-info">
                                    <div className="kpi-value">{kpi.value}</div>
                                    <div className="kpi-label">{kpi.label}</div>
                                    <div className="kpi-change">{kpi.change}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="kpi-grid" style={{ marginTop: '1rem' }}>
                    <div className="kpi-card kpi-blue" style={{ flex: 1 }}>
                        <div className="kpi-icon-wrap"><Users size={22} /></div>
                        <div className="kpi-info" style={{ flex: 1 }}>
                            <div className="kpi-value">{loading ? '...' : `${overview.currentUsers || 0} / ${overview.maxUsers || 0}`}</div>
                            <div className="kpi-label">Người Dùng</div>
                            <div className="storage-progress-container" style={{ marginTop: '8px' }}>
                                <div className="storage-progress-bar" style={{
                                    width: `${loading ? 0 : Math.min(((overview.currentUsers || 0) / (overview.maxUsers || 1)) * 100, 100)}%`,
                                    background: ((overview.currentUsers || 0) / (overview.maxUsers || 1)) > 0.9 ? '#ef4444' : '#3b82f6'
                                }} />
                            </div>
                        </div>
                    </div>

                    <div className="kpi-card storage-card">
                        <div className="storage-icon-container"><HardDrive size={24} /></div>
                        <div className="storage-content">
                            <div className="storage-value">
                                <span className="storage-number">
                                    {loading ? '...' : (
                                        <>
                                            {overview.currentStorageMB < 1024 
                                                ? `${(overview.currentStorageMB || 0).toFixed(1)} MB` 
                                                : `${((overview.currentStorageMB || 0) / 1024).toFixed(1)} GB`
                                            }
                                            <span style={{ margin: '0 8px', color: '#9ca3af' }}>/</span>
                                            {`${((overview.maxStorageMB || 0) / 1024).toFixed(0)} GB`}
                                        </>
                                    )}
                                </span>
                            </div>
                            <div className="storage-label">Dung Lượng</div>
                            <div className="storage-progress-container">
                                <div className="storage-progress-bar" style={{ 
                                    width: `${loading ? 0 : Math.min(((overview.currentStorageMB || 0) / (overview.maxStorageMB || 1)) * 100, 100)}%`,
                                    background: '#8b5cf6'
                                }} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="dashboard-content-grid">
                    <div className="dashboard-charts-col">
                        <div className="chart-card">
                            <div className="chart-card-header">
                                <h2 className="chart-card-title"><TrendingUp size={18} /> Học Sinh Đăng Ký Theo Tháng</h2>
                                <span className="chart-card-badge">7 tháng gần đây</span>
                            </div>
                            <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={enrollmentData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="month" tick={{ fontSize: 13, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 13, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Line type="monotone" dataKey="students" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="chart-card">
                            <div className="chart-card-header">
                                <h2 className="chart-card-title"><BookOpen size={18} /> Phân Bố Học Sinh Theo Môn</h2>
                            </div>
                            <div className="pie-chart-wrap">
                                <ResponsiveContainer width="55%" height={200}>
                                    <PieChart>
                                        <Pie data={subjectData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value">
                                            {subjectData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
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

                    <div className="zalo-col">
                        <div className="zalo-card">
                            <div className="zalo-card-header">
                                <div className="zalo-title-row">
                                    <div className="zalo-icon"><MessageSquare size={18} /></div>
                                    <h2 className="zalo-title">Gửi Thông Báo</h2>
                                </div>
                                <span className="zalo-oa-badge">Zalo OA</span>
                            </div>
                            <div className="zalo-form">
                                {oaStatus && !oaStatus.isConfigured && (
                                    <div className="zalo-error-banner"><AlertCircle size={16} /> Zalo OA chưa được cấu hình.</div>
                                )}
                                <div className="zalo-field">
                                    <label className="zalo-label">Tiêu đề</label>
                                    <input className="zalo-input" placeholder="Tiêu đề..." value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                                </div>
                                <div className="zalo-field">
                                    <label className="zalo-label">Đối tượng</label>
                                    <select className="zalo-select" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })}>
                                        <option value="all">Tất cả</option>
                                        {classes.map(c => <option key={c.classId} value={c.className}>{c.className}</option>)}
                                    </select>
                                </div>
                                <div className="zalo-field">
                                    <label className="zalo-label">Nội dung</label>
                                    <textarea className="zalo-textarea" rows={4} placeholder="Nội dung..." value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
                                </div>
                                <button className="zalo-send-btn" onClick={handleSend} disabled={sending || !form.title.trim()}>
                                    <Send size={16} /> {sending ? 'Đang gửi...' : 'Gửi qua Zalo OA'}
                                </button>
                            </div>
                            <div className="zalo-history">
                                <h3 className="zalo-history-title">Lịch Sử</h3>
                                <div className="zalo-history-list">
                                    {notifications.map(n => (
                                        <div key={n.id} className="zalo-history-item">
                                            <div className="zalo-history-item-header">
                                                <span>{n.title}</span>
                                                <span className="zalo-status-badge sent"><CheckCircle size={11} /> Đã gửi</span>
                                            </div>
                                            <div className="zalo-history-meta">
                                                <span><Clock size={12} /> {formatDateTime(n.sentAt)}</span>
                                                <span><Users size={12} /> {n.recipients} người</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {showContracts && (
                <>
                    <div className="subscription-modal-overlay" onClick={() => setShowContracts(false)} />
                    <div className="subscription-modal" style={{ maxWidth: '860px', width: '92vw', maxHeight: '90vh' }}>
                        <div className="subscription-modal-header">
                            <h2>Hợp Đồng</h2>
                            <button className="subscription-modal-close" onClick={() => setShowContracts(false)}><X size={18} /></button>
                        </div>
                        <div className="subscription-modal-body" style={{ padding: '1rem', maxHeight: 'calc(90vh - 120px)', display: 'flex', flexDirection: 'column' }}>
                            {loadingContracts ? (
                                <div className="subscription-state">Đang tải...</div>
                            ) : contracts.length === 0 ? (
                                <div className="subscription-state">
                                    <FileText size={40} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                                    <p>Chưa có hợp đồng nào.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', flexShrink: 0 }}>
                                        <thead>
                                            <tr>
                                                <th style={{ textAlign: 'left', padding: '0.75rem', background: '#f8fafc' }}>Tiêu đề</th>
                                                <th style={{ textAlign: 'left', padding: '0.75rem', background: '#f8fafc' }}>Loại</th>
                                                <th style={{ textAlign: 'left', padding: '0.75rem', background: '#f8fafc' }}>Ngày tải</th>
                                                <th style={{ textAlign: 'center', padding: '0.75rem', background: '#f8fafc' }}>Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {contracts.map(c => (
                                                <tr key={c.contractId}>
                                                    <td style={{ padding: '0.75rem' }}>{c.contractTitle}</td>
                                                    <td style={{ padding: '0.75rem' }}>{c.fileType}</td>
                                                    <td style={{ padding: '0.75rem' }}>{c.createdAt ? new Date(c.createdAt).toLocaleDateString('vi-VN') : '—'}</td>
                                                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                        <button style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '0.25rem 0.75rem', borderRadius: '4px', cursor: 'pointer' }} onClick={() => handleViewContract(c)}>Xem</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {viewContractTarget && (
                <>
                    <div className="subscription-modal-overlay" onClick={() => setViewContractTarget(null)} />
                    <div className="subscription-modal" style={{ maxWidth: '1200px', width: '90vw', maxHeight: '90vh', height: 'auto' }}>
                        <div className="subscription-modal-header">
                            <h2>{viewContractTarget.contractTitle}</h2>
                            <button className="subscription-modal-close" onClick={() => setViewContractTarget(null)}><X size={18} /></button>
                        </div>
                        <div className="subscription-modal-body" style={{ padding: '0', height: 'calc(90vh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f1f1' }}>
                            <ContractViewer contract={viewContractTarget} isCenter={true} />
                        </div>
                    </div>
                </>
            )}

            <NotificationMailbox
                variant="drawer"
                open={inboxOpen}
                showOverlay={inboxOpen}
                onOverlayClick={() => { setInboxOpen(false); setSelectedMessage(null); setReplyText(''); }}
                onClose={() => { setInboxOpen(false); setSelectedMessage(null); setReplyText(''); }}
                messages={inboxMessages}
                selectedMessage={selectedMessage}
                onSelectedMessageChange={setSelectedMessage}
                onMarkAsRead={handleMarkAsRead}
                renderDetailExtra={(msg) => {
                    if (msg?.type === 'feedback' && !msg.adminResponse) {
                        return (
                            <div style={{ marginTop: '1rem' }}>
                                <textarea className="zalo-textarea" rows={3} placeholder="Phản hồi..." value={replyText} onChange={(e) => setReplyText(e.target.value)} />
                                <button className="zalo-send-btn" style={{ marginTop: '0.5rem' }} disabled={replying} onClick={() => handleReply(msg)}>Gửi trả lời</button>
                            </div>
                        );
                    }

                    if (msg?.type === 'schedule_change' && !msg.adminResponse) {
                        return (
                            <div style={{ marginTop: '1rem' }}>
                                <textarea
                                    className="zalo-textarea"
                                    rows={3}
                                    placeholder="Ghi chú duyệt hoặc lý do từ chối..."
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                />
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    <button className="zalo-send-btn" disabled={replying} onClick={() => handleScheduleReview(msg, 'approve')}>
                                        Duyệt
                                    </button>
                                    <button
                                        className="zalo-send-btn"
                                        style={{ background: '#dc2626' }}
                                        disabled={replying}
                                        onClick={() => handleScheduleReview(msg, 'reject')}
                                    >
                                        Từ chối
                                    </button>
                                </div>
                            </div>
                        );
                    }

                    return null;
                }} />
        </div>
    );
};

export default AdminDashboard;

