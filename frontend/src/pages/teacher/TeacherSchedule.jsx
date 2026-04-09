import { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, Clock, CheckCircle, MessageSquare, MapPin } from 'lucide-react';
import TeacherSidebar from '../../components/TeacherSidebar';
import TeacherInboxDrawer from '../../components/TeacherInboxDrawer';
import api from '../../services/api';

import ScheduleRequestModal from '../../components/ScheduleRequestModal';
import '../../css/pages/teacher/TeacherSchedule.css';
import { useSchedule } from '../../context/ScheduleContext';
import { showValidationError } from '../../services/toastHelper';


const TeacherSchedule = ({ isTA = false }) => {
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('week');


    // State cho Modal yêu cầu thay đổi
    const [requestOpen, setRequestOpen] = useState(false);
    const [requestInitialData, setRequestInitialData] = useState(null);

    // Sử dụng shared schedule context
    const { scheduledClasses } = useSchedule();

    // Lấy thông tin giáo viên từ localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const teacherName = user.fullName || "Giáo viên";

    // Nếu fetch từ /Schedules/teacher/me thì đã được lọc từ BE rồi
    const filteredClasses = scheduledClasses;

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
            showValidationError(null, "Không tìm thấy thông tin lớp học");
        }
    };


    const getClassStyle = (classItem, index, totalInSlot) => {
        const startHour = parseInt(classItem.startTime.split(':')[0]);
        const startMin = parseInt(classItem.startTime.split(':')[1]);
        const endHour = parseInt(classItem.endTime.split(':')[0]);
        const endMin = parseInt(classItem.endTime.split(':')[1]);

        const startOffset = (startHour - 8) + (startMin / 60);
        const duration = (endHour - startHour) + ((endMin - startMin) / 60);

        const widthPercentage = totalInSlot > 1 ? 100 / totalInSlot : 100;
        const leftPercentage = index * widthPercentage;

        return {
            top: `${startOffset * 70}px`,
            height: `${duration * 70 - 4}px`,
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
                                    <div key={time} className="ts-time-slot">{time}</div>
                                ))}
                            </div>

                            {weekDates.map((date, dayIndex) => {
                                const dayClasses = filteredClasses.filter(c => {
                                    const isSameDay = getDayIndexForClass(c.day) === dayIndex;
                                    if (!isSameDay) return false;

                                    // Filter by date range
                                    const check = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
                                    const start = c.startDate ? new Date(c.startDate.getFullYear(), c.startDate.getMonth(), c.startDate.getDate()).getTime() : 0;
                                    const end = c.endDate ? new Date(c.endDate.getFullYear(), c.endDate.getMonth(), c.endDate.getDate()).getTime() : Infinity;

                                    return check >= start && check <= end;
                                });

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
                                                            key={classItem.id}
                                                            className="ts-class-card"
                                                            style={getClassStyle(classItem, idx, group.length)}
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
                                    <div key={time} className="ts-time-slot">{time}</div>
                                ))}
                            </div>

                            {(() => {
                                const date = new Date(currentDate);
                                const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
                                const dayClasses = filteredClasses.filter(c => {
                                    const isSameDay = getDayIndexForClass(c.day) === dayIndex;
                                    if (!isSameDay) return false;

                                    // Filter by date range
                                    const check = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
                                    const start = c.startDate ? new Date(c.startDate.getFullYear(), c.startDate.getMonth(), c.startDate.getDate()).getTime() : 0;
                                    const end = c.endDate ? new Date(c.endDate.getFullYear(), c.endDate.getMonth(), c.endDate.getDate()).getTime() : Infinity;

                                    return check >= start && check <= end;
                                });

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
                                                        key={classItem.id}
                                                        className="ts-class-card"
                                                        style={getClassStyle(classItem, 0, 1)}
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
                                                const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
                                                const dayClasses = filteredClasses.filter(c => {
                                                    const isSameDay = getDayIndexForClass(c.day) === dayIndex;
                                                    if (!isSameDay) return false;

                                                    // Filter by date range
                                                    const check = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
                                                    const start = c.startDate ? new Date(c.startDate.getFullYear(), c.startDate.getMonth(), c.startDate.getDate()).getTime() : 0;
                                                    const end = c.endDate ? new Date(c.endDate.getFullYear(), c.endDate.getMonth(), c.endDate.getDate()).getTime() : Infinity;

                                                    return check >= start && check <= end;
                                                });
                                                const isToday = date.toDateString() === new Date().toDateString();

                                                return (
                                                    <div key={i} className={`ts-month-day-cell ${isToday ? 'today' : ''}`}>
                                                        <div className="ts-month-day-number">{date.getDate()}</div>
                                                        <div className="ts-month-day-classes">
                                                            {dayClasses.map(c => (
                                                                <div
                                                                    key={c.id}
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
                                reschedule: 'Đổi lịch dạy',
                                teacher_swap: 'Đổi giáo viên',
                                absence: 'Xin nghỉ / Hủy buổi',
                                other: 'Thay đổi khác',
                            };
                            const classInfo = payload.classInfo ? ` [${payload.classInfo.code} - ${payload.classInfo.name}]` : '';
                            const Title = `[${typeLabels[payload.type] || 'Yêu cầu'}]${classInfo}`;
                            const Content = `Loại yêu cầu: ${typeLabels[payload.type] || payload.type}\nLý do: ${payload.reason || 'Không có'}`;

                            await api.post('/support-requests', { Title, Content });
                            toast.success('Yêu cầu đã được gửi đến admin!');
                            setRequestOpen(false);
                        } catch (error) {
                            console.error('Error sending request:', error);
                            showValidationError(error, 'Gửi yêu cầu thất bại.');
                        }
                    }}
                    initialData={requestInitialData}
                />
            )}
        </div>
    );
};

export default TeacherSchedule;
