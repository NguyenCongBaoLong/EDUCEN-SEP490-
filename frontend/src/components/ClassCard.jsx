import { useState } from 'react';
import { Edit, Trash2, User, Users } from 'lucide-react';
import PropTypes from 'prop-types';
import '../css/components/ClassCard.css';

const ClassCard = ({ classData, onEdit, onDelete }) => {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = () => {
        onDelete(classData);
    };

    const getSubjectColor = (subject) => {
        const colors = {
            'MATHEMATICS': 'blue',
            'SCIENCE': 'green',
            'ENGLISH': 'purple',
            'PHYSICS': 'orange'
        };
        return colors[subject] || 'gray';
    };

    const isFull = classData.currentStudents >= classData.maxStudents;

    return (
        <div className={`class-card ${isDeleting ? 'deleting' : ''}`}>
            <div className="class-card-header">
                <span className={`class-subject-badge ${getSubjectColor(classData.subject)}`}>
                    {classData.subject}
                </span>
                <div className="class-card-actions">
                    <button
                        className="class-action-btn edit"
                        onClick={() => onEdit(classData)}
                        title="Edit class"
                    >
                        <Edit size={16} />
                    </button>
                    <button
                        className="class-action-btn delete"
                        onClick={handleDelete}
                        title="Delete class"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <h3 className="class-name">{classData.name}</h3>

            <div className="class-teachers">
                <div className="class-teacher">
                    <User size={14} />
                    <div className="teacher-info">
                        <span className="teacher-label">GIÁO VIÊN CHÍNH</span>
                        <div className="teacher-details">
                            <div className="teacher-avatar">{classData.mainTeacher.initials}</div>
                            <span className="teacher-name">{classData.mainTeacher.name}</span>
                        </div>
                    </div>
                </div>

                <div className="class-teacher">
                    <User size={14} />
                    <div className="teacher-info">
                        <span className="teacher-label">TRỢ GIẢNG</span>
                        {classData.assistant ? (
                            <div className="teacher-details">
                                <div className="teacher-avatar">{classData.assistant.initials}</div>
                                <span className="teacher-name">{classData.assistant.name}</span>
                            </div>
                        ) : (
                            <span className="teacher-unassigned">Chưa phân công</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="class-footer">
                <div className="class-students">
                    <Users size={14} />
                    <span className="students-label">HỌC SINH</span>
                    <span className="students-count">
                        {classData.currentStudents} / {classData.maxStudents}
                        {isFull && <span className="students-full"> [Đã đầy]</span>}
                    </span>
                </div>

                <div className="class-schedule">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <span className="schedule-label">LỊCH HỌC</span>
                    <span className="schedule-time">{classData.schedule}</span>
                </div>
            </div>
        </div>
    );
};

ClassCard.propTypes = {
    classData: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        name: PropTypes.string.isRequired,
        subject: PropTypes.string.isRequired,
        mainTeacher: PropTypes.shape({
            name: PropTypes.string.isRequired,
            initials: PropTypes.string.isRequired,
        }).isRequired,
        assistant: PropTypes.shape({
            name: PropTypes.string.isRequired,
            initials: PropTypes.string.isRequired,
        }),
        currentStudents: PropTypes.number.isRequired,
        maxStudents: PropTypes.number.isRequired,
        schedule: PropTypes.string.isRequired,
    }).isRequired,
    onEdit: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
};

export default ClassCard;
