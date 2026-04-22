import { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle, FileText, Calendar, MapPin, Puzzle, Check } from 'lucide-react';
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
        
        // Handle potential missing 'Z' suffix for UTC dates from backend
        let dateStr = iso;
        if (typeof iso === 'string' && !iso.includes('Z') && !iso.includes('+') && iso.includes('T')) {
            dateStr = iso + 'Z';
        }
        
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return iso; // Fallback if parsing fails

        // Use a consistent format: HH:mm DD/MM/YYYY
        const pad = (num) => String(num).padStart(2, '0');
        const hours = pad(d.getHours());
        const minutes = pad(d.getMinutes());
        const day = pad(d.getDate());
        const month = pad(d.getMonth() + 1);
        const year = d.getFullYear();

        return `${hours}:${minutes} ${day}/${month}/${year}`;
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
                    <header className="student-header">
                        <div className="header-left">
                            <h1>Yêu Cầu Đổi Lịch</h1>
                            <p>
                                Phê duyệt các yêu cầu đổi lịch dạy từ giáo viên và trợ giảng.
                                {pendingCount > 0 && (
                                    <span style={{ marginLeft: '1rem', color: '#ef4444', fontWeight: 700 }}>
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
                                        <span>DANH SÁCH CHỜ DUYỆT ({pendingCount})</span>
                                    </div>
                                    <div className="adm-schedule-list">
                                        {/* Pending Section */}
                                        {requests.filter(r => !r.adminResponse).map((req) => (
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
                                                <div className="adm-schedule-title-preview">Tiêu đề: {req?.title || '[SCHEDULE_CHANGE]'}</div>
                                                <div className="adm-schedule-meta" style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--sr-text-muted)' }}>
                                                    Ngày gửi: {formatDate(req?.createdAt)}
                                                </div>
                                            </div>
                                        ))}

                                        {/* Processed Section Header */}
                                        {requests.some(r => r.adminResponse) && (
                                            <div className="adm-schedule-list-head" style={{ marginTop: '1rem', borderTop: '1px solid var(--sr-border)' }}>
                                                <span>ĐÃ XỬ LÝ</span>
                                            </div>
                                        )}

                                        {requests.filter(r => r.adminResponse).map((req) => (
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
                                                    Ngày gửi: {formatDate(req?.createdAt)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section className="adm-schedule-detail-panel">
                                    {selectedRequest ? (
                                        <>
                                            <div className="compact-detail-content animate-fade-in">
                                                <div className="detail-header-new">
                                                    <div className="detail-title-new">
                                                        <AlertCircle size={20} color="#3b82f6" />
                                                        <span>Chi Tiết Yêu Cầu</span>
                                                    </div>
                                                </div>

                                                <div className="sender-info-grid">
                                                    <div className="info-item">
                                                        <div className="info-label-new">NGƯỜI GỬI</div>
                                                        <div className="info-value-new">{selectedRequest.senderName}</div>
                                                    </div>
                                                    <div className="info-item">
                                                        <div className="info-label-new">VAI TRÒ</div>
                                                        <div className="info-value-new">{selectedRequest.senderRoleName}</div>
                                                    </div>
                                                </div>

                                                <div className="detail-row-new">
                                                    <div className="info-label-new">TIÊU ĐỀ</div>
                                                    <div className="info-value-new title-bold">{selectedRequest.title || '[SCHEDULE_CHANGE] [Đổi lịch dạy]'}</div>
                                                </div>

                                                {/* Class Info Box */}
                                                <div className="info-box-card">
                                                    <div className="info-box-header">
                                                        <FileText size={18} color="#f59e0b" />
                                                        <span>THÔNG TIN LỚP HỌC</span>
                                                    </div>
                                                    <div className="info-box-grid">
                                                        <div className="grid-item">
                                                            <span className="item-label">Tên lớp:</span>
                                                            <span className="item-value">{selectedClassData?.className || selectedClassData?.Name || 'N/A'}</span>
                                                        </div>
                                                        <div className="grid-item">
                                                            <span className="item-label">Giáo viên:</span>
                                                            <span className="item-value">{selectedClassData?.teacherName || selectedRequest.senderName}</span>
                                                        </div>
                                                        <div className="grid-item">
                                                            <span className="item-label">Môn học:</span>
                                                            <span className="item-value">{selectedClassData?.subjectName || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Schedule Info Box */}
                                                <div className="info-box-card">
                                                    <div className="info-box-header">
                                                        <Calendar size={18} color="#ef4444" />
                                                        <span>THÔNG TIN ĐỔI LỊCH</span>
                                                    </div>
                                                    <div className="schedule-box-content">
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

                                                            return (
                                                                <div className="schedule-comparison-new">
                                                                    <div className="schedule-row current">
                                                                         <div className="icon-wrap"><MapPin size={14} /></div>
                                                                         <div className="slot-info">
                                                                             <span className="slot-label">Slot hiện tại:</span>
                                                                             <span className="slot-value">{displayCurrentSlot?.dayLabel} ({displayCurrentSlot?.time})</span>
                                                                         </div>
                                                                         <div className="room-info">
                                                                             📍 Phòng: {displayCurrentRoom || 'Chưa rõ'}
                                                                         </div>
                                                                     </div>
                                                                     <div className="schedule-row new">
                                                                         <div className="icon-wrap success"><Puzzle size={14} /></div>
                                                                         <div className="slot-info">
                                                                             <span className="slot-label success">Slot mới:</span>
                                                                             <span className="slot-value success">{slotInfo.newSlot?.dayLabel} ({slotInfo.newSlot?.time})</span>
                                                                         </div>
                                                                         <div className="room-info success">
                                                                             🧩 Phòng: {slotInfo.newRoom || 'Chưa rõ'}
                                                                         </div>
                                                                     </div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>

                                                {validationResults?.hasConflict && (
                                                    <div className="conflict-alert-new">
                                                        <div className="conflict-title">
                                                            <XCircle size={18} />
                                                            CẢNH BÁO XUNG ĐỘT LỊCH
                                                        </div>
                                                        {validationResults.teacherConflict && (
                                                            <div className="conflict-detail">
                                                                <strong>Giáo viên:</strong> Trùng {validationResults.teacherConflict.className} ({validationResults.teacherConflict.time})
                                                            </div>
                                                        )}
                                                        {validationResults.roomConflict && (
                                                            <div className="conflict-detail">
                                                                <strong>Phòng:</strong> Trùng {validationResults.roomConflict.className} ({validationResults.roomConflict.time})
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="reason-section-new">
                                                    <div className="info-label-new">LÝ DO</div>
                                                    <div className="reason-box-new">
                                                        {extractDisplayReason(selectedRequest?.content || selectedRequest?.Content || '')}
                                                    </div>
                                                </div>

                                                <div className="date-sent-new">
                                                    <span className="label">NGÀY GỬI:</span>
                                                    <span className="value">{formatDate(selectedRequest?.createdAt)}</span>
                                                </div>

                                                {selectedRequest?.adminResponse && (
                                                    <div className="reason-section-new">
                                                        <div className="info-label-new">PHẢN HỒI TỪ ADMIN</div>
                                                        <div className="reason-box-new response">
                                                            {selectedRequest?.adminResponse}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="detail-actions-new">
                                                <button
                                                    onClick={() => handleApprove(selectedRequest.id)}
                                                    disabled={processing || validationResults?.hasConflict || selectedRequest?.adminResponse}
                                                    className="btn-approve-new"
                                                >
                                                    <CheckCircle size={18} />
                                                    Duyệt
                                                </button>
                                                <button
                                                    onClick={() => handleReject(selectedRequest.id)}
                                                    disabled={processing || selectedRequest?.adminResponse}
                                                    className="btn-reject-new"
                                                >
                                                    <XCircle size={18} />
                                                    Từ chối
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="adm-schedule-empty-selection">
                                            <div style={{ background: '#eff6ff', padding: '2rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
                                                <Clock size={48} color="#3b82f6" />
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

