import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, BookOpen, Clock, FileText, CheckCircle, AlertCircle, Edit, Trash2, X, AlertTriangle, Library, FileUp, Download, PlayCircle, Loader2, Presentation, FileArchive, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import TeacherSidebar from '../../components/TeacherSidebar';
import CreateAssignmentModal from '../../components/CreateAssignmentModal';
import AssignmentDetailModal from '../../components/AssignmentDetailModal';
import UploadMaterialModal from '../../components/UploadMaterialModal';
import DeleteMaterialModal from '../../components/DeleteMaterialModal';
import MaterialDetailModal from '../../components/MaterialDetailModal';
import EditMaterialModal from '../../components/EditMaterialModal';
import '../../css/pages/teacher/TeacherAssignments.css';
import '../../css/components/DeleteModal.css';


const TeacherAssignments = ({ isTA = false }) => {
    const navigate = useNavigate();


    // Core state
    const [activeTab, setActiveTab] = useState('materials'); // 'materials' | 'templates' | 'assignments'
    const [loading, setLoading] = useState(true);

    const [templates, setTemplates] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [classes, setClasses] = useState([]);
    const [grades, setGrades] = useState([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [matsRes, asmsRes, classesRes, gradesRes] = await Promise.all([
                api.get('/Materials'),
                api.get('/Assignments'),
                api.get('/Classes/teacher/my-classes'),
                api.get('/Grades')
            ]);
            
            const classesMap = (classesRes.data || []).reduce((acc, cls) => {
                acc[cls.classId] = cls.className;
                return acc;
            }, {});

            const getOriginalFileName = (url) => {
                if (!url) return 'Tệp không tên';
                const parts = url.split('/');
                const fileName = parts[parts.length - 1];
                // Remove the GUID prefix if it exists (e.g. guid_filename.ext)
                return fileName.includes('_') ? fileName.substring(fileName.indexOf('_') + 1) : fileName;
            };

            const getFileType = (url) => {
                if (!url) return 'other';
                return url.split('.').pop().toLowerCase();
            };

            const groupUnique = (list) => {
                return list.reduce((acc, curr) => {
                    const isDup = acc.some(item => 
                        item.title === curr.title && 
                        (item.fileUrl === curr.fileUrl || item.fileName === curr.fileName)
                    );
                    if (!isDup) acc.push(curr);
                    return acc;
                }, []);
            };

            setMaterials(groupUnique((matsRes.data || []).map(m => ({
                ...m,
                id: m.materialId || m.MaterialId,
                materialId: m.materialId || m.MaterialId,
                title: m.title || m.Title,
                fileName: getOriginalFileName(m.fileUrl || m.FileUrl),
                type: getFileType(m.fileUrl || m.FileUrl),
                fileSize: m.fileSize,
                originalFileName: m.originalFileName
            }))));

            const allAsms = asmsRes.data || [];
            
            setAssignments(allAsms.filter(a => a.classId || a.ClassId).map(a => ({
                ...a,
                id: a.asmId || a.AsmId,
                asmId: a.asmId || a.AsmId,
                title: a.title || a.Title,
                endTime: a.endTime || a.EndTime,
                fileUrl: a.fileUrl || a.FileUrl,
                className: classesMap[a.classId || a.ClassId] || 'Chưa gán',
                status: ((a.endTime || a.EndTime) && new Date(a.endTime || a.EndTime) < new Date()) ? 'closed' : 'active',
                fileName: getOriginalFileName(a.fileUrl || a.FileUrl),
                type: getFileType(a.fileUrl || a.FileUrl),
                fileSize: a.fileSize,
                originalFileName: a.originalFileName
            })));

            setClasses(classesRes.data || []);
            setGrades(gradesRes.data || []);
            setTemplates(groupUnique(allAsms.filter(a => !a.classId && !a.ClassId).map(a => ({
                ...a,
                id: a.asmId || a.AsmId,
                asmId: a.asmId || a.AsmId,
                title: a.title || a.Title,
                endTime: a.endTime || a.EndTime,
                fileUrl: a.fileUrl || a.FileUrl,
                fileName: getOriginalFileName(a.fileUrl || a.FileUrl),
                type: getFileType(a.fileUrl || a.FileUrl),
                fileSize: a.fileSize,
                originalFileName: a.originalFileName
            }))));

        } catch (error) {
            console.error("Error fetching library data:", error);
            toast.error("Không thể tải dữ liệu thư viện");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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
    const [editMaterialData, setEditMaterialData] = useState(null);

    const getFileStyles = (type) => {
        const t = type?.toLowerCase() || '';
        if (t.includes('pdf')) return { icon: <FileText size={20} />, className: 'icon-pdf', color: '#ef4444' };
        if (t.includes('word') || t.includes('doc')) return { icon: <FileText size={20} />, className: 'icon-word', color: '#2563eb' };
        if (t.includes('excel') || t.includes('xls')) return { icon: <BookOpen size={20} />, className: 'icon-excel', color: '#16a34a' };
        if (t.includes('video') || t.includes('mp4')) return { icon: <PlayCircle size={20} />, className: 'icon-video', color: '#8b5cf6' };
        if (t.includes('powerpoint') || t.includes('ppt')) return { icon: <Presentation size={20} />, className: 'icon-ppt', color: '#f97316' };
        if (t.includes('zip') || t.includes('rar') || t.includes('7z')) return { icon: <FileArchive size={20} />, className: 'icon-zip', color: '#ca8a04' };
        if (t.includes('image') || t.includes('png') || t.includes('jpg') || t.includes('jpeg')) return { icon: <ImageIcon size={20} />, className: 'icon-image', color: '#d946ef' };
        return { icon: <FileText size={20} />, className: 'icon-other', color: '#64748b' };
    };

    /* --- FILTERS --- */
    const filteredTemplates = templates.filter(t => {
        const matchesSearch = t.title?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesLevel = !levelFilter || t.gradeId?.toString() === levelFilter || t.GradeId?.toString() === levelFilter;
        return matchesSearch && matchesLevel;
    });

    const filteredAssignments = assignments.filter(assignment => {
        const matchesSearch = assignment.title?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesClass = !classFilter || assignment.classId?.toString() === classFilter;
        const matchesStatus = !statusFilter || (assignment.endTime && new Date(assignment.endTime) < new Date() ? 'closed' : 'active') === statusFilter;
        const matchesLevel = !levelFilter || assignment.gradeId?.toString() === levelFilter || assignment.GradeId?.toString() === levelFilter;
        return matchesSearch && matchesClass && matchesStatus && matchesLevel;
    });

    const filteredMaterials = materials
        .filter(m => {
            const matchesSearch = m.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesLevel = !levelFilter || m.gradeId?.toString() === levelFilter || m.GradeId?.toString() === levelFilter;
            return matchesSearch && matchesLevel;
        });

    // Pagination Logic
    const totalPages = Math.ceil(filteredMaterials.length / materialsPerPage);
    const indexOfLastItem = currentPage * materialsPerPage;
    const indexOfFirstItem = indexOfLastItem - materialsPerPage;
    const currentMaterials = filteredMaterials.slice(indexOfFirstItem, indexOfLastItem);

    /* --- TEMPLATE HANDLERS --- */
    // Note: Reusing Assignment UI for templating for simplicity currently
    const handleSaveAssignment = async (assignmentData) => {
        try {
            if (editingAssignment) {
                // Update existing assignment
                const targetId = editingAssignment.asmId;
                await api.put(`/Assignments/${targetId}`, assignmentData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                toast.success("Cập nhật bài tập thành công");
            } else {
                // Create new assignment
                await api.post('/Assignments/Create-Assignments', assignmentData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                toast.success("Tạo bài tập thành công");
            }
            fetchData();
        } catch (error) {
            console.error("Error saving assignment:", error);
            toast.error(error.response?.data?.message || "Không thể lưu bài tập");
        }
        setIsAssignmentModalOpen(false);
    };

    const confirmDeleteAssignment = async () => {
        if (deleteAssignmentModal.assignment) {
            try {
                const id = deleteAssignmentModal.assignment.asmId;
                await api.delete(`/Assignments/${id}`);
                toast.success("Xóa bài tập thành công");
                fetchData();
            } catch (error) {
                console.error("Error deleting assignment:", error);
                toast.error("Không thể xóa bài tập");
            }
            setDeleteAssignmentModal({ show: false, assignment: null });
        }
    };

    /* --- MATERIAL HANDLERS --- */
    const handleUploadMaterial = async (newFiles) => {
        // newFiles is expected to be an array of files or material data
        // For simplicity, we refresh everything after upload
        fetchData();
        setIsUploadMaterialOpen(false);
        setCurrentPage(1);
    };

    const confirmDeleteMaterial = async () => {
        if (deleteMaterialId) {
            try {
                await api.delete(`/Materials/${deleteMaterialId}`);
                toast.success("Xóa tài liệu thành công");
                fetchData();
            } catch (error) {
                console.error("Error deleting material:", error);
                toast.error("Không thể xóa tài liệu");
            }
            setDeleteMaterialId(null);
        }
    };

    const handleDownload = (item) => {
        const downloadUrl = item.fileUrl || item.FileUrl || item.url;
        if (downloadUrl) {
            toast.success(`Đang tải xuống: ${item.fileName || item.title}`);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = item.fileName || item.title;
            a.target = "_blank";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            toast.error("Không có đường dẫn tải về");
        }
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

                        <select className="filter-select" value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
                            <option value="">Tất cả khối lớp</option>
                            {grades.map(g => (
                                <option key={g.gradeId} value={g.gradeId}>{g.gradeName}</option>
                            ))}
                        </select>

                        {activeTab === 'assignments' && (
                            <>
                                <select className="filter-select" value={classFilter} onChange={e => setClassFilter(e.target.value)}>
                                    <option value="">Tất cả các lớp</option>
                                    {classes.map(cls => <option key={cls.classId} value={cls.classId}>{cls.className}</option>)}
                                </select>
                                <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                                    <option value="">Tất cả trạng thái</option>
                                    <option value="active">Đang mở</option>
                                    <option value="closed">Đã đóng</option>
                                </select>
                            </>
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
                <div style={{ flex: 1, overflowY: 'auto', position: 'relative', minHeight: '300px' }}>
                    {loading ? (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.7)', zIndex: 10 }}>
                            <div style={{ textAlign: 'center' }}>
                                <Loader2 className="animate-spin" size={40} color="#3b82f6" style={{ margin: '0 auto 12px' }} />
                                <p style={{ color: '#64748b', fontWeight: 500 }}>Đang tải thư viện...</p>
                            </div>
                        </div>
                    ) : activeTab === 'materials' ? (
                        /* MATERIALS VIEW */
                        <div className="materials-list">
                            {currentMaterials.length === 0 ? (
                                <div className="ta-empty-state" style={{ gridColumn: '1/-1' }}>
                                    <Library size={48} style={{ opacity: 0.5, margin: '0 auto 16px' }} />
                                    <p>Không tìm thấy tài liệu nào.</p>
                                </div>
                            ) : (
                                <>
                                    {currentMaterials.map(item => {
                                        const { icon, className } = getFileStyles(item.type);
                                        return (
                                            <div key={item.materialId} className="ta-material-row" onClick={() => setDetailMaterial(item)} style={{ '--accent-color': getFileStyles(item.type).color }}>
                                                <div className={`file-icon-container ${className}`}>
                                                    {icon}
                                                </div>
                                                <div className="ta-material-info" style={{ flex: 1, minWidth: 0 }}>
                                                    <h4 style={{ margin: 0, fontSize: '0.9375rem' }}>{item.title}</h4>
                                                    <div className="ta-material-meta" style={{ marginTop: '2px' }}>
                                                        <span>{item.fileName}</span>
                                                    </div>
                                                </div>
                                                <div className="ta-actions-inline" onClick={e => e.stopPropagation()}>
                                                    <button onClick={() => handleDownload(item)} className="btn-icon-action download" title="Tải xuống">
                                                        <Download size={14} />
                                                    </button>
                                                    {!isTA && (
                                                        <>
                                                            <button onClick={() => setEditMaterialData(item)} className="btn-icon-action edit" title="Chỉnh sửa">
                                                                <Edit size={14} />
                                                            </button>
                                                            <button onClick={() => setDeleteMaterialId(item.materialId)} className="btn-icon-action delete" title="Xóa">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

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
                                <div className="ta-vertical-list">
                                    {filteredTemplates.map(template => (
                                        <div 
                                            key={template.asmId} 
                                            className="ta-assignment-row" 
                                            style={{ cursor: 'pointer', '--accent-color': getFileStyles(template.type).color }} 
                                            onClick={() => setDetailAssignment(template)}
                                        >
                                            <div className={`file-icon-container ${getFileStyles(template.type).className}`}>
                                                {getFileStyles(template.type).icon}
                                            </div>
                                            <div className="ta-material-info" style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <h4 style={{ margin: 0 }}>{template.title}</h4>
                                                    <span className="ta-row-status draft">Bản nháp</span>
                                                </div>
                                                <div className="ta-material-meta">
                                                    <span>{template.fileName || 'Chưa có file'}</span>
                                                </div>
                                            </div>
                                            <div className="ta-actions-inline" onClick={e => e.stopPropagation()}>
                                                <button className="btn-icon-action download" onClick={() => handleDownload(template)} title="Tải xuống">
                                                    <Download size={14} />
                                                </button>
                                                {!isTA && (
                                                    <>
                                                        <button className="btn-icon-action edit" onClick={() => { setEditingAssignment(template); setIsAssignmentModalOpen(true); }}><Edit size={14} /></button>
                                                        <button className="btn-icon-action delete" onClick={() => setDeleteAssignmentModal({ show: true, assignment: template })}><Trash2 size={14} /></button>
                                                    </>
                                                )}
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
                                <div className="ta-vertical-list">
                                    {filteredAssignments.map(assignment => {
                                        const { icon, className } = getFileStyles(assignment.type);
                                        return (
                                            <div 
                                                key={assignment.asmId} 
                                                className="ta-assignment-row" 
                                                onClick={() => setDetailAssignment(assignment)}
                                                style={{ '--accent-color': getFileStyles(assignment.type).color }}
                                            >
                                                <div className={`file-icon-container ${className}`}>
                                                    {icon}
                                                </div>
                                                <div className="ta-material-info" style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <h4 style={{ margin: 0 }}>{assignment.title}</h4>
                                                        <span className="ta-card-class-sm">{assignment.className}</span>
                                                        <span className={`ta-row-status ${assignment.status}`}>
                                                            {assignment.status === 'active' ? 'Đang mở' : 'Đã kết thúc'}
                                                        </span>
                                                    </div>
                                                    <div className="ta-material-meta" style={{ display: 'flex', gap: '15px' }}>
                                                        <span className="ta-row-deadline">
                                                            <Clock size={12} /> Hạn: {assignment.endTime ? new Date(assignment.endTime).toLocaleDateString('vi-VN') : 'Không giới hạn'}
                                                        </span>
                                                        <span>{assignment.fileName}</span>
                                                    </div>
                                                </div>
                                                <div className="ta-actions-inline" onClick={e => e.stopPropagation()}>
                                                    <button className="btn-icon-action download" onClick={() => handleDownload(assignment)} title="Tải xuống">
                                                        <Download size={14} />
                                                    </button>
                                                    {!isTA && (
                                                        <>
                                                            <button
                                                                className="btn-icon-action edit"
                                                                onClick={() => { setEditingAssignment(assignment); setIsAssignmentModalOpen(true); }}
                                                                title="Chỉnh sửa"
                                                            >
                                                                <Edit size={14} />
                                                            </button>
                                                            <button
                                                                className="btn-icon-action delete"
                                                                onClick={() => setDeleteAssignmentModal({ show: true, assignment })}
                                                                title="Xóa"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </>
                                                    )}
                                                    <button
                                                        className="btn-grade"
                                                        onClick={() => navigate(`${isTA ? '/ta' : '/teacher'}/assignments/${assignment.asmId}/grade`)}
                                                    >
                                                        Chấm bài
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
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
                    onSave={handleSaveAssignment} initialData={editingAssignment} classes={classes}
                    isTemplate={activeTab === 'templates'} grades={grades}
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
                    onUpload={handleUploadMaterial} grades={grades}
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

            {editMaterialData && (
                <EditMaterialModal
                    isOpen={!!editMaterialData}
                    onClose={() => setEditMaterialData(null)}
                    onUpdate={fetchData}
                    materialData={editMaterialData}
                    grades={grades}
                />
            )}
        </div>
    );
};

export default TeacherAssignments;
