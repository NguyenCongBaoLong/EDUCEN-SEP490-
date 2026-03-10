import { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, Loader2, DownloadCloud } from 'lucide-react';
import PropTypes from 'prop-types';
import api from '../services/api';
import '../css/components/ImportStudentModal.css';

// Sample Excel template columns guide
const SAMPLE_CSV = `Username,FullName,Email,PhoneNumber\r\nsinhvien01,Nguyễn Văn Test,test@example.com,0901234567\r\nsinhvien02,Trần Thị Demo,demo@example.com,`;

const ImportStudentModal = ({ isOpen, onClose, onImport }) => {
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [step, setStep] = useState('upload'); // 'upload' | 'result'
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null); // { total, success, failed, errors, defaultPasswordNote }
    const fileInputRef = useRef(null);

    const resetState = () => {
        setFile(null);
        setIsDragging(false);
        setStep('upload');
        setLoading(false);
        setResult(null);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const processFile = (f) => {
        if (!f) return;
        const ext = f.name.split('.').pop().toLowerCase();
        if (!['xlsx', 'xls'].includes(ext)) {
            alert('Chỉ hỗ trợ file Excel (.xlsx, .xls). Vui lòng tải mẫu để biết định dạng.');
            return;
        }
        setFile(f);
    };

    const handleFileChange = (e) => {
        processFile(e.target.files[0]);
        e.target.value = '';
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        processFile(e.dataTransfer.files[0]);
    };

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await api.post('/Students/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const data = res.data;
            setResult({
                total: data.importResults?.total ?? 0,
                success: data.importResults?.success ?? 0,
                failed: data.importResults?.failed ?? 0,
                errors: data.importResults?.errors ?? [],
                defaultPasswordNote: data.defaultPasswordNote || ''
            });
            setStep('result');

            // Notify parent to refresh list
            if (data.importResults?.success > 0) {
                onImport();
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Import thất bại, vui lòng thử lại.';
            alert(`❌ ${msg}`);
        } finally {
            setLoading(false);
        }
    };

    const downloadSample = () => {
        const blob = new Blob(['\uFEFF' + SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mau_import_hoc_sinh.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="import-modal-content" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="import-modal-header">
                    <div>
                        <h2>Import Danh Sách Học Sinh</h2>
                        <p>Tải lên file Excel (.xlsx/.xls) để thêm nhiều học sinh cùng lúc</p>
                    </div>
                    <button className="import-modal-close" onClick={handleClose}><X size={22} /></button>
                </div>

                {step === 'upload' ? (
                    <div className="import-modal-body">
                        {/* Upload Zone */}
                        <div
                            className={`upload-zone ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => !file && fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls"
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                            />
                            {file ? (
                                <>
                                    <CheckCircle size={40} style={{ color: '#16a34a', margin: '0 auto 12px', display: 'block' }} />
                                    <h3 style={{ color: '#16a34a' }}>{file.name}</h3>
                                    <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                        {(file.size / 1024).toFixed(1)} KB
                                    </p>
                                    <button
                                        className="btn-reupload"
                                        style={{ marginTop: 8 }}
                                        onClick={(e) => { e.stopPropagation(); setFile(null); fileInputRef.current?.click(); }}
                                    >
                                        Chọn file khác
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Upload size={40} className="upload-icon" />
                                    <h3>Kéo thả file Excel vào đây</h3>
                                    <p>hoặc <span className="upload-link">click để chọn file</span></p>
                                    <p className="upload-hint">Hỗ trợ: .xlsx, .xls</p>
                                </>
                            )}
                        </div>

                        {/* Sample Download */}
                        <div className="import-sample-section">
                            <FileText size={18} />
                            <span>Chưa có file mẫu?</span>
                            <button className="btn-download-sample" onClick={downloadSample}>
                                <DownloadCloud size={15} /> Tải file mẫu
                            </button>
                        </div>

                        {/* Field Guide */}
                        <div className="import-field-guide">
                            <h4>Các cột bắt buộc trong file Excel:</h4>
                            <div className="field-guide-grid">
                                <div className="field-item required">Username <span>*</span></div>
                                <div className="field-item required">FullName <span>*</span></div>
                                <div className="field-item required">Email <span>*</span></div>
                                <div className="field-item optional">PhoneNumber</div>
                            </div>
                            <p className="field-note">
                                <span>*</span> Bắt buộc &nbsp;|&nbsp;
                                Mật khẩu mặc định: <strong>username + "123"</strong>
                            </p>
                        </div>
                    </div>
                ) : (
                    // Result step
                    <div className="import-modal-body">
                        <div className="preview-stats">
                            <div className="stat-card total">
                                <span className="stat-num">{result.total}</span>
                                <span className="stat-label">Tổng dòng</span>
                            </div>
                            <div className="stat-card success">
                                <CheckCircle size={16} />
                                <span className="stat-num">{result.success}</span>
                                <span className="stat-label">Thành công</span>
                            </div>
                            {result.failed > 0 && (
                                <div className="stat-card error">
                                    <AlertCircle size={16} />
                                    <span className="stat-num">{result.failed}</span>
                                    <span className="stat-label">Thất bại</span>
                                </div>
                            )}
                        </div>

                        {result.defaultPasswordNote && (
                            <div style={{
                                padding: '10px 14px',
                                background: '#f0f9ff',
                                borderRadius: 8,
                                fontSize: '0.85rem',
                                color: '#0369a1',
                                marginBottom: 12,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}>
                                <CheckCircle size={15} />
                                {result.defaultPasswordNote}
                            </div>
                        )}

                        {result.errors.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                                <h4 style={{ fontSize: '0.875rem', color: '#dc2626', marginBottom: 8 }}>
                                    Chi tiết lỗi:
                                </h4>
                                <div className="preview-table-wrapper" style={{ maxHeight: 200 }}>
                                    {result.errors.map((err, i) => (
                                        <div key={i} style={{
                                            padding: '6px 10px',
                                            background: '#fef2f2',
                                            borderRadius: 6,
                                            fontSize: '0.8rem',
                                            color: '#dc2626',
                                            marginBottom: 4,
                                            display: 'flex',
                                            gap: 8,
                                            alignItems: 'flex-start'
                                        }}>
                                            <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 2 }} />
                                            {err}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {result.success === result.total && result.total > 0 && (
                            <div style={{ textAlign: 'center', padding: '1rem', color: '#16a34a' }}>
                                <CheckCircle size={36} style={{ margin: '0 auto 8px', display: 'block' }} />
                                <p style={{ fontWeight: 700 }}>Import hoàn tất thành công!</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="import-modal-footer">
                    <button className="btn-cancel" onClick={handleClose}>
                        {step === 'result' ? 'Đóng' : 'Hủy'}
                    </button>
                    {step === 'upload' && (
                        <button
                            className="btn-submit"
                            onClick={handleUpload}
                            disabled={!file || loading}
                            style={(!file || loading) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                        >
                            {loading
                                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Đang import...</>
                                : <><Upload size={16} /> Import học sinh</>
                            }
                        </button>
                    )}
                    {step === 'result' && result?.failed > 0 && (
                        <button className="btn-submit" onClick={resetState}>
                            Import file khác
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

ImportStudentModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onImport: PropTypes.func.isRequired
};

export default ImportStudentModal;
