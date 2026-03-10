import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock,
    CheckCircle, XCircle, MinusCircle
} from 'lucide-react';
import StudentSidebar from '../../components/StudentSidebar';
import '../../css/pages/student/StudentSchedule.css';

// Shared schedule data cho học sinh này
const STUDENT_CLASSES = [
    {
        id: 201, code: 'TOÁN-G10', name: 'Đại Số Nâng Cao',
        day: 1, startTime: '16:30', endTime: '18:00', color: '#3b82f6',
    },
    {
        id: 201, code: 'TOÁN-G10', name: 'Đại Số Nâng Cao',
        day: 3, startTime: '16:30', endTime: '18:00', color: '#3b82f6',
    },
    {
        id: 202, code: 'ANH-G10', name: 'Tiếng Anh Giao Tiếp',
        day: 2, startTime: '17:00', endTime: '18:30', color: '#10b981',
    },
    {
        id: 202, code: 'ANH-G10', name: 'Tiếng Anh Giao Tiếp',
        day: 4, startTime: '17:00', endTime: '18:30', color: '#10b981',
    },
    {
        id: 203, code: 'LÝ-G10', name: 'Vật Lý Cơ Bản',
        day: 5, startTime: '15:00', endTime: '16:30', color: '#f59e0b',
    },
];

// Mock attendance per (classId, dayOfWeek)
// 'present' | 'absent' | 'future' (calculated)
const ATTENDANCE_MOCK = {
    '201_1': 'present',
    '201_3': 'absent',
    '202_2': 'present',
    '202_4': 'present',
    '203_5': 'present',
};

const weekDays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00',
    '16:00', '17:00', '18:00', '19:00', '20:00', '21:00',
];

const StudentSchedule = () => {
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('week');

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
        const isToday = date.toDateString() === new Date().toDateString();
        const isFuture = date > new Date();
        if (isFuture || isToday) return 'upcoming';
        const key = `${classItem.id}_${classItem.day}`;
        return ATTENDANCE_MOCK[key] || 'unknown';
    };

    const AttendanceBadge = ({ status }) => {
        const map = {
            present: { icon: <CheckCircle size={12} />, label: 'Có mặt', cls: 'present' },
            absent: { icon: <XCircle size={12} />, label: 'Vắng', cls: 'absent' },
            upcoming: { icon: <MinusCircle size={12} />, label: 'Sắp tới', cls: 'upcoming' },
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
        const dayClasses = STUDENT_CLASSES.filter(c => getDayIndex(c.day) === dayIndex);
        const isToday = date.toDateString() === new Date().toDateString();

        // Group overlapping
        const groups = [];
        dayClasses.forEach(c => {
            const c1s = parseInt(c.startTime) * 60 + parseInt(c.startTime.split(':')[1]);
            const c1e = parseInt(c.endTime) * 60 + parseInt(c.endTime.split(':')[1]);
            let added = false;
            for (const g of groups) {
                const has = g.some(gc => {
                    const gs = parseInt(gc.startTime) * 60 + parseInt(gc.startTime.split(':')[1]);
                    const ge = parseInt(gc.endTime) * 60 + parseInt(gc.endTime.split(':')[1]);
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
                        {groups.map(group =>
                            group.map((c, idx) => {
                                const status = getAttendanceStatus(c, date);
                                return (
                                    <div
                                        key={`${c.id}-${c.day}`}
                                        className="ss-class-card"
                                        style={getClassStyle(c, idx, group.length)}
                                        onClick={() => navigate(`/student/classes/${c.id}`)}
                                    >
                                        <div className="ss-class-code">{c.code}</div>
                                        <div className="ss-class-name">{c.name}</div>
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
                                                const idx = date.getDay() === 0 ? 6 : date.getDay() - 1;
                                                const dayClasses = STUDENT_CLASSES.filter(c => getDayIndex(c.day) === idx);
                                                const isToday = date.toDateString() === new Date().toDateString();
                                                return (
                                                    <div key={i} className={`ss-month-day-cell ${isToday ? 'today' : ''}`}>
                                                        <div className="ss-month-day-number">{date.getDate()}</div>
                                                        <div className="ss-month-day-classes">
                                                            {dayClasses.map(c => {
                                                                const status = getAttendanceStatus(c, date);
                                                                return (
                                                                    <div
                                                                        key={`${c.id}-${c.day}`}
                                                                        className={`ss-month-class-badge att-${status}`}
                                                                        style={{ background: c.color }}
                                                                        onClick={() => navigate(`/student/classes/${c.id}`)}
                                                                    >
                                                                        {c.code}
                                                                    </div>
                                                                );
                                                            })}
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
