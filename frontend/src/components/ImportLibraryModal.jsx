import { useState } from 'react';
import { X, Search, FileText, PlayCircle, BookOpen, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import '../css/components/CreateAssignmentModal.css';

const ImportLibraryModal = ({ isOpen, onClose, onImport, type, libraryItems, existingItems = [] }) => {
    if (!isOpen) return null;

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItems, setSelectedItems] = useState([]);
    const [isImporting, setIsImporting] = useState(false);
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    const isAlreadyInSession = (item) => {
        // 1. Nếu bài tập/tài liệu có file đính kèm: Kiểm tra theo Tên file gốc + Dung lượng
        const fileName = item.originalFileName || item.fileName;
        if (fileName && item.fileSize > 0) {
            return existingItems.some(existing => 
                (existing.originalFileName === fileName || existing.fileName === fileName) && 
                existing.fileSize === item.fileSize
            );
        }

        // 2. Nếu bài tập KHÔNG có file: Kiểm tra theo Tiêu đề đối với các bài khác cũng không có file
        return existingItems.some(existing => 
            existing.title === item.title && 
            !(existing.originalFileName || existing.fileName)
        );
    };

    const filteredItems = libraryItems.filter(item => {
        const query = searchQuery.toLowerCase();
        return item.title?.toLowerCase().includes(query) || item.name?.toLowerCase().includes(query);
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);

    // Reset page when searching
    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1);
    };

    const getMaterialIcon = (fileType) => {
        switch (fileType) {
            case 'pdf': return <FileText size={20} color="#ef4444" />;
            case 'word': return <FileText size={20} color="#2563eb" />;
            case 'video': return <PlayCircle size={20} color="#8b5cf6" />;
            default: return <FileText size={20} color="#64748b" />;
        }
    };

    const getAssignmentStatusBadge = (status) => {
        switch (status) {
            case 'active': return <span style={{ fontSize: '0.75rem', padding: '2px 6px', background: '#dbeafe', color: '#1e40af', borderRadius: '4px' }}>Đang mở</span>;
            case 'closed': return <span style={{ fontSize: '0.75rem', padding: '2px 6px', background: '#fef08a', color: '#854d0e', borderRadius: '4px' }}>Đã đóng</span>;
            case 'draft': return <span style={{ fontSize: '0.75rem', padding: '2px 6px', background: '#e2e8f0', color: '#475569', borderRadius: '4px' }}>Nháp</span>;
            default: return null;
        }
    };

    const toggleSelection = (item) => {
        if (isAlreadyInSession(item)) return;
        if (selectedItems.some(i => i.id === item.id)) {
            setSelectedItems(selectedItems.filter(i => i.id !== item.id));
        } else {
            setSelectedItems([...selectedItems, item]);
        }
    };

    const handleImport = async () => {
        if (isImporting) return;
        setIsImporting(true);
        try {
            await onImport(selectedItems);
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="cam-overlay">
            <div className="cam-modal" style={{ maxWidth: '650px', display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>
                <div className="cam-header">
                    <h2 className="cam-title">
                        {type === 'material' ? 'Thêm Tài liệu từ Thư viện' : 'Thêm Bài tập từ Bộ đề'}
                    </h2>
                    <button className="cam-close" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="cam-form" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', paddingTop: '1rem' }}>

                    <div className="cam-field" style={{ marginBottom: '1rem' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={18} color="#94a3b8" style={{ position: 'absolute', top: '10px', left: '12px' }} />
                            <input
                                type="text"
                                className="cam-input"
                                placeholder="Tìm kiếm theo tên..."
                                value={searchQuery}
                                onChange={handleSearchChange}
                                style={{ paddingLeft: '40px' }}
                            />
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
                        {filteredItems.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem 0', color: '#64748b' }}>
                                <AlertCircle size={32} style={{ opacity: 0.5, margin: '0 auto 8px' }} />
                                <p>Không tìm thấy mục nào.</p>
                            </div>
                        ) : (
                            <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                {currentItems.map(item => {
                                    const isSelected = selectedItems.some(i => i.id === item.id);
                                    const alreadyAdded = isAlreadyInSession(item);
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => !alreadyAdded && toggleSelection(item)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', 
                                                background: alreadyAdded ? '#f1f5f9' : (isSelected ? '#eff6ff' : 'white'),
                                                border: `1px solid ${alreadyAdded ? '#e2e8f0' : (isSelected ? '#bfdbfe' : '#e2e8f0')}`, 
                                                borderRadius: '8px', cursor: alreadyAdded ? 'not-allowed' : 'pointer', 
                                                transition: 'all 0.2s',
                                                opacity: alreadyAdded ? 0.7 : 1
                                            }}
                                        >
                                            <div style={{ 
                                                width: '20px', height: '20px', borderRadius: '4px', 
                                                border: `1px solid ${alreadyAdded ? '#cbd5e1' : (isSelected ? '#3b82f6' : '#cbd5e1')}`, 
                                                background: alreadyAdded ? '#cbd5e1' : (isSelected ? '#3b82f6' : 'white'), 
                                                display: 'flex', alignItems: 'center', justifyContent: 'center' 
                                            }}>
                                                {alreadyAdded ? <CheckCircle size={14} color="#64748b" /> : (isSelected && <CheckCircle size={14} color="white" />)}
                                            </div>

                                            {type === 'material' ? (
                                                <>
                                                    {getMaterialIcon(item.type)}
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: alreadyAdded ? '#64748b' : '#1e293b' }}>
                                                            {item.name}
                                                            {alreadyAdded && <span style={{ marginLeft: 8, fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>(Đã thêm)</span>}
                                                        </div>
                                                        <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>{item.size} • Đăng: {item.uploadDate}</div>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <BookOpen size={20} color={alreadyAdded ? '#94a3b8' : "#6366f1"} />
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: alreadyAdded ? '#64748b' : '#1e293b', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                            {item.title}
                                                            {alreadyAdded ? <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>(Đã thêm)</span> : getAssignmentStatusBadge(item.status)}
                                                        </div>
                                                         <div style={{ fontSize: '0.8125rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            {item.originalFileName || item.fileName || 'Không có file đính kèm'}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '12px 0', borderTop: '1px solid #e2e8f0', marginTop: '8px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: currentPage === 1 ? '#f1f5f9' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                                    >
                                        ‹
                                    </button>
                                    <span style={{ fontSize: '0.875rem', color: '#475569', fontWeight: 500 }}>
                                        Trang {currentPage} / {totalPages}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: currentPage === totalPages ? '#f1f5f9' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                                    >
                                        ›
                                    </button>
                                </div>
                            )}
                            </>
                        )}
                    </div>
                </div>

                <div className="cam-footer" style={{ marginTop: 0, borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                    <div style={{ flex: 1, fontSize: '0.875rem', color: '#64748b' }}>
                        Đã chọn <strong>{selectedItems.length}</strong> mục
                    </div>
                    <button type="button" className="cam-btn-cancel" onClick={onClose}>Hủy bỏ</button>
                    <button type="button" className="cam-btn-submit" disabled={selectedItems.length === 0 || isImporting} onClick={handleImport}>
                        {isImporting ? 'Đang xử lý...' : `Import ${selectedItems.length > 0 ? `(${selectedItems.length})` : ''}`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImportLibraryModal;
