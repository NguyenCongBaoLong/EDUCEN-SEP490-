import { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
import PropTypes from 'prop-types';
import '../css/components/ImportStudentModal.css';

// Simple CSV parser
const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    return lines.slice(1).map((line, idx) => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row = { _rowIndex: idx + 2 };
        headers.forEach((h, i) => { row[h] = values[i] || ''; });
        return row;
    });
};

const FIELD_MAP = {
    'Họ và Tên': 'name',
    'Ho va Ten': 'name',
    'Name': 'name',
    'name': 'name',
    'Email': 'email',
    'email': 'email',
    'Ngày Sinh': 'dateOfBirth',
    'Ngay Sinh': 'dateOfBirth',
    'ngaysinh': 'dateOfBirth',
    'DateOfBirth': 'dateOfBirth',
    'Giới Tính': 'gender',
    'Gioi Tinh': 'gender',
    'Gender': 'gender',
    'gender': 'gender',
    'Địa Chỉ': 'address',
    'Dia Chi': 'address',
    'Address': 'address',
    'address': 'address',
    'Khối': 'grade',
    'Khoi': 'grade',
    'Grade': 'grade',
    'grade': 'grade',
    'Tên Phụ Huynh': 'parentName',
    'Ten Phu Huynh': 'parentName',
    'ParentName': 'parentName',
    'SĐT Phụ Huynh': 'parentPhone',
    'SDT Phu Huynh': 'parentPhone',
    'ParentPhone': 'parentPhone',
    'Email Phụ Huynh': 'parentEmail',
    'Email Phu Huynh': 'parentEmail',
    'ParentEmail': 'parentEmail',
};

const mapRow = (row) => {
    const mapped = {};
    Object.entries(row).forEach(([key, value]) => {
        if (key === '_rowIndex') { mapped._rowIndex = value; return; }
        const fieldName = FIELD_MAP[key] || FIELD_MAP[key.trim()] || null;
        if (fieldName) mapped[fieldName] = value;
    });
    return mapped;
};

const validateRow = (row) => {
    const errors = [];
    if (!row.name || row.name.trim().length < 2) errors.push('Thiếu họ tên');
    if (!row.grade) errors.push('Thiếu khối');
    if (row.email) {
        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email);
        if (!emailOk) errors.push('Email không hợp lệ');
    }
    if (row.parentPhone) {
        const phoneOk = /^(0[0-9]{9,10})$/.test(row.parentPhone);
        if (!phoneOk) errors.push('SĐT phụ huynh không hợp lệ');
    }
    return errors;
};

// Sample CSV template content
const SAMPLE_CSV = `Họ và Tên,Email,Ngày Sinh,Giới Tính,Khối,Địa Chỉ,Tên Phụ Huynh,SĐT Phụ Huynh,Email Phụ Huynh
Nguyễn Văn Test,test@example.com,2010-05-01,male,8,Hà Nội,Nguyễn Văn Cha,0901234567,cha@example.com
Trần Thị Demo,,2011-03-15,female,7,,,,`;

