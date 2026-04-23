import { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, Loader2, DownloadCloud } from 'lucide-react';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';
import api from '../services/api';
import '../css/components/ImportStudentModal.css';

// Sample Excel template columns guide
const SAMPLE_CSV = `Username,FullName,Email,PhoneNumber\r\nsinhvien01,Nguyễn Văn Test,test@example.com,0901234567\r\nsinhvien02,Trần Thị Demo,demo@example.com,`;

const ImportStudentModal = ({ isOpen, onClose, onImport }) => {
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [step, setStep] = useState('upload'); // 'upload' | 'result'
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null); // { total, success, failed, skipped, successRecords, errors, defaultPasswordNote }
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
            toast.error('Chỉ hỗ trợ file Excel (.xlsx, .xls). Vui lòng tải mẫu để biết định dạng.');
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
            const newResult = {
                total: data.importResults?.total ?? 0,
                success: data.importResults?.success ?? 0,
                failed: data.importResults?.failed ?? 0,
                skipped: data.importResults?.skipped ?? 0,
                successRecords: data.importResults?.successRecords ?? [],
                errors: data.importResults?.errors ?? [],
                defaultPasswordNote: data.defaultPasswordNote || ''
            };
            setResult(newResult);
            setStep('result');

            // Notify parent to refresh list
            if (data.importResults?.success > 0) {
                onImport(data.importResults);
            }
        } catch (err) {
            let msg = err.response?.data?.message || 'Import thất bại, vui lòng thử lại.';

            if (msg.includes('Invalid template format') || msg.includes('template')) {
                msg = 'File Excel không đúng định dạng. Vui lòng tải file mẫu và giữ nguyên các cột bắt buộc: Username, FullName, Email.';
            } else if (msg.includes('No worksheet')) {
                msg = 'Không tìm thấy dữ liệu trong file Excel.';
            }

            toast.error(msg);
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
                            {result.skipped > 0 && (
                                <div className="stat-card skipped">
                                    <span className="stat-num">{result.skipped}</span>
                                    <span className="stat-label">Đã tồn tại</span>
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

                        {/* Combined Success + Error Results - WITHOUT summary message */}
                        {(result.success > 0 || result.failed > 0) && (
                            <div style={{ marginTop: 8 }}>
                                <h4 style={{ fontSize: '0.875rem', color: '#1f2937', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <CheckCircle size={14} style={{ color: '#16a34a' }} />
                                    Kết quả Import
                                </h4>
                                <div className="preview-table-wrapper" style={{ maxHeight: 350, overflowY: 'auto' }}>
                                    {/* Success rows - show details for each */}
                                    {result.successRecords && result.successRecords.length > 0 && (
                                        <>
                                            {result.successRecords.map((record, i) => (
                                                <div key={`success-${i}`} style={{
                                                    padding: '10px 12px',
                                                    background: '#dcfce7',
                                                    borderRadius: 6,
                                                    fontSize: '0.8rem',
                                                    color: '#166534',
                                                    marginBottom: 6,
                                                    borderLeft: '3px solid #16a34a'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                                        <CheckCircle size={13} style={{ color: '#16a34a' }} />
                                                        <strong>✓ Thành công: {record.sheetName} - Row {record.rowNumber}</strong>
                                                    </div>
                                                    <div style={{ paddingLeft: 20, fontSize: '0.75rem', color: '#166534' }}>
                                                        Username: <strong>{record.username || '(trống)'}</strong> | 
                                                        FullName: <strong>{record.fullName}</strong> | 
                                                        Email: <strong>{record.email}</strong>
                                                        {record.phoneNumber && <> | Phone: <strong>{record.phoneNumber}</strong></>}
                                                        {record.grade && <> | Grade: <strong>{record.grade}</strong></>}
                                                        {record.dateOfBirth && <> | DOB: <strong>{record.dateOfBirth}</strong></>}
                                                        {record.gender && <> | Gender: <strong>{record.gender}</strong></>}
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                    
                                    {/* Error rows */}
                                    {result.errors && result.errors.map((err, i) => (
                                        <div key={`error-${i}`} style={{
                                            padding: '10px 12px',
                                            background: '#fef2f2',
                                            borderRadius: 6,
                                            fontSize: '0.8rem',
                                            color: '#dc2626',
                                            marginBottom: 6,
                                            display: 'flex',
                                            gap: 8,
                                            alignItems: 'flex-start',
                                            borderLeft: '3px solid #dc2626'
                                        }}>
                                            <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 2, color: '#dc2626' }} />
                                            <span>{err}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {result.skipped > 0 && result.failed === 0 && result.success === 0 && (
                            <div style={{ textAlign: 'center', padding: '1rem', color: '#f59e0b' }}>
                                <p style={{ fontWeight: 700 }}>Không có học sinh mới: {result.skipped} đã tồn tại trong hệ thống</p>
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