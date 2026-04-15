import React, { useState, useMemo } from 'react';
import { X, Search, Calendar, AlertCircle, CheckCircle, ChevronRight } from 'lucide-react';
import PropTypes from 'prop-types';
import ConfirmModal from './ConfirmModal';
import '../css/components/TeacherAssignModal.css';

const TeacherAssignModal = ({ isOpen, onClose, onSelectTeacher, classSlots = [], teachers = [] }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [confirmData, setConfirmData] = useState({ isOpen: false, title: '', message: '' });


    // Get display string for help text
    const classScheduleDisplay = useMemo(() => {
        if (!classSlots || classSlots.length === 0) return '';
        const days = [...new Set(classSlots.map(s => s.day))];
        const time = classSlots.length > 0 ? `${classSlots[0].startTime} - ${classSlots[0].endTime}` : '';
        return `${days.join(', ')} • ${time}`;
    }, [classSlots]);

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
        if (!classSlots || classSlots.length === 0) return { hasConflict: false, conflicts: [] };

        const conflicts = [];
        const staffSchedule = teacher.schedule || [];

        staffSchedule.forEach(staffSlot => {
            classSlots.forEach(classSlot => {
                if (staffSlot.day === classSlot.day) {
                    if (timeOverlap(staffSlot.startTime, staffSlot.endTime, classSlot.startTime, classSlot.endTime)) {
                        conflicts.push(staffSlot);
                    }
                }
            });
        });

        return {
            hasConflict: conflicts.length > 0,
            conflicts: Array.from(new Set(conflicts.map(c => JSON.stringify(c)))).map(s => JSON.parse(s))
        };
    };

    // Filter teachers
    const filteredTeachers = useMemo(() => {
        return teachers.filter(teacher => {
            const query = searchQuery.toLowerCase();
            return teacher.name.toLowerCase().includes(query) ||
                (teacher.department && teacher.department.toLowerCase().includes(query));
        });
    }, [searchQuery, teachers]);

    // Generate availability grid for selected teacher
    const generateAvailabilityGrid = () => {
        if (!selectedTeacher) return null;

        const allDays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
        const dayLabels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];

        const hours = Array.from({ length: 14 }, (_, i) => {
            const hour = i + 8; // 8 AM to 9 PM
            return `${hour.toString().padStart(2, '0')}:00`;
        });

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
                                const isClassTime = classSlots.some(slot =>
                                    slot.day === day &&
                                    hour >= slot.startTime.substring(0, 5) &&
                                    hour < slot.endTime.substring(0, 5)
                                );

                                const teacherBusy = (selectedTeacher.schedule || []).some(slot =>
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
            const conflict = checkConflict(selectedTeacher);

            if (conflict.hasConflict) {
                const message = `Giáo viên <strong>"${selectedTeacher.name}"</strong> đã có ${conflict.conflicts.length} lịch dạy trùng với thời gian lớp học này:
                
                ${conflict.conflicts.map((c, i) => `${i + 1}. ${c.day} ${c.startTime}-${c.endTime}: ${c.class || 'Lớp khác'}`).join('\n')}
                
                <strong>Không thể phân công giáo viên này do xung đột lịch dạy!</strong>`;

                setConfirmData({
                    isOpen: true,
                    title: 'XUNG ĐỘT LỊCH DẠY!',
                    message: message,
                    isAlert: true,
                    type: 'danger',
                    cancelText: 'Đóng'
                });
                return;
            }

            confirmSelection();
        }
    };

    const confirmSelection = () => {
        onSelectTeacher(selectedTeacher);
        onClose();
        setConfirmData({ isOpen: false, title: '', message: '' });
    };

    if (!isOpen) return null;

    const selectedTeacherConflict = selectedTeacher ? checkConflict(selectedTeacher) : null;

    return (
        <>
        <div className="modal-overlay" onClick={onClose}>
            <div className="teacher-assign-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title-section">
                        <h2>Chọn giáo viên</h2>
                        {classScheduleDisplay && (
                            <div className="class-info-badge">
                                <Calendar size={16} />
                                <span>{classScheduleDisplay}</span>
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

        <ConfirmModal
            isOpen={confirmData.isOpen}
            onClose={(e) => {
                if (e && e.stopPropagation) e.stopPropagation();
                setConfirmData({ ...confirmData, isOpen: false });
            }}
            onConfirm={confirmSelection}
            title={confirmData.title}
            message={confirmData.message}
            isAlert={confirmData.isAlert}
            type={confirmData.type || 'warning'}
            cancelText={confirmData.cancelText || 'Hủy'}
        />
        </>
    );
};

TeacherAssignModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSelectTeacher: PropTypes.func.isRequired,
    classSlots: PropTypes.array,
    teachers: PropTypes.array
};

export default TeacherAssignModal;