const ImportStudentModal = ({ isOpen, onClose, onImport }) => {
    const [parsedRows, setParsedRows] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [fileName, setFileName] = useState('');
    const [step, setStep] = useState('upload'); // 'upload' | 'preview'
    const fileInputRef = useRef(null);

    const resetState = () => {
        setParsedRows([]);
        setFileName('');
        setStep('upload');
        setIsDragging(false);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const processFile = (file) => {
        if (!file) return;
        if (!file.name.match(/\.(csv)$/i)) {
            alert('Chỉ hỗ trợ file CSV. Vui lòng tải mẫu để biết định dạng.');
            return;
        }
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            const raw = parseCSV(e.target.result);
            const mapped = raw.map(mapRow);
            const validated = mapped.map(row => ({
                ...row,
                _errors: validateRow(row),
                _selected: validateRow(row).length === 0
            }));
            setParsedRows(validated);
            setStep('preview');
        };
        reader.readAsText(file, 'UTF-8');
    };

    const handleFileChange = (e) => {
        processFile(e.target.files[0]);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        processFile(e.dataTransfer.files[0]);
    };

    const toggleRow = (idx) => {
        setParsedRows(prev => prev.map((r, i) =>
            i === idx && r._errors.length === 0 ? { ...r, _selected: !r._selected } : r
        ));
    };

    const removeRow = (idx) => {
        setParsedRows(prev => prev.filter((_, i) => i !== idx));
    };

    const validCount = parsedRows.filter(r => r._errors.length === 0).length;
    const selectedCount = parsedRows.filter(r => r._selected).length;
    const errorCount = parsedRows.filter(r => r._errors.length > 0).length;

    const handleConfirmImport = () => {
        const toImport = parsedRows
            .filter(r => r._selected)
            .map(({ _rowIndex, _errors, _selected, ...rest }) => ({
                ...rest,
                grade: parseInt(rest.grade) || rest.grade,
                gender: rest.gender === 'female' ? 'female' : 'male',
                enrollmentDate: new Date().toISOString().split('T')[0],
                status: 'active',
                accountSent: false,
                avatar: null,
                notes: ''
            }));
        onImport(toImport);
        handleClose();
    };

    const downloadSample = () => {
        const blob = new Blob(['\uFEFF' + SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mau_danh_sach_hoc_sinh.csv';
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
                        <p>Tải lên file CSV để thêm nhiều học sinh cùng lúc</p>
                    </div>
                    <button className="import-modal-close" onClick={handleClose}><X size={22} /></button>
                </div>

                {step === 'upload' ? (
                    <div className="import-modal-body">
                        {/* Upload Zone */}
                        <div
                            className={`upload-zone ${isDragging ? 'dragging' : ''}`}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload size={40} className="upload-icon" />
                            <h3>Kéo thả file CSV vào đây</h3>
                            <p>hoặc <span className="upload-link">click để chọn file</span></p>
                            <p className="upload-hint">Chỉ hỗ trợ file .CSV</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv"
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                            />
                        </div>

                        {/* Sample Download */}
                        <div className="import-sample-section">
                            <FileText size={18} />
                            <span>Chưa có file mẫu?</span>
                            <button className="btn-download-sample" onClick={downloadSample}>
                                Tải file mẫu CSV
                            </button>
                        </div>

                        {/* Field Guide */}
                        <div className="import-field-guide">
                            <h4>Các cột trong file CSV:</h4>
                            <div className="field-guide-grid">
                                <div className="field-item required">Họ và Tên <span>*</span></div>
                                <div className="field-item required">Khối <span>*</span></div>
                                <div className="field-item optional">Email</div>
                                <div className="field-item optional">Ngày Sinh</div>
                                <div className="field-item optional">Giới Tính</div>
                                <div className="field-item optional">Địa Chỉ</div>
                                <div className="field-item optional">Tên Phụ Huynh</div>
                                <div className="field-item optional">SĐT Phụ Huynh</div>
                                <div className="field-item optional">Email Phụ Huynh</div>
                            </div>
                            <p className="field-note"><span>*</span> Bắt buộc &nbsp;|&nbsp; Các cột còn lại tuỳ chọn</p>
                        </div>
                    </div>
                ) : (
                    <div className="import-modal-body">
                        {/* Preview Stats */}
                        <div className="preview-stats">
                            <div className="stat-card total">
                                <span className="stat-num">{parsedRows.length}</span>
                                <span className="stat-label">Tổng dòng</span>
                            </div>
                            <div className="stat-card success">
                                <CheckCircle size={16} />
                                <span className="stat-num">{validCount}</span>
                                <span className="stat-label">Hợp lệ</span>
                            </div>
                            {errorCount > 0 && (
                                <div className="stat-card error">
                                    <AlertCircle size={16} />
                                    <span className="stat-num">{errorCount}</span>
                                    <span className="stat-label">Có lỗi</span>
                                </div>
                            )}
                            <div className="stat-card selected">
                                <span className="stat-num">{selectedCount}</span>
                                <span className="stat-label">Sẽ import</span>
                            </div>
                            <div className="preview-filename">
                                <FileText size={14} />
                                {fileName}
                                <button className="btn-reupload" onClick={() => { resetState(); }}>Đổi file</button>
                            </div>
                        </div>

                        {/* Preview Table */}
                        <div className="preview-table-wrapper">
                            <table className="preview-table">
                                <thead>
                                    <tr>
                                        <th></th>
                                        <th>#</th>
                                        <th>Họ và Tên</th>
                                        <th>Email</th>
                                        <th>Khối</th>
                                        <th>Giới Tính</th>
                                        <th>Phụ Huynh</th>
                                        <th>Trạng Thái</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedRows.map((row, idx) => (
                                        <tr
                                            key={idx}
                                            className={`${row._errors.length > 0 ? 'row-error' : ''} ${row._selected ? 'row-selected' : ''}`}
                                        >
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={row._selected}
                                                    disabled={row._errors.length > 0}
                                                    onChange={() => toggleRow(idx)}
                                                />
                                            </td>
                                            <td className="row-num">{row._rowIndex}</td>
                                            <td className="row-name">{row.name || <span className="missing">—</span>}</td>
                                            <td>{row.email || <span className="missing">—</span>}</td>
                                            <td>{row.grade ? `Khối ${row.grade}` : <span className="missing">—</span>}</td>
                                            <td>{row.gender === 'female' ? 'Nữ' : row.gender === 'male' ? 'Nam' : <span className="missing">—</span>}</td>
                                            <td>{row.parentName || <span className="missing">Chưa có</span>}</td>
                                            <td>
                                                {row._errors.length === 0
                                                    ? <span className="row-status ok"><CheckCircle size={13} /> Hợp lệ</span>
                                                    : <span className="row-status err" title={row._errors.join(', ')}>
                                                        <AlertCircle size={13} /> {row._errors[0]}
                                                    </span>
                                                }
                                            </td>
                                            <td>
                                                <button className="btn-remove-row" onClick={() => removeRow(idx)} title="Xoá dòng này">
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="import-modal-footer">
                    <button className="btn-cancel" onClick={handleClose}>Hủy</button>
                    {step === 'preview' && (
                        <button
                            className="btn-submit"
                            onClick={handleConfirmImport}
                            disabled={selectedCount === 0}
                            style={selectedCount === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                        >
                            Import {selectedCount} học sinh
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
