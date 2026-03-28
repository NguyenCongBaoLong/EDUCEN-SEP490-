import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock,
    CheckCircle, XCircle, MinusCircle, Loader2
} from 'lucide-react';
import ParentSidebar from '../../components/ParentSidebar';
import { useChild } from '../../context/ChildContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import '../../css/pages/parent/ParentSchedule.css';

const weekDays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444', '#06b6d4'];

const ParentSchedule = () => {
    const navigate = useNavigate();
    const { selectedChild, loading: childLoading } = useChild();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('week');
    const [studentClasses, setStudentClasses] = useState([]);
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!selectedChild) return;
        setIsLoading(true);
        Promise.all([
            api.get(`/Schedules/parent/child/${selectedChild.studentId}`),
            api.get(`/attendance/student/${selectedChild.studentId}`)
        ]).then(([schedRes, attRes]) => {
            const colorMap = {};
            let ci = 0;
            const mapped = schedRes.data.map(item => {
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
            setAttendanceRecords(attRes.data || []);
        }).catch(() => toast.error('Không thể tải lịch học'))
          .finally(() => setIsLoading(false));
    }, [selectedChild]);

    /* ─ Date helpers ─ */
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
        const months = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
        if (viewMode === 'day') {
            const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
            return `${dayNames[currentDate.getDay()]}, ${currentDate.getDate()} ${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        }
        if (viewMode === 'month') return `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        const s = weekDates[0], e = weekDates[6];
        return `${months[s.getMonth()]} ${s.getDate()} - ${e.getDate()}, ${s.getFullYear()}`;
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
        return { top: `${offset * 70}px`, height: `${dur * 70 - 4}px`, backgroundColor: classItem.color, width: `${w}%`, left: `${idx * w}%` };
    };

    const getAttendanceStatus = (classItem, date) => {
        if (date > new Date()) return 'upcoming';
        
        // Use local date instead of toISOString to avoid timezone issues
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        const found = attendanceRecords.find(a => {
            const sessDate = a.sessionDate?.split('T')[0];
            return sessDate === dateStr && a.className === classItem.name;
        });
        return found?.status || 'unknown';
    };

    const AttendanceBadge = ({ status }) => {
        const map = {
            present: { icon: <CheckCircle size={12} />, label: 'Có mặt', cls: 'present' },
            absent: { icon: <XCircle size={12} />, label: 'Vắng', cls: 'absent' },
            upcoming: { icon: <MinusCircle size={12} />, label: 'Sắp tới', cls: 'upcoming' },
            unknown: { icon: <MinusCircle size={12} />, label: '—', cls: 'upcoming' },
        };
        const s = map[status] || map.unknown;
        return <span className={`ps-att-badge ${s.cls}`}>{s.icon} {s.label}</span>;
    };

    const getMonthDates = () => {
        const y = currentDate.getFullYear(), m = currentDate.getMonth();
        const dates = [];
        for (let d = new Date(y, m, 1); d <= new Date(y, m + 1, 0); d.setDate(d.getDate() + 1))
            dates.push(new Date(d));
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
            <div key={dayIndex} className={single ? 'ps-day-column-single' : 'ps-day-column'}>
                <div className={`ps-day-header ${isToday ? 'today' : ''}`}>
                    <div className="ps-day-name">{weekDays[dayIndex]}</div>
                    <div className="ps-day-date">{date.getDate()}</div>
                </div>
                <div className="ps-day-grid">
                    {timeSlots.map((_, i) => <div key={i} className="ps-grid-cell" />)}
                    <div className="ps-classes-container">
                        {groups.map(group =>
                            group.map((c, idx) => {
                                const status = getAttendanceStatus(c, date);
                                return (
                                    <div
                                        key={`${c.id}-${c.day}`}
                                        className="ps-class-card"
                                        style={getClassStyle(c, idx, group.length)}
                                        onClick={() => navigate('/parent/classes')}
                                    >
                                        <div className="ps-class-code">{c.code}</div>
                                        <div className="ps-class-name">{c.name}</div>
                                        <div className="ps-class-time">
                                            <Clock size={10} />{c.startTime} - {c.endTime}
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
        <div className="ps-page">
            <ParentSidebar />

            <main className="ps-main">
                <div className="ps-header">
                    <div>
                        <h1 className="ps-title">Lịch học của {selectedChild?.fullName || 'con'}</h1>
                        <p className="ps-subtitle">Theo dõi lịch học và trạng thái điểm danh của con bạn</p>
                    </div>
                </div>

                {childLoading || isLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                        <Loader2 className="animate-spin" size={48} color="#6366f1" />
                    </div>
                ) : (
                    <>
                        <div className="ps-controls">
                            <div className="ps-date-nav">
                                <button className="ps-btn-nav" onClick={() => navigate_date(-1)}><ChevronLeft size={20} /></button>
                                <div className="ps-date-display"><CalendarIcon size={18} /><span>{formatDateRange()}</span></div>
                                <button className="ps-btn-nav" onClick={() => navigate_date(1)}><ChevronRight size={20} /></button>
                            </div>
                            <div className="ps-view-toggle">
                                {['day', 'week', 'month'].map(m => (
                                    <button key={m} className={`ps-btn-view ${viewMode === m ? 'active' : ''}`} onClick={() => setViewMode(m)}>
                                        {m === 'day' ? 'Ngày' : m === 'week' ? 'Tuần' : 'Tháng'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="ps-legend">
                            <span className="ps-legend-item present"><CheckCircle size={12} /> Có mặt</span>
                            <span className="ps-legend-item absent"><XCircle size={12} /> Vắng mặt</span>
                            <span className="ps-legend-item upcoming"><MinusCircle size={12} /> Sắp tới</span>
                        </div>

                        <div className="ps-content">
                            {viewMode === 'week' && (
                                <div className="ps-calendar">
                                    <div className="ps-time-column">
                                        <div className="ps-day-header" />
                                        {timeSlots.map(t => <div key={t} className="ps-time-slot">{t}</div>)}
                                    </div>
                                    {weekDates.map((date, idx) => renderDayColumn(date, idx))}
                                </div>
                            )}

                            {viewMode === 'day' && (
                                <div className="ps-calendar">
                                    <div className="ps-time-column">
                                        <div className="ps-day-header" />
                                        {timeSlots.map(t => <div key={t} className="ps-time-slot">{t}</div>)}
                                    </div>
                                    {(() => {
                                        const d = new Date(currentDate);
                                        const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
                                        return renderDayColumn(d, idx, true);
                                    })()}
                                </div>
                            )}

                            {viewMode === 'month' && (
                                <div className="ps-month-view">
                                    <div className="ps-month-weekdays">
                                        {weekDays.map(d => <div key={d} className="ps-month-weekday">{d}</div>)}
                                    </div>
                                    <div className="ps-month-grid">
                                        {(() => {
                                            const monthDates = getMonthDates();
                                            const first = monthDates[0].getDay();
                                            const padding = first === 0 ? 6 : first - 1;
                                            return (
                                                <>
                                                    {Array.from({ length: padding }).map((_, i) => (
                                                        <div key={`p${i}`} className="ps-month-day-cell empty" />
                                                    ))}
                                                    {monthDates.map((date, i) => {
                                                        const idx = date.getDay() === 0 ? 6 : date.getDay() - 1;
                                                        const dayClasses = studentClasses.filter(c => getDayIndex(c.day) === idx);
                                                        const isToday = date.toDateString() === new Date().toDateString();
                                                        return (
                                                            <div key={i} className={`ps-month-day-cell ${isToday ? 'today' : ''}`}>
                                                                <div className="ps-month-day-number">{date.getDate()}</div>
                                                                <div className="ps-month-day-classes">
                                                                    {dayClasses.map(c => {
                                                                        const status = getAttendanceStatus(c, date);
                                                                        return (
                                                                            <div
                                                                                key={`${c.id}-${c.day}`}
                                                                                className={`ps-month-class-badge att-${status}`}
                                                                                style={{ background: c.color }}
                                                                                title={`${c.name}`}
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
                    </>
                )}
            </main>
        </div>
    );
};

export default ParentSchedule;
