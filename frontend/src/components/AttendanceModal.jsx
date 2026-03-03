import { useState } from 'react';
import { X, CheckCircle, XCircle, Calendar, Users } from 'lucide-react';
import PropTypes from 'prop-types';
import '../css/components/AttendanceModal.css';

/**
 * AttendanceModal
 * Cho phép giáo viên điểm danh từng học sinh theo buổi học (schedule_id).
 * status: 'present' | 'absent'  — theo bảng Attendance trong DB
 */
const AttendanceModal = ({ isOpen, onClose, onSave, session, students, existingRecords }) => {
    // Nếu có existingRecords (sửa buổi cũ) thì pre-fill, ngược lại mặc định "Có mặt"
    const initialRecords = () => {
        if (existingRecords && existingRecords.length > 0) {
            return Object.fromEntries(existingRecords.map(r => [r.studentId, r.status]));
        }
        return Object.fromEntries(students.map(s => [s.id, 'present']));
    };

    const [records, setRecords] = useState(initialRecords);
    const [saving, setSaving] = useState(false);

    if (!isOpen) return null;

    const toggle = (studentId) => {
        setRecords(prev => ({
            ...prev,
            [studentId]: prev[studentId] === 'present' ? 'absent' : 'present',
        }));
    };

    const presentCount = Object.values(records).filter(s => s === 'present').length;
    const absentCount = Object.values(records).filter(s => s === 'absent').length;

    const handleSave = async () => {
        setSaving(true);
        // Chuẩn bị payload theo cấu trúc DB:
        // attendance_id (auto), schedule_id, student_id, status, updated_by, recorded_at
        const payload = students.map(s => ({
            scheduleId: session.scheduleId,
            studentId: s.id,
            status: records[s.id],   // 'present' | 'absent'
        }));
        await onSave(session, payload);
        setSaving(false);
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
                <div className="atm-body">
                    {students.map(st => {
                        const isPresent = records[st.id] === 'present';
                        return (
                            <div
                                key={st.id}
                                className={`atm-student-row ${isPresent ? 'present' : 'absent'}`}
                            >
                                <div className="atm-student-info">
                                    <div className="atm-avatar">{st.avatar}</div>
                                    <div>
                                        <div className="atm-student-name">{st.name}</div>
                                        <div className="atm-student-id">ID: #{st.id}</div>
                                    </div>
                                </div>

                                <div className="atm-toggle-group">
                                    <button
                                        className={`atm-btn-status ${isPresent ? 'active-present' : ''}`}
                                        onClick={() => setRecords(prev => ({ ...prev, [st.id]: 'present' }))}
                                    >
                                        <CheckCircle size={15} />
                                        Có mặt
                                    </button>
                                    <button
                                        className={`atm-btn-status ${!isPresent ? 'active-absent' : ''}`}
                                        onClick={() => setRecords(prev => ({ ...prev, [st.id]: 'absent' }))}
                                    >
                                        <XCircle size={15} />
                                        Vắng
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

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
    onSave: PropTypes.func.isRequired,
    session: PropTypes.shape({
        scheduleId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
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
        studentId: PropTypes.string.isRequired,
        status: PropTypes.oneOf(['present', 'absent']).isRequired,
    })),
};

AttendanceModal.defaultProps = { existingRecords: null };

export default AttendanceModal;
