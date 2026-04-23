import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, AlertCircle, CheckCircle, Search } from 'lucide-react';
import PropTypes from 'prop-types';
import api from '../services/api';
import '../css/components/TeacherAssignModal.css';

const RoomAssignModal = ({ isOpen, onClose, onSelectRoom, slotInfo, rooms = [] }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [roomSchedule, setRoomSchedule] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && selectedRoom) {
            fetchRoomSchedule(selectedRoom.roomId);
        }
    }, [isOpen, selectedRoom]);

    const fetchRoomSchedule = async (roomId) => {
        setLoading(true);
        try {
            const response = await api.get(`/Rooms/${roomId}/schedule`);
            // Map DayOfWeek (0-6) to English abbreviations (SUN-SAT)
            const dayMap = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
            const mappedSchedule = response.data.map(slot => ({
                ...slot,
                day: dayMap[slot.dayOfWeek] || 'MON',
                // StartTime/EndTime are probably "HH:mm:ss" from backend
                startTime: slot.startTime.substring(0, 5),
                endTime: slot.endTime.substring(0, 5)
            }));
            setRoomSchedule(mappedSchedule);
        } catch (error) {
            console.error('Error fetching room schedule:', error);
        } finally {
            setLoading(false);
        }
    };

    const timeOverlap = (start1, end1, start2, end2) => {
        const toMinutes = (time) => {
            if (!time) return 0;
            const [hours, minutes] = time.split(':').map(Number);
            return hours * 60 + minutes;
        };
        const s1 = toMinutes(start1);
        const e1 = toMinutes(end1);
        const s2 = toMinutes(start2);
        const e2 = toMinutes(end2);
        return s1 < e2 && e1 > s2;
    };

    const checkConflict = (roomSchedule) => {
        if (!slotInfo || !slotInfo.day || !slotInfo.startTime || !slotInfo.endTime) {
            return { hasConflict: false, conflicts: [] };
        }

        // Map Vietnamese day to English abbreviation
        const dayMap = {
            'Thứ 2': 'MON', 'Thứ 3': 'TUE', 'Thứ 4': 'WED', 
            'Thứ 5': 'THU', 'Thứ 6': 'FRI', 'Thứ 7': 'SAT', 'CN': 'SUN'
        };
        const targetDay = dayMap[slotInfo.day] || slotInfo.day;

        const conflicts = roomSchedule.filter(slot => 
            slot.day === targetDay && 
            timeOverlap(slotInfo.startTime, slotInfo.endTime, slot.startTime, slot.endTime)
        );

        return { hasConflict: conflicts.length > 0, conflicts };
    };

    const filteredRooms = useMemo(() => {
        return rooms.filter(room => 
            room.roomName.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery, rooms]);

    const generateAvailabilityGrid = () => {
        if (!selectedRoom) return null;

        const dayMap = {
            'Thứ 2': 'MON', 'Thứ 3': 'TUE', 'Thứ 4': 'WED', 
            'Thứ 5': 'THU', 'Thứ 6': 'FRI', 'Thứ 7': 'SAT', 'CN': 'SUN'
        };
        const targetDay = dayMap[slotInfo.day] || slotInfo.day;
        
        const allDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
        const dayLabels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
        const hours = Array.from({ length: 14 }, (_, i) => {
            const hour = i + 7; // 7 AM to 8 PM
            return `${hour.toString().padStart(2, '0')}:00`;
        });

        return (
            <div className="availability-grid">
                <div className="grid-header">
                    <div className="grid-time-column"></div>
                    {allDays.map((day, idx) => (
                        <div key={day} className={`grid-day-header ${day === targetDay ? 'current-day' : ''}`}>
                            {dayLabels[idx]}
                        </div>
                    ))}
                </div>
                <div className="grid-body">
                    {hours.map(hour => (
                        <div key={hour} className="grid-row">
                            <div className="grid-time-label">{hour}</div>
                            {allDays.map(day => {
                                const hourEnd = `${(parseInt(hour.split(':')[0]) + 1).toString().padStart(2, '0')}:00`;
                                
                                const isClassTime = day === targetDay &&
                                    slotInfo.startTime &&
                                    slotInfo.endTime &&
                                    timeOverlap(slotInfo.startTime, slotInfo.endTime, hour, hourEnd);

                                const roomBusy = roomSchedule.some(slot =>
                                    slot.day === day &&
                                    timeOverlap(slot.startTime, slot.endTime, hour, hourEnd)
                                );

                                const conflict = isClassTime && roomBusy;

                                return (
                                    <div
                                        key={`${hour}-${day}`}
                                        className={`grid-cell ${isClassTime ? 'class-time' : ''} ${roomBusy ? 'teacher-busy' : ''} ${conflict ? 'conflict' : ''}`}
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

    if (!isOpen) return null;

    const conflictInfo = selectedRoom ? checkConflict(roomSchedule) : null;

    const confirmSelection = () => {
        onSelectRoom(selectedRoom);
        onClose();
    };

    return (
        <>
        <div className="modal-overlay" onClick={onClose}>
            <div className="teacher-assign-modal room-assign-modal" onClick={(e) => e.stopPropagation()}>
                {/* ... same content ... */}
                <div className="modal-header">
                    <div className="modal-title-section">
                        <h2>Kiểm tra phòng học</h2>
                        {slotInfo && (
                            <div className="class-info-badge">
                                <Calendar size={16} />
                                <span>{slotInfo.day} | {slotInfo.startTime} - {slotInfo.endTime}</span>
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
                                    placeholder="Tìm tên phòng..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="teacher-list">
                            {filteredRooms.map(room => (
                                <div
                                    key={room.roomId}
                                    className={`teacher-item ${selectedRoom?.roomId === room.roomId ? 'selected' : ''}`}
                                    onClick={() => setSelectedRoom(room)}
                                >
                                    <div className="teacher-avatar">
                                        <Calendar size={20} />
                                    </div>
                                    <div className="teacher-info">
                                        <div className="teacher-name">{room.roomName}</div>
                                        <div className="teacher-meta">
                                            <span className={`status-tag ${room.status === true || room.status === 'Active' ? 'active' : 'inactive'}`}>
                                                {room.status === true || room.status === 'Active' ? 'Hoạt động' : 'Bảo trì'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="availability-section">
                        {loading ? (
                            <div className="loading-state">Đang tải lịch phòng...</div>
                        ) : selectedRoom ? (
                            <>
                                <div className="availability-header">
                                    <h3>Lịch phòng {selectedRoom.roomName}</h3>
                                    <p className="availability-subtitle">Xanh: Lớp đang tạo | Đỏ: Đã có lớp khác</p>
                                </div>
                                
                                {generateAvailabilityGrid()}

                                {conflictInfo && (
                                    <div className={`conflict-notification ${conflictInfo.hasConflict ? 'has-conflict' : 'no-conflict'}`}>
                                        {conflictInfo.hasConflict ? (
                                            <>
                                                <AlertCircle size={20} />
                                                <div>
                                                    <strong>Xung đột lịch phòng!</strong>
                                                    <p>Phòng này đã có {conflictInfo.conflicts.length} lớp học trong khung giờ này.</p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle size={20} />
                                                <div>
                                                    <strong>Phòng trống</strong>
                                                    <p>Phòng {selectedRoom.roomName} sẵn sàng cho lịch học này.</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="no-teacher-selected">
                                <Calendar size={48} />
                                <p>Chọn một phòng để kiểm tra lịch trống</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <div className="modal-actions" style={{ marginLeft: 'auto' }}>
                        <button className="btn-cancel" onClick={onClose}>Hủy</button>
                        <button 
                            className="btn-assign" 
                            disabled={!selectedRoom || conflictInfo?.hasConflict}
                            title={conflictInfo?.hasConflict ? 'Không thể chọn phòng đang xúng đột' : ''}
                            onClick={confirmSelection}
                        >
                            Xác nhận chọn phòng
                        </button>
                    </div>
                </div>
            </div>
        </div>
        </>
    );
};

RoomAssignModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSelectRoom: PropTypes.func.isRequired,
    slotInfo: PropTypes.object,
    rooms: PropTypes.array
};

export default RoomAssignModal;