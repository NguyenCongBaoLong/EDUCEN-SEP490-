import { useState, useEffect } from 'react';
import {
    Users, GraduationCap, UserCheck, Bell, Send, Clock,
    CheckCircle, AlertCircle, Info, ChevronRight, BookOpen,
    TrendingUp, MessageSquare, X, Inbox, Star, ShieldAlert,
    MessageCircle, ArrowLeft, Mail, MailOpen
} from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import '../../css/pages/center/AdminDashboard.css';

/* ─── Mock Data ─────────────────────────────────────── */
const enrollmentData = [
    { month: 'T8', students: 42 },
    { month: 'T9', students: 67 },
    { month: 'T10', students: 58 },
    { month: 'T11', students: 74 },
    { month: 'T12', students: 55 },
    { month: 'T1', students: 80 },
    { month: 'T2', students: 91 },
];

const subjectData = [
    { name: 'Toán học', value: 35, color: '#3b82f6' },
    { name: 'Tiếng Anh', value: 28, color: '#8b5cf6' },
    { name: 'Vật lý', value: 18, color: '#f59e0b' },
    { name: 'Hóa học', value: 12, color: '#10b981' },
    { name: 'Khác', value: 7, color: '#6b7280' },
];

const initialNotifications = [
    {
        id: 1,
        title: 'Thông báo nghỉ Tết Nguyên Đán 2025',
        content: 'Trung tâm sẽ nghỉ từ 26/01 đến 03/02. Lịch học sẽ tiếp tục từ 04/02.',
        sentAt: '2025-01-20T08:30:00',
        recipients: 312,
        status: 'sent',
        target: 'all',
    },
    {
        id: 2,
        title: 'Thay đổi lịch học lớp Toán 12A',
        content: 'Lớp Toán 12A chuyển từ thứ 3 sang thứ 4 hàng tuần kể từ 10/02.',
        sentAt: '2025-02-08T14:00:00',
        recipients: 28,
        status: 'sent',
        target: 'Toán 12A',
    },
    {
        id: 3,
        title: 'Khai giảng lớp Tiếng Anh IELTS',
        content: 'Lớp IELTS mới khai giảng ngày 15/02. Đăng ký trước 12/02 để nhận ưu đãi.',
        sentAt: '2025-02-10T09:00:00',
        recipients: 185,
        status: 'sent',
        target: 'all',
    },
];

const upcomingClasses = [
    { id: 1, name: 'Toán nâng cao 10', subject: 'Toán học', startDate: '25/02/2025', students: 0, maxStudents: 20 },
    { id: 2, name: 'IELTS 6.5+', subject: 'Tiếng Anh', startDate: '01/03/2025', students: 5, maxStudents: 15 },
    { id: 3, name: 'Lý cơ bản 11', subject: 'Vật lý', startDate: '05/03/2025', students: 3, maxStudents: 20 },
];

