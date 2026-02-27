import { useState } from 'react';
import { Search, GraduationCap } from 'lucide-react';
import TeacherSidebar from '../../components/TeacherSidebar';
import ClassCard from '../../components/ClassCard';
import '../../css/pages/center/ClassesManagement.css';

// Mock data: chỉ hiển thị lớp mà giáo viên này dạy
const MY_CLASSES = [
    {
        id: 101,
        name: 'Đại Số Nâng Cao',
        subject: 'MATHEMATICS',
        gradeLevel: 'high',
        mainTeacher: { name: 'Thầy Nguyễn Minh', initials: 'NM' },
        assistant: { name: 'Cô Lê Hoa', initials: 'LH' },
        currentStudents: 12,
        maxStudents: 15,
        schedule: 'Thứ Hai & Thứ Tư • 16:30',
        status: 'active',
    },
    {
        id: 102,
        name: 'Giải Tích Cơ Bản',
        subject: 'MATHEMATICS',
        gradeLevel: 'high',
        mainTeacher: { name: 'Thầy Nguyễn Minh', initials: 'NM' },
        assistant: null,
        currentStudents: 10,
        maxStudents: 15,
        schedule: 'Thứ Ba & Thứ Năm • 17:00',
        status: 'active',
    },
    {
        id: 103,
        name: 'Toán Nâng Cao Lớp 12',
        subject: 'MATHEMATICS',
        gradeLevel: 'high',
        mainTeacher: { name: 'Thầy Nguyễn Minh', initials: 'NM' },
        assistant: { name: 'Cô Trần Lan', initials: 'TL' },
        currentStudents: 8,
        maxStudents: 12,
        schedule: 'Thứ Sáu • 15:00',
        status: 'active',
    },
    {
        id: 104,
        name: 'Ôn Thi THPT Quốc Gia - Toán',
        subject: 'MATHEMATICS',
        gradeLevel: 'high',
        mainTeacher: { name: 'Thầy Nguyễn Minh', initials: 'NM' },
        assistant: null,
        currentStudents: 15,
        maxStudents: 15,
        schedule: 'Thứ Bảy & Chủ Nhật • 8:00',
        status: 'inactive',
    },
];

const TeacherClasses = ({ isTA = false }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const filteredClasses = MY_CLASSES.filter(cls => {
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

                    {/* Tabs giả để đồng bộ giao diện */}
                    <div className="cm-tabs">
                        <button className="cm-tab active">
                            <GraduationCap size={17} />
                            Lớp học
                            <span className="cm-tab-badge">{MY_CLASSES.length}</span>
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
                    {filteredClasses.length === 0 ? (
                        <div className="classes-empty">
                            <p>Không tìm thấy lớp học phù hợp với bộ lọc.</p>
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
