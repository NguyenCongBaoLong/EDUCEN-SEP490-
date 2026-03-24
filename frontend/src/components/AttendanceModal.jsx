import { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Calendar, Users, Zap } from 'lucide-react';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';
import api from '../services/api';
import '../css/components/AttendanceModal.css';

/**
 * AttendanceModal
 * Cho phép giáo viên điểm danh từng học sinh theo buổi học (sessionId).
 * status: 'present' | 'absent' | 'notYet' — theo bảng Attendance trong DB
 */
const AttendanceModal = ({ isOpen, onClose, onSave, session, students, existingRecords, sessionId }) => {
    const [records, setRecords] = useState({});
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);

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
                        <span>Vắng: <strong>{absentCount}</strong></span>
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
                                            Vắng
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
};

AttendanceModal.defaultProps = { 
    existingRecords: null,
    sessionId: null,
    onSave: null
};

export default AttendanceModal;