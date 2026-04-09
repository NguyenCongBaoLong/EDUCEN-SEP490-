import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5106/api';

const ContractViewer = ({ contract, isCenter = false }) => {
    const [loading, setLoading] = useState(true);
    const [objectUrl, setObjectUrl] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchFile = async () => {
            setLoading(true);
            setError(null);
            
            try {
                const client = axios.create({
                    baseURL: API_BASE_URL,
                    headers: {
                        'Content-Type': 'application/json',
                        'ngrok-skip-browser-warning': 'true',
                    },
                });

                // Add auth
                const token = localStorage.getItem('token');
                const systemApiKey = localStorage.getItem('systemApiKey');
                
                if (isCenter) {
                    if (token && token !== 'sysadmin-session') {
                        client.defaults.headers.Authorization = `Bearer ${token}`;
                    }
                    const tenantId = localStorage.getItem('tenantId');
                    if (tenantId) {
                        client.defaults.headers['tenant'] = tenantId;
                    }
                } else {
                    // SystemAdmin
                    if (systemApiKey) {
                        client.defaults.headers['X-API-KEY'] = systemApiKey;
                    } else if (token && token !== 'sysadmin-session') {
                        client.defaults.headers.Authorization = `Bearer ${token}`;
                    }
                }

                const endpoint = isCenter 
                    ? `/admin/subscription/contracts/${contract.contractId}/download`
                    : `/admin/tenants/contracts/${contract.contractId}/download`;
                
                console.log(`[ContractViewer] Fetching: ${endpoint}, isCenter: ${isCenter}`);
                
                const response = await client.get(endpoint, {
                    responseType: 'blob'
                });
                
                const blob = new Blob([response.data], {
                    type: contract.fileType?.toLowerCase() === 'pdf' 
                        ? 'application/pdf' 
                        : `image/${contract.fileType?.toLowerCase()}`
                });
                
                const url = URL.createObjectURL(blob);
                setObjectUrl(url);
            } catch (err) {
                console.error('Error fetching contract:', err);
                setError('Không thể tải file hợp đồng: ' + (err.response?.status || err.message));
            } finally {
                setLoading(false);
            }
        };

        if (contract?.contractId) {
            fetchFile();
        }

        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [contract?.contractId, isCenter]);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Loader2 size={32} className="spin" style={{ color: '#3b82f6' }} />
                <span style={{ marginLeft: '8px' }}>Đang tải hợp đồng...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ef4444', flexDirection: 'column', gap: '8px' }}>
                <span>{error}</span>
                <button 
                    onClick={() => window.location.reload()}
                    style={{ padding: '4px 12px', fontSize: '12px', cursor: 'pointer' }}
                >
                    Thử lại
                </button>
            </div>
        );
    }

    if (!objectUrl) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                Không có dữ liệu
            </div>
        );
    }

    if (contract.fileType?.toLowerCase() === 'pdf') {
        return (
            <iframe 
                src={objectUrl}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title={contract.contractTitle}
            />
        );
    }

    return (
        <img 
            src={objectUrl}
            alt={contract.contractTitle}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />
    );
};

export default ContractViewer;