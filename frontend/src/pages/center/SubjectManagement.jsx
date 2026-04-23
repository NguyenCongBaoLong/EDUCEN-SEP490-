import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, BookOpen, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../../components/Sidebar';
import SubjectModal from '../../components/SubjectModal';
import api from '../../services/api';
import '../../css/pages/center/ClassesManagement.css'; // Reusing styles for now

const SubjectManagement = () => {
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ show: false, subject: null });

    const fetchSubjects = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/tenantadmin/Subjects');
            setSubjects(res.data);
        } catch (err) {
            setError(err.message || 'Lỗi kết nối server');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSubjects();
    }, [fetchSubjects]);

    const handleAddSubject = () => {
        setEditingSubject(null);
        setIsModalOpen(true);
    };

    const handleEditSubject = (subject) => {
        setEditingSubject(subject);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (subject) => {
        setDeleteModal({ show: true, subject });
    };

    const confirmDelete = async () => {
        if (!deleteModal.subject) return;
        try {
            await api.delete(`/tenantadmin/Subjects/${deleteModal.subject.subjectId}`);
            await fetchSubjects();
            setDeleteModal({ show: false, subject: null });
            toast.success(`Đã xóa môn học "${deleteModal.subject.subjectName}" thành công!`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Môn học đang được sử dụng, không thể xóa!');
        }
    };

    const filteredSubjects = subjects.filter(s =>
        (s.subjectName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="classes-management"> {/* Reusing container class */}
            <Sidebar />
            <main className="classes-main">
                <div className="classes-header">
                    <div className="classes-header-top">
                        <div>
                            <h1>Quản lý môn học</h1>
                            <p className="classes-subtitle">Danh sách các môn học được giảng dạy tại trung tâm</p>
                        </div>
                        <button className="btn-create-class" onClick={handleAddSubject}>
                            <Plus size={20} /> Thêm môn học
                        </button>
                    </div>
                </div>

                <div className="subjects-section">
                    <div className="subjects-search-bar">
                        <div className="filter-search">
                            <Search size={20} />
                            <input
                                type="text"
                                placeholder="Tìm kiếm môn học..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="subjects-loading">
                            <div className="loading-spinner" />
                            <p>Đang tải danh sách môn học...</p>
                        </div>
                    ) : filteredSubjects.length === 0 ? (
                        <div className="subjects-empty">
                            <BookOpen size={48} />
                            <h3>Chưa có môn học nào</h3>
                            <p>Thêm môn học để sử dụng khi tạo lớp học.</p>
                        </div>
                    ) : (
                        <div className="subjects-table-wrapper">
                            <table className="subjects-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Tên môn học</th>
                                        <th>Mô tả</th>
                                        <th>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSubjects.map((subject, idx) => (
                                        <tr key={subject.subjectId}>
                                            <td className="subject-idx">{idx + 1}</td>
                                            <td>
                                                <div className="subject-name-cell">
                                                    <div className="subject-icon-badge">
                                                        <BookOpen size={16} />
                                                    </div>
                                                    <span className="subject-name">{subject.subjectName}</span>
                                                </div>
                                            </td>
                                            <td className="subject-desc">{subject.description || <span className="no-desc">Chưa có mô tả</span>}</td>
                                            <td>
                                                <div className="subject-actions">
                                                    <button className="btn-subject-edit" onClick={() => handleEditSubject(subject)}><Pencil size={15} /></button>
                                                    <button className="btn-subject-delete" onClick={() => handleDeleteClick(subject)}><Trash2 size={15} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            <SubjectModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingSubject(null); }}
                onSuccess={fetchSubjects}
                editingSubject={editingSubject}
            />

            {/* Simple Delete Confirmation */}
            {deleteModal.show && (
                <div className="delete-modal-overlay" onClick={() => setDeleteModal({ show: false, subject: null })}>
                    <div className="delete-modal" onClick={e => e.stopPropagation()}>
                        <div className="delete-modal-header">
                            <h3>Xác nhận xóa</h3>
                        </div>
                        <div className="delete-modal-body">
                            Bạn có chắc chắn muốn xóa môn học <strong>{deleteModal.subject.subjectName}</strong>?
                        </div>
                        <div className="delete-modal-footer">
                            <button className="btn-delete-cancel" onClick={() => setDeleteModal({ show: false, subject: null })}>Hủy</button>
                            <button className="btn-delete-confirm" onClick={confirmDelete}>Xác nhận xóa</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubjectManagement;