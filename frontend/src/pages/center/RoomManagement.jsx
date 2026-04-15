import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, MapPin, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../../components/Sidebar';
import RoomModal from '../../components/RoomModal';
import api from '../../services/api';
import '../../css/pages/center/ClassesManagement.css';

const RoomManagement = () => {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ show: false, room: null });

    const fetchRooms = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/Rooms');
            setRooms(res.data);
        } catch (err) {
            console.error('Lỗi tải danh sách phòng', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRooms();
    }, [fetchRooms]);

    const handleAddRoom = () => {
        setEditingRoom(null);
        setIsModalOpen(true);
    };

    const handleEditRoom = (room) => {
        setEditingRoom(room);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (room) => {
        setDeleteModal({ show: true, room });
    };

    const confirmDelete = async () => {
        if (!deleteModal.room) return;
        try {
            await api.delete(`/Rooms/${deleteModal.room.roomId}`);
            await fetchRooms();
            setDeleteModal({ show: false, room: null });
            toast.success(`Đã xóa phòng "${deleteModal.room.roomName}" thành công!`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể xóa phòng học này!');
        }
    };

    const filteredRooms = rooms.filter(r =>
        (r.roomName || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="classes-management">
            <Sidebar />
            <main className="classes-main">
                <div className="classes-header">
                    <div className="classes-header-top">
                        <div>
                            <h1>Quản lý phòng học</h1>
                            <p className="classes-subtitle">Danh sách cơ sở vật chất và phòng học của trung tâm</p>
                        </div>
                        <button className="btn-create-class" onClick={handleAddRoom}>
                            <Plus size={20} /> Thêm phòng học
                        </button>
                    </div>
                </div>

                <div className="subjects-section">
                    <div className="subjects-search-bar">
                        <div className="filter-search">
                            <Search size={20} />
                            <input
                                type="text"
                                placeholder="Tìm kiếm phòng học..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="subjects-loading">
                            <div className="loading-spinner" />
                            <p>Đang tải danh sách phòng họp...</p>
                        </div>
                    ) : filteredRooms.length === 0 ? (
                        <div className="subjects-empty">
                            <MapPin size={48} />
                            <h3>Chưa có phòng học nào</h3>
                            <p>Thêm phòng học để quản lý việc xếp lớp.</p>
                        </div>
                    ) : (
                        <div className="subjects-table-wrapper">
                            <table className="subjects-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Tên phòng</th>
                                        <th>Trạng thái</th>
                                        <th>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRooms.map((room, idx) => (
                                        <tr key={room.roomId}>
                                            <td className="subject-idx">{idx + 1}</td>
                                            <td><strong>{room.roomName}</strong></td>
                                            <td>
                                                <span className={`status-badge ${room.status ? 'active' : 'inactive'}`}>
                                                    {room.status ? 'Sẵn sàng' : 'Bảo trì'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="subject-actions">
                                                    <button className="btn-subject-edit" onClick={() => handleEditRoom(room)}><Pencil size={15} /></button>
                                                    <button className="btn-subject-delete" onClick={() => handleDeleteClick(room)}><Trash2 size={15} /></button>
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

            <RoomModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingRoom(null); }}
                onSuccess={fetchRooms}
                editingRoom={editingRoom}
            />

            {deleteModal.show && (
                <div className="delete-modal-overlay" onClick={() => setDeleteModal({ show: false, room: null })}>
                    <div className="delete-modal" onClick={e => e.stopPropagation()}>
                        <div className="delete-modal-header">
                            <h3>Xác nhận xóa</h3>
                        </div>
                        <div className="delete-modal-body">
                            Bạn có chắc muốn xóa phòng <strong>{deleteModal.room.roomName}</strong>?
                        </div>
                        <div className="delete-modal-footer">
                            <button className="btn-delete-cancel" onClick={() => setDeleteModal({ show: false, room: null })}>Hủy</button>
                            <button className="btn-delete-confirm" onClick={confirmDelete}>Xác nhận xóa</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoomManagement;
