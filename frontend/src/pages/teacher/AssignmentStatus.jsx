import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Clock, CheckCircle, Download, Edit, Trash2, Library, Loader2, FileText, PlayCircle, Presentation, FileArchive, Image as ImageIcon, X, AlertTriangle, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import TeacherSidebar from '../../components/TeacherSidebar';
import CreateAssignmentModal from '../../components/CreateAssignmentModal';
import AssignmentDetailModal from '../../components/AssignmentDetailModal';
import '../../css/pages/teacher/TeacherAssignments.css';

const AssignmentStatus = ({ isTA = false }) => {
    const navigate = useNavigate();

    // State
    const [loading, setLoading] = useState(true);
    const [assignments, setAssignments] = useState([]);
    const [classes, setClasses] = useState([]);
    const [grades, setGrades] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [classFilter, setClassFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [levelFilter, setLevelFilter] = useState('');

    // Modals
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState(null);
    const [deleteAssignmentModal, setDeleteAssignmentModal] = useState({ show: false, assignment: null });
    const [detailAssignment, setDetailAssignment] = useState(null);

    const loadData = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const [asmsRes, classesRes, gradesRes] = await Promise.all([
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
                return fileName.includes('_') ? fileName.substring(fileName.indexOf('_') + 1) : fileName;
            };

            const getFileType = (url) => {
                if (!url) return 'other';
                return url.split('.').pop().toLowerCase();
            };

            const allAsms = (asmsRes.data || []).filter(a => a.classId || a.ClassId);
            
            setAssignments(allAsms.map(a => ({
                ...a,
                id: a.asmId || a.AsmId,
                asmId: a.asmId || a.AsmId,
                title: a.title || a.Title,
                startTime: a.startTime || a.StartTime,
                endTime: a.endTime || a.EndTime,
                fileUrl: a.fileUrl || a.FileUrl,
                className: classesMap[a.classId || a.ClassId] || 'Chưa gán',
                status: ((a.endTime || a.EndTime) && new Date(a.endTime || a.EndTime) < new Date()) ? 'closed' : 'active',
                fileName: getOriginalFileName(a.fileUrl || a.FileUrl),
                type: getFileType(a.fileUrl || a.FileUrl),
                submissionsCount: a.submissionsCount || a.SubmissionsCount || 0,
                gradedCount: a.gradedCount || a.GradedCount || 0,
                totalStudentsCount: a.totalStudentsCount || a.TotalStudentsCount || 0,
                isPublished: a.isPublished || a.IsPublished || false,
                publishedCount: a.publishedCount || a.PublishedCount || 0
            })));

            setClasses(classesRes.data || []);
            setGrades(gradesRes.data || []);

        } catch (error) {
            console.error("Error fetching assignments:", error);
            toast.error("Không thể tải dữ liệu bài tập");
        } finally {
            if (showLoading) setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const getFileStyles = (type) => {
        const t = type?.toLowerCase() || '';
        if (t.includes('pdf')) return { icon: <FileText size={20} />, className: 'icon-pdf', color: '#ef4444' };
        if (t.includes('word') || t.includes('doc')) return { icon: <FileText size={20} />, className: 'icon-word', color: '#2563eb' };
        if (t.includes('excel') || t.includes('xls')) return { icon: <FileText size={20} />, className: 'icon-excel', color: '#16a34a' };
        if (t.includes('video') || t.includes('mp4')) return { icon: <PlayCircle size={20} />, className: 'icon-video', color: '#8b5cf6' };
        if (t.includes('powerpoint') || t.includes('ppt')) return { icon: <Presentation size={20} />, className: 'icon-ppt', color: '#f97316' };
        if (t.includes('zip') || t.includes('rar') || t.includes('7z')) return { icon: <FileArchive size={20} />, className: 'icon-zip', color: '#ca8a04' };
        if (t.includes('image') || t.includes('png') || t.includes('jpg') || t.includes('jpeg')) return { icon: <ImageIcon size={20} />, className: 'icon-image', color: '#d946ef' };
        return { icon: <FileText size={20} />, className: 'icon-other', color: '#64748b' };
    };

    const filteredAssignments = assignments.filter(assignment => {
        const matchesSearch = assignment.title?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesClass = !classFilter || assignment.classId?.toString() === classFilter;
        const matchesStatus = !statusFilter || assignment.status === statusFilter;
        const matchesLevel = !levelFilter || assignment.gradeId?.toString() === levelFilter;
        return matchesSearch && matchesClass && matchesStatus && matchesLevel;
    }).sort((a, b) => {
        const dateA = a.endTime ? new Date(a.endTime) : new Date(0);
        const dateB = b.endTime ? new Date(b.endTime) : new Date(0);
        return dateB - dateA;
    });

    const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
    const currentAssignments = filteredAssignments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, classFilter, statusFilter, levelFilter]);

    const handleDownload = async (item) => {
        const downloadUrl = item.fileUrl || item.FileUrl || item.url;
        if (!downloadUrl) {
            toast.error("Không có đường dẫn tải về");
            return;
        }
        const fileName = item.originalFileName || item.fileName || item.title || 'download';
        const ext = fileName.split('.').pop()?.toLowerCase() || '';

        // Các loại file trình duyệt có thể xem trực tiếp → mở tab mới
        const viewableExts = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'webm', 'ogg'];
        if (viewableExts.includes(ext)) {
            window.open(downloadUrl, '_blank');
            return;
        }

        // Các loại file phải tải xuống (Excel, Word, PPT, ZIP...) → fetch + blob
        const toastId = toast.loading(`Đang tải xuống: ${fileName}...`);
        try {
            const response = await fetch(downloadUrl);
            if (!response.ok) throw new Error('Network error');
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
            toast.success(`Đã tải xuống: ${fileName}`, { id: toastId });
        } catch (err) {
            console.error('Download error:', err);
            window.open(downloadUrl, '_blank');
            toast.success(`Đã mở liên kết tải: ${fileName}`, { id: toastId });
        }
    };

    const silentRefresh = useCallback(() => loadData(false), [loadData]);

    const handleSaveAssignment = async (assignmentData) => {
        try {
            if (editingAssignment) {
                const targetId = editingAssignment.asmId;
                await api.put(`/Assignments/${targetId}`, assignmentData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                toast.success("Cập nhật bài tập thành công");
            }
            silentRefresh();
        } catch (error) {
            console.error("Error saving assignment detail:", error.response?.data);
            toast.error(error.response?.data?.message || "Không thể lưu bài tập");
        }
        setIsAssignmentModalOpen(false);
    };

    const confirmDeleteAssignment = async () => {
        if (deleteAssignmentModal.assignment) {
            const { asmId } = deleteAssignmentModal.assignment;
            try {
                await api.delete(`/Assignments/${asmId}`);
                toast.success("Xóa bài tập thành công");
                setAssignments(prev => prev.filter(a => a.asmId !== asmId));
            } catch (error) {
                console.error("Error deleting assignment:", error);
                toast.error("Không thể xóa bài tập");
            }
            setDeleteAssignmentModal({ show: false, assignment: null });
        }
    };

    return (
        <div className="teacher-assignments">
            <TeacherSidebar isTA={isTA} />

            <main className="ta-main" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="ta-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '24px', marginBottom: '24px' }}>
                    <div className="ta-header-text">
                        <h1>Tình trạng Giao Bài</h1>
                        <p>Theo dõi tiến độ nộp bài và chấm điểm cho học sinh các lớp.</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '16px', flex: 1 }}>
                        <div className="filter-search" style={{ flex: 1, maxWidth: '400px' }}>
                            <Search size={18} color="#94a3b8" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm bài tập đã giao..."
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

                        <select className="filter-select" value={classFilter} onChange={e => setClassFilter(e.target.value)}>
                            <option value="">Tất cả các lớp</option>
                            {classes.map(cls => <option key={cls.classId} value={cls.classId}>{cls.className}</option>)}
                        </select>

                        <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                            <option value="">Tất cả trạng thái</option>
                            <option value="active">Đang mở</option>
                            <option value="closed">Đã đóng</option>
                        </select>
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', position: 'relative', minHeight: '300px' }}>
                    {loading ? (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.7)', zIndex: 10 }}>
                            <div style={{ textAlign: 'center' }}>
                                <Loader2 className="animate-spin" size={40} color="#3b82f6" style={{ margin: '0 auto 12px' }} />
                                <p style={{ color: '#64748b', fontWeight: 500 }}>Đang tải dữ liệu...</p>
                            </div>
                        </div>
                    ) : filteredAssignments.length === 0 ? (
                        <div className="ta-empty-state">
                            <CheckCircle size={48} />
                            <h3>Chưa có bài tập nào</h3>
                        </div>
                    ) : (
                        <div className="ta-vertical-list">
                            {currentAssignments.map(assignment => {
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
                                                <span>• {assignment.submissionsCount}/{assignment.totalStudentsCount || 0} bài nộp</span>
                                                <span style={{ color: assignment.gradedCount === assignment.submissionsCount && assignment.submissionsCount > 0 ? '#10b981' : 'inherit' }}>
                                                    • Đã chấm: {assignment.gradedCount}
                                                </span>
                                                <span style={{ color: assignment.publishedCount === assignment.submissionsCount && assignment.submissionsCount > 0 ? '#2563eb' : 'inherit' }}>
                                                    • Công bố: {assignment.publishedCount}
                                                </span>
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
                                                        onClick={() => setDeleteAssignmentModal({ show: true, assignment: assignment })}
                                                        title="Xóa"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                    <button
                                                        className="btn-grade"
                                                        onClick={() => navigate(`${isTA ? '/ta' : '/teacher'}/assignments/${assignment.asmId}/grade`)}
                                                    >
                                                        Chấm bài
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {totalPages > 1 && (
                                <div className="ta-pagination">
                                    <div className="pagination-info">
                                        Hiển thị <span>{(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredAssignments.length)}</span> trong tổng số <span>{filteredAssignments.length}</span> bài tập
                                    </div>
                                    <div className="pagination-controls">
                                        <button
                                            className="pagination-btn"
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            title="Trang trước"
                                        >
                                            <ChevronLeft size={18} />
                                        </button>
                                        
                                        {[...Array(totalPages)].map((_, i) => {
                                            const page = i + 1;
                                            // Hiển thị tối đa 5 nút trang (hoặc logic rút gọn nếu nhiều trang)
                                            if (
                                                page === 1 || 
                                                page === totalPages || 
                                                (page >= currentPage - 1 && page <= currentPage + 1)
                                            ) {
                                                return (
                                                    <button
                                                        key={page}
                                                        className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                                                        onClick={() => setCurrentPage(page)}
                                                    >
                                                        {page}
                                                    </button>
                                                );
                                            } else if (
                                                page === currentPage - 2 || 
                                                page === currentPage + 2
                                            ) {
                                                return <span key={page} className="pagination-ellipsis">...</span>;
                                            }
                                            return null;
                                        })}

                                        <button
                                            className="pagination-btn"
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            title="Trang sau"
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {detailAssignment && (
                <AssignmentDetailModal
                    isOpen={!!detailAssignment} onClose={() => setDetailAssignment(null)}
                    assignment={detailAssignment} onDownload={handleDownload}
                />
            )}

            {isAssignmentModalOpen && (
                <CreateAssignmentModal
                    isOpen={isAssignmentModalOpen} onClose={() => setIsAssignmentModalOpen(false)}
                    onSave={handleSaveAssignment} initialData={editingAssignment} classes={classes}
                    isTemplate={false} grades={grades}
                />
            )}

            {deleteAssignmentModal.show && (
                <div className="delete-modal-overlay" onClick={() => setDeleteAssignmentModal({ show: false, assignment: null })}>
                    <div className="delete-modal" onClick={e => e.stopPropagation()}>
                        <div className="delete-modal-header">
                            <h3>Xóa Bài Tập</h3>
                            <button className="delete-modal-close" onClick={() => setDeleteAssignmentModal({ show: false, assignment: null })}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="delete-modal-body">
                            <div className="delete-modal-warning">
                                <AlertTriangle size={20} />
                                <div>
                                    <h4>Xác nhận xóa?</h4>
                                    <p>Hành động này sẽ xóa vĩnh viễn bài tập này khỏi lớp học.</p>
                                </div>
                            </div>
                        </div>
                        <div className="delete-modal-footer">
                            <button className="btn-delete-cancel" onClick={() => setDeleteAssignmentModal({ show: false, assignment: null })}>Hủy</button>
                            <button className="btn-delete-confirm" onClick={confirmDeleteAssignment}>Xóa</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssignmentStatus;
