import { useState, useMemo } from 'react';
import { X, Search, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import PropTypes from 'prop-types';
import '../css/components/TeacherAssignModal.css';

const TeacherAssignModal = ({ isOpen, onClose, onSelectTeacher, classSchedule }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
    const [selectedTeacher, setSelectedTeacher] = useState(null);

    // Mock teacher data with schedules
    const teachers = [
        {
            id: 1,
            name: "Dr. Sarah Jenkins",
            title: "Senior Lecturer",
            department: "Mathematics",
            avatar: "SJ",
            schedule: [
                { day: "MON", startTime: "10:00", endTime: "11:30", class: "Algebra 101" },
                { day: "WED", startTime: "10:00", endTime: "11:30", class: "Algebra 101" },
                { day: "FRI", startTime: "14:00", endTime: "15:30", class: "Calculus 201" }
            ]
        },
        {
            id: 2,
            name: "Prof. Robert Fox",
            title: "Department Head",
            department: "Mathematics",
            avatar: "RF",
            schedule: [
                { day: "MON", startTime: "09:00", endTime: "10:30", class: "Statistics 101" },
                { day: "TUE", startTime: "14:00", endTime: "15:30", class: "Advanced Math" },
                { day: "THU", startTime: "09:00", endTime: "10:30", class: "Statistics 101" }
            ]
        },
        {
            id: 3,
            name: "Michael Chen",
            title: "Associate Professor",
            department: "Mathematics",
            avatar: "MC",
            schedule: [
                { day: "TUE", startTime: "10:00", endTime: "11:30", class: "Geometry 102" },
                { day: "THU", startTime: "13:00", endTime: "14:30", class: "Trigonometry" }
            ]
        },
        {
            id: 4,
            name: "Alice Rivera",
            title: "Lecturer",
            department: "Science",
            avatar: "AR",
            schedule: [
                { day: "MON", startTime: "13:00", endTime: "14:30", class: "Biology 101" },
                { day: "WED", startTime: "15:00", endTime: "16:30", class: "Chemistry Lab" }
            ]
        },
        {
            id: 5,
            name: "Dr. James Wilson",
            title: "Senior Lecturer",
            department: "Physics",
            avatar: "JW",
            schedule: [
                { day: "TUE", startTime: "09:00", endTime: "10:30", class: "Physics 201" },
                { day: "THU", startTime: "09:00", endTime: "10:30", class: "Physics 201" }
            ]
        },
        {
            id: 6,
            name: "Emma Thompson",
            title: "Lecturer",
            department: "English",
            avatar: "ET",
            schedule: [
                { day: "MON", startTime: "11:00", endTime: "12:30", class: "Literature 101" },
                { day: "WED", startTime: "11:00", endTime: "12:30", class: "Creative Writing" },
                { day: "FRI", startTime: "10:00", endTime: "11:30", class: "Grammar" }
            ]
        }
    ];

    const departments = ['All Departments', 'Mathematics', 'Science', 'Physics', 'English'];

    // Parse class schedule (e.g., "Thứ 2, Thứ 4 • 10:00")
    const parseClassSchedule = (schedule) => {
        if (!schedule || !schedule.includes('•')) {
            return { days: [], time: null };
        }

        const parts = schedule.split('•');
        if (parts.length < 2) {
            return { days: [], time: null };
        }

        const [daysStr, timeStr] = parts.map(s => s.trim());

        // Map Vietnamese days to English abbreviations
        const dayMap = {
            'Thứ 2': 'MON', 'Mon': 'MON',
            'Thứ 3': 'TUE', 'Tue': 'TUE',
            'Thứ 4': 'WED', 'Wed': 'WED',
            'Thứ 5': 'THU', 'Thu': 'THU',
            'Thứ 6': 'FRI', 'Fri': 'FRI',
            'Thứ 7': 'SAT', 'Sat': 'SAT',
            'CN': 'SUN', 'Sun': 'SUN'
        };

        if (!daysStr) {
            return { days: [], time: timeStr || null };
        }

        const days = daysStr.split(',').map(d => {
            const trimmed = d.trim();
            return dayMap[trimmed] || trimmed;
        }).filter(Boolean);

        return { days, time: timeStr || null };
    };

    // Check if two time ranges overlap
    const timeOverlap = (start1, end1, start2, end2) => {
        const toMinutes = (time) => {
            const [hours, minutes] = time.split(':').map(Number);
            return hours * 60 + minutes;
        };

        const s1 = toMinutes(start1);
        const e1 = toMinutes(end1);
        const s2 = toMinutes(start2);
        const e2 = toMinutes(end2);

        return s1 < e2 && e1 > s2;
    };

    // Check if teacher has conflict with class schedule
    const checkConflict = (teacher) => {
        const { days, time } = parseClassSchedule(classSchedule);
        if (!time || days.length === 0) return { hasConflict: false, conflicts: [] };

        // Validate time format (should be "HH:MM - HH:MM")
        if (!time.includes('-')) {
            return { hasConflict: false, conflicts: [] };
        }

        const timeParts = time.split('-');
        if (timeParts.length < 2) {
            return { hasConflict: false, conflicts: [] };
        }

        const [startTime, endTime] = timeParts.map(t => t.trim());

        // Validate time strings are not empty
        if (!startTime || !endTime) {
            return { hasConflict: false, conflicts: [] };
        }

        const conflicts = [];

        teacher.schedule.forEach(slot => {
            if (days.includes(slot.day)) {
                if (timeOverlap(startTime, endTime, slot.startTime, slot.endTime)) {
                    conflicts.push(slot);
                }
            }
        });

        return { hasConflict: conflicts.length > 0, conflicts };
    };

    // Filter teachers
    const filteredTeachers = useMemo(() => {
        return teachers.filter(teacher => {
            const matchesSearch = teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                teacher.department.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesDepartment = selectedDepartment === 'All Departments' ||
                teacher.department === selectedDepartment;
            return matchesSearch && matchesDepartment;
        });
    }, [searchQuery, selectedDepartment]);

    // Generate availability grid for selected teacher
    const generateAvailabilityGrid = () => {
        if (!selectedTeacher) return null;

        const { days, time } = parseClassSchedule(classSchedule);
        const allDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
        const dayLabels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];

        const hours = Array.from({ length: 10 }, (_, i) => {
            const hour = i + 9; // 9 AM to 6 PM
            return `${hour.toString().padStart(2, '0')}:00`;
        });

        // Safely parse time range
        let classStartTime = '';
        let classEndTime = '';

        if (time && time.includes('-')) {
            const timeParts = time.split('-');
            if (timeParts.length >= 2) {
                classStartTime = timeParts[0].trim();
                classEndTime = timeParts[1].trim();
            }
        }

        return (
            <div className="availability-grid">
                <div className="grid-header">
                    <div className="grid-time-column"></div>
                    {allDays.map((day, idx) => (
                        <div key={day} className="grid-day-header">{dayLabels[idx]}</div>
                    ))}
                </div>
                <div className="grid-body">
                    {hours.map(hour => (
                        <div key={hour} className="grid-row">
                            <div className="grid-time-label">{hour}</div>
                            {allDays.map(day => {
                                const isClassTime = days.includes(day) &&
                                    classStartTime &&
                                    classEndTime &&
                                    hour >= classStartTime.substring(0, 5) &&
                                    hour < classEndTime.substring(0, 5);

                                const teacherBusy = selectedTeacher.schedule.some(slot =>
                                    slot.day === day &&
                                    hour >= slot.startTime.substring(0, 5) &&
                                    hour < slot.endTime.substring(0, 5)
                                );

                                const conflict = isClassTime && teacherBusy;

                                return (
                                    <div
                                        key={`${hour}-${day}`}
                                        className={`grid-cell ${isClassTime ? 'class-time' : ''} ${teacherBusy ? 'teacher-busy' : ''} ${conflict ? 'conflict' : ''}`}
                                    >
                                        {conflict && <AlertCircle size={14} />}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const handleSelectTeacher = () => {
        if (selectedTeacher) {
            // Check for conflicts before selecting
            const conflict = checkConflict(selectedTeacher);

            if (conflict.hasConflict) {
                const confirmMessage = `⚠️ CẢNH BÁO XUNG ĐỘT LỊCH!\n\nGiáo viên "${selectedTeacher.name}" đã có ${conflict.conflicts.length} lịch dạy trùng với thời gian lớp học này:\n\n${conflict.conflicts.map((c, i) => `${i + 1}. ${c.day} ${c.startTime}-${c.endTime}: ${c.class || 'Lớp khác'}`).join('\n')}\n\nViệc phân công giáo viên này có thể gây trùng lắp lịch dạy.\n\nBạn có chắc chắn muốn tiếp tục?`;

                if (!confirm(confirmMessage)) {
                    return; // User cancelled
                }
            }

            onSelectTeacher(selectedTeacher);
            onClose();
        }
    };

    if (!isOpen) return null;

    const selectedTeacherConflict = selectedTeacher ? checkConflict(selectedTeacher) : null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="teacher-assign-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title-section">
                        <h2>Chọn giáo viên</h2>
                        {classSchedule && (
                            <div className="class-info-badge">
                                <Calendar size={16} />
                                <span>{classSchedule}</span>
                            </div>
                        )}
                    </div>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="teacher-list-section">
                        <div className="search-filter-bar">
                            <div className="search-box">
                                <Search size={18} />
                                <input
                                    type="text"
                                    placeholder="Tìm theo tên hoặc khoa"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <div className="department-filters">
                                {departments.map(dept => (
                                    <button
                                        key={dept}
                                        className={`dept-filter-btn ${selectedDepartment === dept ? 'active' : ''}`}
                                        onClick={() => setSelectedDepartment(dept)}
                                    >
                                        {dept === 'All Departments' ? 'Tất cả khoa' : dept}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="teacher-list">
                            {filteredTeachers.map(teacher => {
                                const { hasConflict } = checkConflict(teacher);
                                return (
                                    <div
                                        key={teacher.id}
                                        className={`teacher-item ${selectedTeacher?.id === teacher.id ? 'selected' : ''}`}
                                        onClick={() => setSelectedTeacher(teacher)}
                                    >
                                        <div className="teacher-avatar">{teacher.avatar}</div>
                                        <div className="teacher-info">
                                            <div className="teacher-name">{teacher.name}</div>
                                            <div className="teacher-meta">
                                                <span className="teacher-title">{teacher.title}</span>
                                                <span className="separator">•</span>
                                                <span className="teacher-dept">{teacher.department}</span>
                                            </div>
                                        </div>
                                        <div className={`status-badge ${hasConflict ? 'conflict' : 'available'}`}>
                                            {hasConflict ? 'Xung đột' : 'Rảnh'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="availability-section">
                        {selectedTeacher ? (
                            <>
                                <div className="availability-header">
                                    <h3>So sánh lịch</h3>
                                    <p className="availability-subtitle">
                                        So sánh lịch của {selectedTeacher.name}
                                    </p>
                                </div>

                                <div className="schedule-legend">
                                    <div className="legend-item">
                                        <div className="legend-color class-time"></div>
                                        <span>Thời gian lớp học</span>
                                    </div>
                                    <div className="legend-item">
                                        <div className="legend-color teacher-busy"></div>
                                        <span>Giáo viên bận</span>
                                    </div>
                                </div>

                                {generateAvailabilityGrid()}

                                {selectedTeacherConflict && (
                                    <div className={`conflict-notification ${selectedTeacherConflict.hasConflict ? 'has-conflict' : 'no-conflict'}`}>
                                        {selectedTeacherConflict.hasConflict ? (
                                            <>
                                                <AlertCircle size={20} />
                                                <div>
                                                    <strong>Phát hiện xung đột lịch</strong>
                                                    <p>
                                                        {selectedTeacher.name} có {selectedTeacherConflict.conflicts.length} xung đột thời gian.
                                                        Việc phân công có thể gây trùng lắp lịch dạy.
                                                    </p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle size={20} />
                                                <div>
                                                    <strong>Không có xung đột lịch</strong>
                                                    <p>
                                                        {selectedTeacher.name} rảnh trong khung giờ này.
                                                        Bạn có thể phân công mà không gặp vấn đề gì.
                                                    </p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="no-teacher-selected">
                                <Calendar size={48} />
                                <p>Chọn giáo viên để xem lịch chi tiết</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    {selectedTeacher && (
                        <div className="selected-teacher-info">
                            <div className="selected-avatar">{selectedTeacher.avatar}</div>
                            <span>{selectedTeacher.name} được chọn</span>
                        </div>
                    )}
                    <div className="modal-actions">
                        <button className="btn-cancel" onClick={onClose}>
                            Hủy
                        </button>
                        <button
                            className="btn-assign"
                            onClick={handleSelectTeacher}
                            disabled={!selectedTeacher}
                        >
                            Chọn giáo viên →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

TeacherAssignModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSelectTeacher: PropTypes.func.isRequired,
    classSchedule: PropTypes.string
};

export default TeacherAssignModal;
