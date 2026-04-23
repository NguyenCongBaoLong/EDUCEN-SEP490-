import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, Clock, CheckCircle, MessageSquare, MapPin } from 'lucide-react';
import TeacherSidebar from '../../components/TeacherSidebar';
import TeacherInboxDrawer from '../../components/TeacherInboxDrawer';
import api from '../../services/api';

import ScheduleRequestModal from '../../components/ScheduleRequestModal';
import '../../css/pages/teacher/TeacherSchedule.css';
import { useSchedule } from '../../context/ScheduleContext';

const SCHEDULE_CHANGE_TAG = '[SCHEDULE_CHANGE]';


const TeacherSchedule = ({ isTA = false }) => {
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('week');


    // State cho Modal yêu cầu thay đổi
    const [requestOpen, setRequestOpen] = useState(false);
    const [requestInitialData, setRequestInitialData] = useState(null);
    const [rooms, setRooms] = useState([]);

    // Sử dụng shared schedule context
    const { scheduledClasses } = useSchedule();

    // Lấy thông tin giáo viên từ localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const teacherName = user.fullName || "Giáo viên";

    // Nếu fetch từ /Schedules/teacher/me thì đã được lọc từ BE rồi
    const filteredClasses = scheduledClasses;

    // Filter out inactive classes
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeClasses = (scheduledClasses || []).filter(c => {
        if (c.status && c.status !== "Active") return false;
        if (c.endDate) {
            const endDate = new Date(c.endDate);
            endDate.setHours(0, 0, 0, 0);
            if (endDate < today) return false;
        }
        return true;
    });

    const classOptions = useMemo(() => {
        const grouped = new Map();
        (activeClasses || []).filter(c => c.source !== 'session').forEach((c) => {
            const key = c.classId || c.id;
            if (!key) return;
            if (!grouped.has(key)) {
                grouped.set(key, {
                    classId: key,
                    name: c.name || c.className || "Lớp học",
                    code: c.code || `CLASS-${key}`,
                    time: "",
                    date: "",
                    scheduleSlots: []
                });
            }
            grouped.get(key).scheduleSlots.push({
                id: c.id, // day: scheduleId mapped in context
                dayOfWeek: c.day,
                startTime: c.startTime,
                endTime: c.endTime,
                roomName: c.roomName || "",
                roomId: c.roomId || null
            });
        });
        return Array.from(grouped.values());
    }, [activeClasses]);

    // Fetch danh sách phòng
    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const res = await api.get('/Rooms');
                setRooms(res.data || []);
            } catch (error) {
                console.error('Error fetching rooms:', error);
                setRooms([]);
            }
        };
        fetchRooms();
    }, []);

    // Get week dates (Monday to Sunday)
    const getWeekDates = () => {
        const start = new Date(currentDate);
        const day = start.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        start.setDate(start.getDate() + diff);

        const dates = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(start);
            date.setDate(start.getDate() + i);
            dates.push(date);
        }
        return dates;
    };

    const weekDates = getWeekDates();
    const weekDays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];

    const getDayIndexForClass = (classDay) => {
        if (classDay === 0) return 6;
        return classDay - 1;
    };

    const isSameDate = (d1, d2) =>
        d1 && d2 &&
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();

    const toDateKey = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

    const sessionDateKeysByClass = useMemo(() => {
        const map = new Map();
        (filteredClasses || []).forEach((c) => {
            if (c.source !== 'session' || !c.sessionDate || !c.classId) return;
            const classKey = String(c.classId);
            if (!map.has(classKey)) map.set(classKey, new Set());
            map.get(classKey).add(toDateKey(c.sessionDate));
        });
        return map;
    }, [filteredClasses]);

    const movedFromDateKeysByClass = useMemo(() => {
        const map = new Map();
        const scheduleDayByScheduleId = new Map();
        (filteredClasses || []).forEach((c) => {
            if (c.source === 'schedule' && c.id) {
                scheduleDayByScheduleId.set(c.id, c.day);
            }
        });
        (filteredClasses || []).forEach((c) => {
            if (c.source !== 'session' || !c.sessionDate || !c.classId) return;
            if (c.sessionStatus && c.sessionStatus !== 'Scheduled') return;
            const sessionJsDay = c.sessionDate.getDay();
            const expectedDay = scheduleDayByScheduleId.get(c.id) ?? c.day;
            if (sessionJsDay === expectedDay) return;
            const movedFromDate = new Date(c.sessionDate);
            movedFromDate.setDate(movedFromDate.getDate() + (expectedDay - sessionJsDay));
            const classKey = String(c.classId);
            if (!map.has(classKey)) map.set(classKey, new Set());
            map.get(classKey).add(toDateKey(movedFromDate));
        });
        return map;
    }, [filteredClasses]);

    const occursOnDate = (classItem, date) => {
        if (classItem.source === 'session' && classItem.sessionDate) {
            if (classItem.sessionStatus && classItem.sessionStatus !== 'Scheduled') return false;
            return isSameDate(classItem.sessionDate, date);
        }

        const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
        const isSameDay = getDayIndexForClass(classItem.day) === dayIndex;
        if (!isSameDay) return false;

        const check = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
        const start = classItem.startDate
            ? new Date(classItem.startDate.getFullYear(), classItem.startDate.getMonth(), classItem.startDate.getDate()).getTime()
            : 0;
        const end = classItem.endDate
            ? new Date(classItem.endDate.getFullYear(), classItem.endDate.getMonth(), classItem.endDate.getDate()).getTime()
            : Infinity;

        if (!(check >= start && check <= end)) return false;

        const classKey = String(classItem.classId || '');
        const overrideDateSet = sessionDateKeysByClass.get(classKey);
        if (overrideDateSet && overrideDateSet.has(toDateKey(date))) {
            return false;
        }
        const movedFromDateSet = movedFromDateKeysByClass.get(classKey);
        if (movedFromDateSet && movedFromDateSet.has(toDateKey(date))) {
            return false;
        }

        return true;
    };

    const formatDateRange = () => {
        const monthNames = [
            'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
            'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
        ];

        if (viewMode === 'day') {
            const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
            const date = new Date(currentDate);
            return `${dayNames[date.getDay()]}, ${date.getDate()} ${monthNames[date.getMonth()]}, ${date.getFullYear()}`;
        } else if (viewMode === 'month') {
            return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        } else {
            const start = weekDates[0];
            const end = weekDates[6];
            return `${monthNames[start.getMonth()]} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
        }
    };

    const navigateWeek = (direction) => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + (direction * 7));
        setCurrentDate(newDate);
    };

    const navigateDay = (direction) => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + direction);
        setCurrentDate(newDate);
    };

    const navigateMonth = (direction) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(currentDate.getMonth() + direction);
        setCurrentDate(newDate);
    };

    const getMonthDates = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const dates = [];
        for (let date = new Date(firstDay); date <= lastDay; date.setDate(date.getDate() + 1)) {
            dates.push(new Date(date));
        }
        return dates;
    };

    const timeSlots = [
        '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00',
        '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
    ];

    const handleCardClick = (classItem) => {
        if (classItem.classId) {
            navigate(isTA ? `/ta/classes/${classItem.classId}` : `/teacher/classes/${classItem.classId}`);
        } else {
            toast.error("Không tìm thấy thông tin lớp học");
        }
    };


    const getClassStyle = (classItem, index, totalInSlot) => {
        const [sh, sm] = classItem.startTime.split(':').map(Number);
        const [eh, em] = classItem.endTime.split(':').map(Number);
        const duration = (eh + em / 60) - (sh + sm / 60);
        const startOffset = (sh - 8) + (sm / 60);

        const widthPercentage = totalInSlot > 1 ? 100 / totalInSlot : 100;
        const leftPercentage = index * widthPercentage;

        return {
            top: `${startOffset * 85}px`,
            height: `${duration * 85 - 4}px`,
            backgroundColor: classItem.color,
            width: `${widthPercentage}%`,
            left: `${leftPercentage}%`
        };
    };

    return (
        <div className="teacher-schedule">
            <TeacherSidebar isTA={isTA} />

            <main className="ts-main">
                <div className="ts-header">
                    <div className="ts-header-left">
                        <h1>Lịch dạy của tôi</h1>
                        <p className="ts-subtitle">Chào {teacherName}, bạn có {filteredClasses.length} buổi dạy được phân công</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <TeacherInboxDrawer />
                        <button className="ts-btn-request" onClick={() => {
                            setRequestInitialData(null);
                            setRequestOpen(true);
                        }}>
                            <MessageSquare size={18} />
                            Yêu cầu thay đổi
                        </button>
                    </div>
                </div>

                <div className="ts-controls">
                    <div className="ts-date-nav">
                        <button className="ts-btn-nav" onClick={() => {
                            if (viewMode === 'day') navigateDay(-1);
                            else if (viewMode === 'week') navigateWeek(-1);
                            else navigateMonth(-1);
                        }}>
                            <ChevronLeft size={20} />
                        </button>
                        <div className="ts-date-display">
                            <CalendarIcon size={18} />
                            <span>{formatDateRange()}</span>
                        </div>
                        <button className="ts-btn-nav" onClick={() => {
                            if (viewMode === 'day') navigateDay(1);
                            else if (viewMode === 'week') navigateWeek(1);
                            else navigateMonth(1);
                        }}>
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    <div className="ts-view-toggle">
                        <button
                            className={`ts-btn-view ${viewMode === 'day' ? 'active' : ''}`}
                            onClick={() => setViewMode('day')}
                        >
                            Ngày
                        </button>
                        <button
                            className={`ts-btn-view ${viewMode === 'week' ? 'active' : ''}`}
                            onClick={() => setViewMode('week')}
                        >
                            Tuần
                        </button>
                        <button
                            className={`ts-btn-view ${viewMode === 'month' ? 'active' : ''}`}
                            onClick={() => setViewMode('month')}
                        >
                            Tháng
                        </button>
                    </div>
                </div>

                <div className="ts-content">
                    {viewMode === 'week' && (
                        <div className="ts-calendar">
                            <div className="ts-time-column">
                                <div className="ts-day-header"></div>
                                {timeSlots.map((time) => (
                                    <div key={time} className="ts-time-slot">
                                        <span className="ts-time-label">{time}</span>
                                    </div>
                                ))}
                            </div>

                            {weekDates.map((date, dayIndex) => {
                                const dayClasses = filteredClasses.filter(c => occursOnDate(c, date));

                                // Group overlapping
                                const groupedClasses = [];
                                dayClasses.forEach(classItem => {
                                    let added = false;
                                    for (let group of groupedClasses) {
                                        const hasOverlap = group.some(gc => {
                                            const c1Start = parseInt(classItem.startTime.split(':')[0]) * 60 + parseInt(classItem.startTime.split(':')[1]);
                                            const c1End = parseInt(classItem.endTime.split(':')[0]) * 60 + parseInt(classItem.endTime.split(':')[1]);
                                            const c2Start = parseInt(gc.startTime.split(':')[0]) * 60 + parseInt(gc.startTime.split(':')[1]);
                                            const c2End = parseInt(gc.endTime.split(':')[0]) * 60 + parseInt(gc.endTime.split(':')[1]);
                                            return (c1Start < c2End && c1End > c2Start);
                                        });
                                        if (hasOverlap) {
                                            group.push(classItem);
                                            added = true;
                                            break;
                                        }
                                    }
                                    if (!added) groupedClasses.push([classItem]);
                                });

                                return (
                                    <div key={dayIndex} className="ts-day-column">
                                        <div className={`ts-day-header ${date.toDateString() === new Date().toDateString() ? 'today' : ''}`}>
                                            <div className="ts-day-name">{weekDays[dayIndex]}</div>
                                            <div className="ts-day-date">{date.getDate()}</div>
                                        </div>
                                        <div className="ts-day-grid">
                                            {timeSlots.map((_, i) => <div key={i} className="ts-grid-cell"></div>)}
                                            <div className="ts-classes-container">
                                                {groupedClasses.map(group =>
                                                    group.map((classItem, idx) => (
                                                        <div
                                                            key={classItem.eventKey || `${classItem.id}-${classItem.startTime}-${classItem.endTime}`}
                                                            className="ts-class-card"
                                                            style={getClassStyle(classItem, idx, group.length)}
                                                            title={`${classItem.code} - ${classItem.name}\nGiờ: ${classItem.startTime} - ${classItem.endTime}\nPhòng: ${classItem.roomName || 'N/A'}\nGiáo viên: ${classItem.teacher || 'N/A'}`}
                                                            onClick={() => handleCardClick(classItem)}
                                                        >
                                                            <div className="ts-class-code">
                                                                {classItem.code}
                                                            </div>
                                                            <div className="ts-class-name">{classItem.name}</div>
                                                            <div className="ts-class-time" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                    <Clock size={10} />
                                                                    {classItem.startTime} - {classItem.endTime}
                                                                </span>
                                                                <span style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    background: 'rgba(255, 255, 255, 0.25)',
                                                                    padding: '2px 6px',
                                                                    borderRadius: '4px',
                                                                    fontWeight: 700,
                                                                    fontSize: '0.65rem'
                                                                }}>
                                                                    <MapPin size={10} />
                                                                    {classItem.roomName || 'N/A'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {viewMode === 'day' && (
                        <div className="ts-calendar">
                            <div className="ts-time-column">
                                <div className="ts-day-header"></div>
                                {timeSlots.map((time) => (
                                    <div key={time} className="ts-time-slot">
                                        <span className="ts-time-label">{time}</span>
                                    </div>
                                ))}
                            </div>

                            {(() => {
                                const date = new Date(currentDate);
                                const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
                                const dayClasses = filteredClasses.filter(c => occursOnDate(c, date));

                                return (
                                    <div className="ts-day-column-single">
                                        <div className={`ts-day-header ${date.toDateString() === new Date().toDateString() ? 'today' : ''}`}>
                                            <div className="ts-day-name">{weekDays[dayIndex]}</div>
                                            <div className="ts-day-date">{date.getDate()}</div>
                                        </div>
                                        <div className="ts-day-grid">
                                            {timeSlots.map((_, i) => <div key={i} className="ts-grid-cell"></div>)}
                                            <div className="ts-classes-container">
                                                {dayClasses.map((classItem) => (
                                                    <div
                                                        key={classItem.eventKey || `${classItem.id}-${classItem.startTime}-${classItem.endTime}`}
                                                        className="ts-class-card"
                                                        style={getClassStyle(classItem, 0, 1)}
                                                        title={`${classItem.code} - ${classItem.name}\nGiờ: ${classItem.startTime} - ${classItem.endTime}\nPhòng: ${classItem.roomName || 'N/A'}\nGiáo viên: ${classItem.teacher || 'N/A'}`}
                                                        onClick={() => handleCardClick(classItem)}
                                                    >
                                                        <div className="ts-class-code">
                                                            {classItem.code}
                                                        </div>
                                                        <div className="ts-class-name">{classItem.name}</div>
                                                        <div className="ts-class-time">
                                                            <Clock size={12} />
                                                            {classItem.startTime} - {classItem.endTime}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {viewMode === 'month' && (
                        <div className="ts-month-view">
                            <div className="ts-month-weekdays">
                                {weekDays.map(day => <div key={day} className="ts-month-weekday">{day}</div>)}
                            </div>
                            <div className="ts-month-grid">
                                {(() => {
                                    const monthDates = getMonthDates();
                                    const firstDayOfWeek = monthDates[0].getDay();
                                    const paddingDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

                                    return (
                                        <>
                                            {Array.from({ length: paddingDays }).map((_, i) => (
                                                <div key={`p-${i}`} className="ts-month-day-cell empty"></div>
                                            ))}
                                            {monthDates.map((date, i) => {
                                                const dayClasses = filteredClasses.filter(c => occursOnDate(c, date));
                                                const isToday = date.toDateString() === new Date().toDateString();

                                                return (
                                                    <div key={i} className={`ts-month-day-cell ${isToday ? 'today' : ''}`}>
                                                        <div className="ts-month-day-number">{date.getDate()}</div>
                                                        <div className="ts-month-day-classes">
                                                            {dayClasses.map(c => (
                                                                <div
                                                                    key={c.eventKey || `${c.id}-${c.startTime}-${c.endTime}`}
                                                                    className="ts-month-class-badge"
                                                                    style={{ backgroundColor: c.color }}
                                                                >
                                                                    {c.code}
                                                                </div>
                                                            ))}
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


            {/* Request Change Modal */}
            {requestOpen && (
                <ScheduleRequestModal
                    isOpen={requestOpen}
                    onClose={() => setRequestOpen(false)}
                    onSend={async (payload) => {
                        try {
                            const typeLabels = {
                                schedule_change: 'Đổi lịch dạy',
                                reschedule: 'Đổi lịch dạy',
                                teacher_swap: 'Đổi giáo viên',
                                absence: 'Xin nghỉ / Hủy buổi',
                                other: 'Thay đổi khác',
                            };
                            const classInfo = (payload.classInfo && payload.type !== 'other') ? ` [${payload.classInfo.code} - ${payload.classInfo.name}]` : '';
                            const tag = payload.type === 'schedule_change' ? SCHEDULE_CHANGE_TAG : '[SUPPORT]';
                            const Title = `${tag} [${typeLabels[payload.type] || 'Yêu cầu'}]${classInfo}`;

                            // Giao diện thuần Tiếng Việt cho người dùng
                            let Content = `Loại yêu cầu: ${typeLabels[payload.type] || payload.type}\nLý do: ${payload.reason || 'Không có'}`;

                            if (payload.type === 'schedule_change') {
                                if (payload.currentSlot) {
                                    Content += `\nSlot hiện tại: ${payload.currentSlot.dayLabel} (${payload.currentSlot.startTime} - ${payload.currentSlot.endTime})`;
                                    if (payload.currentRoomId) {
                                        const currentRoom = rooms.find(r => r.roomId === payload.currentRoomId);
                                        if (currentRoom) Content += `\nPhòng hiện tại: ${currentRoom.roomName}`;
                                    }
                                }

                                if (payload.requestedSlot) {
                                    Content += `\nSlot mới: ${payload.requestedSlot.dayLabel} (${payload.requestedSlot.startTime} - ${payload.requestedSlot.endTime})`;
                                }
                                if (payload.requestedRoomId) {
                                    const room = rooms.find(r => r.roomId === payload.requestedRoomId);
                                    if (room) Content += `\nPhòng mới: ${room.roomName}`;
                                }
                                if (payload.changeType) {
                                    const changeTypeLabel = payload.changeType === 'single_session' ? 'Đổi 1 buổi học cụ thể' : 'Đổi toàn bộ lịch';
                                    Content += `\nLoại đổi: ${payload.changeType}`;
                                }
                                if (payload.targetSessionDate) {
                                    const date = new Date(payload.targetSessionDate);
                                    const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
                                    Content += `\nNgày đổi: ${payload.targetSessionDate}`;
                                }
                            }

                            // DỮ LIỆU HỆ THỐNG (SẼ ĐƯỢC GIẤU KHỎI GIAO DIỆN)
                            const classId = (payload.type === 'schedule_change') ? payload.classInfo?.classId : '';
                            const slotId = (payload.type === 'schedule_change') ? payload.currentSlot?.id : '';
                            const roomId = (payload.type === 'schedule_change') ? payload.requestedRoomId : '';
                            const changeType = (payload.type === 'schedule_change') ? payload.changeType : '';
                            const targetSessionDate = (payload.type === 'schedule_change') ? payload.targetSessionDate : '';

                            Content += `\n\n[SYSTEM_DATA]\nClassId: ${classId}\nSlotId: ${slotId}\nRoomId: ${roomId}\nChangeType: ${changeType}\nTargetSessionDate: ${targetSessionDate}\n[/SYSTEM_DATA]`;

                            console.log('[TeacherSchedule] Sending request:', { Title, Content, payload });
                            await api.post('/support-requests', { Title, Content });
                            toast.success('Yêu cầu đã được gửi đến admin!');
                            setRequestOpen(false);
                        } catch (error) {
                            console.error('Error sending request:', error);
                            toast.error(error.response?.data?.message || 'Gửi yêu cầu thất bại.');
                        }
                    }}
                    initialData={requestInitialData}
                    classOptions={classOptions}
                    rooms={rooms}
                />
            )}
        </div>
    );
};

export default TeacherSchedule;

