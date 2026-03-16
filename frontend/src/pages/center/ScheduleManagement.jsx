import { useState, useEffect, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../../components/Sidebar';
import api from '../../services/api';
import '../../css/pages/center/ScheduleManagement.css';
import '../../css/components/DeleteModal.css';
import { useSchedule } from '../../context/ScheduleContext';

const ScheduleManagement = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [teacherFilter, setTeacherFilter] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('');
    const [deleteModal, setDeleteModal] = useState({ show: false, classItem: null });
    const [viewMode, setViewMode] = useState('week'); // 'day', 'week', 'month'
    const [hourRange, setHourRange] = useState({ min: 8, max: 20 });

    // Use shared schedule context (synced with CenterHome)
    const { scheduledClasses, setScheduledClasses, refreshSchedules } = useSchedule();
    const [loading, setLoading] = useState(false);
    const [subjects, setSubjects] = useState([]);

    // Fetch center subjects for filter
    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const res = await api.get('/tenantadmin/Subjects');
                setSubjects(res.data);
            } catch (error) {
                console.error('Lỗi khi tải môn học:', error);
            }
        };
        fetchSubjects();
    }, []);

    // (fetchUnscheduledClasses và useEffect liên quan đã bị xóa)

    // Calculate dynamic hour range based on actual schedules
    useEffect(() => {
        if (scheduledClasses.length > 0) {
            let min = 8;
            let max = 18;

            scheduledClasses.forEach(c => {
                const startHour = parseInt(c.startTime.split(':')[0]);
                const endHour = parseInt(c.endTime.split(':')[0]);

                if (startHour < min) min = startHour;
                if (endHour > max) max = endHour;
            });

            // Add some padding
            setHourRange({
                min: Math.max(0, min - 1),
                max: Math.min(23, max + 1)
            });
        }
    }, [scheduledClasses]);

    const [addClassModal, setAddClassModal] = useState({ show: false });

    // Utility functions
    const getWeekDates = useCallback(() => {
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
    }, [currentDate]);

    const getDayIndexForClass = (classDay) => {
        if (classDay === 0) return 6;
        return classDay - 1;
    };

    // Get single day date
    const getDayDate = () => {
        return new Date(currentDate);
    };

    // Get month dates (all days in current month)
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

    // Modal handlers
    const handleDeleteClass = (classItem) => {
        setDeleteModal({ show: true, classItem });
    };

    const confirmDelete = async () => {
        if (deleteModal.classItem) {
            try {
                await api.delete(`/Schedules/${deleteModal.classItem.id}`);
                refreshSchedules();
                setDeleteModal({ show: false, classItem: null });
                toast.success('Xóa lịch học thành công!');
            } catch (error) {
                toast.error('Lỗi khi xóa lịch học');
            }
        }
    };

    const cancelDelete = () => {
        setDeleteModal({ show: false, classItem: null });
    };

    // (Modal handlers và Add class handlers cũ đã bị xóa)

    // Get all unique class codes in schedule
    const scheduledClassCodes = [...new Set(scheduledClasses.map(c => c.code))];

    // Modified delete handler - deletes ALL slots of the class
    const handleDeleteClassAll = (classItem) => {
        setDeleteModal({ show: true, classItem });
    };

    const confirmDeleteAll = async () => {
        if (deleteModal.classItem) {
            try {
                // Find all schedule IDs for this class code
                const schedulesToDelete = scheduledClasses.filter(c => c.code === deleteModal.classItem.code);
                const deletePromises = schedulesToDelete.map(s => api.delete(`/Schedules/${s.id}`));

                await Promise.all(deletePromises);
                refreshSchedules();
                setDeleteModal({ show: false, classItem: null });
                toast.success(`Đã xóa tất cả buổi học của lớp ${deleteModal.classItem.code}!`);
            } catch (error) {
                console.error(error);
                toast.error("Lỗi khi xóa lịch học hàng loạt");
            }
        }
    };

    const weekDates = getWeekDates();
    const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']; // Monday to Sunday

    // Format date for display
    const formatDateRange = () => {
        const monthNames = [
            'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
            'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
        ];

        if (viewMode === 'day') {
            const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
            const date = getDayDate();
            return `${dayNames[date.getDay()]}, ${date.getDate()} ${monthNames[date.getMonth()]}, ${date.getFullYear()}`;
        } else if (viewMode === 'month') {
            return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        } else {
            // Week view
            const start = weekDates[0];
            const end = weekDates[6];
            return `${monthNames[start.getMonth()]} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
        }
    };

    // Navigate dates
    const navigate = (direction) => {
        const newDate = new Date(currentDate);
        if (viewMode === 'day') {
            newDate.setDate(currentDate.getDate() + direction);
        } else if (viewMode === 'month') {
            newDate.setMonth(currentDate.getMonth() + direction);
        } else {
            // Week
            newDate.setDate(currentDate.getDate() + (direction * 7));
        }
        setCurrentDate(newDate);
    };

    // Dynamic Time slots based on hourRange
    const timeSlots = [];
    for (let h = hourRange.min; h <= hourRange.max; h++) {
        timeSlots.push(`${String(h).padStart(2, '0')}:00`);
    }

    // Get class position and height with overlap handling
    const getClassStyle = (classItem, index, totalInSlot) => {
        const startHour = parseInt(classItem.startTime.split(':')[0]);
        const startMin = parseInt(classItem.startTime.split(':')[1]);
        const endHour = parseInt(classItem.endTime.split(':')[0]);
        const endMin = parseInt(classItem.endTime.split(':')[1]);

        const startOffset = (startHour - hourRange.min) + (startMin / 60);
        const duration = (endHour - startHour) + ((endMin - startMin) / 60);

        // Calculate width and left position for overlapping classes
        const widthPercentage = totalInSlot > 1 ? 100 / totalInSlot : 100;
        const leftPercentage = index * widthPercentage;

        return {
            top: `${startOffset * 40}px`,
            height: `${duration * 40 - 2}px`,
            backgroundColor: classItem.color,
            width: `${widthPercentage}%`,
            left: `${leftPercentage}%`
        };
    };

    // Filter classes
    const filteredClasses = scheduledClasses.filter(classItem => {
        if (teacherFilter && classItem.teacher !== teacherFilter) return false;
        if (subjectFilter && classItem.subjectName !== subjectFilter) return false;
        return true;
    });

    return (
        <div className="schedule-management">
            <Sidebar />

            <main className="schedule-main">
                {/* Header */}
                <div className="schedule-header">
                    <div className="schedule-header-left">
                        <h1>Lịch học lớp</h1>
                        <p className="schedule-subtitle">{scheduledClasses.length} buổi học tuần này</p>
                    </div>
                    {/* Nút thêm lớp đã bị xóa */}
                </div>

                {/* Date Navigation & Filters */}
                <div className="schedule-controls">
                    <div className="schedule-date-nav">
                        <button className="btn-nav" onClick={() => navigate(-1)}>
                            <ChevronLeft size={20} />
                        </button>
                        <div className="schedule-date-display">
                            <CalendarIcon size={18} />
                            <span>{formatDateRange()}</span>
                        </div>
                        <button className="btn-nav" onClick={() => navigate(1)}>
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    <div className="schedule-filters">
                        <select
                            className="filter-select"
                            value={teacherFilter}
                            onChange={(e) => setTeacherFilter(e.target.value)}
                        >
                            <option value="">Tất cả giáo viên</option>
                            {[...new Set(scheduledClasses.map(c => c.teacher))].filter(Boolean).map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>

                        <select
                            className="filter-select"
                            value={subjectFilter}
                            onChange={(e) => setSubjectFilter(e.target.value)}
                        >
                            <option value="">Tất cả môn học</option>
                            {subjects.map(s => (
                                <option key={s.subjectId} value={s.subjectName}>{s.subjectName}</option>
                            ))}
                        </select>
                    </div>

                    <div className="schedule-view-toggle">
                        <button
                            className={`btn-view ${viewMode === 'day' ? 'active' : ''}`}
                            onClick={() => setViewMode('day')}
                        >
                            Ngày
                        </button>
                        <button
                            className={`btn-view ${viewMode === 'week' ? 'active' : ''}`}
                            onClick={() => setViewMode('week')}
                        >
                            Tuần
                        </button>
                        <button
                            className={`btn-view ${viewMode === 'month' ? 'active' : ''}`}
                            onClick={() => setViewMode('month')}
                        >
                            Tháng
                        </button>
                    </div>
                </div>

                {/* Calendar Content */}
                <div className="schedule-content">
                    {/* Day & Week View */}
                    {(viewMode === 'day' || viewMode === 'week') && (
                        <div className="schedule-calendar">
                            {/* Time column */}
                            <div className="schedule-time-column">
                                <div className="schedule-day-header"></div>
                                {timeSlots.map((time) => (
                                    <div key={time} className="schedule-time-slot">
                                        {time}
                                    </div>
                                ))}
                            </div>

                            {/* Day columns */}
                            {(viewMode === 'week' ? weekDates : [getDayDate()]).map((date, dayIdxInView) => {
                                // Normalize date for comparison
                                const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                                const currentDayIdx = date.getDay() === 0 ? 6 : date.getDay() - 1;

                                // Get all classes for this day based on recurring DayOfWeek and Date Range
                                const dayClasses = filteredClasses.filter(c => {
                                    const classDay = c.day === 0 ? 6 : c.day - 1; // Backend: 0=Sun, 1=Mon... -> Frontend logic: 0=Mon, 6=Sun

                                    if (classDay !== currentDayIdx) return false;

                                    // Check date range
                                    if (c.startDate) {
                                        const start = new Date(c.startDate.getFullYear(), c.startDate.getMonth(), c.startDate.getDate());
                                        if (compareDate < start) return false;
                                    }
                                    if (c.endDate) {
                                        const end = new Date(c.endDate.getFullYear(), c.endDate.getMonth(), c.endDate.getDate());
                                        if (compareDate > end) return false;
                                    }

                                    return true;
                                });

                                // Group overlapping classes
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
                                    if (!added) {
                                        groupedClasses.push([classItem]);
                                    }
                                });

                                return (
                                    <div key={dayIdxInView} className={`schedule-day-column ${viewMode === 'day' ? 'schedule-day-column-single' : ''}`}>
                                        <div className={`schedule-day-header ${date.toDateString() === new Date().toDateString() ? 'today' : ''}`}>
                                            <div className="schedule-day-name">{weekDays[currentDayIdx]}</div>
                                            <div className="schedule-day-date">{date.getDate()}</div>
                                        </div>

                                        <div className="schedule-day-grid">
                                            {timeSlots.map((time, timeIndex) => (
                                                <div key={timeIndex} className="schedule-grid-cell"></div>
                                            ))}

                                            {/* Render classes for this day */}
                                            <div className="schedule-classes-container">
                                                {groupedClasses.map((group) =>
                                                    group.map((classItem, indexInGroup) => (
                                                        <div
                                                            key={classItem.id}
                                                            className="schedule-class-card"
                                                            style={getClassStyle(classItem, indexInGroup, group.length)}
                                                        >
                                                            <button
                                                                className="btn-delete-class"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteClassAll(classItem);
                                                                }}
                                                                title="Xóa tất cả buổi học của lớp này"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                            <div className="schedule-class-code">{classItem.code}</div>
                                                            <div className="schedule-class-name">{classItem.name}</div>
                                                            {classItem.teacher && (
                                                                <div className="schedule-class-teacher">
                                                                    <User size={12} />
                                                                    {classItem.teacher}
                                                                </div>
                                                            )}
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

                    {/* Month View */}
                    {viewMode === 'month' && (
                        <div className="schedule-month-view">
                            <div className="month-weekdays">
                                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => (
                                    <div key={day} className="month-weekday">{day}</div>
                                ))}
                            </div>
                            <div className="month-grid">
                                {(() => {
                                    const monthDates = getMonthDates();
                                    const firstDayOfWeek = monthDates[0].getDay();
                                    const paddingDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

                                    return (
                                        <>
                                            {/* Padding for days before month starts */}
                                            {Array.from({ length: paddingDays }).map((_, i) => (
                                                <div key={`padding-${i}`} className="month-day-cell empty"></div>
                                            ))}

                                            {/* Month days */}
                                            {monthDates.map((date, dateIndex) => {
                                                const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                                                const currentDayIdx = date.getDay() === 0 ? 6 : date.getDay() - 1;

                                                const dayClasses = filteredClasses.filter(c => {
                                                    const classDay = c.day === 0 ? 6 : c.day - 1;
                                                    if (classDay !== currentDayIdx) return false;

                                                    // Check date range
                                                    if (c.startDate) {
                                                        const start = new Date(c.startDate.getFullYear(), c.startDate.getMonth(), c.startDate.getDate());
                                                        if (compareDate < start) return false;
                                                    }
                                                    if (c.endDate) {
                                                        const end = new Date(c.endDate.getFullYear(), c.endDate.getMonth(), c.endDate.getDate());
                                                        if (compareDate > end) return false;
                                                    }

                                                    return true;
                                                });
                                                const isToday = date.toDateString() === new Date().toDateString();

                                                return (
                                                    <div
                                                        key={dateIndex}
                                                        className={`month-day-cell ${isToday ? 'today' : ''}`}
                                                    >
                                                        <div className="month-day-number">{date.getDate()}</div>
                                                        <div className="month-day-classes">
                                                            {dayClasses.slice(0, 3).map(classItem => (
                                                                <div
                                                                    key={classItem.id}
                                                                    className="month-class-badge"
                                                                    style={{ backgroundColor: classItem.color }}
                                                                    title={`${classItem.code} - ${classItem.name}\n${classItem.startTime} - ${classItem.endTime}`}
                                                                >
                                                                    {classItem.code}
                                                                </div>
                                                            ))}
                                                            {dayClasses.length > 3 && (
                                                                <div className="month-class-more">
                                                                    +{dayClasses.length - 3}
                                                                </div>
                                                            )}
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

                {/* Add Class Modal đã bị xóa */}

                {/* Delete Confirmation Modal */}
                {deleteModal.show && (
                    <div className="delete-modal-overlay" onClick={cancelDelete}>
                        <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
                            {/* Header */}
                            <div className="delete-modal-header">
                                <h3>Xóa Lớp Khỏi Lịch</h3>
                                <button className="delete-modal-close" onClick={cancelDelete}>
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="delete-modal-body">
                                {/* Warning Section */}
                                <div className="delete-modal-warning">
                                    <div className="delete-modal-warning-icon">
                                        <AlertTriangle size={20} />
                                    </div>
                                    <div className="delete-modal-warning-content">
                                        <h4>Bạn có chắc muốn xóa lớp này?</h4>
                                        <p>
                                            Hành động này sẽ xóa lớp <strong>{deleteModal.classItem?.code}</strong> và tất cả buổi học của lớp này khỏi lịch.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="delete-modal-footer">
                                <button className="btn-delete-cancel" onClick={cancelDelete}>
                                    Hủy
                                </button>
                                <button className="btn-delete-confirm" onClick={confirmDeleteAll}>
                                    Xóa Lớp
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ScheduleManagement;
