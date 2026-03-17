import { useState, useEffect } from 'react';
import { Search, GraduationCap } from 'lucide-react';
import TeacherSidebar from '../../components/TeacherSidebar';
import ClassCard from '../../components/ClassCard';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import '../../css/pages/center/ClassesManagement.css';

const TeacherClasses = ({ isTA = false }) => {
    const { user } = useAuth();
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        if (!user?.userId) return;
        const fetchClasses = async () => {
            try {
                setLoading(true);
                const endpoint = isTA
                    ? `/Assistants/${user.userId}/classes`
                    : `/Teachers/${user.userId}/classes`;
                const res = await api.get(endpoint);
                // Normalize data to match ClassCard expected shape
                const normalized = (res.data || []).map(c => {
                    // Format schedule: "T2, T4 (18:00 - 20:00)"
                    let scheduleStr = 'Chưa xếp lịch';
                    if (c.scheduleSlots && c.scheduleSlots.length > 0) {
                        const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                        const days = c.scheduleSlots.map(s => dayNames[s.dayOfWeek]).join(', ');
                        const time = `${c.scheduleSlots[0].startTime} - ${c.scheduleSlots[0].endTime}`;
                        scheduleStr = `${days} (${time})`;
                    }

                    return {
                        id: c.classId,
                        name: c.className,
                        subject: c.subjectName || '',
                        gradeLevel: '',
                        mainTeacher: { 
                            name: c.teacherName || 'Chưa phân công', 
                            initials: (c.teacherName || '?').split(' ').pop().charAt(0).toUpperCase() 
                        },
                        assistant: c.assistantName ? { 
                            name: c.assistantName, 
                            initials: c.assistantName.split(' ').pop().charAt(0).toUpperCase() 
                        } : null,
                        currentStudents: c.studentCount ?? 0,
                        maxStudents: null,
                        schedule: scheduleStr,
                        status: (c.status || 'Active').toLowerCase() === 'active' ? 'active' : 'inactive',
                    };
                });
                setClasses(normalized);
            } catch (err) {
                setError('Không thể tải danh sách lớp học.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchClasses();
    }, [user, isTA]);

    const filteredClasses = classes.filter(cls => {
        const matchesSearch = cls.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = !statusFilter || cls.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="classes-management">
            <TeacherSidebar isTA={isTA} />

            <main className="classes-main">
                {/* Header */}
                <div className="classes-header">
                    <div className="classes-header-top">
                        <div>
                            <h1>Lớp học của tôi</h1>
                            <p className="classes-subtitle">
                                Danh sách các lớp học bạn đang phụ trách giảng dạy
                            </p>
                        </div>
                    </div>

                    <div className="cm-tabs">
                        <button className="cm-tab active">
                            <GraduationCap size={17} />
                            Lớp học
                            <span className="cm-tab-badge">{classes.length}</span>
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="classes-filters">
                    <div className="filter-search">
                        <Search size={20} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo tên lớp..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <select
                        className="filter-select"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="active">Đang hoạt động</option>
                        <option value="inactive">Tạm dừng</option>
                    </select>
                </div>

                {/* Classes Grid */}
                <div className="classes-overview">
                    <h2>Tổng quan lớp học của tôi</h2>

                    {loading ? (
                        <div className="classes-empty">
                            <p>Đang tải danh sách lớp...</p>
                        </div>
                    ) : error ? (
                        <div className="classes-empty">
                            <p style={{ color: '#ef4444' }}>{error}</p>
                        </div>
                    ) : filteredClasses.length === 0 ? (
                        <div className="classes-empty">
                            <p>Không tìm thấy lớp học phù hợp.</p>
                        </div>
                    ) : (
                        <div className="classes-grid">
                            {filteredClasses.map((classItem) => (
                                <ClassCard
                                    key={classItem.id}
                                    classData={classItem}
                                    readOnly
                                    basePath={isTA ? "/ta/classes" : "/teacher/classes"}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default TeacherClasses;
