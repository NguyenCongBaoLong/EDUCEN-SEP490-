import { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Calendar, Users, Zap, AlertCircle, Clock } from 'lucide-react';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';
import api from '../services/api';
import '../css/components/AttendanceModal.css';

 /**
  * AttendanceModal
  * Cho phép giáo viên điểm danh từng học sinh theo buổi học (sessionId).
  * status: 'present' | 'absent' | 'notYet' - theo bảng Attendance trong DB
  * 
  * Props:
  * - canAttend: boolean - có thể điểm danh không (true = trong ngày, false = đã quá ngày)
  * - onRequestModification: callback khi Teacher cần gửi yêu cầu sửa điểm danh
  */
const AttendanceModal = ({ 
    isOpen, 
    onClose, 
    onSave, 
    session, 
    students, 
    existingRecords, 
    sessionId,
    canAttend = true,
    lockMessage = '',
    onRequestModification,
    isAdmin = false // New: differentiation for Admin portal
}) => {
    const getAttendanceStatusMeta = (status) => {
        switch (status) {
            case 'present':
                return { label: 'Có mặt', className: 'present', icon: CheckCircle };
            case 'absent':
                return { label: 'Vắng mặt', className: 'absent', icon: XCircle };
            default:
                return { label: 'Chưa điểm danh', className: 'pending', icon: Clock };
        }
    };

    const [records, setRecords] = useState({});
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [requestData, setRequestData] = useState({
        reason: ''
    });
    const [requestedStatuses, setRequestedStatuses] = useState({});
    const [submittingRequest, setSubmittingRequest] = useState(false);
    const [selectedStudentsForRequest, setSelectedStudentsForRequest] = useState([]);
    const [hasFetchedData, setHasFetchedData] = useState(false); // New: track if DB has records

    useEffect(() => {
        if (isOpen) {
            loadExistingRecords();
        }
    }, [isOpen, sessionId]);

    const loadExistingRecords = async () => {
        if (!sessionId) return;
        
        setLoading(true);
        try {
            const res = await api.get(`/attendance/session/${sessionId}`);
            if (res.data && res.data.length > 0) {
                const recordMap = {};
                res.data.forEach(r => {
                    recordMap[r.studentId] = r.status || 'notYet';
                });
                setRecords(recordMap);
                setHasFetchedData(true);
            } else {
                setHasFetchedData(false);
                const defaultRecords = {};
                students.forEach(s => {
                    defaultRecords[s.id] = 'present';
                });
                setRecords(defaultRecords);
            }
        } catch (error) {
            console.error('Load attendance error:', error);
            const defaultRecords = {};
            students.forEach(s => {
                defaultRecords[s.id] = 'present';
            });
            setRecords(defaultRecords);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const handleQuickAttendance = () => {
        const allPresent = {};
        students.forEach(s => {
            allPresent[s.id] = 'present';
        });
        setRecords(allPresent);
    };

    const handleStatusChange = (studentId, status) => {
        setRecords(prev => ({
            ...prev,
            [studentId]: status
        }));
    };

    const presentCount = Object.values(records).filter(s => s === 'present').length;
    const absentCount = Object.values(records).filter(s => s === 'absent').length;

    const handleSave = async () => {
        if (!canAttend && !isAdmin) {
            toast.error(lockMessage || 'Đã quá ngày điểm danh. Vui lòng gửi yêu cầu sửa điểm danh cho Admin.');
            return;
        }
        
        setSaving(true);
        try {
            const payload = students.map(s => ({
                studentId: parseInt(s.id),
                status: records[s.id] || 'present'
            }));

            if (sessionId) {
                await api.post(`/attendance/session/${sessionId}/bulk`, payload);
                onSave && await onSave(session, payload);
                toast.success('Lưu điểm danh thành công!');
                onClose();
            } else {
                await onSave(session, payload);
                onClose();
            }
        } catch (error) {
            console.error('Save attendance error:', error);
            toast.error(error.response?.data?.message || 'Lỗi khi lưu điểm danh');
        } finally {
            setSaving(false);
        }
    };

    // Submit modification request for selected students
    const handleSubmitRequest = async () => {
        const selectedStudents = students.filter(s => selectedStudentsForRequest.includes(s.id));
        
        if (selectedStudents.length === 0) {
            toast.error('Vui lòng chọn ít nhất một học sinh');
            return;
        }
        
        if (!requestData.reason.trim()) {
            toast.error('Vui lòng nhập lý do yêu cầu sửa điểm danh');
            return;
        }

        setSubmittingRequest(true);
        try {
            const payload = {
                sessionId: parseInt(session?.sessionId ?? sessionId),
                requests: selectedStudents.map(student => ({
                    studentId: parseInt(student.id),
                    requestedStatus: requestedStatuses[student.id] || 'present',
                    reason: requestData.reason
                }))
            };

            await api.post('/attendance/modification-requests/batch', payload);

            toast.success(`Gửi yêu cầu sửa điểm danh cho ${selectedStudents.length} học sinh thành công. Vui lòng chờ Admin duyệt.`);
            setShowRequestForm(false);
            setSelectedStudentsForRequest([]);
            setRequestedStatuses({});
            onRequestModification && onRequestModification();
            onClose();
        } catch (error) {
            console.error('Submit request error:', error);
            toast.error(error.response?.data?.message || 'Lỗi khi gửi yêu cầu sửa điểm danh');
        } finally {
            setSubmittingRequest(false);
        }
    };

    const handleSelectAllForRequest = () => {
        if (selectedStudentsForRequest.length === students.length) {
            setSelectedStudentsForRequest([]);
            setRequestedStatuses({});
        } else {
            setSelectedStudentsForRequest(students.map(s => s.id));
            const nextStatuses = {};
            students.forEach(s => {
                nextStatuses[s.id] = requestedStatuses[s.id] || records[s.id] || 'present';
            });
            setRequestedStatuses(nextStatuses);
        }
    };

    const handleToggleStudentForRequest = (studentId, checked) => {
        if (checked) {
            setSelectedStudentsForRequest(prev => [...prev, studentId]);
            setRequestedStatuses(prev => ({
                ...prev,
                [studentId]: prev[studentId] || records[studentId] || 'present'
            }));
            return;
        }

        setSelectedStudentsForRequest(prev => prev.filter(id => id !== studentId));
        setRequestedStatuses(prev => {
            const next = { ...prev };
            delete next[studentId];
            return next;
        });
    };

    // Show request modification form for past days
    if (showRequestForm) {
        return (
            <div className="atm-overlay" onClick={() => !submittingRequest && setShowRequestForm(false)}>
                <div className="atm-modal atm-request-modal" onClick={e => e.stopPropagation()}>
                    <div className="atm-header">
                        <div className="atm-header-info">
                            <h3>Yêu cầu sửa điểm danh</h3>
                            <div className="atm-session-meta">
                                 <Clock size={14} />
                                <span>{session.dayLabel} - {session.date}</span>
                            </div>
                        </div>
                        <button className="atm-close" onClick={() => setShowRequestForm(false)} disabled={submittingRequest}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="atm-body atm-request-body">
                        <div className="atm-request-alert">
                            <AlertCircle size={20} color="#f59e0b" className="atm-request-alert-icon" />
                            <div className="atm-request-alert-text">
                                <strong>Lưu ý:</strong> Đã quá ngày điểm danh. Bạn cần gửi yêu cầu cho Admin để sửa điểm danh.
                            </div>
                        </div>

                        {/* Student Selection */}
                        <div className="atm-request-students-block">
                            <div className="atm-request-students-header">
                                <label className="atm-request-students-label">
                                    Chọn học sinh <span style={{ color: '#ef4444' }}>*</span>:
                                </label>
                                <button
                                    type="button"
                                    onClick={handleSelectAllForRequest}
                                    className="atm-select-all-btn"
                                >
                                    {selectedStudentsForRequest.length === students.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                                </button>
                            </div>
                            <div className="atm-request-students-list">
                                {students.map(st => (
                                    <label
                                        key={st.id}
                                        className="atm-request-student-item"
                                    >
                                        <input 
                                            type="checkbox"
                                            checked={selectedStudentsForRequest.includes(st.id)}
                                            onChange={(e) => handleToggleStudentForRequest(st.id, e.target.checked)}
                                        />
                                        <span className="atm-request-student-name">{st.name}</span>
                                        <span className={`atm-req-status-badge ${getAttendanceStatusMeta(records[st.id]).className}`}>
                                            {getAttendanceStatusMeta(records[st.id]).label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                            <div className="atm-request-selected-count">
                                Đã chọn: {selectedStudentsForRequest.length} / {students.length} học sinh
                            </div>
                        </div>

                        <div className="atm-request-field">
                            <label className="atm-request-field-label">
                                Trạng thái điểm danh muốn sửa:
                            </label>
                            {selectedStudentsForRequest.length > 0 ? (
                                <div className="atm-target-status-panel">
                                    <div className="atm-target-status-grid">
                                        {students
                                            .filter(st => selectedStudentsForRequest.includes(st.id))
                                            .map(st => {
                                                const targetStatus = requestedStatuses[st.id] || 'present';
                                                return (
                                                    <div key={`req-status-${st.id}`} className="atm-target-status-item">
                                                        <span className="atm-target-status-name">{st.name}</span>
                                                        <div className="atm-target-status-toggle">
                                                            <button
                                                                type="button"
                                                                className={`atm-target-status-btn ${targetStatus === 'present' ? 'active-present' : ''}`}
                                                                onClick={() =>
                                                                    setRequestedStatuses(prev => ({
                                                                        ...prev,
                                                                        [st.id]: 'present'
                                                                    }))
                                                                }
                                                                disabled={submittingRequest}
                                                            >
                                                                Có mặt
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className={`atm-target-status-btn ${targetStatus === 'absent' ? 'active-absent' : ''}`}
                                                                onClick={() =>
                                                                    setRequestedStatuses(prev => ({
                                                                        ...prev,
                                                                        [st.id]: 'absent'
                                                                    }))
                                                                }
                                                                disabled={submittingRequest}
                                                            >
                                                                Vắng mặt
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            ) : (
                                <div className="atm-request-selected-count">Chọn học sinh để đặt trạng thái muốn sửa.</div>
                            )}
                        </div>

                        <div className="atm-request-field">
                            <label className="atm-request-field-label">
                                Lý do <span className="atm-required">*</span>:
                            </label>
                            <textarea
                                className="atm-request-textarea"
                                value={requestData.reason}
                                onChange={e => setRequestData({ ...requestData, reason: e.target.value })}
                                placeholder="Nhập lý do yêu cầu sửa điểm danh..."
                                rows={4}
                                disabled={submittingRequest}
                            />
                        </div>

                    </div>

                    <div className="atm-footer">
                        <button 
                            className="atm-btn-cancel"
                            onClick={() => setShowRequestForm(false)}
                            disabled={submittingRequest}
                        >
                            Hủy
                        </button>
                        <button 
                            className="atm-btn-save"
                            onClick={handleSubmitRequest}
                            disabled={submittingRequest}
                        >
                            {submittingRequest ? 'Đang gửi...' : 'Gửi yêu cầu'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Logic for TEACHER (Logic cũ)
    if (!isAdmin && !canAttend && sessionId) {
        const isFuture = lockMessage.toLowerCase().includes('chưa bắt đầu') || lockMessage.toLowerCase().includes('chưa diễn ra');
        return (
            <div className="atm-overlay" onClick={onClose}>
                <div className="atm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                    <div className="atm-header">
                        <div className="atm-header-info">
                            <h3>Điểm danh buổi học</h3>
                            <div className="atm-session-meta">
                                <Calendar size={14} />
                                <span>{session.dayLabel} - {session.date}</span>
                                <span className="atm-dot">•</span>
                                <span>{session.time}</span>
                            </div>
                        </div>
                        <button className="atm-close" onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>

                    <div style={{ padding: '30px 20px', textAlign: 'center' }}>
                        <div style={{ 
                            width: '60px', 
                            height: '60px', 
                            borderRadius: '50%', 
                            background: '#fef3c7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px'
                        }}>
                            <Clock size={28} color="#f59e0b" />
                        </div>
                        <h4 style={{ margin: '0 0 8px', color: '#92400e' }}>
                            {isFuture ? 'Buổi học chưa bắt đầu' : 'Đã quá ngày điểm danh'}
                        </h4>
                        <p style={{ margin: '0 0 20px', color: '#b45309', fontSize: '14px' }}>
                            {lockMessage || 'Bạn chỉ có thể điểm danh trong ngày diễn ra buổi học.'}
                        </p>
                        
                        {!isFuture ? (
                            <button 
                                onClick={() => setShowRequestForm(true)}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px 24px',
                                    background: '#f59e0b',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: 'pointer'
                                }}
                            >
                                <AlertCircle size={18} />
                                Gửi yêu cầu sửa điểm danh
                            </button>
                        ) : (
                            <button 
                                onClick={onClose}
                                style={{
                                    padding: '10px 24px',
                                    background: '#f59e0b',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: 'pointer'
                                }}
                            >
                                Quay lại
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Logic for ADMIN - Chỉ hiện thông báo khi ở chế độ XEM và chưa có dữ liệu
    if (isAdmin && !canAttend && sessionId && !hasFetchedData) {
        return (
            <div className="atm-overlay" onClick={onClose}>
                <div className="atm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                    <div className="atm-header">
                        <div className="atm-header-info">
                            <h3>Điểm danh buổi học</h3>
                            <div className="atm-session-meta">
                                <Calendar size={14} />
                                <span>{session.dayLabel} - {session.date}</span>
                                <span className="atm-dot">•</span>
                                <span>{session.time}</span>
                            </div>
                        </div>
                        <button className="atm-close" onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>

                    <div style={{ padding: '30px 20px', textAlign: 'center' }}>
                        <div style={{ 
                            width: '60px', 
                            height: '60px', 
                            borderRadius: '50%', 
                            background: '#fef3c7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px'
                        }}>
                            <Clock size={28} color="#f59e0b" />
                        </div>
                        <h4 style={{ margin: '0 0 8px', color: '#92400e' }}>Buổi học chưa có dữ liệu</h4>
                        <p style={{ margin: '0 0 20px', color: '#b45309', fontSize: '14px' }}>
                            Buổi học này chưa được điểm danh bởi giáo viên.
                        </p>
                        <button 
                            onClick={onClose}
                            style={{
                                padding: '10px 24px',
                                background: '#f59e0b',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: 'pointer'
                            }}
                        >
                            Quay lại
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const isEditAllowed = canAttend;

    return (
        <div className="atm-overlay" onClick={onClose}>
            <div className="atm-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="atm-header">
                    <div className="atm-header-info">
                        <h3>Điểm danh buổi học</h3>
                        <div className="atm-session-meta">
                            <Calendar size={14} />
                            <span>{session.dayLabel} - {session.date}</span>
                            <span className="atm-dot">•</span>
                            <span>{session.time}</span>
                        </div>
                    </div>
                    <button className="atm-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Header Actions - Hidden in read-only mode */}
                {isEditAllowed && (
                    <div style={{ padding: '12px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button 
                            onClick={handleQuickAttendance}
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px',
                                padding: '8px 16px',
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            <Zap size={16} />
                            Điểm danh nhanh (Tất cả có mặt)
                        </button>

                        {isAdmin && !hasFetchedData && (
                            <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600, background: '#fef3c7', padding: '4px 10px', borderRadius: '12px' }}>
                                Chưa có dữ liệu điểm danh
                            </span>
                        )}
                    </div>
                )}

                {/* Summary bar */}
                <div className="atm-summary">
                    <div className="atm-summary-item present">
                        <CheckCircle size={16} />
                        <span>Có mặt: <strong>{presentCount}</strong></span>
                    </div>
                    <div className="atm-summary-item absent">
                        <XCircle size={16} />
                        <span>Vắng mặt: <strong>{absentCount}</strong></span>
                    </div>
                    <div className="atm-summary-item total">
                        <Users size={16} />
                        <span>Tổng: <strong>{students.length}</strong></span>
                    </div>
                </div>

                {/* Student list */}
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                        Đang tải dữ liệu...
                    </div>
                ) : (
                    <div className="atm-body">
                        {students.map(st => {
                            const status = records[st.id] || 'present';
                            const isPresent = status === 'present';
                            const isAbsent = status === 'absent';
                            
                            return (
                                <div
                                    key={st.id}
                                    className={`atm-student-row ${isPresent ? 'present' : isAbsent ? 'absent' : ''}`}
                                >
                                    <div className="atm-student-info">
                                        <div className="atm-avatar">{st.avatar}</div>
                                        <div>
                                            <div className="atm-student-name">{st.name}</div>
                                        </div>
                                    </div>

                                    <div className="atm-toggle-group">
                                        <button
                                            className={`atm-btn-status ${isPresent ? 'active-present' : ''}`}
                                            onClick={() => handleStatusChange(st.id, 'present')}
                                            disabled={!isEditAllowed}
                                        >
                                            <CheckCircle size={15} />
                                            Có mặt
                                        </button>
                                        <button
                                            className={`atm-btn-status ${isAbsent ? 'active-absent' : ''}`}
                                            onClick={() => handleStatusChange(st.id, 'absent')}
                                            disabled={!isEditAllowed}
                                        >
                                            <XCircle size={15} />
                                            Vắng mặt
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Footer */}
                <div className="atm-footer">
                    <button className="atm-btn-cancel" onClick={onClose} disabled={saving}>
                        {isEditAllowed ? 'Hủy' : 'Đóng'}
                    </button>
                    {isEditAllowed && (
                        <button className="atm-btn-save" onClick={handleSave} disabled={saving}>
                            {saving ? 'Đang lưu...' : 'Lưu điểm danh'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

AttendanceModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSave: PropTypes.func,
    session: PropTypes.shape({
        scheduleId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        sessionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        date: PropTypes.string.isRequired,
        dayLabel: PropTypes.string.isRequired,
        time: PropTypes.string.isRequired,
    }).isRequired,
    students: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        avatar: PropTypes.string.isRequired,
    })).isRequired,
    existingRecords: PropTypes.arrayOf(PropTypes.shape({
        studentId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        status: PropTypes.oneOf(['present', 'absent', 'notYet']).isRequired,
    })),
    sessionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    canAttend: PropTypes.bool,
    lockMessage: PropTypes.string,
    onRequestModification: PropTypes.func,
    isAdmin: PropTypes.bool,
};

AttendanceModal.defaultProps = { 
    existingRecords: null,
    sessionId: null,
    onSave: null,
    canAttend: true,
    onRequestModification: null,
    isAdmin: false
};

export default AttendanceModal;