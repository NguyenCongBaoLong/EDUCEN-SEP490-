import { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import notificationService from '../../services/notificationService';
import api from '../../services/api';
import toast from 'react-hot-toast';
import '../../css/pages/center/ScheduleRequests.css';

const SCHEDULE_CHANGE_TAG = '[SCHEDULE_CHANGE]';

const ScheduleRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const isInitialMount = useRef(true);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [selectedClassData, setSelectedClassData] = useState(null);
    const [validationResults, setValidationResults] = useState(null);
    const [rooms, setRooms] = useState([]);

    const fetchRequests = useCallback(async (reason = 'manual') => {
        if (isInitialMount.current || reason === 'manual') {
            setLoading(true);
            isInitialMount.current = false;
        }
        try {
            const res = await notificationService.getSupportRequests();
            let data = res.data;
            if (!Array.isArray(data)) {
                data = data?.data || data?.notifications || data?.items || [];
            }
            console.log('[ScheduleRequests] Raw data:', data);
            console.log('[ScheduleRequests] Data length:', data.length);
            
            const isScheduleChangeRequest = (req) => {
                const title = (req.title || req.Title || '').toLowerCase();
                const content = (req.content || req.Content || '').toLowerCase();
                return title.includes(SCHEDULE_CHANGE_TAG.toLowerCase())
                    || content.includes('type: schedule_change')
                    || title.includes('đổi lịch dạy')
                    || content.includes('slot đề xuất')
                    || content.includes('requestedslot:');
            };

            data.forEach((req, index) => {
                const title = req.title || req.Title || '';
                const titleLower = title.toLowerCase();
                console.log(`[ScheduleRequests] Request ${index}:`, {
                    title: title,
                    titleLower: titleLower,
                    isScheduleChange: isScheduleChangeRequest(req),
                    id: req.id
                });
            });
            
            const scheduleChangeRequests = data.filter(isScheduleChangeRequest);
            
            console.log('[ScheduleRequests] Filtered requests:', scheduleChangeRequests.length);
            setRequests(scheduleChangeRequests);
            setSelectedRequest((prev) => {
                if (!prev?.id) return null;
                return scheduleChangeRequests.find((r) => r.id === prev.id) || null;
            });
            console.debug('[ScheduleRequests] refreshed requests', { reason, total: scheduleChangeRequests.length, rawData: data });
        } catch (error) {
            toast.error('Không thể tải danh sách yêu cầu.');
            console.error('Error fetching schedule requests:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRequests('mount');

        const intervalId = window.setInterval(() => {
            fetchRequests('interval-30s');
        }, 30000);

        const handleFocus = () => fetchRequests('window-focus');
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                fetchRequests('tab-visible');
            }
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [fetchRequests]);

    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const res = await api.get('/Rooms');
                setRooms(res.data || []);
            } catch (error) {
                console.error('Error fetching rooms:', error);
            }
        };
        fetchRooms();
    }, []);

    useEffect(() => {
        const fetchClassData = async () => {
            if (selectedRequest) {
                const slotInfo = parseSlotInfo(selectedRequest.content || selectedRequest.Content || '');
                if (slotInfo.classId) {
                    try {
                        const classRes = await api.get(`/Classes/${slotInfo.classId}`);
                        const classData = classRes.data;
                        setSelectedClassData(classData);
                        
                        const validation = await validateScheduleChange(slotInfo, classData);
                        setValidationResults(validation);
                    } catch (error) {
                        console.error('Error fetching class data:', error);
                        setSelectedClassData(null);
                        setValidationResults(null);
                    }
                }
            } else {
                setSelectedClassData(null);
                setValidationResults(null);
            }
        };
        fetchClassData();
    }, [selectedRequest]);

    const validateScheduleChange = async (slotInfo, classData) => {
        const conflicts = {
            teacherConflict: null,
            roomConflict: null,
            hasConflict: false
        };

        if (!slotInfo.newSlot || !classData) return conflicts;

        try {
            const [newStartTime, newEndTime] = slotInfo.newSlot.time.split(' - ');
            const newDayOfWeek = getDayOfWeekFromLabel(slotInfo.newSlot.dayLabel);

            if (classData.teacherId) {
                const teacherSchedulesRes = await api.get(`/Schedules/teacher/${classData.teacherId}`);
                const teacherSchedules = teacherSchedulesRes.data || [];
                
                const teacherConflict = teacherSchedules.find(schedule => {
                    const scheduleDay = schedule.dayOfWeek ?? schedule.DayOfWeek;
                    const scheduleStart = schedule.startTime ?? schedule.StartTime;
                    const scheduleEnd = schedule.endTime ?? schedule.EndTime;
                    
                    if (schedule.classId === classData.classId) return false;
                    
                    if (scheduleDay === newDayOfWeek) {
                        return (newStartTime < scheduleEnd && newEndTime > scheduleStart);
                    }
                    return false;
                });

                if (teacherConflict) {
                    conflicts.teacherConflict = {
                        className: teacherConflict.name || teacherConflict.className,
                        day: ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][teacherConflict.dayOfWeek ?? teacherConflict.DayOfWeek],
                        time: `${teacherConflict.startTime ?? teacherConflict.StartTime} - ${teacherConflict.endTime ?? teacherConflict.EndTime}`
                    };
                    conflicts.hasConflict = true;
                }
            }

            if (slotInfo.newRoom) {
                const roomSchedulesRes = await api.get('/Schedules');
                const roomSchedules = roomSchedulesRes.data || [];
                
                const roomsRes = await api.get('/Rooms');
                const rooms = roomsRes.data || [];
                const newRoom = rooms.find(r => r.roomName === slotInfo.newRoom);
                
                const roomConflict = roomSchedules.find(schedule => {
                    const scheduleDay = schedule.dayOfWeek ?? schedule.DayOfWeek;
                    const scheduleStart = schedule.startTime ?? schedule.StartTime;
                    const scheduleEnd = schedule.endTime ?? schedule.EndTime;
                    const scheduleRoomId = schedule.roomId ?? schedule.RoomId;
                    
                    if (schedule.classId === classData.classId) return false;
                    
                    if (scheduleRoomId === newRoom?.roomId) {
                        if (scheduleDay === newDayOfWeek) {
                            return (newStartTime < scheduleEnd && newEndTime > scheduleStart);
                        }
                    }
                    return false;
                });

                if (roomConflict) {
                    conflicts.roomConflict = {
                        className: roomConflict.name || roomConflict.className,
                        day: ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][roomConflict.dayOfWeek ?? roomConflict.DayOfWeek],
                        time: `${roomConflict.startTime ?? roomConflict.StartTime} - ${roomConflict.endTime ?? roomConflict.EndTime}`
                    };
                    conflicts.hasConflict = true;
                }
            }
        } catch (error) {
            console.error('Error validating schedule change:', error);
        }

        return conflicts;
    };

    const handleApprove = async (requestId) => {
        setProcessing(true);
        try {
            console.log('[ScheduleRequests] Approving request:', requestId);
            const request = requests.find(r => r.id === requestId);
            if (!request) {
                toast.error('Không tìm thấy yêu cầu.');
                return;
            }

            const slotInfo = parseSlotInfo(request.content || request.Content || '');
            console.log('[ScheduleRequests] Slot info:', slotInfo);
            
            if (validationResults?.hasConflict) {
                toast.error('Không thể duyệt: Có xung đột lịch/phòng. Vui lòng kiểm tra cảnh báo.');
                return;
            }
            
            await notificationService.approveSupportRequest(requestId, 'Đã duyệt yêu cầu đổi lịch.');
            toast.success('Đã duyệt và cập nhật lịch dạy thành công.');
            window.dispatchEvent(new Event('center-sidebar-badge-refresh'));
            fetchRequests('approve');
        } catch (error) {
            toast.error('Không thể duyệt yêu cầu.');
            console.error('Error approving schedule request:', error);
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async (requestId) => {
        setProcessing(true);
        try {
            await notificationService.rejectSupportRequest(requestId, 'Yêu cầu không được chấp nhận.');
            toast.success('Đã từ chối yêu cầu đổi lịch.');
            window.dispatchEvent(new Event('center-sidebar-badge-refresh'));
            fetchRequests('reject');
        } catch (error) {
            toast.error('Không thể từ chối yêu cầu.');
            console.error('Error rejecting schedule request:', error);
        } finally {
            setProcessing(false);
        }
    };

    const formatDate = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const parseSlotInfo = (content) => {
        const classIdMatch = content?.match(/ClassId:\s*(\d+)/i);
        const currentSlotMatch = content?.match(/(?:CurrentSlot|Slot hiện tại)\s*:\s*([^\(]+)\s*\(([^)]+)\)/i);
        const newSlotMatch = content?.match(/(?:RequestedSlot|Slot mới|Slot đề xuất)\s*:\s*([^\(]+)\s*\(([^)]+)\)/i);
        const newRoomMatch = content?.match(/(?:Phòng mới)\s*:\s*([^\n]+)/i);
        const requestedRoomIdMatch = content?.match(/RequestedRoomId:\s*(\d+)/i);
        const changeTypeMatch = content?.match(/(?:ChangeType|Loại đổi)\s*:\s*(\w+)/i);
        const targetSessionDateMatch = content?.match(/(?:TargetSessionDate|Ngày đổi)\s*:\s*(\d{4}-\d{2}-\d{2})/i);
        const currentRoomMatch = content?.match(/(?:CurrentRoomId|Phòng hiện tại)\s*:\s*(\d+)/i);
        
        return {
            classId: classIdMatch ? parseInt(classIdMatch[1]) : null,
            currentSlot: currentSlotMatch ? {
                dayLabel: currentSlotMatch[1].trim(),
                time: currentSlotMatch[2].trim()
            } : null,
            newSlot: newSlotMatch ? {
                dayLabel: newSlotMatch[1].trim(),
                time: newSlotMatch[2].trim()
            } : null,
            newRoom: newRoomMatch ? newRoomMatch[1].trim() : null,
            requestedRoomId: requestedRoomIdMatch ? Number(requestedRoomIdMatch[1]) : null,
            changeType: changeTypeMatch ? changeTypeMatch[1].trim() : 'full_schedule',
            targetSessionDate: targetSessionDateMatch ? targetSessionDateMatch[1].trim() : null,
            currentRoomId: currentRoomMatch ? Number(currentRoomMatch[1]) : null
        };
    };

    const extractDisplayReason = (content) => {
        if (!content) return 'Không có nội dung.';

        const reasonMatch = content.match(/Lý do\s*:\s*([^\n]+)/i);
        if (reasonMatch?.[1]?.trim()) return reasonMatch[1].trim();

        const cleanContent = content
            .replace(/Type:\s*schedule_change\s*\n?/gi, '')
            .replace(/ClassId:\s*\d+\n?/gi, '')
            .replace(/CurrentSlot:\s*[^\n]+\n?/gi, '')
            .replace(/RequestedSlot:\s*[^\n]+\n?/gi, '')
            .replace(/RequestedRoomId:\s*\d+\n?/gi, '')
            .replace(/Slot hiện tại:\s*[^\n]+\n?/gi, '')
            .replace(/Slot mới:\s*[^\n]+\n?/gi, '')
            .replace(/Slot đề xuất:\s*[^\n]+\n?/gi, '')
            .replace(/Phòng mới:\s*[^\n]+\n?/gi, '')
            .replace(/Loại yêu cầu:\s*[^\n]+\n?/gi, '')
            .trim();

        return cleanContent || 'Không có nội dung.';
    };

    const getDayOfWeekFromLabel = (dayLabel) => {
        const dayMap = {
            'thứ hai': 1,
            'thứ ba': 2,
            'thứ tư': 3,
            'thứ năm': 4,
            'thứ sáu': 5,
            'thứ bảy': 6,
            'chủ nhật': 0,
            'monday': 1,
            'tuesday': 2,
            'wednesday': 3,
            'thursday': 4,
            'friday': 5,
            'saturday': 6,
            'sunday': 0
        };
        if (dayLabel === undefined || dayLabel === null) return 1;
        const normalized = String(dayLabel).trim().toLowerCase();
        return dayMap[normalized] ?? 1;
    };

    const pendingRequests = requests.filter(r => !r.adminResponse);
    const processedRequests = requests.filter(r => r.adminResponse);
    const pendingCount = pendingRequests.length;

    return (
        <div className="admin-dashboard">
            <Sidebar />
            <main className="dashboard-main">
                <div className="schedule-mgmt-container">
                    <header className="mgmt-header">
                        <div className="mgmt-title-area">
                            <h1 className="mgmt-page-title">Yêu Cầu Đổi Lịch</h1>
                            <p className="mgmt-subtitle">
                                Phê duyệt các yêu cầu đổi lịch dạy từ giáo viên và trợ giảng.
                                {pendingCount > 0 && (
                                    <span style={{ marginLeft: '1rem', color: 'var(--sr-warning)', fontWeight: 700 }}>
                                        ({pendingCount} yêu cầu mới)
                                    </span>
                                )}
                            </p>
                        </div>
                    </header>

                    <div className="adm-schedule-wrap">
                        {loading ? (
                            <div className="adm-schedule-loading" style={{ textAlign: 'center', padding: '4rem' }}>
                                <div className="loading-spinner"></div>
                                <p style={{ marginTop: '1rem', color: 'var(--sr-text-muted)' }}>Đang tải dữ liệu...</p>
                            </div>
                        ) : requests.length === 0 ? (
                            <div className="adm-schedule-empty-selection">
                                <Clock size={48} color="var(--sr-primary)" />
                                <h3 style={{ marginTop: '1rem', fontWeight: 700 }}>Hoàn thành công việc!</h3>
                                <p>Hiện tại không có yêu cầu đổi lịch nào cần xử lý.</p>
                            </div>
                        ) : (
                            <div className="adm-schedule-grid">
                                <section className="adm-schedule-list-panel">
                                    <div className="adm-schedule-list-head">
                                        <span>Danh sách yêu cầu</span>
                                    </div>
                                    <div className="adm-schedule-sections">
                                        <div className="adm-schedule-section">
                                            <div className="adm-schedule-section-head">
                                                <span>Yêu cầu mới</span>
                                            </div>
                                            <div className="adm-schedule-list">
                                                {pendingRequests.map((req) => (
                                                    <div
                                                        key={req.id}
                                                        onClick={() => setSelectedRequest(req)}
                                                        className={`adm-schedule-item ${selectedRequest?.id === req?.id ? 'active' : ''}`}
                                                    >
                                                        <div className="adm-schedule-item-top" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                                                            <div className="adm-schedule-sender">{req?.senderName}</div>
                                                            <span className="adm-schedule-pending">Mới</span>
                                                        </div>
                                                        <div className="adm-schedule-role">{req?.senderRoleName}</div>
                                                        <div className="adm-schedule-meta" style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--sr-text-muted)' }}>
                                                            {formatDate(req?.createdAt)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="adm-schedule-section">
                                            <div className="adm-schedule-section-head">
                                                <span>Đã xử lý</span>
                                            </div>
                                            <div className="adm-schedule-list">
                                                {processedRequests.map((req) => (
                                                    <div
                                                        key={req.id}
                                                        onClick={() => setSelectedRequest(req)}
                                                        className={`adm-schedule-item ${selectedRequest?.id === req?.id ? 'active' : ''}`}
                                                        style={{ opacity: 0.7 }}
                                                    >
                                                        <div className="adm-schedule-item-top" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                                                            <div className="adm-schedule-sender">{req?.senderName}</div>
                                                            <span className="adm-schedule-processed">Đã xử lý</span>
                                                        </div>
                                                        <div className="adm-schedule-role">{req?.senderRoleName}</div>
                                                        <div className="adm-schedule-meta" style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--sr-text-muted)' }}>
                                                            {formatDate(req?.createdAt)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section className="adm-schedule-detail-panel">
                                    {selectedRequest ? (
                                        <>
                                            <div className="compact-detail-content animate-fade-in">
                                                <div className="detail-header">
                                                    <h3 className="detail-title">
                                                        <AlertCircle size={24} color="var(--sr-primary)" />
                                                        Chi Tiết Yêu Cầu
                                                    </h3>
                                                    <div className="adm-schedule-meta" style={{ fontSize: '0.75rem', color: 'var(--sr-text-muted)' }}>ID: #{selectedRequest.id}</div>
                                                </div>

                                                <div className="detail-section">
                                                    <div className="info-grid">
                                                        <div className="info-card">
                                                            <div className="info-label">Người gửi</div>
                                                            <div className="info-value">{selectedRequest.senderName}</div>
                                                        </div>
                                                        <div className="info-card">
                                                            <div className="info-label">Vai trò</div>
                                                            <div className="info-value">{selectedRequest.senderRoleName}</div>
                                                        </div>
                                                        <div className="info-card">
                                                            <div className="info-label">Lớp học</div>
                                                            <div className="info-value">{selectedClassData?.className || selectedClassData?.Name || 'N/A'}</div>
                                                        </div>
                                                        <div className="info-card">
                                                            <div className="info-label">Môn học</div>
                                                            <div className="info-value">{selectedClassData?.subjectName || selectedClassData?.SubjectName || 'N/A'}</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {validationResults?.hasConflict && (
                                                    <div className="conflict-alert">
                                                        <div style={{ fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <XCircle size={18} />
                                                            CẢNH BÁO XUNG ĐỘT LỊCH
                                                        </div>
                                                        {validationResults.teacherConflict && (
                                                            <div className="conflict-item">
                                                                <strong>Giáo viên:</strong> Trùng {validationResults.teacherConflict.className} ({validationResults.teacherConflict.time})
                                                            </div>
                                                        )}
                                                        {validationResults.roomConflict && (
                                                            <div className="conflict-item">
                                                                <strong>Phòng:</strong> Trùng {validationResults.roomConflict.className} ({validationResults.roomConflict.time})
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="detail-section">
                                                    <div className="info-label" style={{ marginBottom: '1rem' }}>Thay đổi lịch học</div>
                                                    {(() => {
                                                        const slotInfo = parseSlotInfo(selectedRequest?.content || selectedRequest?.Content || '');
                                                        
                                                        let displayCurrentSlot = slotInfo.currentSlot;
                                                        let displayCurrentRoom = null;
                                                        
                                                        if (!displayCurrentSlot && selectedClassData?.scheduleSlots?.[0]) {
                                                            const firstSlot = selectedClassData.scheduleSlots[0];
                                                            displayCurrentSlot = {
                                                                dayLabel: ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'][firstSlot.dayOfWeek ?? firstSlot.DayOfWeek] || 'N/A',
                                                                time: `${firstSlot.startTime ?? firstSlot.StartTime} - ${firstSlot.endTime ?? firstSlot.EndTime}`
                                                            };
                                                            displayCurrentRoom = firstSlot.roomName || firstSlot.RoomName || `Phòng ${firstSlot.roomId}`;
                                                        }

                                                        // Try to get current room from currentRoomId
                                                        if (!displayCurrentRoom && slotInfo.currentRoomId) {
                                                            const room = rooms.find(r => r.roomId === slotInfo.currentRoomId);
                                                            if (room) displayCurrentRoom = room.roomName;
                                                            else displayCurrentRoom = `Phòng ${slotInfo.currentRoomId}`;
                                                        }

                                                        // Try to get current room from class schedule slots
                                                        if (!displayCurrentRoom && selectedClassData?.scheduleSlots && displayCurrentSlot) {
                                                            const matchingSlot = selectedClassData.scheduleSlots.find(s => {
                                                                const slotDay = s.dayOfWeek ?? s.DayOfWeek;
                                                                const slotStart = s.startTime ?? s.StartTime;
                                                                const slotEnd = s.endTime ?? s.EndTime;
                                                                const targetDay = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'].map(d => d.toLowerCase()).indexOf(displayCurrentSlot.dayLabel.toLowerCase());
                                                                return slotDay === targetDay && slotStart === displayCurrentSlot.time.split(' - ')[0] && slotEnd === displayCurrentSlot.time.split(' - ')[1];
                                                            });
                                                            if (matchingSlot) {
                                                                displayCurrentRoom = matchingSlot.roomName || matchingSlot.RoomName;
                                                                if (!displayCurrentRoom && matchingSlot.roomId) {
                                                                    const room = rooms.find(r => r.roomId === matchingSlot.roomId);
                                                                    if (room) displayCurrentRoom = room.roomName;
                                                                    else displayCurrentRoom = `Phòng ${matchingSlot.roomId}`;
                                                                }
                                                            }
                                                        }

                                                        // Get new room name
                                                        let displayNewRoom = slotInfo.newRoom;
                                                        if (!displayNewRoom && slotInfo.requestedRoomId) {
                                                            const room = rooms.find(r => r.roomId === slotInfo.requestedRoomId);
                                                            if (room) displayNewRoom = room.roomName;
                                                            else displayNewRoom = `Phòng ${slotInfo.requestedRoomId}`;
                                                        }
                                                        // If still no new room and keeping same room, use current room
                                                        if (!displayNewRoom && !slotInfo.requestedRoomId) {
                                                            displayNewRoom = displayCurrentRoom || 'Giữ nguyên phòng';
                                                        }

                                                        // Calculate dates for single session change
                                                        let formattedTargetDate = '';
                                                        let formattedNewDate = '';
                                                        if (slotInfo.changeType === 'single_session' && slotInfo.targetSessionDate) {
                                                            const targetDate = new Date(slotInfo.targetSessionDate);
                                                            formattedTargetDate = `${targetDate.getDate()}/${targetDate.getMonth() + 1}/${targetDate.getFullYear()}`;
                                                            
                                                            // Calculate new date based on day difference
                                                            if (displayCurrentSlot?.dayLabel && slotInfo.newSlot?.dayLabel) {
                                                                const dayMap = {
                                                                    'chủ nhật': 0, 'thứ hai': 1, 'thứ ba': 2, 'thứ tư': 3,
                                                                    'thứ năm': 4, 'thứ sáu': 5, 'thứ bảy': 6
                                                                };
                                                                const currentDay = dayMap[displayCurrentSlot.dayLabel.toLowerCase()] ?? 1;
                                                                const newDay = dayMap[slotInfo.newSlot.dayLabel.toLowerCase()] ?? 1;
                                                                const dayDiff = newDay - currentDay;
                                                                const newDate = new Date(targetDate);
                                                                newDate.setDate(newDate.getDate() + dayDiff);
                                                                formattedNewDate = `${newDate.getDate()}/${newDate.getMonth() + 1}/${newDate.getFullYear()}`;
                                                            }
                                                        }

                                                        const changeTypeText = slotInfo.changeType === 'single_session' ? 'Đổi 1 buổi học cụ thể' : 'Đổi toàn bộ lịch';

                                                        return (
                                                            <div className="change-comparison-card">
                                                                <div style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--sr-primary)' }}>
                                                                    {changeTypeText}
                                                                </div>
                                                                <div className="comparison-grid">
                                                                    <div className="slot-box current">
                                                                        <div className="info-label">Lịch hiện tại</div>
                                                                        <div className="info-value" style={{ fontSize: '1rem' }}>{displayCurrentSlot?.dayLabel}</div>
                                                                        <div className="adm-schedule-meta" style={{ fontSize: '0.75rem', color: 'var(--sr-text-muted)' }}>{displayCurrentSlot?.time}</div>
                                                                        {formattedTargetDate && (
                                                                            <div className="adm-schedule-meta" style={{ fontSize: '0.75rem', color: 'var(--sr-text-muted)' }}>📅 {formattedTargetDate}</div>
                                                                        )}
                                                                        <div className="adm-schedule-meta" style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--sr-text-muted)' }}>🏠 {displayCurrentRoom || 'Chưa rõ'}</div>
                                                                    </div>

                                                                    <div className="slot-arrow">
                                                                        <CheckCircle size={20} color="var(--sr-primary)" />
                                                                    </div>

                                                                    <div className="slot-box new">
                                                                        <div className="info-label" style={{ color: 'var(--sr-success)' }}>Lịch đề xuất</div>
                                                                        <div className="info-value" style={{ fontSize: '1rem', color: 'var(--sr-success)' }}>{slotInfo.newSlot?.dayLabel}</div>
                                                                        <div className="adm-schedule-meta" style={{ color: 'var(--sr-success)', fontSize: '0.75rem' }}>{slotInfo.newSlot?.time}</div>
                                                                        {formattedNewDate && (
                                                                            <div className="adm-schedule-meta" style={{ color: 'var(--sr-success)', fontSize: '0.75rem' }}>📅 {formattedNewDate}</div>
                                                                        )}
                                                                        <div className="adm-schedule-meta" style={{ marginTop: '0.5rem', color: 'var(--sr-success)', fontSize: '0.75rem' }}>🏠 {displayNewRoom || 'Chưa rõ'}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>

                                                <div className="detail-section">
                                                    <div className="info-label">Lý do thay đổi</div>
                                                    <div className="adm-schedule-reason compact" style={{ marginTop: '0.5rem' }}>
                                                        {extractDisplayReason(selectedRequest?.content || selectedRequest?.Content || '')}
                                                    </div>
                                                </div>

                                                {selectedRequest?.adminResponse && (
                                                    <div className="detail-section">
                                                        <div className="info-label">Phản hồi từ Admin</div>
                                                        <div className="adm-schedule-response compact" style={{ marginTop: '0.5rem' }}>
                                                            {selectedRequest?.adminResponse}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="adm-schedule-actions compact">
                                                <button
                                                    onClick={() => handleApprove(selectedRequest.id)}
                                                    disabled={processing || validationResults?.hasConflict || selectedRequest?.adminResponse}
                                                    className="sr-action-btn approve"
                                                >
                                                    <CheckCircle size={20} />
                                                    Duyệt yêu cầu
                                                </button>
                                                <button
                                                    onClick={() => handleReject(selectedRequest.id)}
                                                    disabled={processing || selectedRequest?.adminResponse}
                                                    className="sr-action-btn reject"
                                                >
                                                    <XCircle size={20} />
                                                    Từ chối
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="adm-schedule-empty-selection">
                                            <div style={{ background: 'var(--sr-primary-light)', padding: '2rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
                                                <Clock size={48} color="var(--sr-primary)" />
                                            </div>
                                            <h3 style={{ fontWeight: 700 }}>Chưa chọn yêu cầu</h3>
                                            <p>Vui lòng chọn một yêu cầu từ danh sách bên trái để xem chi tiết và xử lý.</p>
                                        </div>
                                    )}
                                </section>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ScheduleRequests;