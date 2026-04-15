import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Layers, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../../components/Sidebar';
import GradeModal from '../../components/GradeModal';
import api from '../../services/api';
import '../../css/pages/center/ClassesManagement.css';

const GradeManagement = () => {
    const [grades, setGrades] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGrade, setEditingGrade] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ show: false, grade: null });

    const fetchGrades = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/Grades');
            setGrades(res.data);
        } catch (err) {
            console.error('Lỗi tải danh sách khối lớp', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchGrades();
    }, [fetchGrades]);

    const handleAddGrade = () => {
        setEditingGrade(null);
        setIsModalOpen(true);
    };

    const handleEditGrade = (grade) => {
        setEditingGrade(grade);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (grade) => {
        setDeleteModal({ show: true, grade });
    };

    const confirmDelete = async () => {
        if (!deleteModal.grade) return;
        try {
            await api.delete(`/Grades/${deleteModal.grade.gradeId}`);
            await fetchGrades();
            setDeleteModal({ show: false, grade: null });
            toast.success(`Đã xóa khối lớp "${deleteModal.grade.gradeName}" thành công!`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể xóa khối lớp này!');
        }
    };

    const filteredGrades = grades.filter(g =>
        (g.gradeName || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="classes-management">
            <Sidebar />
            <main className="classes-main">
                <div className="classes-header">
                    <div className="classes-header-top">
                        <div>
                            <h1>Quản lý khối lớp</h1>
                            <p className="classes-subtitle">Phân loại học sinh và lớp học theo cấp độ học tập</p>
                        </div>
                        <button className="btn-create-class" onClick={handleAddGrade}>
                            <Plus size={20} /> Thêm khối lớp
                        </button>
                    </div>
                </div>

                <div className="subjects-section">
                    <div className="subjects-search-bar">
                        <div className="filter-search">
                            <Search size={20} />
                            <input
                                type="text"
                                placeholder="Tìm kiếm khối lớp..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="subjects-loading">
                            <div className="loading-spinner" />
                            <p>Đang tải danh sách khối lớp...</p>
                        </div>
                    ) : filteredGrades.length === 0 ? (
                        <div className="subjects-empty">
                            <Layers size={48} />
                            <h3>Chưa có khối lớp nào</h3>
                            <p>Thêm khối lớp để phân loại trình độ học tập.</p>
                        </div>
                    ) : (
                        <div className="subjects-table-wrapper">
                            <table className="subjects-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Tên khối lớp</th>
                                        <th>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredGrades.map((grade, idx) => (
                                        <tr key={grade.gradeId}>
                                            <td className="subject-idx">{idx + 1}</td>
                                            <td><strong>{grade.gradeName}</strong></td>
                                            <td>
                                                <div className="subject-actions">
                                                    <button className="btn-subject-edit" onClick={() => handleEditGrade(grade)}><Pencil size={15} /></button>
                                                    <button className="btn-subject-delete" onClick={() => handleDeleteClick(grade)}><Trash2 size={15} /></button>
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

            <GradeModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingGrade(null); }}
                onSuccess={fetchGrades}
                editingGrade={editingGrade}
            />

            {deleteModal.show && (
                <div className="delete-modal-overlay" onClick={() => setDeleteModal({ show: false, grade: null })}>
                    <div className="delete-modal" onClick={e => e.stopPropagation()}>
                        <div className="delete-modal-header">
                            <h3>Xác nhận xóa</h3>
                        </div>
                        <div className="delete-modal-body">
                            Bạn có chắc muốn xóa khối lớp <strong>{deleteModal.grade.gradeName}</strong>?
                        </div>
                        <div className="delete-modal-footer">
                            <button className="btn-delete-cancel" onClick={() => setDeleteModal({ show: false, grade: null })}>Hủy</button>
                            <button className="btn-delete-confirm" onClick={confirmDelete}>Xác nhận xóa</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GradeManagement;
