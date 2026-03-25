import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock,
    CheckCircle, XCircle, MinusCircle, AlertCircle, Loader2, BookOpen
} from 'lucide-react';
import StudentSidebar from '../../components/StudentSidebar';
import '../../css/pages/student/StudentSchedule.css';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

const weekDays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444', '#06b6d4'];

const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00',
    '16:00', '17:00', '18:00', '19:00', '20:00', '21:00',
];

const StudentSchedule = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('week');
    const [studentClasses, setStudentClasses] = useState([]);
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchSchedule = async () => {
        try {
            setIsLoading(true);
            const [scheduleRes, attendanceRes] = await Promise.all([
                api.get('/Schedules/student/me'),
                api.get(`/attendance/student/${user.userId}`)
            ]);

            // Map schedule data
            const colorMap = {};
            let ci = 0;
            const mapped = scheduleRes.data.map(item => {
                if (!colorMap[item.classId]) {
                    colorMap[item.classId] = COLORS[ci++ % COLORS.length];
                }
                return {
                    id: item.classId,
                    code: item.subjectName || 'N/A',
                    name: item.className,
                    day: item.dayOfWeek,
                    startTime: item.startTime.substring(0, 5),
                    endTime: item.endTime.substring(0, 5),
                    color: colorMap[item.classId],
                    room: item.roomName || 'Phòng học',
                    startDate: item.startDate,
                    endDate: item.endDate
                };
            });
            setStudentClasses(mapped);
            setAttendanceRecords(attendanceRes.data);
        } catch (error) {
            console.error('Error fetching schedule/attendance:', error);
            toast.error('Không thể tải lịch học');
        } finally {
            setTimeout(() => setIsLoading(false), 300);
        }
    };

    useEffect(() => {
        fetchSchedule();
    }, []);

    /* ─── Date helpers ─── */
    const getWeekDates = () => {
        const start = new Date(currentDate);
        const day = start.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        start.setDate(start.getDate() + diff);
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return d;
        });
    };

    const weekDates = getWeekDates();

    const getDayIndex = (classDay) => classDay === 0 ? 6 : classDay - 1;

    const formatDateRange = () => {
        const monthNames = [
            'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
            'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
        ];
        if (viewMode === 'day') {
            const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
            return `${dayNames[currentDate.getDay()]}, ${currentDate.getDate()} ${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        }
        if (viewMode === 'month') {
            return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        }
        const s = weekDates[0], e = weekDates[6];
        return `${monthNames[s.getMonth()]} ${s.getDate()} - ${e.getDate()}, ${s.getFullYear()}`;
    };

    const navigate_date = (dir) => {
        const d = new Date(currentDate);
        if (viewMode === 'day') d.setDate(d.getDate() + dir);
        else if (viewMode === 'week') d.setDate(d.getDate() + dir * 7);
        else d.setMonth(d.getMonth() + dir);
        setCurrentDate(d);
    };

    const getClassStyle = (classItem, idx, total) => {
        const [sh, sm] = classItem.startTime.split(':').map(Number);
        const [eh, em] = classItem.endTime.split(':').map(Number);
        const offset = (sh - 8) + sm / 60;
        const dur = (eh - sh) + (em - sm) / 60;
        const w = total > 1 ? 100 / total : 100;
        return {
            top: `${offset * 70}px`,
            height: `${dur * 70 - 4}px`,
            backgroundColor: classItem.color,
            width: `${w}%`,
            left: `${idx * w}%`,
        };
    };

    const getAttendanceStatus = (classItem, date) => {
        const dStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        // Find if there's an attendance record for this class on this date
        const record = attendanceRecords.find(r => {
            if (!r.sessionDate) return false;
            const rDate = new Date(r.sessionDate);
            const rDateStr = `${rDate.getFullYear()}-${String(rDate.getMonth() + 1).padStart(2, '0')}-${String(rDate.getDate()).padStart(2, '0')}`;
            return rDateStr === dStr && r.className === classItem.name;
        });

        if (record) {
            if (record.status === 'present') return 'present';
            if (record.status === 'absent') return 'absent';
        }

        const isToday = date.toDateString() === new Date().toDateString();
        const isFuture = date > new Date();
        if (isFuture || isToday) return 'upcoming';
        
        return 'missing';
    };

    const AttendanceBadge = ({ status }) => {
        const map = {
            present: { icon: <CheckCircle size={12} />, label: 'Có mặt', cls: 'present' },
            absent: { icon: <XCircle size={12} />, label: 'Vắng', cls: 'absent' },
            upcoming: { icon: <MinusCircle size={12} />, label: 'Sắp tới', cls: 'upcoming' },
            missing: { icon: <AlertCircle size={12} />, label: 'Chưa điểm danh', cls: 'missing' },
            unknown: { icon: <MinusCircle size={12} />, label: '—', cls: 'upcoming' },
        };
        const s = map[status] || map.unknown;
        return (
            <span className={`ss-att-badge ${s.cls}`}>
                {s.icon} {s.label}
            </span>
        );
    };

    /* ─── Month view helpers ─── */
    const getMonthDates = () => {
        const y = currentDate.getFullYear(), m = currentDate.getMonth();
        const first = new Date(y, m, 1);
        const last = new Date(y, m + 1, 0);
        const dates = [];
        for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) dates.push(new Date(d));
        return dates;
    };

    const renderDayColumn = (date, dayIndex, single = false) => {
        const compareDate = new Date(date);
        compareDate.setHours(0, 0, 0, 0);

        const dayClasses = studentClasses.filter(c => {
            if (getDayIndex(c.day) !== dayIndex) return false;

            if (c.startDate) {
                const start = new Date(c.startDate);
                start.setHours(0, 0, 0, 0);
                if (compareDate < start) return false;
            }
            if (c.endDate) {
                const end = new Date(c.endDate);
                end.setHours(0, 0, 0, 0);
                if (compareDate > end) return false;
            }
            return true;
        });
        const isToday = date.toDateString() === new Date().toDateString();

        // Group overlapping
        const groups = [];
        dayClasses.forEach(c => {
            const [sh, sm] = c.startTime.split(':').map(Number);
            const [eh, em] = c.endTime.split(':').map(Number);
            const c1s = sh * 60 + sm;
            const c1e = eh * 60 + em;
            let added = false;
            for (const g of groups) {
                const has = g.some(gc => {
                    const [gsh, gsm] = gc.startTime.split(':').map(Number);
                    const [geh, gem] = gc.endTime.split(':').map(Number);
                    const gs = gsh * 60 + gsm;
                    const ge = geh * 60 + gem;
                    return c1s < ge && c1e > gs;
                });
                if (has) { g.push(c); added = true; break; }
            }
            if (!added) groups.push([c]);
        });

        return (
            <div key={dayIndex} className={single ? 'ss-day-column-single' : 'ss-day-column'}>
                <div className={`ss-day-header ${isToday ? 'today' : ''}`}>
                    <div className="ss-day-name">{weekDays[dayIndex]}</div>
                    <div className="ss-day-date">{date.getDate()}</div>
                </div>
                <div className="ss-day-grid">
                    {timeSlots.map((_, i) => <div key={i} className="ss-grid-cell" />)}
                    <div className="ss-classes-container">
                        {groups.map((group, gIdx) =>
                            group.map((c, idx) => {
                                const status = getAttendanceStatus(c, date);
                                return (
                                    <div
                                        key={`${c.id}-${c.day}-${gIdx}-${idx}`}
                                        className="ss-class-card"
                                        style={getClassStyle(c, idx, group.length)}
                                        onClick={() => navigate(`/student/classes/${c.id}`)}
                                    >
                                        <div className="ss-class-code">{c.code}</div>
                                        <div className="ss-class-name">{c.name}</div>
                                        <div className="ss-class-room">
                                            <BookOpen size={10} /> {c.room}
                                        </div>
                                        <div className="ss-class-time">
                                            <Clock size={10} />
                                            {c.startTime} - {c.endTime}
                                        </div>
                                        <AttendanceBadge status={status} />
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderMonthDayClasses = (date) => {
        const idx = date.getDay() === 0 ? 6 : date.getDay() - 1;
        const compareDate = new Date(date);
        compareDate.setHours(0, 0, 0, 0);

        const dayClasses = studentClasses.filter(c => {
            if (getDayIndex(c.day) !== idx) return false;

            if (c.startDate) {
                const start = new Date(c.startDate);
                start.setHours(0, 0, 0, 0);
                if (compareDate < start) return false;
            }
            if (c.endDate) {
                const end = new Date(c.endDate);
                end.setHours(0, 0, 0, 0);
                if (compareDate > end) return false;
            }
            return true;
        });
        
        return dayClasses.map((c, i) => {
            const status = getAttendanceStatus(c, date);
            return (
                <div
                    key={`${c.id}-${c.day}-${i}`}
                    className={`ss-month-class-badge att-${status}`}
                    style={{ background: c.color }}
                    onClick={() => navigate(`/student/classes/${c.id}`)}
                >
                    <span className="sc-code">{c.code}</span>
                    <span className="sc-room">{c.room}</span>
                </div>
            );
        });
    };

    if (isLoading) {
        return (
            <div className="ss-page">
                <StudentSidebar />
                <div className="ss-main ss-loading">
                    <Loader2 className="animate-spin" size={40} />
                    <p>Đang tải lịch học...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="ss-page">
            <StudentSidebar />

            <main className="ss-main">
                <div className="ss-header">
                    <div>
                        <h1 className="ss-title">Lịch học của tôi</h1>
                        <p className="ss-subtitle">
                            Xem lịch học và trạng thái điểm danh từng buổi
                        </p>
                    </div>
                </div>

                {/* Controls */}
                <div className="ss-controls">
                    <div className="ss-date-nav">
                        <button className="ss-btn-nav" onClick={() => navigate_date(-1)}>
                            <ChevronLeft size={20} />
                        </button>
                        <div className="ss-date-display">
                            <CalendarIcon size={18} />
                            <span>{formatDateRange()}</span>
                        </div>
                        <button className="ss-btn-nav" onClick={() => navigate_date(1)}>
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    <div className="ss-view-toggle">
                        {['day', 'week', 'month'].map(m => (
                            <button
                                key={m}
                                className={`ss-btn-view ${viewMode === m ? 'active' : ''}`}
                                onClick={() => setViewMode(m)}
                            >
                                {m === 'day' ? 'Ngày' : m === 'week' ? 'Tuần' : 'Tháng'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Legend */}
                <div className="ss-legend">
                    <span className="ss-legend-item present"><CheckCircle size={12} /> Có mặt</span>
                    <span className="ss-legend-item absent"><XCircle size={12} /> Vắng mặt</span>
                    <span className="ss-legend-item upcoming"><MinusCircle size={12} /> Sắp tới</span>
                </div>

                {/* Calendar Content */}
                <div className="ss-content">
                    {/* WEEK VIEW */}
                    {viewMode === 'week' && (
                        <div className="ss-calendar">
                            <div className="ss-time-column">
                                <div className="ss-day-header" />
                                {timeSlots.map(t => (
                                    <div key={t} className="ss-time-slot">{t}</div>
                                ))}
                            </div>
                            {weekDates.map((date, idx) => renderDayColumn(date, idx))}
                        </div>
                    )}

                    {/* DAY VIEW */}
                    {viewMode === 'day' && (
                        <div className="ss-calendar">
                            <div className="ss-time-column">
                                <div className="ss-day-header" />
                                {timeSlots.map(t => (
                                    <div key={t} className="ss-time-slot">{t}</div>
                                ))}
                            </div>
                            {(() => {
                                const d = new Date(currentDate);
                                const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
                                return renderDayColumn(d, idx, true);
                            })()}
                        </div>
                    )}

                    {/* MONTH VIEW */}
                    {viewMode === 'month' && (
                        <div className="ss-month-view">
                            <div className="ss-month-weekdays">
                                {weekDays.map(d => (
                                    <div key={d} className="ss-month-weekday">{d}</div>
                                ))}
                            </div>
                            <div className="ss-month-grid">
                                {(() => {
                                    const monthDates = getMonthDates();
                                    const first = monthDates[0].getDay();
                                    const padding = first === 0 ? 6 : first - 1;
                                    return (
                                        <>
                                            {Array.from({ length: padding }).map((_, i) => (
                                                <div key={`p${i}`} className="ss-month-day-cell empty" />
                                            ))}
                                            {monthDates.map((date, i) => {
                                                const isToday = date.toDateString() === new Date().toDateString();
                                                return (
                                                    <div key={i} className={`ss-month-day-cell ${isToday ? 'today' : ''}`}>
                                                        <div className="ss-month-day-number">{date.getDate()}</div>
                                                        <div className="ss-month-day-classes">
                                                            {renderMonthDayClasses(date)}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default StudentSchedule;
