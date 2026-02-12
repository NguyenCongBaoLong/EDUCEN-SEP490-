import { useState, useEffect } from 'react';
import { X, UserCheck, Plus, Trash2 } from 'lucide-react';
import PropTypes from 'prop-types';
import TeacherAssignModal from './TeacherAssignModal';
import '../css/components/CreateClassModal.css';

const CreateClassModal = ({ isOpen, onClose, onSubmit, editingClass, existingClasses = [] }) => {
    const [formData, setFormData] = useState({
        name: '',
        subject: '',
        gradeLevel: '',
        mainTeacher: '',
        assistant: '',
        maxStudents: '',
        scheduleSlots: [{ day: '', startTime: '', endTime: '' }], // Array of time slots
        startDate: '', // Ngày bắt đầu lớp
        endDate: '', // Ngày kết thúc lớp
        status: 'active'
    });

    const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
    const [teacherType, setTeacherType] = useState('main'); // 'main' or 'assistant'

    useEffect(() => {
        if (editingClass) {
            let scheduleSlots = [];

            // Migration: Convert old schedule format to scheduleSlots
            if (editingClass.scheduleSlots) {
                // New format: already has scheduleSlots
                scheduleSlots = editingClass.scheduleSlots;
            } else if (editingClass.schedule) {
                // Old format examples:
                // "Thứ 2, Thứ 4 • 10:00 - 11:30" (with time range)
                // "Mon, Wed • 4:30 PM" (single time, no range)
                const parts = editingClass.schedule.split(' • ');
                if (parts.length >= 2) {
                    const [daysStr, timeStr] = parts;
                    const days = daysStr.split(',').map(d => d.trim()).filter(Boolean);

                    if (timeStr.includes('-')) {
                        // Format: "10:00 - 11:30"
                        const [startTime, endTime] = timeStr.split('-').map(t => t.trim());
                        scheduleSlots = days.map(day => ({
                            day,
                            startTime,
                            endTime
                        }));
                    } else {
                        // Format: "4:30 PM" or "10:00" (single time without end)
                        // Create a default 1.5 hour slot
                        const startTime = timeStr.trim();

                        // Try to calculate end time (add 1.5 hours)
                        let endTime = startTime;
                        try {
                            const timeMatch = startTime.match(/(\d{1,2}):(\d{2})/);
                            if (timeMatch) {
                                let hours = parseInt(timeMatch[1]);
                                let minutes = parseInt(timeMatch[2]);

                                // Check for PM
                                if (startTime.toLowerCase().includes('pm') && hours < 12) {
                                    hours += 12;
                                }

                                // Add 90 minutes (1.5 hours)
                                minutes += 90;
                                if (minutes >= 60) {
                                    hours += Math.floor(minutes / 60);
                                    minutes = minutes % 60;
                                }

                                endTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                            }
                        } catch (e) {
                            // If calculation fails, use same time
                            endTime = startTime;
                        }

                        scheduleSlots = days.map(day => ({
                            day,
                            startTime: startTime.replace(/\s*(AM|PM)/i, ''), // Remove AM/PM for time input
                            endTime: endTime
                        }));
                    }
                }
            }

            // Ensure at least one empty slot
            if (scheduleSlots.length === 0) {
                scheduleSlots = [{ day: '', startTime: '', endTime: '' }];
            }

            setFormData({
                name: editingClass.name || '',
                subject: editingClass.subject || '',
                gradeLevel: editingClass.gradeLevel || '',
                mainTeacher: editingClass.mainTeacher?.name || '',
                assistant: editingClass.assistant?.name || '',
                maxStudents: editingClass.maxStudents?.toString() || '',
                scheduleSlots,
                startDate: editingClass.startDate || '',
                endDate: editingClass.endDate || '',
                status: editingClass.status || 'active'
            });
        } else {
            setFormData({
                name: '',
                subject: '',
                gradeLevel: '',
                mainTeacher: '',
                assistant: '',
                maxStudents: '',
                scheduleSlots: [{ day: '', startTime: '', endTime: '' }],
                startDate: '',
                endDate: '',
                status: 'active'
            });
        }
    }, [editingClass, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleOpenTeacherModal = (type) => {
        setTeacherType(type);
        setIsTeacherModalOpen(true);
    };

    const handleSelectTeacher = (teacher) => {
        if (teacherType === 'main') {
            setFormData(prev => ({ ...prev, mainTeacher: teacher.name }));
        } else {
            setFormData(prev => ({ ...prev, assistant: teacher.name }));
        }
    };

    // Schedule slot management functions
    const handleAddSlot = () => {
        setFormData(prev => ({
            ...prev,
            scheduleSlots: [...prev.scheduleSlots, { day: '', startTime: '', endTime: '' }]
        }));
    };

    const handleRemoveSlot = (index) => {
        // Prevent removing if only one slot
        if (formData.scheduleSlots.length <= 1) {
            alert('⚠️ Phải có ít nhất 1 buổi học!');
            return;
        }
        setFormData(prev => ({
            ...prev,
            scheduleSlots: prev.scheduleSlots.filter((_, i) => i !== index)
        }));
    };

    const handleSlotChange = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            scheduleSlots: prev.scheduleSlots.map((slot, i) =>
                i === index ? { ...slot, [field]: value } : slot
            )
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validation: Check all slots have valid data
        const invalidSlots = formData.scheduleSlots.filter(slot =>
            !slot.day || !slot.startTime || !slot.endTime
        );

        if (invalidSlots.length > 0) {
            alert('❌ Vui lòng điền đầy đủ thông tin cho tất cả các buổi học!');
            return;
        }

        // Validation: Check for duplicate slots
        const duplicateSlots = formData.scheduleSlots.some((slot, index) =>
            formData.scheduleSlots.findIndex((s, i) =>
                i !== index &&
                s.day === slot.day &&
                s.startTime === slot.startTime &&
                s.endTime === slot.endTime
            ) !== -1
        );

        if (duplicateSlots) {
            alert('❌ Có buổi học bị trùng lặp! Vui lòng kiểm tra lại lịch học.');
            return;
        }

        // Validation: Check for time overlaps between slots on the same day
        const timeToMinutes = (time) => {
            const [hours, minutes] = time.split(':').map(Number);
            return hours * 60 + minutes;
        };

        const hasTimeOverlap = (start1, end1, start2, end2) => {
            const s1 = timeToMinutes(start1);
            const e1 = timeToMinutes(end1);
            const s2 = timeToMinutes(start2);
            const e2 = timeToMinutes(end2);
            return s1 < e2 && e1 > s2;
        };

        // Check each slot against all other slots on the same day
        for (let i = 0; i < formData.scheduleSlots.length; i++) {
            for (let j = i + 1; j < formData.scheduleSlots.length; j++) {
                const slot1 = formData.scheduleSlots[i];
                const slot2 = formData.scheduleSlots[j];

                // Only check slots on the same day
                if (slot1.day === slot2.day) {
                    if (hasTimeOverlap(slot1.startTime, slot1.endTime, slot2.startTime, slot2.endTime)) {
                        alert(`❌ Phát hiện xung đột lịch học!\n\nCả 2 buổi học đều vào ${slot1.day}:\n• Buổi 1: ${slot1.startTime} - ${slot1.endTime}\n• Buổi 2: ${slot2.startTime} - ${slot2.endTime}\n\nCác buổi học trùng thời gian! Vui lòng điều chỉnh lại.`);
                        return;
                    }
                }
            }
        }

        // Validation: Check start time < end time for each slot
        const invalidTimes = formData.scheduleSlots.some(slot => {
            const start = slot.startTime.split(':').map(Number);
            const end = slot.endTime.split(':').map(Number);
            return start[0] > end[0] || (start[0] === end[0] && start[1] >= end[1]);
        });

        if (invalidTimes) {
            alert('❌ Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc!');
            return;
        }

        // Format schedule for display (backward compatibility)
        const schedule = formatScheduleForDisplay(formData.scheduleSlots);

        // Validation: Check duplicate class (simplified - just check name + subject for now)
        const isDuplicate = existingClasses.some(cls => {
            if (editingClass && cls.id === editingClass.id) return false;
            return cls.name.toLowerCase() === formData.name.toLowerCase() &&
                cls.subject === formData.subject;
        });

        if (isDuplicate) {
            alert(`❌ Không thể tạo lớp!\n\nĐã tồn tại lớp học với:\n- Tên: "${formData.name}"\n- Môn: ${formData.subject}\n\nVui lòng thay đổi thông tin lớp học.`);
            return;
        }

        // Validation: Check teacher conflicts for ALL slots
        const teacherConflicts = checkTeacherConflictsForAllSlots(
            formData.scheduleSlots,
            formData.mainTeacher,
            formData.assistant
        );

        if (teacherConflicts.mainTeacherConflicts.length > 0) {
            const conflictDetails = teacherConflicts.mainTeacherConflicts
                .map(c => `  • ${c.day} ${c.startTime}-${c.endTime}`)
                .join('\n');
            alert(`❌ Không thể tạo lớp!\n\nGiáo viên chính "${formData.mainTeacher}" đã có lịch dạy trùng:\n\n${conflictDetails}\n\nVui lòng chọn giáo viên khác hoặc thay đổi thời gian.`);
            return;
        }

        if (teacherConflicts.assistantConflicts.length > 0) {
            const conflictDetails = teacherConflicts.assistantConflicts
                .map(c => `  • ${c.day} ${c.startTime}-${c.endTime}`)
                .join('\n');
            alert(`❌ Không thể tạo lớp!\n\nTrợ giảng "${formData.assistant}" đã có lịch dạy trùng:\n\n${conflictDetails}\n\nVui lòng chọn trợ giảng khác hoặc thay đổi thời gian.`);
            return;
        }

        const classData = {
            ...formData,
            schedule, // For display compatibility
            scheduleSlots: formData.scheduleSlots, // New format
            maxStudents: parseInt(formData.maxStudents),
            currentStudents: editingClass?.currentStudents || 0,
            mainTeacher: {
                name: formData.mainTeacher,
                initials: formData.mainTeacher.split(' ').map(n => n[0]).join('').toUpperCase()
            },
            assistant: formData.assistant ? {
                name: formData.assistant,
                initials: formData.assistant.split(' ').map(n => n[0]).join('').toUpperCase()
            } : null,
        };

        if (editingClass) {
            classData.id = editingClass.id;
        }

        onSubmit(classData);
        onClose();
    };

    // Helper function to format schedule slots for display
    const formatScheduleForDisplay = (slots) => {
        if (!slots || slots.length === 0) return '';

        // Group slots by time to show more compact format if possible
        const timeGroups = {};
        slots.forEach(slot => {
            const timeKey = `${slot.startTime} - ${slot.endTime}`;
            if (!timeGroups[timeKey]) {
                timeGroups[timeKey] = [];
            }
            timeGroups[timeKey].push(slot.day);
        });

        // Format: "Thứ 2, Thứ 4 • 10:00 - 11:30" OR "Thứ 2: 10:00-11:30, Thứ 4: 13:30-15:00"
        const groups = Object.entries(timeGroups);
        if (groups.length === 1) {
            // All slots have same time
            const [time, days] = groups[0];
            return `${days.join(', ')} • ${time}`;
        } else {
            // Different times for different days
            return slots.map(slot => `${slot.day}: ${slot.startTime}-${slot.endTime}`).join(', ');
        }
    };

    // Helper function to check teacher conflicts for all schedule slots
    const checkTeacherConflictsForAllSlots = (scheduleSlots, mainTeacherName, assistantName) => {
        const teachers = getMockTeachers(); // Use shared mock data

        const checkTeacherSlots = (teacherName) => {
            const teacher = teachers.find(t => t.name === teacherName);
            if (!teacher) return [];

            const conflicts = [];
            scheduleSlots.forEach(slot => {
                const dayMap = {
                    'Thứ 2': 'MON', 'Mon': 'MON',
                    'Thứ 3': 'TUE', 'Tue': 'TUE',
                    'Thứ 4': 'WED', 'Wed': 'WED',
                    'Thứ 5': 'THU', 'Thu': 'THU',
                    'Thứ 6': 'FRI', 'Fri': 'FRI',
                    'Thứ 7': 'SAT', 'Sat': 'SAT',
                    'CN': 'SUN', 'Sun': 'SUN'
                };

                const dayEng = dayMap[slot.day] || slot.day;

                const hasConflict = teacher.schedule.some(teacherSlot =>
                    teacherSlot.day === dayEng &&
                    timeOverlap(slot.startTime, slot.endTime, teacherSlot.startTime, teacherSlot.endTime)
                );

                if (hasConflict) {
                    conflicts.push(slot);
                }
            });

            return conflicts;
        };

        const timeOverlap = (start1, end1, start2, end2) => {
            const toMinutes = (time) => {
                const [hours, minutes] = time.split(':').map(Number);
                return hours * 60 + minutes;
            };
            return toMinutes(start1) < toMinutes(end2) && toMinutes(end1) > toMinutes(start2);
        };

        return {
            mainTeacherConflicts: mainTeacherName ? checkTeacherSlots(mainTeacherName) : [],
            assistantConflicts: assistantName ? checkTeacherSlots(assistantName) : []
        };
    };

    // Shared mock teacher data
    const getMockTeachers = () => [
        {
            id: 1,
            name: "Dr. Sarah Jenkins",
            schedule: [
                { day: "MON", startTime: "10:00", endTime: "11:30" },
                { day: "WED", startTime: "10:00", endTime: "11:30" },
                { day: "FRI", startTime: "14:00", endTime: "15:30" }
            ]
        },
        {
            id: 2,
            name: "Prof. Robert Fox",
            schedule: [
                { day: "MON", startTime: "09:00", endTime: "10:30" },
                { day: "TUE", startTime: "14:00", endTime: "15:30" },
                { day: "THU", startTime: "09:00", endTime: "10:30" }
            ]
        },
        {
            id: 3,
            name: "Michael Chen",
            schedule: [
                { day: "TUE", startTime: "10:00", endTime: "11:30" },
                { day: "THU", startTime: "14:00", endTime: "15:30" }
            ]
        },
        {
            id: 4,
            name: "Emily Rodriguez",
            schedule: [
                { day: "MON", startTime: "14:00", endTime: "15:30" },
                { day: "WED", startTime: "09:00", endTime: "10:30" }
            ]
        },
        {
            id: 5,
            name: "David Kim",
            schedule: [
                { day: "TUE", startTime: "09:00", endTime: "10:30" },
                { day: "THU", startTime: "09:00", endTime: "10:30" }
            ]
        },
        {
            id: 6,
            name: "Emma Thompson",
            schedule: [
                { day: "MON", startTime: "11:00", endTime: "12:30" },
                { day: "WED", startTime: "11:00", endTime: "12:30" },
                { day: "FRI", startTime: "10:00", endTime: "11:30" }
            ]
        }
    ];

    // Helper function to check teacher conflicts (duplicate from TeacherAssignModal)
    const checkTeacherConflicts = (schedule, mainTeacherName, assistantName) => {
        // Mock teacher data (same as in TeacherAssignModal)
        const teachers = [
            {
                id: 1,
                name: "Dr. Sarah Jenkins",
                schedule: [
                    { day: "MON", startTime: "10:00", endTime: "11:30" },
                    { day: "WED", startTime: "10:00", endTime: "11:30" },
                    { day: "FRI", startTime: "14:00", endTime: "15:30" }
                ]
            },
            {
                id: 2,
                name: "Prof. Robert Fox",
                schedule: [
                    { day: "MON", startTime: "09:00", endTime: "10:30" },
                    { day: "TUE", startTime: "14:00", endTime: "15:30" },
                    { day: "THU", startTime: "09:00", endTime: "10:30" }
                ]
            },
            {
                id: 3,
                name: "Michael Chen",
                schedule: [
                    { day: "TUE", startTime: "10:00", endTime: "11:30" },
                    { day: "THU", startTime: "13:00", endTime: "14:30" }
                ]
            },
            {
                id: 4,
                name: "Alice Rivera",
                schedule: [
                    { day: "MON", startTime: "13:00", endTime: "14:30" },
                    { day: "WED", startTime: "15:00", endTime: "16:30" }
                ]
            },
            {
                id: 5,
                name: "Dr. James Wilson",
                schedule: [
                    { day: "TUE", startTime: "09:00", endTime: "10:30" },
                    { day: "THU", startTime: "09:00", endTime: "10:30" }
                ]
            },
            {
                id: 6,
                name: "Emma Thompson",
                schedule: [
                    { day: "MON", startTime: "11:00", endTime: "12:30" },
                    { day: "WED", startTime: "11:00", endTime: "12:30" },
                    { day: "FRI", startTime: "10:00", endTime: "11:30" }
                ]
            }
        ];

        const parseClassSchedule = (schedule) => {
            if (!schedule || !schedule.includes('•')) {
                return { days: [], time: null };
            }

            const parts = schedule.split('•');
            if (parts.length < 2) {
                return { days: [], time: null };
            }

            const [daysStr, timeStr] = parts.map(s => s.trim());

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

        const checkConflict = (teacherName) => {
            const teacher = teachers.find(t => t.name === teacherName);
            if (!teacher) return false;

            const { days, time } = parseClassSchedule(schedule);
            if (!time || days.length === 0) return false;

            // Validate time format before splitting
            if (!time.includes('-')) return false;

            const timeParts = time.split('-');
            if (timeParts.length < 2) return false;

            const [startTime, endTime] = timeParts.map(t => t.trim());

            return teacher.schedule.some(slot =>
                days.includes(slot.day) &&
                timeOverlap(startTime, endTime, slot.startTime, slot.endTime)
            );
        };

        return {
            mainTeacherConflict: mainTeacherName ? checkConflict(mainTeacherName) : false,
            assistantConflict: assistantName ? checkConflict(assistantName) : false
        };
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{editingClass ? 'Chỉnh sửa lớp học' : 'Tạo lớp học mới'}</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group">
                        <label>Tên lớp học *</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="VD: Đại số nâng cao II"
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Môn học *</label>
                            <select
                                name="subject"
                                value={formData.subject}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Chọn môn học</option>
                                <option value="MATHEMATICS">Toán học</option>
                                <option value="SCIENCE">Khoa học</option>
                                <option value="ENGLISH">Tiếng Anh</option>
                                <option value="PHYSICS">Vật lý</option>
                                <option value="CHEMISTRY">Hóa học</option>
                                <option value="BIOLOGY">Sinh học</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Cấp học *</label>
                            <select
                                name="gradeLevel"
                                value={formData.gradeLevel}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Chọn cấp học</option>
                                <option value="elementary">Tiểu học</option>
                                <option value="middle">THCS</option>
                                <option value="high">THPT</option>
                                <option value="college">Luyện thi đại học</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Giáo viên chính *</label>
                            <div className="input-with-button">
                                <input
                                    type="text"
                                    name="mainTeacher"
                                    value={formData.mainTeacher}
                                    onChange={handleChange}
                                    placeholder="Họ tên giáo viên"
                                    required
                                />
                                <button
                                    type="button"
                                    className="btn-check-teacher"
                                    onClick={() => handleOpenTeacherModal('main')}
                                    title="Kiểm tra lịch giáo viên"
                                >
                                    <UserCheck size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Trợ giảng</label>
                            <div className="input-with-button">
                                <input
                                    type="text"
                                    name="assistant"
                                    value={formData.assistant}
                                    onChange={handleChange}
                                    placeholder="Tùy chọn"
                                />
                                <button
                                    type="button"
                                    className="btn-check-teacher"
                                    onClick={() => handleOpenTeacherModal('assistant')}
                                    title="Kiểm tra lịch giáo viên"
                                >
                                    <UserCheck size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Số học sinh tối đa *</label>
                        <input
                            type="number"
                            name="maxStudents"
                            value={formData.maxStudents}
                            onChange={handleChange}
                            placeholder="VD: 15"
                            min="1"
                            max="50"
                            required
                        />
                    </div>


                    {/* Schedule Slots Section */}
                    <div className="schedule-slots-section">
                        <div className="schedule-slots-header">
                            <label>Lịch học *</label>
                            <button
                                type="button"
                                className="btn-add-slot"
                                onClick={handleAddSlot}
                            >
                                <Plus size={16} />
                                Thêm buổi học
                            </button>
                        </div>

                        <div className="schedule-slots-container">
                            {formData.scheduleSlots.map((slot, index) => (
                                <div key={index} className="schedule-slot-row">
                                    <div className="slot-field">
                                        <label>Ngày</label>
                                        <select
                                            value={slot.day}
                                            onChange={(e) => handleSlotChange(index, 'day', e.target.value)}
                                            required
                                        >
                                            <option value="">Chọn ngày</option>
                                            <option value="Thứ 2">Thứ 2</option>
                                            <option value="Thứ 3">Thứ 3</option>
                                            <option value="Thứ 4">Thứ 4</option>
                                            <option value="Thứ 5">Thứ 5</option>
                                            <option value="Thứ 6">Thứ 6</option>
                                            <option value="Thứ 7">Thứ 7</option>
                                            <option value="CN">Chủ nhật</option>
                                        </select>
                                    </div>

                                    <div className="slot-field">
                                        <label>Bắt đầu</label>
                                        <input
                                            type="time"
                                            value={slot.startTime}
                                            onChange={(e) => handleSlotChange(index, 'startTime', e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="slot-field">
                                        <label>Kết thúc</label>
                                        <input
                                            type="time"
                                            value={slot.endTime}
                                            onChange={(e) => handleSlotChange(index, 'endTime', e.target.value)}
                                            required
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        className="btn-remove-slot"
                                        onClick={() => handleRemoveSlot(index)}
                                        title="Xóa buổi học"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <small className="schedule-hint">
                            Mỗi buổi học có thể có thời gian khác nhau. Ví dụ: Thứ 2 từ 10:00-11:30, Thứ 4 từ 13:30-15:00
                        </small>
                    </div>

                    {/* Start Date and End Date Section */}
                    <div className="form-row">
                        <div className="form-group">
                            <label>Ngày bắt đầu *</label>
                            <input
                                type="date"
                                name="startDate"
                                value={formData.startDate}
                                onChange={handleChange}
                                required
                            />
                            <small className="field-hint">Ngày bắt đầu lớp học đầu tiên</small>
                        </div>

                        <div className="form-group">
                            <label>Ngày kết thúc *</label>
                            <input
                                type="date"
                                name="endDate"
                                value={formData.endDate}
                                onChange={handleChange}
                                min={formData.startDate}
                                required
                            />
                            <small className="field-hint">Ngày kết thúc lớp học cuối cùng</small>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Trạng thái *</label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            required
                        >
                            <option value="active">Đang hoạt động</option>
                            <option value="inactive">Tạm dừng</option>
                        </select>
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-cancel" onClick={onClose}>
                            Hủy
                        </button>
                        <button type="submit" className="btn-submit">
                            {editingClass ? 'Cập nhật' : 'Tạo lớp học'}
                        </button>
                    </div>
                </form>
            </div>

            <TeacherAssignModal
                isOpen={isTeacherModalOpen}
                onClose={() => setIsTeacherModalOpen(false)}
                onSelectTeacher={handleSelectTeacher}
                classSchedule={formData.day && formData.time ? `${formData.day} • ${formData.time}` : ''}
            />
        </div>
    );
};

CreateClassModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired,
    editingClass: PropTypes.object,
    existingClasses: PropTypes.array,
};

export default CreateClassModal;
