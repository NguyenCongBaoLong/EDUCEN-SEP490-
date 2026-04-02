import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { X, UserCheck, Plus, Trash2, Calendar, Search } from 'lucide-react';
import PropTypes from 'prop-types';
import TeacherAssignModal from './TeacherAssignModal';
import RoomAssignModal from './RoomAssignModal';
import '../css/components/CreateClassModal.css';

const CreateClassModal = ({ isOpen, onClose, onSubmit, editingClass, existingClasses = [], subjects = [], teachersList = [], assistantsList = [], roomsList = [], gradesList = [] }) => {
    const [formData, setFormData] = useState({
        name: '',
        subject: '',
        mainTeacher: '',
        mainTeacherId: null,
        assistant: '',
        assistantId: null,
        room: '',
        roomId: null,
        gradeId: null,
        description: '',
        syllabusContent: '',
        pricePerSession: '', // Đơn giá theo buổi
        scheduleSlots: [{ day: '', startTime: '', endTime: '' }], // Array of time slots
        startDate: '', // Ngày bắt đầu lớp
        endDate: '', // Ngày kết thúc lớp
        status: 'active'
    });

    const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
    const [teacherType, setTeacherType] = useState('main'); // 'main' or 'assistant'

    const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
    const [activeSlotIndex, setActiveSlotIndex] = useState(null);

    useEffect(() => {
        console.log('CreateClassModal: editingClass changed:', editingClass);
        if (editingClass) {
            let scheduleSlots = [];

            // Robust initialization: check for non-empty scheduleSlots first
            if (editingClass.scheduleSlots && editingClass.scheduleSlots.length > 0 && editingClass.scheduleSlots[0].day) {
                scheduleSlots = editingClass.scheduleSlots.map(s => ({ ...s })); // Deep copy
            } else if (editingClass.schedule) {
                // ... same parsing logic as before ...
                const parts = editingClass.schedule.split(' • ');
                if (parts.length >= 2) {
                    const [daysStr, timeStr] = parts;
                    const days = daysStr.split(',').map(d => d.trim()).filter(Boolean);

                    if (timeStr.includes('-')) {
                        const [startTime, endTime] = timeStr.split('-').map(t => t.trim());
                        scheduleSlots = days.map(day => ({ day, startTime, endTime }));
                    } else {
                        const startTime = timeStr.trim();
                        let endTime = startTime;
                        try {
                            const timeMatch = startTime.match(/(\d{1,2}):(\d{2})/);
                            if (timeMatch) {
                                let hours = parseInt(timeMatch[1]);
                                let minutes = parseInt(timeMatch[2]);
                                if (startTime.toLowerCase().includes('pm') && hours < 12) hours += 12;
                                minutes += 90;
                                if (minutes >= 60) {
                                    hours += Math.floor(minutes / 60);
                                    minutes = minutes % 60;
                                }
                                endTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                            }
                        } catch (e) { endTime = startTime; }
                        scheduleSlots = days.map(day => ({
                            day,
                            startTime: startTime.replace(/\s*(AM|PM)/i, ''),
                            endTime: endTime
                        }));
                    }
                }
            }

            // Ensure at least one empty slot if still empty
            if (!scheduleSlots || scheduleSlots.length === 0) {
                scheduleSlots = [{ day: '', startTime: '', endTime: '' }];
            }

            console.log('CreateClassModal: Setting formData with slots:', scheduleSlots);
            setFormData({
                name: editingClass.name || '',
                subject: editingClass.subject || '',
                mainTeacher: editingClass.mainTeacher?.name || '',
                mainTeacherId: editingClass.mainTeacher?.id || null,
                assistant: editingClass.assistant?.name || '',
                assistantId: editingClass.assistant?.id || null,
                room: editingClass.roomName || '',
                roomId: editingClass.roomId || null,
                gradeId: editingClass.gradeId || null,
                description: editingClass.description || '',
                syllabusContent: editingClass.syllabusContent || '',
                pricePerSession: editingClass.pricePerSession || '',
                scheduleSlots,
                startDate: editingClass.startDate || '',
                endDate: editingClass.endDate || '',
                status: editingClass.status || 'active'
            });
        } else {
            setFormData({
                name: '',
                subject: '',
                mainTeacher: '',
                mainTeacherId: null,
                assistant: '',
                assistantId: null,
                roomId: null,
                gradeId: null,
                description: '',
                syllabusContent: '',
                pricePerSession: '',
                scheduleSlots: [{ day: '', startTime: '', endTime: '', roomId: null }],
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
            setFormData(prev => ({ ...prev, mainTeacher: teacher.name, mainTeacherId: teacher.id }));
        } else {
            setFormData(prev => ({ ...prev, assistant: teacher.name, assistantId: teacher.id }));
        }
    };

    const handleOpenRoomModal = (index) => {
        setActiveSlotIndex(index);
        setIsRoomModalOpen(true);
    };

    const handleSelectRoom = (room) => {
        if (activeSlotIndex !== null) {
            handleSlotChange(activeSlotIndex, 'roomId', room.roomId);
            handleSlotChange(activeSlotIndex, 'roomName', room.roomName);
        }
    };

    // Schedule slot management functions
    const handleAddSlot = () => {
        setFormData(prev => ({
            ...prev,
            scheduleSlots: [...prev.scheduleSlots, { day: '', startTime: '', endTime: '', roomId: null, roomName: '' }]
        }));
    };

    const handleRemoveSlot = (index) => {
        // Prevent removing if only one slot
        if (formData.scheduleSlots.length <= 1) {
            toast.error('⚠️ Phải có ít nhất 1 buổi học!');
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
            toast.error('❌ Vui lòng điền đầy đủ thông tin cho tất cả các buổi học!');
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
            toast.error('❌ Có buổi học bị trùng lặp! Vui lòng kiểm tra lại lịch học.');
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
                        toast.error(`❌ Phát hiện xung đột lịch học!\n\nCả 2 buổi học đều vào ${slot1.day}:\n• Buổi 1: ${slot1.startTime} - ${slot1.endTime}\n• Buổi 2: ${slot2.startTime} - ${slot2.endTime}`);
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
            toast.error('❌ Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc!');
            return;
        }

        // Validation: Check each slot is at least 1 hour 30 mins (90 mins)
        const shortSlots = formData.scheduleSlots.filter(slot => {
            if (!slot.startTime || !slot.endTime) return false;
            const duration = timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime);
            return duration < 90;
        });

        if (shortSlots.length > 0) {
            toast.error('❌ Mỗi buổi học phải kéo dài ít nhất 1 tiếng 30 phút (90 phút)!');
            return;
        }

        // Validation: Check start date < end date
        if (formData.startDate && formData.endDate) {
            if (new Date(formData.startDate) > new Date(formData.endDate)) {
                toast.error('❌ Ngày bắt đầu không thể sau ngày kết thúc!');
                return;
            }
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
            toast.error(`❌ Không thể tạo lớp! Đã tồn tại lớp "${formData.name}" cho môn ${formData.subject}.`);
            return;
        }

        // Validation: Check teacher conflicts for ALL slots
        const teacherConflicts = checkTeacherConflictsForAllSlots(
            formData.scheduleSlots,
            formData.mainTeacher,
            formData.assistant
        );

        if (teacherConflicts.mainTeacherConflicts.length > 0) {
            toast.error(`❌ Giáo viên "${formData.mainTeacher}" đã có lịch dạy trùng!`);
            return;
        }

        if (teacherConflicts.assistantConflicts.length > 0) {
            toast.error(`❌ Trợ giảng "${formData.assistant}" đã có lịch dạy trùng!`);
            return;
        }

        const classData = {
    ...formData, // <-- Cái này đã bao gồm pricePerSession
    schedule, // For display compatibility
    scheduleSlots: formData.scheduleSlots, // New format
    currentStudents: editingClass?.currentStudents || 0,
    mainTeacher: {
        id: formData.mainTeacherId,
        name: formData.mainTeacher,
        initials: formData.mainTeacher.split(' ').map(n => n[0]).join('').toUpperCase()
    },
    assistant: formData.assistant ? {
        id: formData.assistantId,
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
        const checkTeacherSlots = (teacherName, staffList) => {
            const teacher = staffList.find(t => t.name === teacherName);
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

                const hasConflict = teacher.schedule?.some(teacherSlot =>
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
            mainTeacherConflicts: mainTeacherName ? checkTeacherSlots(mainTeacherName, teachersList) : [],
            assistantConflicts: assistantName ? checkTeacherSlots(assistantName, assistantsList) : []
        };
    };



    // Helper function to check teacher conflicts (duplicate from TeacherAssignModal)
    const checkTeacherConflicts = (schedule, mainTeacherName, assistantName) => {
        const checkConflict = (teacherName, staffList) => {
            const teacher = staffList.find(t => t.name === teacherName);
            if (!teacher) return false;

            const { days, time } = parseClassSchedule(schedule);
            if (!time || days.length === 0) return false;

            // Validate time format before splitting
            if (!time.includes('-')) return false;

            const timeParts = time.split('-');
            if (timeParts.length < 2) return false;

            const [startTime, endTime] = timeParts.map(t => t.trim());

            return teacher.schedule?.some(slot =>
                days.includes(slot.day) &&
                timeOverlap(startTime, endTime, slot.startTime, slot.endTime)
            );
        };

        return {
            mainTeacherConflict: mainTeacherName ? checkConflict(mainTeacherName, teachersList) : false,
            assistantConflict: assistantName ? checkConflict(assistantName, assistantsList) : false
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
                                {subjects.length > 0
                                    ? subjects.map(s => (
                                        <option key={s.subjectId} value={s.subjectName}>
                                            {s.subjectName}
                                        </option>
                                    ))
                                    : (
                                        <>
                                            <option value="MATHEMATICS">Toán học</option>
                                            <option value="SCIENCE">Khoa học</option>
                                            <option value="ENGLISH">Tiếng Anh</option>
                                            <option value="PHYSICS">Vật lý</option>
                                            <option value="CHEMISTRY">Hóa học</option>
                                            <option value="BIOLOGY">Sinh học</option>
                                        </>
                                    )
                                }
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Khối lớp</label>
                            <select
                                name="gradeId"
                                value={formData.gradeId || ''}
                                onChange={(e) => {
                                    const id = e.target.value ? parseInt(e.target.value) : null;
                                    setFormData(prev => ({
                                        ...prev,
                                        gradeId: id
                                    }));
                                }}
                            >
                                <option value="">Chọn khối lớp</option>
                                {gradesList.map(g => (
                                    <option key={g.gradeId} value={g.gradeId}>
                                        {g.gradeName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Đơn giá theo buổi *</label>
                        <input
                            type="number"
                            name="pricePerSession"
                            value={formData.pricePerSession}
                            onChange={handleChange}
                            placeholder="VD: 150000"
                            min="0"
                            step="1000"
                            required
                        />
                        <small style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px', display: 'block' }}>
                            Nhập đơn giá cho mỗi buổi học (VNĐ)
                        </small>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Giáo viên chính *</label>
                            <div className="input-with-button" style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="text"
                                    name="mainTeacher"
                                    value={formData.mainTeacher}
                                    onChange={handleChange}
                                    placeholder="Chọn giáo viên từ danh sách"
                                    required
                                    readOnly
                                    style={{ cursor: 'pointer', backgroundColor: '#f8fafc' }}
                                    onClick={() => handleOpenTeacherModal('main')}
                                />
                                {formData.mainTeacher && (
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, mainTeacher: '', mainTeacherId: null }))}
                                        title="Hủy phân công giáo viên"
                                        style={{ backgroundColor: '#fee2e2', color: '#ef4444', border: '1px solid #fecaca', padding: '0 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <X size={18} />
                                    </button>
                                )}
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
                            <div className="input-with-button" style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="text"
                                    name="assistant"
                                    value={formData.assistant}
                                    onChange={handleChange}
                                    placeholder="Tùy chọn trợ giảng"
                                    readOnly
                                    style={{ cursor: 'pointer', backgroundColor: '#f8fafc' }}
                                    onClick={() => handleOpenTeacherModal('assistant')}
                                />
                                {formData.assistant && (
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, assistant: '', assistantId: null }))}
                                        title="Hủy phân công trợ giảng"
                                        style={{ backgroundColor: '#fee2e2', color: '#ef4444', border: '1px solid #fecaca', padding: '0 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="btn-check-teacher"
                                    onClick={() => handleOpenTeacherModal('assistant')}
                                    title="Kiểm tra lịch trợ giảng"
                                >
                                    <UserCheck size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Mô tả lớp học</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Nhập mô tả về lớp học..."
                            rows="2"
                        />
                    </div>

                    <div className="form-group">
                        <label>Nội dung giáo trình</label>
                        <textarea
                            name="syllabusContent"
                            value={formData.syllabusContent}
                            onChange={handleChange}
                            placeholder="Nhập nội dung giáo trình..."
                            rows="3"
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

                                    <div className="slot-field">
                                        <label>Phòng học</label>
                                        <div className="input-with-button">
                                            <select
                                                value={slot.roomId || ''}
                                                onChange={(e) => {
                                                    const id = e.target.value ? parseInt(e.target.value) : null;
                                                    const room = roomsList.find(r => r.roomId === id);
                                                    handleSlotChange(index, 'roomId', id);
                                                    handleSlotChange(index, 'roomName', room ? room.roomName : '');
                                                }}
                                                required
                                            >
                                                <option value="">Chọn phòng</option>
                                                {roomsList.map(r => (
                                                    <option key={r.roomId} value={r.roomId}>
                                                        {r.roomName}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                className="btn-check-room"
                                                onClick={() => handleOpenRoomModal(index)}
                                                title="Kiểm tra lịch phòng"
                                            >
                                                <Calendar size={18} />
                                            </button>
                                        </div>
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
                            {formData.status === 'completed' && (
                                <option value="completed">Đã hoàn thành (Tự động)</option>
                            )}
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
                </form >
            </div >

            <TeacherAssignModal
                isOpen={isTeacherModalOpen}
                onClose={() => setIsTeacherModalOpen(false)}
                onSelectTeacher={handleSelectTeacher}
                classSlots={formData.scheduleSlots}
                teachers={teacherType === 'main' ? teachersList : assistantsList}
            />

            <RoomAssignModal
                isOpen={isRoomModalOpen}
                onClose={() => setIsRoomModalOpen(false)}
                onSelectRoom={handleSelectRoom}
                slotInfo={activeSlotIndex !== null ? formData.scheduleSlots[activeSlotIndex] : null}
                rooms={roomsList}
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
    subjects: PropTypes.array,
    teachersList: PropTypes.array,
    assistantsList: PropTypes.array,
    roomsList: PropTypes.array,
    gradesList: PropTypes.array
};

export default CreateClassModal;
