import { useMemo, useState } from 'react';
import { X, Send, Calendar, Clock, BookOpen, ArrowRight } from 'lucide-react';
import PropTypes from 'prop-types';
import '../css/components/ScheduleRequestModal.css';

const DAY_OPTIONS = [
    { value: 1, label: 'Thứ Hai' },
    { value: 2, label: 'Thứ Ba' },
    { value: 3, label: 'Thứ Tư' },
    { value: 4, label: 'Thứ Năm' },
    { value: 5, label: 'Thứ Sáu' },
    { value: 6, label: 'Thứ Bảy' },
    { value: 0, label: 'Chủ Nhật' }
];

const DAY_LABEL_MAP = {
    0: 'Chủ Nhật',
    1: 'Thứ Hai',
    2: 'Thứ Ba',
    3: 'Thứ Tư',
    4: 'Thứ Năm',
    5: 'Thứ Sáu',
    6: 'Thứ Bảy'
};

const TIME_OPTIONS = [
    '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
    '19:00', '20:00', '21:00', '22:00'
];

const DEFAULT_REASON = '';
const DEFAULT_DAY = 1;
const DEFAULT_START_TIME = '16:00';
const DEFAULT_END_TIME = '18:00';

const ScheduleRequestModal = ({ isOpen, onClose, onSend, initialData, classOptions = [], rooms = [] }) => {
    const [reason, setReason] = useState(DEFAULT_REASON);
    const [targetDay, setTargetDay] = useState(DEFAULT_DAY);
    const [targetStartTime, setTargetStartTime] = useState(DEFAULT_START_TIME);
    const [targetEndTime, setTargetEndTime] = useState(DEFAULT_END_TIME);
    const [selectedSlotIdx, setSelectedSlotIdx] = useState(0);
    const [selectedRoomId, setSelectedRoomId] = useState(null);
    const [requestType, setRequestType] = useState('schedule_change'); // schedule_change, absence, other
    const [selectedClassId, setSelectedClassId] = useState(() => {
        if (classOptions.length > 0) return classOptions[0].classId;
        return initialData?.classInfo?.classId ?? null;
    });

    const selectedClass = useMemo(() => {
        if (!classOptions.length && !initialData?.classInfo) return null;
        const options = classOptions.length > 0 ? classOptions : [initialData?.classInfo].filter(Boolean);
        return options.find(c => String(c.classId) === String(selectedClassId)) || options[0];
    }, [classOptions, selectedClassId, initialData]);

    const displaySlots = useMemo(() => {
        const raw = selectedClass?.scheduleSlots || [];
        return raw
            .map((slot) => ({
                id: slot.id ?? slot.SlotId ?? slot.scheduleId,
                dayOfWeek: slot.dayOfWeek ?? slot.DayOfWeek,
                startTime: slot.startTime ?? slot.StartTime,
                endTime: slot.endTime ?? slot.EndTime,
                roomName: slot.roomName ?? slot.RoomName ?? ''
            }))
            .filter(slot => slot.dayOfWeek !== undefined && slot.startTime && slot.endTime);
    }, [selectedClass]);

    const isValid = useMemo(() => {
        if (!reason.trim()) return false;
        if (!targetStartTime || !targetEndTime) return false;
        if (targetStartTime >= targetEndTime) return false;
        return true;
    }, [reason, targetStartTime, targetEndTime]);

    if (!isOpen) return null;

    const handleSend = () => {
        const selectedDayLabel = DAY_OPTIONS.find(d => d.value === Number(targetDay))?.label || 'Không xác định';
        const payload = {
            type: requestType,
            reason,
            requestedSlot: requestType === 'schedule_change' ? {
                dayOfWeek: Number(targetDay),
                dayLabel: selectedDayLabel,
                startTime: targetStartTime,
                endTime: targetEndTime
            } : null,
            requestedRoomId: requestType === 'schedule_change' ? selectedRoomId : null,
            classInfo: selectedClass,
            requestedAt: new Date().toISOString()
        };

        // Lấy currentSlot từ lựa chọn của giáo viên (hoặc mặc định)
        if (displaySlots.length > selectedSlotIdx) {
            const chosen = displaySlots[selectedSlotIdx];
            payload.currentSlot = {
                id: chosen.id,
                dayOfWeek: chosen.dayOfWeek,
                dayLabel: DAY_LABEL_MAP[chosen.dayOfWeek] || 'Không xác định',
                startTime: chosen.startTime,
                endTime: chosen.endTime
            };
            payload.currentRoomId = chosen.roomId || null;
        }

        onSend(payload);
        onClose();
    };

    const handleClose = () => {
        setReason(DEFAULT_REASON);
        setTargetDay(DEFAULT_DAY);
        setTargetStartTime(DEFAULT_START_TIME);
        setTargetEndTime(DEFAULT_END_TIME);
        setSelectedSlotIdx(0);
        setRequestType('schedule_change');
        onClose();
    };

    return (
        <div className="req-modal-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
            <div className="req-modal-container">
                <div className="req-modal-header">
                    <div className="req-header-title">
                        <div className="req-header-icon-wrapper">
                            <Calendar size={22} />
                        </div>
                        <div>
                            <h2>Yêu cầu đổi lịch dạy</h2>
                            <p className="req-header-subtitle">Điền thông tin để gửi yêu cầu cho quản lý</p>
                        </div>
                    </div>
                    <button className="req-close-btn" onClick={handleClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="req-modal-content">
                    <div className="req-form-section">
                        <label className="req-section-label">Loại yêu cầu</label>
                        <div className="req-type-tabs">
                            <button 
                                className={`req-type-tab ${requestType === 'schedule_change' ? 'active' : ''}`}
                                onClick={() => setRequestType('schedule_change')}
                            >
                                Đổi lịch dạy
                            </button>
                            <button 
                                className={`req-type-tab ${requestType === 'absence' ? 'active' : ''}`}
                                onClick={() => setRequestType('absence')}
                            >
                                Xin nghỉ
                            </button>
                            <button 
                                className={`req-type-tab ${requestType === 'other' ? 'active' : ''}`}
                                onClick={() => setRequestType('other')}
                            >
                                Yêu cầu khác
                            </button>
                        </div>
                    </div>

                    {requestType === 'schedule_change' && classOptions.length > 0 && (
                        <div className="req-form-section">
                            <label className="req-section-label">
                                <BookOpen size={16} />
                                Chọn lớp học
                            </label>
                            <div className="req-class-grid">
                                {classOptions.map(cls => (
                                    <button
                                        key={cls.classId}
                                        type="button"
                                        className={'req-class-card ' + (String(selectedClassId) === String(cls.classId) ? 'active' : '')}
                                        onClick={() => setSelectedClassId(cls.classId)}
                                    >
                                        <div className="req-class-code">{cls.code}</div>
                                        <div className="req-class-name">{cls.name}</div>
                                        <div className="req-class-slots">{cls.scheduleSlots?.length || 0} slot(s)</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {requestType === 'schedule_change' && selectedClass && displaySlots.length > 0 && (
                        <div className="req-form-section">
                            <label className="req-section-label">
                                <Clock size={16} />
                                Lịch dạy hiện tại
                            </label>
                            <div className="req-current-slots">
                                {displaySlots.map((slot, idx) => (
                                    <button 
                                        key={idx} 
                                        type="button"
                                        className={'req-slot-badge-btn ' + (selectedSlotIdx === idx ? 'active' : '')}
                                        onClick={() => setSelectedSlotIdx(idx)}
                                    >
                                        <span className="req-badge-day">{DAY_LABEL_MAP[slot.dayOfWeek]}</span>
                                        <span className="req-badge-time">{slot.startTime} - {slot.endTime}</span>
                                        {slot.roomName && <span className="req-badge-room">{slot.roomName}</span>}
                                        {selectedSlotIdx === idx && <div className="req-slot-check">✓</div>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {requestType === 'schedule_change' && (
                        <div className="req-form-section">
                            <label className="req-section-label">
                                <ArrowRight size={16} />
                                Lịch muốn đổi sang
                            </label>
                            <div className="req-target-grid">
                                <div className="req-target-item">
                                    <span className="req-target-label">Ngày</span>
                                    <select 
                                        className="req-select" 
                                        value={targetDay} 
                                        onChange={(e) => setTargetDay(Number(e.target.value))}
                                    >
                                        {DAY_OPTIONS.map(day => (
                                            <option key={day.value} value={day.value}>{day.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="req-target-item">
                                    <span className="req-target-label">Bắt đầu</span>
                                    <select 
                                        className="req-select" 
                                        value={targetStartTime} 
                                        onChange={(e) => setTargetStartTime(e.target.value)}
                                    >
                                        {TIME_OPTIONS.map(time => (
                                            <option key={time} value={time}>{time}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="req-target-item">
                                    <span className="req-target-label">Kết thúc</span>
                                    <select 
                                        className="req-select" 
                                        value={targetEndTime} 
                                        onChange={(e) => setTargetEndTime(e.target.value)}
                                    >
                                        {TIME_OPTIONS.filter(t => t > targetStartTime).map(time => (
                                            <option key={time} value={time}>{time}</option>
                                        ))}
                                    </select>
                                </div>
                                {rooms.length > 0 && (
                                    <div className="req-target-item">
                                        <span className="req-target-label">Phòng</span>
                                        <select 
                                            className="req-select" 
                                            value={selectedRoomId || ''} 
                                            onChange={(e) => setSelectedRoomId(e.target.value ? Number(e.target.value) : null)}
                                        >
                                            <option value="">Giữ nguyên phòng</option>
                                            {rooms.map(room => (
                                                <option key={room.roomId} value={room.roomId}>{room.roomName}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="req-form-section">
                        <label className="req-section-label">
                            {requestType === 'schedule_change' ? 'Lý do đổi lịch' : 'Mô tả chi tiết yêu cầu'}
                        </label>
                        <textarea
                            className="req-textarea"
                            placeholder="Nhập lý do để quản lý xem xét..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={4}
                        />
                    </div>
                </div>

                <div className="req-modal-footer">
                    <button className="req-btn-cancel" onClick={handleClose}>Hủy bỏ</button>
                    <button
                        className="req-btn-send"
                        disabled={!isValid}
                        onClick={handleSend}
                    >
                        <Send size={16} />
                        Gửi yêu cầu
                    </button>
                </div>
            </div>
        </div>
    );
};

ScheduleRequestModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSend: PropTypes.func.isRequired,
    classOptions: PropTypes.arrayOf(PropTypes.shape({
        classId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        name: PropTypes.string,
        code: PropTypes.string,
        scheduleSlots: PropTypes.array
    })),
    rooms: PropTypes.arrayOf(PropTypes.shape({
        roomId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        roomName: PropTypes.string
    })),
    initialData: PropTypes.shape({
        classInfo: PropTypes.shape({
            classId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
            name: PropTypes.string,
            code: PropTypes.string,
            scheduleSlots: PropTypes.arrayOf(PropTypes.shape({
                dayOfWeek: PropTypes.number,
                startTime: PropTypes.string,
                endTime: PropTypes.string,
                roomName: PropTypes.string
            }))
        })
    })
};

export default ScheduleRequestModal;