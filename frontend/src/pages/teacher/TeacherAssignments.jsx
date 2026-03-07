import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, BookOpen, Clock, FileText, CheckCircle, AlertCircle, Edit, Trash2, X, AlertTriangle, Library, FileUp, Download, PlayCircle } from 'lucide-react';
import TeacherSidebar from '../../components/TeacherSidebar';
import CreateAssignmentModal from '../../components/CreateAssignmentModal';
import AssignmentDetailModal from '../../components/AssignmentDetailModal';
import UploadMaterialModal from '../../components/UploadMaterialModal';
import DeleteMaterialModal from '../../components/DeleteMaterialModal';
import MaterialDetailModal from '../../components/MaterialDetailModal';
import '../../css/pages/teacher/TeacherAssignments.css';
import '../../css/components/DeleteModal.css';

// Mock data
const MY_CLASSES = [
    { id: 101, name: 'Đại Số Nâng Cao' },
    { id: 102, name: 'Giải Tích Cơ Bản' },
    { id: 103, name: 'Toán Nâng Cao Lớp 12' },
    { id: 104, name: 'Ôn Thi THPT Quốc Gia - Toán' },
];

const INITIAL_TEMPLATES = [
    {
        id: 1, title: 'Bài tập về nhà Chương 1: Hàm số',
        description: 'Hoàn thành các bài tập từ 1 đến 15 trang 42 SGK.',
        fileUrl: '#', fileName: 'bai_tap_chuong_1.pdf'
    },
    {
        id: 2, title: 'Đề kiểm tra 15 phút - Đạo hàm',
        description: 'Làm bài trực tuyến trên hệ thống, thời gian 15 phút.',
        fileUrl: '#', fileName: 'de_kiem_tra_dao_ham.docx'
    },
    {
        id: 3, title: 'Bài tập tự luyện: Tích phân',
        description: 'Giải 50 câu trắc nghiệm mức độ vận dụng cao.',
        fileUrl: '#', fileName: '50_cau_trac_nghiem.pdf'
    }
];

const INITIAL_ASSIGNMENTS = [
    {
        id: 1, title: 'Bài tập về nhà Chương 1: Hàm số', classId: 101, className: 'Đại Số Nâng Cao',
        dueDate: '2023-10-15T23:59', description: 'Hoàn thành các bài tập từ 1 đến 15 trang 42 SGK.',
        status: 'active', submittedCount: 12, totalStudents: 15, createdAt: '2023-10-10T08:00'
    },
    {
        id: 2, title: 'Đề kiểm tra 15 phút - Đạo hàm', classId: 102, className: 'Giải Tích Cơ Bản',
        dueDate: '2023-10-18T10:00', description: 'Làm bài trực tuyến trên hệ thống, thời gian 15 phút.',
        status: 'active', submittedCount: 8, totalStudents: 10, createdAt: '2023-10-12T14:30'
    },
    {
        id: 3, title: 'Bài tập tự luyện: Tích phân', classId: 103, className: 'Toán Nâng Cao Lớp 12',
        dueDate: '2023-09-30T23:59', description: 'Giải 50 câu trắc nghiệm mức độ vận dụng cao.',
        status: 'closed', submittedCount: 8, totalStudents: 8, createdAt: '2023-09-25T09:00',
        fileUrl: '#', fileName: '50_cau_trac_nghiem_tich_phan.pdf'
    },
    {
        id: 4, title: 'Đề cương ôn tập giữa kì I', classId: 104, className: 'Ôn Thi THPT Quốc Gia - Toán',
        dueDate: '2023-10-25T23:59', description: 'Hoàn thiện đề cương theo file đính kèm.',
        status: 'draft', submittedCount: 0, totalStudents: 15, createdAt: '2023-10-15T16:00',
        fileUrl: '#', fileName: 'de_cuong_giua_ki_1.docx'
    }
];

