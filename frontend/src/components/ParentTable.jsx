import { useState } from 'react';
import { Search, Eye, Edit2, Lock, Unlock, Mail, CheckCircle, X, AlertTriangle } from 'lucide-react';
import PropTypes from 'prop-types';
import '../css/components/ParentTable.css';
import '../css/components/DeleteModal.css';

const ParentTable = ({ parentData, searchQuery, setSearchQuery, onView, onEdit, onToggleStatus, onSendAccount }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [lockModal, setLockModal] = useState({ show: false, parent: null });
    const [sendModal, setSendModal] = useState({ show: false, parent: null });
    const itemsPerPage = 6;

    const totalPages = Math.ceil(parentData.length / itemsPerPage);
    const currentParents = parentData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const getInitials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    const confirmLock = () => {
        if (lockModal.parent) onToggleStatus(lockModal.parent.id);
        setLockModal({ show: false, parent: null });
    };

    const confirmSend = () => {
        if (sendModal.parent && onSendAccount) onSendAccount(sendModal.parent.id);
        setSendModal({ show: false, parent: null });
    };

    return (
        <div className="parent-table-container">
            {/* Compact toolbar */}
            <div className="parent-toolbar">
                <div className="parent-search-wrap">
                    <Search size={15} className="parent-search-icon" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm phụ huynh..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="parent-search-input"
                    />
                </div>
                <span className="parent-count-label">{parentData.length} phụ huynh</span>
            </div>

            {/* Table */}
            <div className="table-wrapper">
                <table className="parent-table">
                    <thead>
                        <tr>
                            <th>Phụ Huynh</th>
                            <th>Liên Hệ</th>
                            <th>Học Sinh</th>
                            <th>Trạng Thái</th>
                            <th>Tài Khoản</th>
                            <th>Hành Động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentParents.length > 0 ? currentParents.map(p => (
                            <tr key={p.id}>
                                <td>
                                    <div className="parent-info-cell">
                                        <div className="parent-avatar">{getInitials(p.name)}</div>
                                        <div>
                                            <div className="parent-name">{p.name}</div>
                                            <div className="parent-id">{p.id}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div className="parent-contact">
                                        <div>{p.phone}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{p.email}</div>
                                    </div>
                                </td>
                                <td>
                                    {p.linkedStudentNames?.length > 0 ? (
                                        <div className="linked-students">
                                            {p.linkedStudentNames.map((n, i) => (
                                                <span key={i} className="linked-student-badge">{n}</span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Chưa liên kết</span>
                                    )}
                                </td>
                                <td>
                                    <span className={`status-badge ${p.status}`}>
                                        {p.status === 'active' ? 'Hoạt động' : 'Đã khoá'}
                                    </span>
                                </td>
                                <td>
                                    {p.accountSent
                                        ? <span className="account-badge sent"><CheckCircle size={13} /> Đã gửi</span>
                                        : <span className="account-badge pending">Chưa gửi</span>
                                    }
                                </td>
                                <td>
                                    <div className="action-buttons">
                                        <button className="action-btn view" title="Xem chi tiết" onClick={() => onView(p)}>
                                            <Eye size={18} />
                                        </button>
                                        <button className="action-btn edit" title="Sửa thông tin" onClick={() => onEdit(p)}>
                                            <Edit2 size={18} />
                                        </button>
                                        {!p.accountSent && (
                                            <button className="action-btn send-account" title="Gửi tài khoản" onClick={() => setSendModal({ show: true, parent: p })}>
                                                <Mail size={18} />
                                            </button>
                                        )}
                                        <button
                                            className={`action-btn ${p.status === 'active' ? 'lock' : 'unlock'} ${!p.accountSent ? 'disabled' : ''}`}
                                            title={!p.accountSent ? 'Cần gửi tài khoản để kích hoạt' : (p.status === 'active' ? 'Khoá tài khoản' : 'Kích hoạt lại')}
                                            onClick={() => p.accountSent && setLockModal({ show: true, parent: p })}
                                            disabled={!p.accountSent}
                                        >
                                            {p.status === 'active' ? <Lock size={18} /> : <Unlock size={18} />}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                                    Không tìm thấy phụ huynh nào.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="pagination">
                <span className="pagination-info">
                    Hiển thị {parentData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, parentData.length)} / {parentData.length} phụ huynh
                </span>
                <div className="pagination-controls">
                    <button className="pagination-btn" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>‹</button>
                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Trang {currentPage} / {Math.max(totalPages, 1)}</span>
                    <button className="pagination-btn" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0}>›</button>
                </div>
            </div>

            {/* Lock modal */}
            {lockModal.show && (
                <div className="delete-modal-overlay" onClick={() => setLockModal({ show: false, parent: null })}>
                    <div className="delete-modal" onClick={e => e.stopPropagation()}>
                        <div className="delete-modal-header">
                            <h3>{lockModal.parent?.status === 'active' ? 'Khoá tài khoản' : 'Kích Hoạt Lại'}</h3>
                            <button className="delete-modal-close" onClick={() => setLockModal({ show: false, parent: null })}><X size={20} /></button>
                        </div>
                        <div className="delete-modal-body">
                            <div className="delete-modal-warning">
                                <div className="delete-modal-warning-icon"><AlertTriangle size={20} /></div>
                                <div className="delete-modal-warning-content">
                                    <h4>{lockModal.parent?.status === 'active' ? 'Khoá tài khoản phụ huynh?' : 'Kích hoạt lại?'}</h4>
                                    <p>Phụ huynh <strong>{lockModal.parent?.name}</strong> sẽ {lockModal.parent?.status === 'active' ? 'bị khoá và không thể đăng nhập.' : 'được kích hoạt trở lại.'}</p>
                                </div>
                            </div>
                        </div>
                        <div className="delete-modal-footer">
                            <button className="btn-delete-cancel" onClick={() => setLockModal({ show: false, parent: null })}>Hủy</button>
                            <button className={lockModal.parent?.status === 'active' ? 'btn-delete-confirm' : 'btn-unlock-confirm'} onClick={confirmLock}>
                                {lockModal.parent?.status === 'active' ? 'Khoá' : 'Kích Hoạt'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Send account modal */}
            {sendModal.show && (
                <div className="delete-modal-overlay" onClick={() => setSendModal({ show: false, parent: null })}>
                    <div className="delete-modal" onClick={e => e.stopPropagation()}>
                        <div className="delete-modal-header">
                            <h3>Gửi Tài Khoản Qua Email</h3>
                            <button className="delete-modal-close" onClick={() => setSendModal({ show: false, parent: null })}><X size={20} /></button>
                        </div>
                        <div className="delete-modal-body">
                            <div className="delete-modal-warning">
                                <div className="delete-modal-warning-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                                    <Mail size={20} />
                                </div>
                                <div className="delete-modal-warning-content">
                                    <h4>Xác nhận gửi tài khoản?</h4>
                                    <p>Hệ thống sẽ gửi tài khoản và mật khẩu đến <strong>{sendModal.parent?.email}</strong>.</p>
                                </div>
                            </div>
                        </div>
                        <div className="delete-modal-footer">
                            <button className="btn-delete-cancel" onClick={() => setSendModal({ show: false, parent: null })}>Hủy</button>
                            <button className="btn-unlock-confirm" onClick={confirmSend}>Gửi Tài Khoản</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

ParentTable.propTypes = {
    parentData: PropTypes.array.isRequired,
    searchQuery: PropTypes.string.isRequired,
    setSearchQuery: PropTypes.func.isRequired,
    onView: PropTypes.func.isRequired,
    onEdit: PropTypes.func.isRequired,
    onToggleStatus: PropTypes.func.isRequired,
    onSendAccount: PropTypes.func
};

export default ParentTable;