const initialInboxMessages = [
    {
        id: 1,
        type: 'admin',
        senderName: 'Admin Tổng Hệ Thống',
        senderRole: 'Quản trị viên',
        subject: '[QUAN TRỌNG] Cập nhật chính sách học phí 2025',
        preview: 'Kính gửi các trung tâm, từ tháng 3/2025 hệ thống sẽ áp dụng chính sách mới...',
        content: 'Kính gửi các trung tâm,\n\nTừ tháng 3/2025, hệ thống sẽ áp dụng chính sách học phí mới như sau:\n\n1. Học phí sẽ được thu theo kỳ (3 tháng/kỳ) thay vì theo tháng.\n2. Học sinh đăng ký trước ngày 01/03 sẽ được giữ nguyên mức học phí cũ đến hết học kỳ 1.\n3. Các trường hợp miễn giảm học phí cần nộp hồ sơ trước ngày 20/02.\n\nVui lòng thông báo đến phụ huynh và học sinh. Mọi thắc mắc liên hệ phòng hỗ trợ.\n\nTrân trọng,\nPhòng Quản Lý Hệ Thống',
        sentAt: '2025-02-18T09:00:00',
        isRead: false,
        priority: 'high',
    },
    {
        id: 2,
        type: 'admin',
        senderName: 'Admin Tổng Hệ Thống',
        senderRole: 'Quản trị viên',
        subject: 'Bảo trì hệ thống ngày 22/02/2025',
        preview: 'Hệ thống sẽ tạm ngưng hoạt động từ 23:00 ngày 22/02 đến 02:00 ngày 23/02...',
        content: 'Kính gửi các trung tâm,\n\nHệ thống sẽ tạm ngưng hoạt động để bảo trì theo lịch:\n\n- Thời gian: 23:00 ngày 22/02 đến 02:00 ngày 23/02/2025\n- Ảnh hưởng: Không thể đăng nhập, xem lịch học, hoặc nhắn tin trong thời gian này.\n\nXin lỗi vì sự bất tiện này. Chúng tôi sẽ cố gắng hoàn thành sớm nhất có thể.\n\nTrân trọng,\nPhòng Kỹ Thuật',
        sentAt: '2025-02-17T14:30:00',
        isRead: true,
        priority: 'normal',
    },
    {
        id: 3,
        type: 'feedback',
        senderName: 'Nguyễn Thị Hoa',
        senderRole: 'Phụ huynh – Lớp Toán 12A',
        subject: 'Góp ý về lịch học buổi tối',
        preview: 'Cho em hỏi lớp Toán 12A tối thứ 3 có thể dời sang 19h30 thay vì 19h không ạ...',
        content: 'Kính gửi Ban Giám Đốc Trung Tâm,\n\nCon tôi đang học lớp Toán 12A. Tôi muốn góp ý nhỏ: buổi học tối thứ 3 hiện bắt đầu lúc 19h, nhưng nhiều bé tan học ở trường lúc 18h30 và cần về ăn cơm, đi xa khá vất vả.\n\nNếu được, nhờ trung tâm xem xét dời sang 19h30 sẽ thuận tiện hơn cho các bé.\n\nCảm ơn trung tâm đã lắng nghe!\n\nTrân trọng,\nNguyễn Thị Hoa',
        sentAt: '2025-02-19T20:15:00',
        isRead: false,
        priority: 'normal',
    },
    {
        id: 4,
        type: 'feedback',
        senderName: 'Trần Văn Minh',
        senderRole: 'Học sinh – Lớp IELTS',
        subject: 'Phản hồi về tài liệu học tập',
        preview: 'Em muốn góp ý là tài liệu đọc hiểu của lớp IELTS tuần trước có một số lỗi đánh máy...',
        content: 'Kính gửi thầy/cô,\n\nEm là Trần Văn Minh, học lớp IELTS 6.5+. Em muốn phản hồi rằng tài liệu phần Reading tuần 3 (trang 12-13) có một số lỗi đánh máy nhỏ ở phần câu hỏi số 4 và 7, làm em hơi nhầm khi làm bài.\n\nNgoài ra em rất hài lòng với cách dạy của thầy. Cảm ơn trung tâm!\n\nEm,\nTrần Văn Minh',
        sentAt: '2025-02-15T16:00:00',
        isRead: true,
        priority: 'normal',
    },
];

