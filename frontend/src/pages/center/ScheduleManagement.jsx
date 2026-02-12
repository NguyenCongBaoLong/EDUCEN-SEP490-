import { useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, X, AlertTriangle } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import '../../css/pages/center/ScheduleManagement.css';
import '../../css/components/DeleteModal.css';

const ScheduleManagement = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('week'); // day, week, month
    const [teacherFilter, setTeacherFilter] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('');
    const [deleteModal, setDeleteModal] = useState({ show: false, classItem: null });

    // Mock data for scheduled classes - can have multiple classes in same slot
    const [scheduledClasses, setScheduledClasses] = useState([
        {
            id: 1,
            code: 'TOÁN-101',
            name: 'Đại Số Nâng Cao',
            teacher: 'Thầy Minh',
            day: 1, // Monday (1 = Monday, 0 = Sunday)
            startTime: '09:00',
            endTime: '11:00',
            color: '#3b82f6'
        },
        {
            id: 2,
            code: 'LÝ-202',
            name: 'Vật Lý Lượng Tử',
            teacher: null,
            day: 2, // Tuesday
            startTime: '09:00',
            endTime: '11:00',
            color: '#dc2626'
        },
        {
            id: 3,
            code: 'HÓA-105',
            name: 'Hóa Hữu Cơ Thí Nghiệm',
            teacher: 'Cô Hương',
            day: 2, // Tuesday - Same day, overlapping time
            startTime: '10:00',
            endTime: '12:00',
            color: '#f59e0b'
        },
        {
            id: 4,
            code: 'VĂN-300',
            name: 'Văn Học Việt Nam',
            teacher: 'Cô Hà',
            day: 4, // Thursday
            startTime: '09:00',
            endTime: '11:00',
            color: '#8b5cf6'
        },
        {
            id: 5,
            code: 'SINH-101',
            name: 'Sinh Học Cơ Bản',
            teacher: 'Thầy Nam',
            day: 3, // Wednesday
            startTime: '13:00',
            endTime: '15:00',
            color: '#10b981'
        },
        {
            id: 6,
            code: 'ANH-201',
            name: 'IELTS Writing',
            teacher: 'Cô Lan',
            day: 6, // Saturday
            startTime: '09:00',
            endTime: '11:00',
            color: '#06b6d4'
        },
        {
            id: 7,
            code: 'TOÁN-205',
            name: 'Luyện Thi THPT QG',
            teacher: 'Thầy Đức',
            day: 0, // Sunday
            startTime: '14:00',
            endTime: '16:00',
            color: '#ec4899'
        }
    ]);

    // Mock data for unscheduled classes (with pre-set schedules)
    const unscheduledClasses = [
        {
            id: 8,
            code: 'TOÁN-102',
            name: 'Đại Số Cơ Bản',
            teacher: 'Thầy Tuấn',
            schedules: [
                { day: 2, startTime: '14:00', endTime: '16:00' }, // Tuesday
                { day: 4, startTime: '14:00', endTime: '16:00' }  // Thursday
            ],
            color: '#8b5cf6'
        },
        {
            id: 9,
            code: 'ANH-105',
            name: 'Grammar Nâng Cao',
            teacher: 'Cô Linh',
            schedules: [
                { day: 3, startTime: '10:00', endTime: '11:30' }, // Wednesday
                { day: 5, startTime: '10:00', endTime: '11:30' }  // Friday
            ],
            color: '#06b6d4'
        },
        {
            id: 10,
            code: 'VẬT-101',
            name: 'Cơ Học Lý Thuyết',
            teacher: 'Thầy Đức',
            schedules: [
                { day: 1, startTime: '15:00', endTime: '17:00' }  // Monday
            ],
            color: '#f59e0b'
        }
    ];

    const [addClassModal, setAddClassModal] = useState({ show: false });

    // Modal handlers
    const handleDeleteClass = (classItem) => {
        setDeleteModal({ show: true, classItem });
    };

    const confirmDelete = () => {
        if (deleteModal.classItem) {
            setScheduledClasses(scheduledClasses.filter(c => c.id !== deleteModal.classItem.id));
            setDeleteModal({ show: false, classItem: null });
        }
    };

    const cancelDelete = () => {
        setDeleteModal({ show: false, classItem: null });
    };

    // Add class handlers
    const handleAddClassClick = () => {
        setAddClassModal({ show: true });
    };

    const handleAddClass = (classItem) => {
        // Convert each schedule entry to a calendar entry
        const newEntries = classItem.schedules.map((schedule, idx) => ({
            id: `${classItem.id}-${idx}`,
            code: classItem.code,
            name: classItem.name,
            teacher: classItem.teacher,
            day: schedule.day,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            color: classItem.color
        }));

        setScheduledClasses([...scheduledClasses, ...newEntries]);
    };

    const handleAddAllClasses = () => {
        const allNewEntries = [];
        unscheduledClasses.forEach(classItem => {
            classItem.schedules.forEach((schedule, idx) => {
                allNewEntries.push({
                    id: `${classItem.id}-${idx}`,
                    code: classItem.code,
                    name: classItem.name,
                    teacher: classItem.teacher,
                    day: schedule.day,
                    startTime: schedule.startTime,
                    endTime: schedule.endTime,
                    color: classItem.color
                });
            });
        });

        setScheduledClasses([...scheduledClasses, ...allNewEntries]);
        setAddClassModal({ show: false });
    };

    const closeAddClassModal = () => {
        setAddClassModal({ show: false });
    };

    // Filter out classes that are already in the schedule
    const availableClasses = unscheduledClasses.filter(unscheduledClass => {
        // Check if this class code exists in scheduled classes
        return !scheduledClasses.some(scheduled => scheduled.code === unscheduledClass.code);
    });

    // Get all unique class codes in schedule
    const scheduledClassCodes = [...new Set(scheduledClasses.map(c => c.code))];

    // Modified delete handler - deletes ALL slots of the class
    const handleDeleteClassAll = (classItem) => {
        setDeleteModal({ show: true, classItem });
    };

    const confirmDeleteAll = () => {
        if (deleteModal.classItem) {
            // Remove all entries with the same class code
            setScheduledClasses(scheduledClasses.filter(c => c.code !== deleteModal.classItem.code));
            setDeleteModal({ show: false, classItem: null });
        }
    };

    // Get week dates (Monday to Sunday)
    const getWeekDates = () => {
        const start = new Date(currentDate);
        const day = start.getDay();
        // Calculate diff to get to Monday (day 1)
        const diff = day === 0 ? -6 : 1 - day; // If Sunday, go back 6 days; otherwise go to Monday
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
    const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']; // Monday to Sunday

    // Map dayIndex to match the new order (0 = Monday, 6 = Sunday)
    const getDayIndexForClass = (classDay) => {
        // classDay: 0 = Sunday, 1 = Monday, 2 = Tuesday, etc.
        // We need to map to 0-6 where 0 = Monday, 6 = Sunday
        if (classDay === 0) return 6; // Sunday at the end
        return classDay - 1; // Monday-Saturday
    };

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

    // Navigate weeks
    const navigateWeek = (direction) => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + (direction * 7));
        setCurrentDate(newDate);
    };

    // Navigate days
    const navigateDay = (direction) => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + direction);
        setCurrentDate(newDate);
    };

    // Navigate months
    const navigateMonth = (direction) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(currentDate.getMonth() + direction);
        setCurrentDate(newDate);
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


    // Time slots (08:00 to 22:00 for full day coverage)
    const timeSlots = [
        '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00',
        '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
    ];

    // Get class position and height with overlap handling
    const getClassStyle = (classItem, index, totalInSlot) => {
        const startHour = parseInt(classItem.startTime.split(':')[0]);
        const startMin = parseInt(classItem.startTime.split(':')[1]);
        const endHour = parseInt(classItem.endTime.split(':')[0]);
        const endMin = parseInt(classItem.endTime.split(':')[1]);

        const startOffset = (startHour - 8) + (startMin / 60);
        const duration = (endHour - startHour) + ((endMin - startMin) / 60);

        // Calculate width and left position for overlapping classes
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

    // Filter classes
    const filteredClasses = scheduledClasses.filter(classItem => {
        if (teacherFilter && classItem.teacher !== teacherFilter) return false;
        if (subjectFilter && !classItem.code.includes(subjectFilter)) return false;
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
                        <p className="schedule-subtitle">Điều phối {scheduledClasses.length} buổi học trong tuần này</p>
                    </div>
                    <button className="btn-add-class" onClick={handleAddClassClick}>
                        <Plus size={20} />
                        Thêm lớp vào lịch
                    </button>
                </div>

                {/* Date Navigation & Filters */}
                <div className="schedule-controls">
                    <div className="schedule-date-nav">
                        <button className="btn-nav" onClick={() => {
                            if (viewMode === 'day') navigateDay(-1);
                            else if (viewMode === 'week') navigateWeek(-1);
                            else navigateMonth(-1);
                        }}>
                            <ChevronLeft size={20} />
                        </button>
                        <div className="schedule-date-display">
                            <CalendarIcon size={18} />
                            <span>{formatDateRange()}</span>
                        </div>
                        <button className="btn-nav" onClick={() => {
                            if (viewMode === 'day') navigateDay(1);
                            else if (viewMode === 'week') navigateWeek(1);
                            else navigateMonth(1);
                        }}>
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
                            <option value="Thầy Minh">Thầy Minh</option>
                            <option value="Cô Hương">Cô Hương</option>
                            <option value="Thầy Nam">Thầy Nam</option>
                            <option value="Cô Lan">Cô Lan</option>
                            <option value="Thầy Đức">Thầy Đức</option>
                            <option value="Cô Hà">Cô Hà</option>
                        </select>

                        <select
                            className="filter-select"
                            value={subjectFilter}
                            onChange={(e) => setSubjectFilter(e.target.value)}
                        >
                            <option value="">Tất cả môn học</option>
                            <option value="TOÁN">Toán</option>
                            <option value="LÝ">Vật lý</option>
                            <option value="HÓA">Hóa học</option>
                            <option value="VĂN">Văn học</option>
                            <option value="SINH">Sinh học</option>
                            <option value="ANH">Tiếng Anh</option>
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
                    {/* Conditional Rendering Based on View Mode */}
                    {viewMode === 'week' && (
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
                            {weekDates.map((date, dayIndex) => {
                                // Get all classes for this day
                                const dayClasses = filteredClasses.filter(c => getDayIndexForClass(c.day) === dayIndex);

                                // Group overlapping classes
                                const groupedClasses = [];
                                dayClasses.forEach(classItem => {
                                    let added = false;
                                    for (let group of groupedClasses) {
                                        // Check if this class overlaps with any class in the group
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
                                    <div key={dayIndex} className="schedule-day-column">
                                        <div className={`schedule-day-header ${date.toDateString() === new Date().toDateString() ? 'today' : ''}`}>
                                            <div className="schedule-day-name">{weekDays[dayIndex]}</div>
                                            <div className="schedule-day-date">{date.getDate()}</div>
                                        </div>

                                        <div className="schedule-day-grid">
                                            {timeSlots.map((time, timeIndex) => (
                                                <div
                                                    key={timeIndex}
                                                    className="schedule-grid-cell"
                                                ></div>
                                            ))}

                                            {/* Render classes for this day */}
                                            <div className="schedule-classes-container">
                                                {groupedClasses.map((group, groupIndex) =>
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

                    {viewMode === 'day' && (
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

                            {/* Single day column */}
                            {(() => {
                                const date = getDayDate();
                                const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
                                const dayClasses = filteredClasses.filter(c => getDayIndexForClass(c.day) === dayIndex);

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

                                const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

                                return (
                                    <div className="schedule-day-column-single">
                                        <div className={`schedule-day-header ${date.toDateString() === new Date().toDateString() ? 'today' : ''}`}>
                                            <div className="schedule-day-name">{dayNames[date.getDay()]}</div>
                                            <div className="schedule-day-date">{date.getDate()}</div>
                                        </div>

                                        <div className="schedule-day-grid">
                                            {timeSlots.map((time, timeIndex) => (
                                                <div
                                                    key={timeIndex}
                                                    className="schedule-grid-cell"
                                                ></div>
                                            ))}

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
                            })()}
                        </div>
                    )}

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
                                                const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
                                                const dayClasses = filteredClasses.filter(c => getDayIndexForClass(c.day) === dayIndex);
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

                {/* Add Class Modal */}
                {addClassModal.show && (
                    <div className="delete-modal-overlay" onClick={closeAddClassModal}>
                        <div className="delete-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                            {/* Header */}
                            <div className="delete-modal-header">
                                <h3>Thêm Lớp Vào Lịch</h3>
                                <button className="delete-modal-close" onClick={closeAddClassModal}>
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="delete-modal-body">
                                {availableClasses.length === 0 ? (
                                    <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px 0' }}>
                                        Tất cả các lớp đã được thêm vào lịch
                                    </p>
                                ) : (
                                    <>
                                        <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '0.875rem' }}>
                                            Chọn các lớp học để thêm vào lịch (lớp đã có sẵn thời gian học)
                                        </p>

                                        <div className="add-class-list">
                                            {availableClasses.map(classItem => (
                                                <div key={classItem.id} className="add-class-item">
                                                    <div className="add-class-info">
                                                        <div className="add-class-header">
                                                            <span className="add-class-code" style={{ color: classItem.color }}>
                                                                {classItem.code}
                                                            </span>
                                                            <span className="add-class-name">{classItem.name}</span>
                                                        </div>
                                                        <div className="add-class-teacher">
                                                            <User size={14} />
                                                            {classItem.teacher}
                                                        </div>
                                                        <div className="add-class-schedule">
                                                            {classItem.schedules.map((sched, idx) => {
                                                                const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                                                                return (
                                                                    <span key={idx} className="schedule-badge">
                                                                        {dayNames[sched.day]} {sched.startTime}-{sched.endTime}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                    <button
                                                        className="btn-add-single"
                                                        onClick={() => {
                                                            handleAddClass(classItem);
                                                            closeAddClassModal();
                                                        }}
                                                    >
                                                        <Plus size={16} />
                                                        Thêm
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Footer */}
                            {availableClasses.length > 0 && (
                                <div className="delete-modal-footer">
                                    <button className="btn-delete-cancel" onClick={closeAddClassModal}>
                                        Đóng
                                    </button>
                                    <button className="btn-delete-confirm" onClick={handleAddAllClasses}>
                                        <Plus size={16} />
                                        Thêm Tất Cả
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

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
