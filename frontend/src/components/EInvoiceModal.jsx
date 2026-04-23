const EInvoiceModal = ({
    isOpen,
    title = 'Xem hóa đơn điện tử',
    previewUrl,
    iframeTitle = 'einvoice-representation',
    onClose,
    onDownload,
    onReissue,
    disableDownload = false,
    disableReissue = false
}) => {
    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.55)',
                backdropFilter: 'blur(2px)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    width: '92vw',
                    maxWidth: '1120px',
                    maxHeight: '90vh',
                    background: '#fff',
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem 1.25rem',
                        borderBottom: '1px solid #e2e8f0'
                    }}
                >
                    <h3 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: '#1e293b' }}>{title}</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#64748b',
                            cursor: 'pointer',
                            fontSize: 22,
                            lineHeight: 1
                        }}
                    >
                        ×
                    </button>
                </div>

                <div style={{ padding: '1rem 1.25rem 0.75rem', flex: 1, minHeight: 0 }}>
                    <div
                        style={{
                            border: '1px solid #dbe2ea',
                            borderRadius: 10,
                            overflow: 'hidden',
                            height: '100%'
                        }}
                    >
                        {previewUrl && (
                            <iframe
                                title={iframeTitle}
                                src={previewUrl}
                                style={{ width: '100%', height: '100%', border: 'none', minHeight: '62vh' }}
                            />
                        )}
                    </div>
                </div>

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: onReissue ? '1fr 1fr 1fr' : '1fr 1fr',
                        gap: '0.6rem',
                        padding: '0.75rem 1.25rem 1.1rem',
                        borderTop: '1px solid #e2e8f0'
                    }}
                >
                    <button
                        type="button"
                        onClick={onDownload}
                        disabled={disableDownload}
                        style={{
                            height: 42,
                            borderRadius: 10,
                            border: '1px solid #cbd5e1',
                            background: '#e2e8f0',
                            color: '#1e293b',
                            fontWeight: 700,
                            cursor: disableDownload ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Tải xuống XML hóa đơn
                    </button>

                    {onReissue && (
                        <button
                            type="button"
                            onClick={onReissue}
                            disabled={disableReissue}
                            style={{
                                height: 42,
                                borderRadius: 10,
                                border: '1px solid #cbd5e1',
                                background: '#e2e8f0',
                                color: '#1e293b',
                                fontWeight: 700,
                                cursor: disableReissue ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Phát hành lại HĐĐT Sandbox
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            height: 42,
                            borderRadius: 10,
                            border: '1px solid #2563eb',
                            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                            color: '#fff',
                            fontWeight: 800,
                            cursor: 'pointer'
                        }}
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EInvoiceModal;