const kpiData = [
    { label: 'Tổng học sinh', value: '312', icon: Users, color: 'blue', change: '+12 tháng này' },
    { label: 'Lớp đang học', value: '18', icon: BookOpen, color: 'purple', change: '3 sắp khai giảng' },
    { label: 'Nhân viên', value: '24', icon: UserCheck, color: 'green', change: '20 đang active' },
    { label: 'Đăng ký mới', value: '91', icon: TrendingUp, color: 'orange', change: 'Tháng 2/2025' },
];

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
    const [notifications, setNotifications] = useState(initialNotifications);
    const [form, setForm] = useState({ title: '', content: '', target: 'all' });
    const [sending, setSending] = useState(false);
    const [sendSuccess, setSendSuccess] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Inbox state
    const [inboxMessages, setInboxMessages] = useState(initialInboxMessages);
    const [inboxOpen, setInboxOpen] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState(null);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const handleSend = () => {
        if (!form.title.trim() || !form.content.trim()) return;
        setSending(true);
        setTimeout(() => {
            const newNotif = {
                id: notifications.length + 1,
                title: form.title,
                content: form.content,
                sentAt: new Date().toISOString(),
                recipients: form.target === 'all' ? 312 : Math.floor(Math.random() * 30 + 10),
                status: 'sent',
                target: form.target === 'all' ? 'all' : form.target,
            };
            setNotifications([newNotif, ...notifications]);
            setForm({ title: '', content: '', target: 'all' });
            setSending(false);
            setSendSuccess(true);
            setTimeout(() => setSendSuccess(false), 3000);
        }, 1500);
    };

    const formattedDate = currentTime.toLocaleDateString('vi-VN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

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
                            {inboxMessages.filter(m => !m.isRead).length > 0 && (
                                <span className="inbox-trigger-badge">
                                    {inboxMessages.filter(m => !m.isRead).length}
                                </span>
                            )}
                        </button>
                        <div className="dashboard-center-badge">
                            <GraduationCap size={18} />
                            Trung Tâm Gia Sư TutorCenter
                        </div>
                    </div>
                </div>

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
                                        <option value="Toán 12A">Lớp Toán 12A</option>
                                        <option value="Tiếng Anh IELTS">Lớp IELTS</option>
                                        <option value="Lý 11">Lớp Vật Lý 11</option>
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

                                <button
                                    className="zalo-send-btn"
                                    onClick={handleSend}
                                    disabled={sending || !form.title.trim() || !form.content.trim()}
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




                {/* ── Upcoming Classes Table ── */}
                <div className="upcoming-card">
                    <div className="upcoming-header">
                        <h2 className="upcoming-title">
                            <Bell size={18} />
                            Lớp Sắp Khai Giảng
                        </h2>
                        <button className="upcoming-view-all">
                            Xem tất cả <ChevronRight size={15} />
                        </button>
                    </div>
                    <table className="upcoming-table">
                        <thead>
                            <tr>
                                <th>Tên lớp</th>
                                <th>Môn học</th>
                                <th>Ngày khai giảng</th>
                                <th>Đã đăng ký</th>
                                <th>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {upcomingClasses.map((cls) => (
                                <tr key={cls.id}>
                                    <td className="upcoming-class-name">{cls.name}</td>
                                    <td>
                                        <span className="upcoming-subject-tag">{cls.subject}</span>
                                    </td>
                                    <td className="upcoming-date">{cls.startDate}</td>
                                    <td>
                                        <div className="upcoming-enrollment">
                                            <div className="enrollment-bar-wrap">
                                                <div
                                                    className="enrollment-bar-fill"
                                                    style={{ width: `${(cls.students / cls.maxStudents) * 100}%` }}
                                                />
                                            </div>
                                            <span>{cls.students}/{cls.maxStudents}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`upcoming-status-badge ${cls.students === 0 ? 'not-started' : 'enrolling'}`}>
                                            {cls.students === 0 ? 'Chưa có đăng ký' : 'Đang tuyển sinh'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </main>

            {/* ── Inbox Drawer Overlay ── */}
            {inboxOpen && (
                <div
                    className="inbox-overlay"
                    onClick={() => { setInboxOpen(false); setSelectedMessage(null); }}
                />
            )}

            {/* ── Inbox Drawer ── */}
            <div className={`inbox-drawer ${inboxOpen ? 'open' : ''}`}>
                {/* Header */}
                <div className="inbox-drawer-header">
                    {selectedMessage ? (
                        <button className="inbox-back-btn" onClick={() => setSelectedMessage(null)}>
                            <ArrowLeft size={16} /> Tất cả thông báo
                        </button>
                    ) : (
                        <div className="inbox-drawer-title">
                            <Inbox size={18} />
                            <span>Hộp Thư</span>
                            {inboxMessages.filter(m => !m.isRead).length > 0 && (
                                <span className="drawer-unread-badge">
                                    {inboxMessages.filter(m => !m.isRead).length}
                                </span>
                            )}
                        </div>
                    )}
                    <button
                        className="inbox-drawer-close"
                        onClick={() => { setInboxOpen(false); setSelectedMessage(null); }}
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
                                    setInboxMessages(prev =>
                                        prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m)
                                    );
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
