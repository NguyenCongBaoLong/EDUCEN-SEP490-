import { useState, useEffect, useCallback } from 'react';
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
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [selectedClassData, setSelectedClassData] = useState(null);
    const [validationResults, setValidationResults] = useState(null);

    const fetchRequests = useCallback(async (reason = 'manual') => {
        setLoading(true);
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
            requestedRoomId: requestedRoomIdMatch ? Number(requestedRoomIdMatch[1]) : null
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

    const pendingCount = requests.filter(r => !r.adminResponse).length;

    return (
        <div className="admin-dashboard">
            <Sidebar />
            <main className="dashboard-main">
                <div className="schedule-mgmt-container">
                    <header className="mgmt-header" style={{ marginBottom: '1rem' }}>
                        <div className="mgmt-title-area">
                            <div className="mgmt-title-row">
                                <h1 className="mgmt-page-title">Yêu Cầu Đổi Lịch</h1>
                                {pendingCount > 0 && (
                                    <span className="mgmt-badge">
                                        <AlertCircle size={14} />
                                        {pendingCount} chờ duyệt
                                    </span>
                                )}
                            </div>
                            <p className="mgmt-subtitle">
                                Phê duyệt các yêu cầu đổi lịch dạy từ giáo viên/phụ huynh.
                            </p>
                        </div>
                    </header>

                    <div className="adm-schedule-wrap">
                        {loading ? (
                            <div className="adm-schedule-loading" style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>
                                <div className="loading-spinner"></div>
                                <p style={{ marginTop: '1rem' }}>Đang tải yêu cầu...</p>
                            </div>
                        ) : requests.length === 0 ? (
                            <div className="adm-schedule-empty" style={{ textAlign: 'center', padding: '5rem', background: 'white', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <div style={{ background: '#f9fafb', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                    <Clock size={40} color="#3b82f6" />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>Hoàn thành công việc!</h3>
                                <p style={{ color: '#6b7280' }}>Hiện tại không có yêu cầu đổi lịch nào cần xử lý.</p>
                            </div>
                        ) : (
                            <div className="adm-schedule-grid">
                                <section className="adm-schedule-list-panel">
                                    <div className="adm-schedule-list-head">
                                        <span>DANH SÁCH CHỜ DUYỆT ({requests.filter(r => !r.adminResponse).length})</span>
                                    </div>
                                    <div className="adm-schedule-list">
                                        {requests.filter(r => !r.adminResponse).map((req) => (
                                            <div
                                                key={req.id}
                                                onClick={() => setSelectedRequest(req)}
                                                className={`adm-schedule-item ${selectedRequest?.id === req?.id ? 'active' : ''}`}
                                            >
                                                <div className="adm-schedule-item-top">
                                                    <div>
                                                        <div className="adm-schedule-sender">{req?.senderName || 'Không xác định'}</div>
                                                        <div className="adm-schedule-role">{req?.senderRoleName || 'Người dùng'}</div>
                                                    </div>
                                                    <span className="adm-schedule-pending">Mới</span>
                                                </div>
                                                <div className="adm-schedule-meta">
                                                    <strong>Tiêu đề:</strong> {req?.title || 'Yêu cầu đổi lịch'}
                                                </div>
                                                <div className="adm-schedule-meta" style={{ marginTop: '4px' }}>
                                                    <strong>Ngày gửi:</strong> {formatDate(req?.createdAt)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {requests.filter(r => r.adminResponse).length > 0 && (
                                        <div className="adm-schedule-list-head" style={{ marginTop: '1rem' }}>
                                            <span>ĐÃ XỬ LÝ ({requests.filter(r => r.adminResponse).length})</span>
                                        </div>
                                    )}
                                    {requests.filter(r => r.adminResponse).length > 0 && (
                                        <div className="adm-schedule-list">
                                            {requests.filter(r => r.adminResponse).map((req) => (
                                                <div
                                                    key={req.id}
                                                    onClick={() => setSelectedRequest(req)}
                                                    className={`adm-schedule-item ${selectedRequest?.id === req?.id ? 'active' : ''}`}
                                                    style={{ opacity: '0.6' }}
                                                >
                                                    <div className="adm-schedule-item-top">
                                                        <div>
                                                            <div className="adm-schedule-sender">{req?.senderName || 'Không xác định'}</div>
                                                            <div className="adm-schedule-role">{req?.senderRoleName || 'Người dùng'}</div>
                                                        </div>
                                                        <span className="adm-schedule-processed">ĐÃ XỬ LÝ</span>
                                                    </div>
                                                    <div className="adm-schedule-meta">
                                                        <strong>Tiêu đề:</strong> {req?.title || 'Yêu cầu đổi lịch'}
                                                    </div>
                                                    <div className="adm-schedule-meta" style={{ marginTop: '4px' }}>
                                                        <strong>Ngày gửi:</strong> {formatDate(req?.createdAt)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>

                                <section className="adm-schedule-detail-panel">
                                    {selectedRequest ? (
                                        <>
                                            <div className="compact-detail-content" style={{ animation: 'fade-in 0.3s ease-out' }}>
                                                <div style={{ marginBottom: '1rem' }}>
                                                    <h3 className="adm-schedule-detail-title">
                                                        <AlertCircle size={20} color="#3b82f6" />
                                                        Chi Tiết Yêu Cầu
                                                    </h3>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                                                    <div className="adm-schedule-field compact">
                                                        <div className="adm-schedule-field-label">Người gửi</div>
                                                        <div className="adm-schedule-field-value" style={{ fontSize: '0.85rem' }}>{selectedRequest?.senderName}</div>
                                                    </div>
                                                    <div className="adm-schedule-field compact">
                                                        <div className="adm-schedule-field-label">Vai trò</div>
                                                        <div className="adm-schedule-field-value" style={{ fontSize: '0.85rem' }}>{selectedRequest?.senderRoleName}</div>
                                                    </div>
                                                </div>

                                                <div style={{ marginBottom: '1rem' }}>
                                                    <div className="adm-schedule-field-label">Tiêu đề</div>
                                                    <div className="adm-schedule-field-value">{selectedRequest?.title || 'Yêu cầu đổi lịch'}</div>
                                                </div>

                                                {selectedClassData && (
                                                    <div style={{ marginBottom: '1rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                        <div className="adm-schedule-field-label" style={{ marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>📚 Thông tin lớp học</div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem', fontSize: '0.8rem' }}>
                                                            <div>
                                                                <span style={{ color: '#64748b', fontWeight: 600 }}>Tên lớp:</span>
                                                                <span style={{ color: '#334155', marginLeft: '0.375rem' }}>{selectedClassData.name || selectedClassData.Name || 'N/A'}</span>
                                                            </div>
                                                            <div>
                                                                <span style={{ color: '#64748b', fontWeight: 600 }}>Giáo viên:</span>
                                                                <span style={{ color: '#334155', marginLeft: '0.375rem' }}>{selectedClassData.teacherName || selectedClassData.TeacherName || 'N/A'}</span>
                                                            </div>
                                                            <div>
                                                                <span style={{ color: '#64748b', fontWeight: 600 }}>Môn học:</span>
                                                                <span style={{ color: '#334155', marginLeft: '0.375rem' }}>{selectedClassData.subjectName || selectedClassData.SubjectName || 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {validationResults?.hasConflict && (
                                                    <div style={{ marginBottom: '1rem', background: '#fef2f2', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fecaca' }}>
                                                        <div className="adm-schedule-field-label" style={{ marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 700, color: '#dc2626' }}>⚠️ Cảnh báo xung đột</div>
                                                        {validationResults.teacherConflict && (
                                                            <div style={{ marginBottom: '0.375rem', fontSize: '0.8rem', color: '#991b1b' }}>
                                                                <strong>Trùng lịch giáo viên:</strong> Giáo viên đã có lớp {validationResults.teacherConflict.className} vào {validationResults.teacherConflict.day} ({validationResults.teacherConflict.time})
                                                            </div>
                                                        )}
                                                        {validationResults.roomConflict && (
                                                            <div style={{ fontSize: '0.8rem', color: '#991b1b' }}>
                                                                <strong>Trùng phòng:</strong> Phòng đã được lớp {validationResults.roomConflict.className} sử dụng vào {validationResults.roomConflict.day} ({validationResults.roomConflict.time})
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {(() => {
                                                    const slotInfo = parseSlotInfo(selectedRequest?.content || selectedRequest?.Content || '');
                                                    console.log('[ScheduleRequests] Content:', selectedRequest?.content || selectedRequest?.Content);
                                                    console.log('[ScheduleRequests] Parsed slotInfo:', slotInfo);
                                                    console.log('[ScheduleRequests] Selected class data:', selectedClassData);
                                                    
                                                    let displayCurrentSlot = slotInfo.currentSlot;
                                                    let displayCurrentRoom = null;
                                                    
                                                    if (!displayCurrentSlot && selectedClassData?.scheduleSlots && selectedClassData.scheduleSlots.length > 0) {
                                                        const firstSlot = selectedClassData.scheduleSlots[0];
                                                        const dayOfWeek = firstSlot.dayOfWeek ?? firstSlot.DayOfWeek;
                                                        displayCurrentSlot = {
                                                            dayLabel: ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'][dayOfWeek] || 'Không xác định',
                                                            time: `${firstSlot.startTime ?? firstSlot.StartTime} - ${firstSlot.endTime ?? firstSlot.EndTime}`
                                                        };
                                                        displayCurrentRoom = firstSlot.roomId ? selectedClassData.scheduleSlots.find(s => 
                                                            (s.dayOfWeek ?? s.DayOfWeek) === dayOfWeek && 
                                                            s.startTime === (firstSlot.startTime ?? firstSlot.StartTime)
                                                        )?.roomId : null;
                                                    } else if (slotInfo.currentSlot && selectedClassData?.scheduleSlots) {
                                                        // Tìm room cho current slot
                                                        const [currentStartTime, currentEndTime] = slotInfo.currentSlot.time.split(' - ');
                                                        const currentDayOfWeek = getDayOfWeekFromLabel(slotInfo.currentSlot.dayLabel);
                                                        displayCurrentRoom = selectedClassData.scheduleSlots.find(s => 
                                                            (s.dayOfWeek ?? s.DayOfWeek) === currentDayOfWeek && 
                                                            s.startTime === currentStartTime
                                                        )?.roomId;
                                                    }
                                                    
                                                    // Lấy room name từ classData
                                                    const getRoomName = (roomId) => {
                                                        if (!roomId) return 'Chưa phân công';
                                                        const room = selectedClassData?.rooms?.find(r => r.roomId === roomId) || 
                                                                    selectedClassData?.scheduleSlots?.find(s => s.roomId === roomId);
                                                        return room?.roomName || room?.RoomName || `Phòng ${roomId}`;
                                                    };
                                                    
                                                    if (displayCurrentSlot || slotInfo.newSlot) {
                                                        return (
                                                            <div style={{ marginBottom: '1rem', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                                <div className="adm-schedule-field-label" style={{ marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>📅 Thông tin đổi lịch</div>
                                                                {displayCurrentSlot && (
                                                                    <div style={{ marginBottom: '0.5rem' }}>
                                                                        <div style={{ marginBottom: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                                                            <span style={{ fontWeight: 600, color: '#64748b', fontSize: '0.8rem' }}>📍 Slot hiện tại:</span>
                                                                            <span style={{ color: '#334155', fontWeight: 500, fontSize: '0.85rem' }}>{displayCurrentSlot.dayLabel} ({displayCurrentSlot.time})</span>
                                                                        </div>
                                                                        <div style={{ marginLeft: '1.25rem', fontSize: '0.8rem', color: '#64748b' }}>
                                                                            🏠 Phòng: {getRoomName(displayCurrentRoom)}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {slotInfo.newSlot && (
                                                                    <div>
                                                                        <div style={{ marginBottom: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                                                            <span style={{ fontWeight: 600, color: '#059669', fontSize: '0.8rem' }}>✨ Slot mới:</span>
                                                                            <span style={{ color: '#047857', fontWeight: 600, fontSize: '0.85rem' }}>{slotInfo.newSlot.dayLabel} ({slotInfo.newSlot.time})</span>
                                                                        </div>
                                                                        <div style={{ marginLeft: '1.25rem', fontSize: '0.8rem', color: '#64748b' }}>
                                                                            🏠 Phòng: {slotInfo.newRoom || getRoomName(null)}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}

                                                <div style={{ marginBottom: '1rem' }}>
                                                    <div className="adm-schedule-field-label">Lý do</div>
                                                    <div className="adm-schedule-reason compact">
                                                        {extractDisplayReason(selectedRequest?.content || selectedRequest?.Content || '')}
                                                    </div>
                                                </div>

                                                <div style={{ marginBottom: '1rem' }}>
                                                    <div className="adm-schedule-field-label">Ngày gửi</div>
                                                    <div className="adm-schedule-field-value">{formatDate(selectedRequest?.createdAt)}</div>
                                                </div>

                                                {selectedRequest?.adminResponse && (
                                                    <div style={{ marginBottom: '1rem' }}>
                                                        <div className="adm-schedule-field-label">Phản hồi của admin</div>
                                                        <div className="adm-schedule-response compact">{selectedRequest?.adminResponse}</div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="adm-schedule-actions compact">
                                                <button
                                                    onClick={() => handleApprove(selectedRequest.id)}
                                                    disabled={processing || validationResults?.hasConflict || selectedRequest?.adminResponse}
                                                    className="adm-schedule-btn approve"
                                                    style={{ opacity: (validationResults?.hasConflict || selectedRequest?.adminResponse) ? 0.5 : 1 }}
                                                >
                                                    <CheckCircle size={18} />
                                                    Duyệt
                                                </button>
                                                <button
                                                    onClick={() => handleReject(selectedRequest.id)}
                                                    disabled={processing || selectedRequest?.adminResponse}
                                                    className="adm-schedule-btn deny"
                                                    style={{ opacity: selectedRequest?.adminResponse ? 0.5 : 1 }}
                                                >
                                                    <XCircle size={18} />
                                                    Từ chối
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="adm-schedule-empty-selection">
                                            <div style={{ background: '#f3f4f6', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                                                <Clock size={32} color="#9ca3af" />
                                            </div>
                                            <div style={{ fontWeight: 600, color: '#4b5563' }}>Chọn một yêu cầu từ danh sách bên trái</div>
                                            <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Nội dung chi tiết sẽ hiện ra tại đây</div>
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