const INITIAL_MATERIALS = [
    { id: 101, name: 'Giáo trình Toán Học Đại cương Tập 1.pdf', size: '5.2 MB', uploadDate: '01/09/2023', type: 'pdf', description: 'Sách giáo khoa điện tử chương trình cơ bản.', targetLevel: 'Lớp 10', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
    { id: 102, name: 'Video Hướng dẫn Giải Phương trình Bậc 2.mp4', size: '125 MB', uploadDate: '05/09/2023', type: 'video', description: 'Cách bấm máy tính Casio để giải nhanh.', targetLevel: 'Lớp 9', url: 'https://www.w3schools.com/html/mov_bbb.mp4' },
    { id: 103, name: 'Bài Tập Trắc Nghiệm Chương 1 (Bản gốc).docx', size: '1.2 MB', uploadDate: '10/09/2023', type: 'word', description: 'Dùng để soạn đề cho các lớp.', targetLevel: 'Lớp 11', url: '' },
    { id: 104, name: 'Tài liệu Ôn Tập Giữa Kỳ.pdf', size: '3.4 MB', uploadDate: '12/10/2023', type: 'pdf', description: 'Các dạng toán thường ra trong đề thi.', targetLevel: 'Lớp 12', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
];

const TeacherAssignments = ({ isTA = false }) => {
    const navigate = useNavigate();

    // Core state
    const [activeTab, setActiveTab] = useState('materials'); // 'materials' | 'templates' | 'assignments'

    const [templates, setTemplates] = useState(INITIAL_TEMPLATES);
    const [assignments, setAssignments] = useState(INITIAL_ASSIGNMENTS);
    const [materials, setMaterials] = useState(INITIAL_MATERIALS);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const materialsPerPage = 6;

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [classFilter, setClassFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [levelFilter, setLevelFilter] = useState('');

    // Mods - Assignments
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState(null);
    const [deleteAssignmentModal, setDeleteAssignmentModal] = useState({ show: false, assignment: null });
    const [detailAssignment, setDetailAssignment] = useState(null);

    // Mods - Materials
    const [isUploadMaterialOpen, setIsUploadMaterialOpen] = useState(false);
    const [deleteMaterialId, setDeleteMaterialId] = useState(null);
    const [detailMaterial, setDetailMaterial] = useState(null);

    const getFileIcon = (type) => {
        switch (type) {
            case 'pdf': return <FileText size={24} color="#ef4444" />;
            case 'word': return <FileText size={24} color="#2563eb" />;
            case 'video': return <PlayCircle size={24} color="#8b5cf6" />;
            default: return <FileText size={24} color="#64748b" />;
        }
    };

    /* --- FILTERS --- */
    const filteredTemplates = templates.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredAssignments = assignments.filter(assignment => {
        const matchesSearch = assignment.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesClass = !classFilter || assignment.classId.toString() === classFilter;
        const matchesStatus = !statusFilter || assignment.status === statusFilter;
        return matchesSearch && matchesClass && matchesStatus;
    });

    const filteredMaterials = materials
        .filter(m => {
            const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesLevel = !levelFilter || m.targetLevel === levelFilter;
            return matchesSearch && matchesLevel;
        })
        .sort((a, b) => {
            // Sort by uploadDate descending (newest first). Assumes DD/MM/YYYY format.
            const dateA = a.uploadDate.split('/').reverse().join('');
            const dateB = b.uploadDate.split('/').reverse().join('');
            return dateB.localeCompare(dateA);
        });

    // Pagination Logic
    const totalPages = Math.ceil(filteredMaterials.length / materialsPerPage);
    const indexOfLastItem = currentPage * materialsPerPage;
    const indexOfFirstItem = indexOfLastItem - materialsPerPage;
    const currentMaterials = filteredMaterials.slice(indexOfFirstItem, indexOfLastItem);

    /* --- TEMPLATE HANDLERS --- */
    // Note: Reusing Assignment UI for templating for simplicity currently
    const handleSaveAssignment = (assignmentData) => {
        if (activeTab === 'templates') {
            if (editingAssignment) {
                setTemplates(templates.map(t =>
                    t.id === editingAssignment.id ? { ...t, ...assignmentData } : t
                ));
            } else {
                const newId = Math.max(...templates.map(t => t.id), 0) + 1;
                setTemplates([...templates, { ...assignmentData, id: newId }]);
            }
        } else {
            // Assignment logic
            if (editingAssignment) {
                setAssignments(assignments.map(a =>
                    a.id === editingAssignment.id ? { ...a, ...assignmentData, className: MY_CLASSES.find(c => c.id.toString() === assignmentData.classId.toString())?.name } : a
                ));
            } else {
                const newId = Math.max(...assignments.map(a => a.id), 0) + 1;
                const newAssignment = {
                    ...assignmentData, id: newId,
                    className: MY_CLASSES.find(c => c.id.toString() === assignmentData.classId.toString())?.name,
                    submittedCount: 0, totalStudents: 15, createdAt: new Date().toISOString()
                };
                setAssignments([...assignments, newAssignment]);
            }
        }
        setIsAssignmentModalOpen(false);
    };

    const confirmDeleteAssignment = () => {
        if (deleteAssignmentModal.assignment) {
            if (activeTab === 'templates') {
                setTemplates(templates.filter(t => t.id !== deleteAssignmentModal.assignment.id));
            } else {
                setAssignments(assignments.filter(a => a.id !== deleteAssignmentModal.assignment.id));
            }
            setDeleteAssignmentModal({ show: false, assignment: null });
        }
    };

    /* --- MATERIAL HANDLERS --- */
    const handleUploadMaterial = (newFiles) => {
        const newItems = newFiles.map(f => ({
            id: Math.random(),
            name: f.name,
            size: f.size + " bytes",
            uploadDate: f.uploadDate,
            type: f.type,
            description: f.description
        }));
        setMaterials([
            ...newItems,
            ...materials
        ]);
        setIsUploadMaterialOpen(false);
        setCurrentPage(1); // Reset to first page when new item is uploaded
    };

    const confirmDeleteMaterial = () => {
        if (deleteMaterialId) {
            setMaterials(materials.filter(m => m.id !== deleteMaterialId));
            setDeleteMaterialId(null);
        }
    };

    const handleDownload = (item) => {
        alert(`Đang tải xuống: ${item.title || item.name}`);
    };

    return (
        <div className="teacher-assignments">
            <TeacherSidebar isTA={isTA} />

            <main className="ta-main" style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div className="ta-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '24px', marginBottom: '24px' }}>
                    <div className="ta-header-text">
                        <h1>Thư viện cá nhân</h1>
                        <p>Quản lý tập trung tài liệu giảng dạy và bộ đề bài tập để sử dụng cho nhiều lớp.</p>
                    </div>
                </div>

                {/* Custom Tabs */}
                <div style={{ display: 'flex', gap: '32px', marginBottom: '24px', borderBottom: '2px solid #e2e8f0' }}>
                    <button
                        onClick={() => setActiveTab('materials')}
                        style={{
                            padding: '12px 0', background: 'none', border: 'none', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
                            color: activeTab === 'materials' ? '#3b82f6' : '#64748b',
                            borderBottom: activeTab === 'materials' ? '2px solid #3b82f6' : '2px solid transparent',
                            marginBottom: '-2px', display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                    >
                        <Library size={18} /> Kho Tài Liệu chung ({materials.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('templates')}
                        style={{
                            padding: '12px 0', background: 'none', border: 'none', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
                            color: activeTab === 'templates' ? '#3b82f6' : '#64748b',
                            borderBottom: activeTab === 'templates' ? '2px solid #3b82f6' : '2px solid transparent',
                            marginBottom: '-2px', display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                    >
                        <BookOpen size={18} /> Kho Bộ Đề gốc ({templates.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('assignments')}
                        style={{
                            padding: '12px 0', background: 'none', border: 'none', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
                            color: activeTab === 'assignments' ? '#3b82f6' : '#64748b',
                            borderBottom: activeTab === 'assignments' ? '2px solid #3b82f6' : '2px solid transparent',
                            marginBottom: '-2px', display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                    >
                        <CheckCircle size={18} /> Tình trạng Giao Bài ({assignments.length})
                    </button>
                </div>

                {/* Filters Row */}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '16px', flex: 1 }}>
                        <div className="filter-search" style={{ flex: 1, maxWidth: '400px' }}>
                            <Search size={18} color="#94a3b8" />
                            <input
                                type="text"
                                placeholder={`Tìm kiếm ${activeTab === 'materials' ? 'tài liệu' : 'bài tập'}...`}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                style={{ border: 'none', outline: 'none', width: '100%', background: 'transparent' }}
                            />
                        </div>

                        {activeTab === 'assignments' ? (
                            <>
                                <select className="filter-select" value={classFilter} onChange={e => setClassFilter(e.target.value)}>
                                    <option value="">Tất cả các lớp</option>
                                    {MY_CLASSES.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                                </select>
                                <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                                    <option value="">Tất cả trạng thái</option>
                                    <option value="active">Đang mở</option>
                                    <option value="closed">Đã đóng</option>
                                    <option value="draft">Bản nháp</option>
                                </select>
                            </>
                        ) : (
                            <select className="filter-select" value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
                                <option value="">Tất cả khối lớp</option>
                                <option value="Lớp 6">Lớp 6</option>
                                <option value="Lớp 7">Lớp 7</option>
                                <option value="Lớp 8">Lớp 8</option>
                                <option value="Lớp 9">Lớp 9</option>
                                <option value="Lớp 10">Lớp 10</option>
                                <option value="Lớp 11">Lớp 11</option>
                                <option value="Lớp 12">Lớp 12</option>
                            </select>
                        )}
                    </div>

                    {!isTA && (
                        <div>
                            {activeTab === 'materials' && (
                                <button className="btn-create-assignment" onClick={() => setIsUploadMaterialOpen(true)}>
                                    <FileUp size={18} /> Tải tài liệu lên
                                </button>
                            )}
                            {activeTab === 'templates' && (
                                <button className="btn-create-assignment" onClick={() => { setEditingAssignment(null); setIsAssignmentModalOpen(true); }}>
                                    <Plus size={18} /> Tạo Bộ đề mới
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Content Area */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {activeTab === 'materials' ? (
                        /* MATERIALS VIEW */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {currentMaterials.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
                                    <Library size={48} style={{ opacity: 0.5, margin: '0 auto 16px' }} />
                                    <p>Không tìm thấy tài liệu nào.</p>
                                </div>
                            ) : (
                                <>
                                    {currentMaterials.map(item => (
                                        <div key={item.id} className="ta-material-row" style={{ cursor: 'pointer', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'all 0.2s' }} onClick={() => setDetailMaterial(item)}>
                                            <div style={{ flexShrink: 0, padding: '12px', background: '#f8fafc', borderRadius: '12px' }}>
                                                {getFileIcon(item.type)}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <h4 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {item.name}
                                                </h4>
                                                <div style={{ fontSize: '0.875rem', color: '#64748b', display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                    <span>{item.targetLevel || 'Khác'}</span>
                                                    <span className="dot">•</span>
                                                    <span>{item.size}</span>
                                                    <span className="dot">•</span>
                                                    <span>Đăng: {item.uploadDate}</span>
                                                </div>
                                            </div>
                                            {!isTA && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }} onClick={e => e.stopPropagation()}>
                                                    <button onClick={() => setDeleteMaterialId(item.id)} className="btn-icon delete" style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '8px', cursor: 'pointer', borderRadius: '8px', transition: 'background 0.2s' }}>
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Pagination UI */}
                                    {filteredMaterials.length > materialsPerPage && (
                                        <div className="pagination" style={{ marginTop: '24px' }}>
                                            <span className="pagination-info">
                                                Hiển thị {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredMaterials.length)} trên tổng số {filteredMaterials.length} tài liệu
                                            </span>
                                            <div className="pagination-controls">
                                                <button
                                                    className="pagination-btn"
                                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                    disabled={currentPage === 1}
                                                >
                                                    ‹
                                                </button>
                                                <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#4b5563' }}>
                                                    Trang {currentPage} / {totalPages}
                                                </span>
                                                <button
                                                    className="pagination-btn"
                                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                    disabled={currentPage === totalPages}
                                                >
                                                    ›
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ) : activeTab === 'templates' ? (
                        /* TEMPLATES VIEW */
                        <div className="ta-list-container">
                            {filteredTemplates.length === 0 ? (
                                <div className="ta-empty-state">
                                    <BookOpen size={48} />
                                    <h3>Không tìm thấy bộ đề nào</h3>
                                </div>
                            ) : (
                                <div className="ta-grid">
                                    {filteredTemplates.map(template => (
                                        <div key={template.id} className="ta-card" style={{ cursor: 'pointer' }}>
                                            <div className="ta-card-header">
                                                <span className="ta-status-badge draft">
                                                    Bản nháp
                                                </span>
                                                {!isTA && (
                                                    <div className="ta-card-actions" onClick={(e) => e.stopPropagation()}>
                                                        <button className="btn-icon edit" onClick={() => { setEditingAssignment(template); setIsAssignmentModalOpen(true); }}><Edit size={16} /></button>
                                                        <button className="btn-icon delete" onClick={() => setDeleteAssignmentModal({ show: true, assignment: template })}><Trash2 size={16} /></button>
                                                    </div>
                                                )}
                                            </div>

                                            <h3 className="ta-card-title">{template.title}</h3>
                                            <p className="ta-card-desc" style={{ minHeight: '40px' }}>{template.description}</p>

                                            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6', fontSize: '0.875rem', fontWeight: '500' }}>
                                                <FileText size={16} /> <span>{template.fileName}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ASSIGNMENTS VIEW */
                        <div className="ta-list-container">
                            {filteredAssignments.length === 0 ? (
                                <div className="ta-empty-state">
                                    <CheckCircle size={48} />
                                    <h3>Chưa có bài tập nào được giao</h3>
                                </div>
                            ) : (
                                <div className="ta-grid">
                                    {filteredAssignments.map(assignment => (
                                        <div key={assignment.id} className="ta-card" onClick={() => setDetailAssignment(assignment)} style={{ cursor: 'pointer' }}>
                                            <div className="ta-card-header">
                                                <span className={`ta-status-badge ${assignment.status}`}>
                                                    {assignment.status === 'active' ? 'Đang mở' : assignment.status === 'closed' ? 'Đã đóng' : 'Bản nháp'}
                                                </span>
                                            </div>

                                            <h3 className="ta-card-title">{assignment.title}</h3>
                                            <div className="ta-card-class">{assignment.className}</div>
                                            <p className="ta-card-desc">{assignment.description}</p>

                                            <div className="ta-card-meta">
                                                <div className="meta-item deadline"><Clock size={14} /> Hạn: {new Date(assignment.dueDate).toLocaleDateString('vi-VN')}</div>
                                            </div>

                                            <div className="ta-card-footer" onClick={(e) => e.stopPropagation()}>
                                                <div className="ta-progress-wrap">
                                                    <div className="ta-progress-text">
                                                        <span>Nộp bài</span>
                                                        <span className="ta-progress-count">{assignment.submittedCount} / {assignment.totalStudents}</span>
                                                    </div>
                                                    <div className="ta-progress-bar">
                                                        <div className={`ta-progress-fill ${assignment.submittedCount === assignment.totalStudents ? 'complete' : ''}`} style={{ width: `${(assignment.submittedCount / Math.max(assignment.totalStudents, 1)) * 100}%` }}></div>
                                                    </div>
                                                </div>
                                                <button
                                                    className={`btn-grade ${assignment.status === 'draft' ? 'disabled' : ''}`}
                                                    onClick={() => assignment.status !== 'draft' && navigate(isTA ? `/ta/assignments/${assignment.id}/grade` : `/teacher/assignments/${assignment.id}/grade`)}
                                                    disabled={assignment.status === 'draft'}
                                                    style={{ opacity: assignment.status === 'draft' ? 0.5 : 1 }}
                                                >
                                                    Chấm bài
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* MODALS */}
            {isAssignmentModalOpen && (
                <CreateAssignmentModal
                    isOpen={isAssignmentModalOpen} onClose={() => setIsAssignmentModalOpen(false)}
                    onSave={handleSaveAssignment} initialData={editingAssignment} classes={MY_CLASSES}
                    isTemplate={activeTab === 'templates'}
                />
            )}

            {deleteAssignmentModal.show && (
                <div className="delete-modal-overlay" onClick={() => setDeleteAssignmentModal({ show: false, assignment: null })}>
                    <div className="delete-modal" onClick={e => e.stopPropagation()}>
                        <div className="delete-modal-header"><h3>Xóa Bộ Đề</h3><button className="delete-modal-close" onClick={() => setDeleteAssignmentModal({ show: false, assignment: null })}><X size={20} /></button></div>
                        <div className="delete-modal-body">
                            <div className="delete-modal-warning">
                                <AlertTriangle size={20} />
                                <div><h4>Xác nhận?</h4><p>Hành động này không thể hoàn tác.</p></div>
                            </div>
                        </div>
                        <div className="delete-modal-footer">
                            <button className="btn-delete-cancel" onClick={() => setDeleteAssignmentModal({ show: false, assignment: null })}>Hủy</button>
                            <button className="btn-delete-confirm" onClick={confirmDeleteAssignment}>Xóa</button>
                        </div>
                    </div>
                </div>
            )}

            {detailAssignment && (
                <AssignmentDetailModal
                    isOpen={!!detailAssignment} onClose={() => setDetailAssignment(null)}
                    assignment={detailAssignment} onDownload={handleDownload}
                />
            )}

            {isUploadMaterialOpen && (
                <UploadMaterialModal
                    isOpen={isUploadMaterialOpen} onClose={() => setIsUploadMaterialOpen(false)}
                    onUpload={handleUploadMaterial}
                />
            )}

            {deleteMaterialId && (
                <DeleteMaterialModal
                    isOpen={!!deleteMaterialId} onClose={() => setDeleteMaterialId(null)}
                    onDelete={confirmDeleteMaterial}
                />
            )}

            {detailMaterial && (
                <MaterialDetailModal
                    isOpen={!!detailMaterial} onClose={() => setDetailMaterial(null)}
                    material={detailMaterial} onDownload={handleDownload}
                />
            )}
        </div>
    );
};

export default TeacherAssignments;
