import { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Calendar, Users, Zap, AlertCircle, Clock } from 'lucide-react';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';
import api from '../services/api';
import '../css/components/AttendanceModal.css';

/**
 * AttendanceModal
 * Cho phép giáo viên điểm danh từng học sinh theo buổi học (sessionId).
 * status: 'present' | 'absent' | 'notYet' — theo bảng Attendance trong DB
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
    onRequestModification 
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
        requestedStatus: 'present',
        reason: ''
    });
    const [submittingRequest, setSubmittingRequest] = useState(false);

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
            } else {
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
        if (!canAttend) {
            toast.error('Đã quá ngày điểm danh. Vui lòng gửi yêu cầu sửa điểm danh cho Admin.');
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
            // Create request for each selected student
            for (const student of selectedStudents) {
                await api.post('/attendance/modification-request', {
                    sessionId: parseInt(session.sessionId),
                    studentId: parseInt(student.id),
                    requestedStatus: requestData.requestedStatus,
                    reason: requestData.reason
                });
            }

            toast.success(`Gửi yêu cầu sửa điểm danh cho ${selectedStudents.length} học sinh thành công. Vui lòng chờ Admin duyệt.`);
            setShowRequestForm(false);
            setSelectedStudentsForRequest([]);
            onRequestModification && onRequestModification();
            onClose();
        } catch (error) {
            console.error('Submit request error:', error);
            toast.error(error.response?.data?.message || 'Lỗi khi gửi yêu cầu sửa điểm danh');
        } finally {
            setSubmittingRequest(false);
        }
    };

    // State for selected students in request form
    const [selectedStudentsForRequest, setSelectedStudentsForRequest] = useState([]);

    const handleSelectAllForRequest = () => {
        if (selectedStudentsForRequest.length === students.length) {
            setSelectedStudentsForRequest([]);
        } else {
            setSelectedStudentsForRequest(students.map(s => s.id));
        }
    };

    // Show request modification form for past days
    if (showRequestForm) {
        return (
            <div className="atm-overlay" onClick={() => !submittingRequest && setShowRequestForm(false)}>
                <div className="atm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                    <div className="atm-header">
                        <div className="atm-header-info">
                            <h3>Yêu cầu sửa điểm danh</h3>
                            <div className="atm-session-meta">
                                <Clock size={14} />
                                <span>{session.dayLabel} — {session.date}</span>
                            </div>
                        </div>
                        <button className="atm-close" onClick={() => setShowRequestForm(false)} disabled={submittingRequest}>
                            <X size={20} />
                        </button>
                    </div>

                    <div style={{ padding: '20px' }}>
                        <div style={{ 
                            background: '#fef3c7', 
                            border: '1px solid #f59e0b', 
                            borderRadius: '8px', 
                            padding: '12px',
                            marginBottom: '20px',
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start'
                        }}>
                            <AlertCircle size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div style={{ fontSize: '14px', color: '#92400e' }}>
                                <strong>Lưu ý:</strong> Đã quá ngày điểm danh. Bạn cần gửi yêu cầu cho Admin để sửa điểm danh.
                            </div>
                        </div>

                        {/* Student Selection */}
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <label style={{ fontWeight: '500' }}>
                                    Chọn học sinh <span style={{ color: '#ef4444' }}>*</span>:
                                </label>
                                <button 
                                    type="button"
                                    onClick={handleSelectAllForRequest}
                                    style={{ 
                                        fontSize: '13px', 
                                        color: '#3b82f6', 
                                        background: 'none', 
                                        border: 'none', 
                                        cursor: 'pointer',
                                        textDecoration: 'underline'
                                    }}
                                >
                                    {selectedStudentsForRequest.length === students.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                                </button>
                            </div>
                            <div style={{ 
                                maxHeight: '150px', 
                                overflow: 'auto', 
                                border: '1px solid #e5e7eb', 
                                borderRadius: '6px',
                                padding: '8px'
                            }}>
                                {students.map(st => (
                                    <label 
                                        key={st.id}
                                        style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '8px',
                                            padding: '8px',
                                            cursor: 'pointer',
                                            borderBottom: '1px solid #f3f4f6'
                                        }}
                                    >
                                        <input 
                                            type="checkbox"
                                            checked={selectedStudentsForRequest.includes(st.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedStudentsForRequest([...selectedStudentsForRequest, st.id]);
                                                } else {
                                                    setSelectedStudentsForRequest(selectedStudentsForRequest.filter(id => id !== st.id));
                                                }
                                            }}
                                        />
                                        <span style={{ fontSize: '14px', flex: 1 }}>{st.name}</span>
                                        <span className={`atm-req-status-badge ${getAttendanceStatusMeta(records[st.id]).className}`}>
                                            {getAttendanceStatusMeta(records[st.id]).label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                Đã chọn: {selectedStudentsForRequest.length} / {students.length} học sinh
                            </div>
                        </div>

                        {selectedStudentsForRequest.length > 0 && (
                            <div className="atm-original-status-panel">
                                <div className="atm-original-status-title">
                                    Trạng thái điểm danh ban đầu của học sinh đã chọn
                                </div>
                                <div className="atm-original-status-grid">
                                    {students
                                        .filter(st => selectedStudentsForRequest.includes(st.id))
                                        .map(st => {
                                            const currentStatusMeta = getAttendanceStatusMeta(records[st.id]);
                                            return (
                                                <div key={`origin-${st.id}`} className="atm-original-status-item">
                                                    <span className="atm-original-student-name">{st.name}</span>
                                                    <span className={`atm-req-status-badge ${currentStatusMeta.className}`}>
                                                        {currentStatusMeta.label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        )}

                        <div className="atm-request-field">
                            <label className="atm-request-field-label">
                                Trạng thái điểm danh muốn sửa:
                            </label>
                            <div className="atm-request-status-options">
                                <label className={`atm-request-status-option ${requestData.requestedStatus === 'present' ? 'active-present' : ''}`}>
                                    <input 
                                        type="radio" 
                                        name="requestedStatus" 
                                        value="present"
                                        checked={requestData.requestedStatus === 'present'}
                                        onChange={e => setRequestData({ ...requestData, requestedStatus: e.target.value })}
                                    />
                                    <CheckCircle size={16} />
                                    <span>Có mặt</span>
                                </label>
                                <label className={`atm-request-status-option ${requestData.requestedStatus === 'absent' ? 'active-absent' : ''}`}>
                                    <input 
                                        type="radio" 
                                        name="requestedStatus" 
                                        value="absent"
                                        checked={requestData.requestedStatus === 'absent'}
                                        onChange={e => setRequestData({ ...requestData, requestedStatus: e.target.value })}
                                    />
                                    <XCircle size={16} />
                                    <span>Vắng mặt</span>
                                </label>
                            </div>
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

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button 
                                onClick={() => setShowRequestForm(false)}
                                disabled={submittingRequest}
                                style={{
                                    padding: '10px 20px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    background: 'white',
                                    cursor: submittingRequest ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Hủy
                            </button>
                            <button 
                                onClick={handleSubmitRequest}
                                disabled={submittingRequest}
                                style={{
                                    padding: '10px 20px',
                                    background: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: submittingRequest ? 'not-allowed' : 'pointer',
                                    opacity: submittingRequest ? 0.7 : 1
                                }}
                            >
                                {submittingRequest ? 'Đang gửi...' : 'Gửi yêu cầu'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Show blocked state when can't attend
    if (!canAttend && sessionId) {
        return (
            <div className="atm-overlay" onClick={onClose}>
                <div className="atm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                    <div className="atm-header">
                        <div className="atm-header-info">
                            <h3>Điểm danh buổi học</h3>
                            <div className="atm-session-meta">
                                <Calendar size={14} />
                                <span>{session.dayLabel} — {session.date}</span>
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
                        <h4 style={{ margin: '0 0 8px', color: '#92400e' }}>Đã quá ngày điểm danh</h4>
                        <p style={{ margin: '0 0 20px', color: '#b45309', fontSize: '14px' }}>
                            Bạn chỉ có thể điểm danh trong ngày diễn ra buổi học. Để sửa điểm danh cho ngày đã qua, vui lòng gửi yêu cầu cho Admin.
                        </p>
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
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="atm-overlay" onClick={onClose}>
            <div className="atm-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="atm-header">
                    <div className="atm-header-info">
                        <h3>Điểm danh buổi học</h3>
                        <div className="atm-session-meta">
                            <Calendar size={14} />
                            <span>{session.dayLabel} — {session.date}</span>
                            <span className="atm-dot">•</span>
                            <span>{session.time}</span>
                        </div>
                    </div>
                    <button className="atm-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Quick Attendance Button */}
                <div style={{ padding: '12px 20px', borderBottom: '1px solid #e5e7eb' }}>
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
                </div>

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
                                        >
                                            <CheckCircle size={15} />
                                            Có mặt
                                        </button>
                                        <button
                                            className={`atm-btn-status ${isAbsent ? 'active-absent' : ''}`}
                                            onClick={() => handleStatusChange(st.id, 'absent')}
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
                        Hủy
                    </button>
                    <button className="atm-btn-save" onClick={handleSave} disabled={saving}>
                        {saving ? 'Đang lưu...' : 'Lưu điểm danh'}
                    </button>
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
    onRequestModification: PropTypes.func,
};

AttendanceModal.defaultProps = { 
    existingRecords: null,
    sessionId: null,
    onSave: null,
    canAttend: true,
    onRequestModification: null
};

export default AttendanceModal;
