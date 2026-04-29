import { useState, useEffect, useCallback } from 'react';
import {
    Building2, Plus, Search, Edit2, Eye, Lock, Unlock, Package,
    X, CheckCircle, AlertCircle, Loader2, ClipboardList, Check, Filter, TrendingUp,
    FileText
} from 'lucide-react';
import SystemAdminSidebar from '../../components/SystemAdminSidebar';
import ContractViewer from '../../components/ContractViewer';
import adminApi from '../../services/adminApi';
import '../../css/pages/sysadmin/TenantManagement.css';

const EMPTY_FORM = {
    tenantName: '', subDomain: '',
    contactPerson: '', email: '', phoneNumber: '', address: '',
    adminUsername: '', adminPassword: '',
};

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : value);
const hasText = (value) => normalizeText(value)?.length > 0;
const API_ORIGIN = (import.meta.env.VITE_API_URL || `${window.location.origin}/api`).replace(/\/api\/?$/i, '');
const buildPublicFileUrl = (path) => {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    const cleaned = String(path).replace(/^\/?wwwroot\/?/i, '').replace(/^\/+/, '');
    return `${API_ORIGIN}/${cleaned}`;
};

const parseSafeDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    let d = new Date(value);
    if (typeof value === 'string' && !value.includes('Z') && !/[+-]\d{2}:?\d{2}$/.test(value)) {
        const utcDate = new Date(value + 'Z');
        if (!isNaN(utcDate.getTime())) d = utcDate;
    }
    return isNaN(d.getTime()) ? null : d;
};

const formatFullDateTime = (value) => {
    const date = parseSafeDate(value);
    if (!date) return '—';
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    }).format(date).replace(/,/g, '');
};

const formatDateOnly = (value) => {
    const date = parseSafeDate(value);
    if (!date) return '—';
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    }).format(date);
};

const TenantManagement = () => {
    const [tenants, setTenants] = useState([]);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('tenants'); // 'tenants' | 'registrations' | 'package-requests'
    const [registrations, setRegistrations] = useState([]);
    const [loadingReg, setLoadingReg] = useState(false);
    const [filterStatus, setFilterStatus] = useState('Pending'); // 'All', 'Pending', 'Approved', 'Rejected'
    const [viewRegTarget, setViewRegTarget] = useState(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null); // null = create mode

    // New Modals State 
    const [viewTarget, setViewTarget] = useState(null);
    const [subscribeTarget, setSubscribeTarget] = useState(null);
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [registrationApprovalTarget, setRegistrationApprovalTarget] = useState(null);
    const [lockTarget, setLockTarget] = useState(null);
    const [historyTarget, setHistoryTarget] = useState(null);
    const [historyRecords, setHistoryRecords] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    // Custom Confirm Modal State
    const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

    // Contract Modal State
    const [contractModalTarget, setContractModalTarget] = useState(null);
    const [contracts, setContracts] = useState([]);
    const [loadingContracts, setLoadingContracts] = useState(false);
    const [uploadContractModal, setUploadContractModal] = useState(null);
    const [uploadingContract, setUploadingContract] = useState(false);
    const [viewContractTarget, setViewContractTarget] = useState(null);
    const [deleteContractTarget, setDeleteContractTarget] = useState(null);
    const [viewBusinessLicenseTarget, setViewBusinessLicenseTarget] = useState(null);

    // Subscription Change Request State
    const [showChangeRequests, setShowChangeRequests] = useState(false);
    const [changeRequests, setChangeRequests] = useState([]);
    const [loadingChangeRequests, setLoadingChangeRequests] = useState(false);
    const [reviewRequestTarget, setReviewRequestTarget] = useState(null);
    const [reviewRequestMode, setReviewRequestMode] = useState('approve');
    const [reviewRequestNote, setReviewRequestNote] = useState('');
    const [createInvoiceTarget, setCreateInvoiceTarget] = useState(null);
    const [showInvoiceHistory, setShowInvoiceHistory] = useState(false);
    const [invoiceHistory, setInvoiceHistory] = useState([]);
    const [invoiceHistoryCount, setInvoiceHistoryCount] = useState(0);
    const [loadingInvoiceHistory, setLoadingInvoiceHistory] = useState(false);
    const [viewCreditLedger, setViewCreditLedger] = useState([]);
    const [loadingCreditLedger, setLoadingCreditLedger] = useState(false);
    const [packageFilterStatus, setPackageFilterStatus] = useState('Pending'); // 'All', 'Pending', 'Approved', 'Rejected', 'Completed'

    const fetchTenants = () => {
        setLoading(true);
        adminApi.get('/admin/Tenants')
            .then(res => setTenants(res.data))
            .catch(() => showToast('Không thể tải danh sách trung tâm.', 'error'))
            .finally(() => setLoading(false));
    };

    const fetchPlans = () => {
        adminApi.get('/admin/plans')
            .then(res => setPlans(res.data))
            .catch(() => console.error('Error fetching plans'));
    };

    const fetchRegistrations = () => {
        setLoadingReg(true);
        adminApi.get('/registrations')
            .then(res => setRegistrations(res.data))
            .catch(() => showToast('Không thể tải danh sách đăng ký.', 'error'))
            .finally(() => setLoadingReg(false));
    };

    const fetchChangeRequests = (status = packageFilterStatus) => {
        setLoadingChangeRequests(true);
        const url = (status && status !== 'All')
            ? `/admin/tenants/subscription-change-requests?status=${status}`
            : '/admin/tenants/subscription-change-requests';
        adminApi.get(url)
            .then(res => setChangeRequests(res.data || []))
            .catch(() => showToast('Không thể tải danh sách yêu cầu đổi gói.', 'error'))
            .finally(() => setLoadingChangeRequests(false));
    };

    const handleReviewRequest = async (requestId, approved, reviewNote = '') => {
        if (!approved && !hasText(reviewNote)) {
            showToast('Vui lòng nhập lý do từ chối.', 'error');
            return;
        }

        setSaving(true);
        try {
            await adminApi.put(`/admin/tenants/subscription-change-requests/${requestId}/review`, {
                approved,
                reviewNote: normalizeText(reviewNote)
            });
            showToast(approved ? 'Đã duyệt yêu cầu và tự động gửi hóa đơn.' : 'Đã từ chối yêu cầu.');
            setReviewRequestTarget(null);
            setReviewRequestMode('approve');
            setReviewRequestNote('');
            fetchChangeRequests(packageFilterStatus);
            notifySidebarBadgeRefresh();
        } catch (err) {
            showToast(err.response?.data?.message || 'Không thể xử lý yêu cầu.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const fetchInvoiceAwaitingCount = useCallback(async ({ silent = true, reason = 'count-refresh' } = {}) => {
        try {
            const res = await adminApi.get('/admin/tenants/invoices-history/count', {
                params: { status: 'AwaitingConfirmation' }
            });
            const total = Number(res?.data?.total || 0);
            setInvoiceHistoryCount(total);
            console.debug('[TenantManagement] refreshed invoice awaiting count', {
                reason,
                awaitingConfirmation: total,
            });
        } catch (err) {
            if (!silent) {
                showToast('Không thể tải số lượng hóa đơn chờ xác nhận.', 'error');
            }
            console.warn('[TenantManagement] failed to refresh invoice awaiting count', {
                reason,
                error: err?.response?.data || err?.message || err,
            });
        }
    }, []);

    const fetchInvoiceHistory = useCallback(async ({ openModal = false, silent = false, reason = 'manual' } = {}) => {
        if (openModal) {
            setShowInvoiceHistory(true);
        }

        if (!openModal) {
            await fetchInvoiceAwaitingCount({ silent, reason });
            return;
        }

        if (!silent || openModal) {
            setLoadingInvoiceHistory(true);
        }
        try {
            const res = await adminApi.get('/admin/tenants/invoices-history', {
                params: { page: 1, pageSize: 100 }
            });
            const data = Array.isArray(res.data) ? res.data : [];
            setInvoiceHistory(data);
            const awaitingCount = data.filter(inv => (inv?.status || '').trim() === 'AwaitingConfirmation').length;
            setInvoiceHistoryCount(awaitingCount);
            console.debug('[TenantManagement] refreshed invoice history', {
                reason,
                total: data.length,
                awaitingConfirmation: awaitingCount,
            });
        } catch (err) {
            if (!silent || openModal) {
                showToast('Không thể tải lịch sử hóa đơn.', 'error');
            }
            console.warn('[TenantManagement] failed to refresh invoice history', {
                reason,
                error: err?.response?.data || err?.message || err,
            });
        } finally {
            if (!silent || openModal) {
                setLoadingInvoiceHistory(false);
            }
        }
    }, [fetchInvoiceAwaitingCount]);

    const openInvoiceHistory = async () => {
        await fetchInvoiceHistory({ openModal: true, reason: 'open-modal' });
    };
    const handleCreateInvoice = async (requestId, dueDays = 7) => {
        setSaving(true);
        try {
            await adminApi.post(`/admin/tenants/subscription-change-requests/${requestId}/invoice`, { dueDays });
            showToast('Đã tạo hoá đơn.');
            setCreateInvoiceTarget(null);
            fetchChangeRequests(packageFilterStatus);
            await fetchInvoiceHistory({ silent: !showInvoiceHistory, reason: 'create-invoice' });
        } catch (err) {
            showToast(err.response?.data?.message || 'Không thể tạo hoá đơn.', 'error');
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        fetchTenants();
        fetchPlans();
        fetchRegistrations();
        fetchChangeRequests('Pending');
        fetchInvoiceAwaitingCount({ silent: true, reason: 'mount' });
    }, []);

    useEffect(() => {
        const refreshBadgeSources = () => {
            fetchRegistrations();
            fetchChangeRequests(packageFilterStatus);
            fetchInvoiceAwaitingCount({ silent: true, reason: 'sysadmin-badge-refresh' });
        };

        const intervalId = window.setInterval(() => {
            refreshBadgeSources();
        }, 30000);

        const handleFocus = () => refreshBadgeSources();
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                refreshBadgeSources();
            }
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, []);

    useEffect(() => {
        const shouldRefreshInvoiceHistory = activeTab === 'package-requests' || showInvoiceHistory;
        if (!shouldRefreshInvoiceHistory) return;

        if (showInvoiceHistory) {
            fetchInvoiceHistory({ openModal: true, silent: false, reason: 'invoice-modal-visible' });
        } else {
            fetchInvoiceAwaitingCount({ silent: true, reason: 'package-tab-visible' });
        }

        const intervalId = window.setInterval(() => {
            if (showInvoiceHistory) {
                fetchInvoiceHistory({ openModal: true, silent: false, reason: 'invoice-interval-30s' });
            } else {
                fetchInvoiceAwaitingCount({ silent: true, reason: 'invoice-count-interval-30s' });
            }
        }, 30000);

        const handleFocus = () => {
            if (showInvoiceHistory) {
                fetchInvoiceHistory({ openModal: true, silent: false, reason: 'invoice-window-focus' });
            } else {
                fetchInvoiceAwaitingCount({ silent: true, reason: 'invoice-count-window-focus' });
            }
        };
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                if (showInvoiceHistory) {
                    fetchInvoiceHistory({ openModal: true, silent: false, reason: 'invoice-tab-visible' });
                } else {
                    fetchInvoiceAwaitingCount({ silent: true, reason: 'invoice-count-tab-visible' });
                }
            }
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [activeTab, showInvoiceHistory, fetchInvoiceHistory, fetchInvoiceAwaitingCount]);

    const handleUpdateRegistrationStatus = async (id, status) => {
        try {
            await adminApi.put(`/registrations/${id}/status?status=${status}`);
            showToast(status === 'Approved' ? 'Đã duyệt yêu cầu đăng ký!' : 'Đã từ chối yêu cầu.');
            fetchRegistrations();
            notifySidebarBadgeRefresh();
        } catch {
            showToast('Có lỗi xảy ra khi cập nhật.', 'error');
        }
    };


    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const notifySidebarBadgeRefresh = () => {
        window.dispatchEvent(new Event('sysadmin-badge-refresh'));
    };

    const openCreate = () => {
        setEditTarget(null);
        setForm(EMPTY_FORM);
        setModalOpen(true);
    };

    const openEdit = (tenant) => {
        setEditTarget(tenant);
        setForm({
            tenantId: tenant.tenantId,
            tenantName: tenant.tenantName,
            subDomain: tenant.subDomain,
            contactPerson: tenant.contactPerson || '',
            email: tenant.email || '',
            phoneNumber: tenant.phoneNumber || '',
            address: tenant.address || '',
        });
        setModalOpen(true);
    };

    const openApproveModal = (reg) => {
        setRegistrationApprovalTarget(reg);
        setEditTarget(null);
        setForm({
            tenantId: '',
            tenantName: reg.centerName || '',
            subDomain: '',
            contactPerson: reg.contactPerson || '',
            email: reg.email || '',
            phoneNumber: reg.phoneNumber || '',
            address: '',
        });
        setModalOpen(true);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        // Giữ nguyên input để backend có thể validate chính xác trường hợp chứa whitespace.
        const processedValue = name === 'subDomain' ? value.toLowerCase() : value;
        setForm(f => ({ ...f, [name]: processedValue }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!hasText(form.tenantName) || !hasText(form.subDomain)) {
            showToast('Tên trung tâm và subdomain không được để trống.', 'error');
            return;
        }

        // Validate subdomain pattern: lowercase, numbers, hyphens only
        const subDomainRegex = /^[a-z0-9-]+$/;
        if (!subDomainRegex.test(form.subDomain)) {
            showToast('Subdomain chỉ được chứa chữ cái thường, số và dấu gạch ngang (-).', 'error');
            return;
        }

        if (!editTarget) {
            if (!hasText(form.adminUsername) || !hasText(form.adminPassword)) {
                showToast('Vui lòng nhập đầy đủ tài khoản Admin khi tạo trung tâm.', 'error');
                return;
            }
            if (normalizeText(form.adminPassword).length < 6) {
                showToast('Mật khẩu Admin phải có ít nhất 6 ký tự.', 'error');
                return;
            }
        }

        setSaving(true);
        try {
            if (editTarget) {
                await adminApi.put(`/admin/Tenants/${editTarget.tenantId}`, {
                    tenantName: normalizeText(form.tenantName),
                    subDomain: normalizeText(form.subDomain),
                    contactPerson: normalizeText(form.contactPerson) || null,
                    email: normalizeText(form.email) || null,
                    phoneNumber: normalizeText(form.phoneNumber) || null,
                    address: normalizeText(form.address) || null,
                    isActive: editTarget.isActive,
                });
                showToast('Cập nhật trung tâm thành công!');
            } else {
                await adminApi.post('/admin/Tenants', {
                    ...form,
                    tenantName: normalizeText(form.tenantName),
                    subDomain: normalizeText(form.subDomain),
                    contactPerson: normalizeText(form.contactPerson),
                    email: normalizeText(form.email),
                    phoneNumber: normalizeText(form.phoneNumber),
                    address: normalizeText(form.address),
                    adminUsername: normalizeText(form.adminUsername),
                    adminPassword: normalizeText(form.adminPassword),
                });
                showToast('Tạo trung tâm thành công! DB mới đã được khởi tạo.');
                if (registrationApprovalTarget) {
                    await handleUpdateRegistrationStatus(registrationApprovalTarget.registrationId, 'Approved');
                }
            }
            setModalOpen(false);
            setRegistrationApprovalTarget(null);
            fetchTenants();
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data || 'Có lỗi xảy ra.';
            showToast(typeof msg === 'string' ? msg : 'Có lỗi xảy ra.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = (tenant) => {
        setLockTarget(tenant);
    };

    const executeToggleActive = async () => {
        if (!lockTarget) return;
        setSaving(true);
        try {
            await adminApi.put(`/admin/Tenants/${lockTarget.tenantId}`, {
                tenantName: lockTarget.tenantName,
                subDomain: lockTarget.subDomain,
                isActive: !lockTarget.isActive,   // toggle
            });
            showToast(lockTarget.isActive
                ? `Đã ngưng hoạt động trung tâm ${lockTarget.tenantName}.`
                : `Đã kích hoạt lại trung tâm ${lockTarget.tenantName}.`
            );
            setLockTarget(null);
            fetchTenants();
        } catch {
            showToast('Không thể thay đổi trạng thái.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const openViewDetails = async (tenant) => {
        setViewTarget(tenant);
        setLoadingCreditLedger(true);
        setViewCreditLedger([]);
        try {
            const [detailsRes, ledgerRes] = await Promise.all([
                adminApi.get(`/admin/Tenants/${tenant.tenantId}/details`),
                adminApi.get(`/admin/Tenants/${tenant.tenantId}/credit-ledger`, { params: { page: 1, pageSize: 20 } })
            ]);

            setViewTarget(detailsRes.data || tenant);
            setViewCreditLedger(Array.isArray(ledgerRes.data) ? ledgerRes.data : []);
        } catch {
            showToast('Không thể tải chi tiết credit của trung tâm.', 'error');
        } finally {
            setLoadingCreditLedger(false);
        }
    };

    const handleConfirmCashInvoice = async (invoice) => {
        setSaving(true);
        try {
            await adminApi.put(`/admin/tenants/invoices/${invoice.invoiceId}/payment`, {
                paymentMethod: 'Cash',
                paymentNote: `SystemAdmin xác nhận đã nhận tiền mặt cho hóa đơn ${invoice.invoiceNumber}`
            });

            showToast('Đã xác nhận thanh toán tiền mặt và áp dụng đổi gói.');
            await fetchInvoiceHistory({ openModal: showInvoiceHistory, silent: !showInvoiceHistory, reason: 'confirm-cash' });
            fetchChangeRequests(packageFilterStatus);
            fetchTenants();
        } catch (err) {
            showToast(err.response?.data?.message || 'Không thể xác nhận thanh toán tiền mặt.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const openSubscribe = (tenant) => {
        setSubscribeTarget(tenant);
        setSelectedPlanId('');
    };

    const openHistory = (tenant) => {
        setHistoryTarget(tenant);
        setHistoryLoading(true);
        setHistoryRecords([]);
        adminApi.get(`/admin/tenants/${tenant.tenantId}/subscription-history`)
            .then(res => setHistoryRecords(res.data || []))
            .catch(() => showToast('Không thể tải lịch sử mua gói.', 'error'))
            .finally(() => setHistoryLoading(false));
    };

    const openContracts = (tenant) => {
        setContractModalTarget(tenant);
        setLoadingContracts(true);
        setContracts([]);
        adminApi.get(`/admin/tenants/${tenant.tenantId}/contracts`)
            .then(res => setContracts(res.data || []))
            .catch(() => showToast('Không thể tải danh sách hợp đồng.', 'error'))
            .finally(() => setLoadingContracts(false));
    };

    const handleUploadContract = async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('contract-file');
        const titleInput = document.getElementById('contract-title');
        const descInput = document.getElementById('contract-desc');
        
        if (!fileInput?.files?.[0]) {
            showToast('Vui lòng chọn file hợp đồng', 'error');
            return;
        }
        if (!titleInput?.value) {
            showToast('Vui lòng nhập tiêu đề hợp đồng', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('title', titleInput.value);
        if (descInput?.value) formData.append('description', descInput.value);

        setUploadingContract(true);
        try {
            await adminApi.post(`/admin/tenants/${uploadContractModal.tenantId}/contract`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showToast('Tải lên hợp đồng thành công!');
            setUploadContractModal(null);
            openContracts(uploadContractModal);
        } catch (err) {
            showToast(err.response?.data?.message || 'Không thể tải lên hợp đồng.', 'error');
        } finally {
            setUploadingContract(false);
        }
    };

    const handleViewContract = (contract) => {
        setViewContractTarget(contract);
    };

    const openBusinessLicenseViewer = (registration) => {
        if (!registration?.businessLicenseFilePath) return;
        const fileUrl = buildPublicFileUrl(registration.businessLicenseFilePath);
        const ext = String(fileUrl).split('.').pop()?.toLowerCase() || '';
        const fileType = ext === 'pdf' ? 'pdf' : 'image';

        setViewBusinessLicenseTarget({
            title: `Giấy phép kinh doanh - ${registration.centerName || registration.tenantName || 'Trung tâm'}`,
            fileUrl,
            fileType,
        });
    };

    const handleDeleteContract = (contract) => {
        setDeleteContractTarget(contract);
    };

    const executeDeleteContract = async () => {
        if (!deleteContractTarget) return;
        
        setSaving(true);
        try {
            await adminApi.delete(`/admin/tenants/contracts/${deleteContractTarget.contractId}`);
            showToast('Xóa hợp đồng thành công!');
            setDeleteContractTarget(null);
            if (contractModalTarget) {
                openContracts(contractModalTarget);
            }
        } catch (err) {
            showToast(err.response?.data?.message || 'Không thể xóa hợp đồng.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleSubscribeSubmit = async (e) => {
        e.preventDefault();
        if (!selectedPlanId) {
            showToast('Vui lòng chọn gói dịch vụ', 'error');
            return;
        }

        setSaving(true);
        try {
            if (selectedPlanId === subscribeTarget.planId) {
                showToast('Không thể gia hạn gói hiện tại bằng tài khoản hệ thống.', 'error');
                return;
            }
            // Đổi gói mới / Cấp gói lần đầu
            await adminApi.post('/admin/tenants/subscribe', {
                tenantId: subscribeTarget.tenantId,
                planId: selectedPlanId
            });
            showToast(`Đã cập nhật gói dịch vụ thành công cho ${subscribeTarget.tenantName}`);
            setSubscribeTarget(null);
            fetchTenants();
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data || 'Có lỗi xảy ra.';
            showToast(typeof msg === 'string' ? msg : 'Có lỗi xảy ra.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleCancelSubscription = async () => {
        if (!subscribeTarget) return;
        
        setSaving(true);
        try {
            await adminApi.post(`/admin/tenants/${subscribeTarget.tenantId}/cancel`);
            showToast(`Đã hủy gói dịch vụ của ${subscribeTarget.tenantName}`);
            setSubscribeTarget(null);
            setConfirmCancelOpen(false);
            fetchTenants();
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data || 'Không thể hủy gói dịch vụ.';
            showToast(typeof msg === 'string' ? msg : 'Lỗi.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const filtered = tenants.filter(t =>
        t.tenantName?.toLowerCase().includes(search.toLowerCase()) ||
        t.subDomain?.toLowerCase().includes(search.toLowerCase())
    );

    const filteredRegistrations = registrations.filter(r => {
        const matchSearch = r.centerName?.toLowerCase().includes(search.toLowerCase()) ||
            r.email?.toLowerCase().includes(search.toLowerCase()) ||
            r.contactPerson?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === 'All' ? true : r.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const pendingCount = registrations.filter(r => r.status === 'Pending').length;
    const pendingPackageCount = changeRequests.filter(r => r.status === 'Pending').length;

    return (
        <div className="sa-page">
            <SystemAdminSidebar />
            <main className="sa-page-main">

                {/* Toast */}
                {toast && (
                    <div className={`sa-toast ${toast.type}`}>
                        {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                        {toast.msg}
                    </div>
                )}

                {/* Header */}
                <div className="sa-page-header">
                    <div>
                        <h1 className="sa-page-title">
                            {activeTab === 'tenants' ? 'Quản Lý Trung Tâm' : 
                             activeTab === 'registrations' ? 'Yêu Cầu Đăng Ký' : 
                             'Yêu Cầu Đổi Gói'}
                        </h1>
                        <p className="sa-page-subtitle">
                            {activeTab === 'tenants' ? 'Tạo và quản lý các trung tâm gia sư trong hệ thống' : 
                             activeTab === 'registrations' ? 'Kiểm duyệt các yêu cầu đăng ký mở trung tâm mới' : 
                             'Quản lý các yêu cầu đổi gói dịch vụ'}
                        </p>
                    </div>
                    {activeTab === 'tenants' && (
                        <button className="sa-btn-primary" onClick={openCreate}>
                            <Plus size={18} /> Thêm Trung Tâm
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div className="sa-tabs">
                    <button 
                        className={`sa-tab-btn ${activeTab === 'tenants' ? 'active' : ''}`}
                        onClick={() => setActiveTab('tenants')}
                    >
                        <Building2 size={18} /> Quản Lý Trung Tâm
                    </button>
                    <button 
                        className={`sa-tab-btn ${activeTab === 'registrations' ? 'active' : ''}`}
                        onClick={() => setActiveTab('registrations')}
                    >
                        <ClipboardList size={18} /> Yêu Cầu Đăng Ký
                        {pendingCount > 0 && (
                            <span className="sa-tab-badge">{pendingCount}</span>
                        )}
                    </button>
                    <button
                        className={`sa-tab-btn ${activeTab === 'package-requests' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('package-requests'); fetchChangeRequests(packageFilterStatus); }}
                    >
                        <Package size={18} /> Yêu Cầu Đổi Gói
                        {pendingPackageCount > 0 && (
                            <span className="sa-tab-badge">{pendingPackageCount}</span>
                        )}
                    </button>
                </div>

                {/* Toolbar */}
                <div className="sa-toolbar">
                    <div className="sa-search-wrap">
                        <Search size={16} className="sa-search-icon" />
                        <input
                            className="sa-search-input"
                            placeholder={activeTab === 'tenants' ? "Tìm kiếm theo tên, domain, email..." : "Tìm kiếm theo tên trung tâm, email..."}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    {activeTab === 'registrations' && (
                        <div className="sa-filter-wrap">
                            <Filter size={14} className="sa-filter-label" style={{ color: '#6366f1' }} />
                            <span className="sa-filter-label">Trạng thái:</span>
                            <select 
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="sa-filter-select"
                            >
                                <option value="All">Tất cả</option>
                                <option value="Pending">Chờ duyệt</option>
                                <option value="Approved">Đã duyệt</option>
                                <option value="Rejected">Từ chối</option>
                            </select>
                        </div>
                    )}
                    
                    {activeTab === 'package-requests' && (
                        <div className="sa-filter-wrap">
                            <Filter size={14} className="sa-filter-label" style={{ color: '#6366f1' }} />
                            <span className="sa-filter-label">Trạng thái:</span>
                            <select 
                                value={packageFilterStatus}
                                onChange={(e) => {
                                    const newStatus = e.target.value;
                                    setPackageFilterStatus(newStatus);
                                    fetchChangeRequests(newStatus);
                                }}
                                className="sa-filter-select"
                            >
                                <option value="All">Tất cả</option>
                                <option value="Pending">Chờ duyệt</option>
                                <option value="Approved">Đã duyệt (Chờ HĐ)</option>
                                <option value="Rejected">Từ chối</option>
                                <option value="Completed">Đã thanh toán</option>
                            </select>
                        </div>
                    )}

                    {activeTab === 'package-requests' && (
                        <button className="sa-btn-primary" onClick={openInvoiceHistory}>
                            <FileText size={16} /> Lịch Sử Gửi Hóa Đơn
                            {invoiceHistoryCount > 0 && (
                                <span className="sa-tab-badge">{invoiceHistoryCount}</span>
                            )}
                        </button>
                    )}
                    <span className="sa-count-badge">
                        {activeTab === 'tenants' ? (
                            <><Building2 size={14} /> {filtered.length} trung tâm</>
                        ) : activeTab === 'registrations' ? (
                            <><ClipboardList size={14} /> {filteredRegistrations.length} yêu cầu</>
                        ) : (
                            <><Package size={14} /> {changeRequests.length} yêu cầu đổi gói</>
                        )}
                    </span>
                </div>

                {/* Tab content: Tenants */}
                {activeTab === 'tenants' && (
                    <div className="sa-table-card">
                    {loading ? (
                        <div className="sa-loading"><Loader2 size={24} className="spin" /> Đang tải...</div>
                    ) : filtered.length === 0 ? (
                        <div className="sa-empty">
                            <Building2 size={40} />
                            <p>{search ? 'Không tìm thấy kết quả phù hợp.' : 'Chưa có trung tâm nào. Hãy tạo trung tâm đầu tiên!'}</p>
                        </div>
                    ) : (
                        <table className="sa-table">
                            <thead>
                                <tr>
                                    <th>Tên Trung Tâm</th>
                                    <th>Domain</th>
                                    <th>Gói Đăng Ký</th>
                                    <th>Trạng Thái</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(t => (
                                    <tr key={t.tenantId}>
                                        <td>
                                            <div className="sa-tenant-name-cell">
                                                <div className="sa-tenant-avatar">
                                                    {t.tenantName?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="sa-tenant-name">{t.tenantName}</div>
                                                    <div className="sa-tenant-id">ID: {t.tenantId}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="sa-domain-tag">{t.subDomain}</span>
                                        </td>
                                        <td>
                                            {t.planDeleted ? (
                                                <div className="sa-subscription-info">
                                                    <span className="sa-plan-name" style={{ color: '#ef4444', fontWeight: 600 }}>
                                                        Gói đã xóa
                                                    </span>
                                                    {t.expiredAt && (
                                                        <div style={{ fontSize: '0.75rem', color: '#666', marginTop: 2 }}>
                                                            Hết hạn: {formatDateOnly(t.expiredAt)}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : t.planName ? (
                                                <div className="sa-subscription-info">
                                                    <span className="sa-plan-name" style={{ color: t.planIsActive ? 'inherit' : '#ef4444', fontWeight: t.planIsActive ? 'inherit' : 600 }}>
                                                        {t.planName}
                                                        {!t.planIsActive && <span style={{ fontSize: '0.7rem', display: 'block', color: '#ef4444' }}>(Gói đã lưu trữ)</span>}
                                                    </span>
                                                    {t.expiredAt && (
                                                        <div style={{ fontSize: '0.75rem', color: '#666', marginTop: 2 }}>
                                                            Hết hạn: {formatDateOnly(t.expiredAt)}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span style={{ color: '#999', fontStyle: 'italic', fontSize: '0.85rem' }}>Chưa đăng ký</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`sa-status-badge ${t.isActive ? 'active' : 'inactive'}`}>
                                                {t.isActive ? 'Hoạt động' : 'Tạm dừng'}
                                            </span>
                                        </td>
                                        <td className="sa-actions-td">
                                            <div className="sa-action-buttons">
                                                <button
                                                    className="sa-action-btn view"
                                                    title="Xem chi tiết"
                                                    onClick={() => openViewDetails(t)}
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    className="sa-action-btn subscribe"
                                                    title="Xem lịch sử mua gói"
                                                    onClick={() => openHistory(t)}
                                                >
                                                    <Package size={18} />
                                                </button>
                                                <button
                                                    className="sa-action-btn"
                                                    title="Xem hợp đồng"
                                                    onClick={() => openContracts(t)}
                                                    style={{ background: '#fef3c7', border: '1px solid #f59e0b', color: '#f59e0b' }}
                                                >
                                                    <FileText size={18} />
                                                </button>
                                                <button
                                                    className="sa-action-btn edit"
                                                    title="Chỉnh sửa"
                                                    onClick={() => openEdit(t)}
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    className={`sa-action-btn ${t.isActive ? 'lock' : 'unlock'}`}
                                                    title={t.isActive ? 'Vô hiệu hóa' : 'Kích hoạt lại'}
                                                    onClick={() => handleToggle(t)}
                                                >
                                                    {t.isActive ? <Lock size={18} /> : <Unlock size={18} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                )}

                {/* Tab content: Registrations */}
                {activeTab === 'registrations' && (
                    <div className="sa-table-card">
                        {/* List Area */}

                        {loadingReg ? (
                            <div className="sa-loading"><Loader2 size={24} className="spin" /> Đang tải...</div>
                        ) : filteredRegistrations.length === 0 ? (
                            <div className="sa-empty">
                                <ClipboardList size={40} />
                                <p>{search ? 'Không tìm thấy kết quả phù hợp.' : 'Chưa có yêu cầu đăng ký nào.'}</p>
                            </div>
                        ) : (
                            <table className="sa-table">
                                <thead>
                                    <tr>
                                        <th>Tên Trung Tâm</th>
                                        <th>Người Liên Hệ</th>
                                        <th>Mã Số Thuế</th>
                                        <th style={{ minWidth: '170px' }}>Giấy Phép KD</th>
                                        <th>Ngày Gửi</th>
                                        <th>Trạng Thái</th>
                                        <th>Phê Duyệt</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRegistrations.map(r => (
                                        <tr key={r.registrationId}>
                                            <td>
                                                <div className="sa-tenant-name-cell">
                                                    <div className="sa-tenant-avatar" style={{ background: '#f3f4f6', color: '#374151' }}>
                                                        {r.centerName?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="sa-tenant-name">{r.centerName}</div>
                                                        <div className="sa-tenant-id" style={{ whiteSpace: 'normal', maxWidth: '300px' }}>
                                                            {r.message ? `Lời nhắn: ${r.message.length > 50 ? r.message.substring(0, 50) + '...' : r.message}` : 'Không có lời nhắn'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 500, color: '#111827' }}>{r.contactPerson || '—'}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                                    {r.email} {r.phoneNumber ? `• ${r.phoneNumber}` : ''}
                                                </div>
                                            </td>
                                            <td>{r.taxCode || '—'}</td>
                                            <td>
                                                {r.businessLicenseFilePath ? (
                                                    <button
                                                        type="button"
                                                        className="sa-action-btn view"
                                                        style={{
                                                            color: '#2563eb',
                                                            fontWeight: 600,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            padding: '0.35rem 0.75rem',
                                                            borderRadius: '8px',
                                                            border: '1px solid #bfdbfe',
                                                            background: '#eff6ff',
                                                            whiteSpace: 'nowrap',
                                                            minWidth: '92px'
                                                        }}
                                                        onClick={() => openBusinessLicenseViewer(r)}
                                                    >
                                                        Xem file
                                                    </button>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td>{formatDateOnly(r.createdAt)}</td>
                                            <td>
                                                <span className={`sa-status-badge ${r.status === 'Pending' ? 'pending' : r.status === 'Approved' ? 'active' : 'inactive'}`} style={r.status === 'Pending' ? { background: '#fef3c7', color: '#d97706' } : r.status === 'Rejected' ? { background: '#fef2f2', color: '#ef4444' } : {}}>
                                                    {r.status === 'Pending' ? 'Chờ duyệt' : r.status === 'Approved' ? 'Đã duyệt' : 'Từ chối'}
                                                </span>
                                            </td>
                                            <td className="sa-actions-td">
                                                <div className="sa-action-buttons">
                                                    <button
                                                        className="sa-action-btn view"
                                                        title="Xem chi tiết"
                                                        onClick={() => setViewRegTarget(r)}
                                                        style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    {r.status === 'Pending' && (
                                                        <>
                                                            <button
                                                                className="sa-action-btn subscribe"
                                                                title="Phê duyệt (Tạo trung tâm)"
                                                                onClick={() => openApproveModal(r)}
                                                                style={{ background: '#ecfdf5', border: '1px solid #10b981' }}
                                                            >
                                                                <Check size={18} />
                                                            </button>
                                                            <button
                                                                className="sa-action-btn lock"
                                                                title="Từ chối yêu cầu"
                                                                onClick={() => handleUpdateRegistrationStatus(r.registrationId, 'Rejected')}
                                                                style={{ background: '#fef2f2', border: '1px solid #ef4444' }}
                                                            >
                                                                <X size={18} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* MODALS SECTION */}
                
                {/* Registration Detail Modal */}
                {viewRegTarget && (
                    <>
                        <div className="sa-modal-overlay" onClick={() => setViewRegTarget(null)} />
                        <div className="sa-modal">
                            <div className="sa-modal-header">
                                <h2>Chi Tiết Yêu Cầu Đăng Ký</h2>
                                <button className="sa-modal-close" onClick={() => setViewRegTarget(null)}><X size={20} /></button>
                            </div>
                            <div className="sa-modal-form" style={{ gap: '1rem', paddingBottom: '1.5rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    {[
                                        { label: 'Tên trung tâm', value: viewRegTarget.centerName, span: true },
                                        { label: 'Người liên hệ', value: viewRegTarget.contactPerson },
                                        { label: 'Email', value: viewRegTarget.email },
                                        { label: 'Số điện thoại', value: viewRegTarget.phoneNumber },
                                        { label: 'Mã số thuế', value: viewRegTarget.taxCode },
                                        { label: 'Trạng thái', value: viewRegTarget.status === 'Pending' ? 'Chưa duyệt' : viewRegTarget.status === 'Approved' ? 'Đã duyệt' : 'Từ chối' },
                                        { label: 'Ngày gửi', value: formatFullDateTime(viewRegTarget.createdAt) },
                                        { label: 'Lời nhắn / Yêu cầu', value: viewRegTarget.message || 'Không có', span: true },
                                    ].map(({ label, value, span }) => (
                                        <div key={label} style={{
                                            background: '#f8fafc', padding: '0.75rem 1rem',
                                            borderRadius: '8px', gridColumn: span ? '1 / -1' : undefined
                                        }}>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
                                            <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 500, whiteSpace: 'pre-wrap' }}>{value || '—'}</div>
                                        </div>
                                    ))}
                                </div>
                                {viewRegTarget.businessLicenseFilePath && (
                                    <div
                                        style={{
                                            marginTop: '0.25rem',
                                            background: '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '10px',
                                            padding: '0.85rem 1rem'
                                        }}
                                    >
                                        <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.55rem', textTransform: 'uppercase' }}>
                                            Giấy phép kinh doanh
                                        </div>
                                        <button
                                            type="button"
                                            style={{
                                                color: '#2563eb',
                                                fontWeight: 600,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: '0.4rem 0.85rem',
                                                borderRadius: '8px',
                                                border: '1px solid #bfdbfe',
                                                background: '#eff6ff',
                                                whiteSpace: 'nowrap',
                                                cursor: 'pointer',
                                                fontSize: '0.95rem',
                                                lineHeight: 1.2
                                            }}
                                            onClick={() => openBusinessLicenseViewer(viewRegTarget)}
                                        >
                                            Xem giấy phép
                                        </button>
                                    </div>
                                )}
                                {viewRegTarget.status === 'Pending' && (
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                                        <button
                                            className="sa-btn-primary"
                                            style={{ flex: 1, background: '#10b981' }}
                                            onClick={() => {
                                                openApproveModal(viewRegTarget);
                                                setViewRegTarget(null);
                                            }}
                                        >
                                            <Check size={18} /> Phê Duyệt Ngay
                                        </button>
                                        <button
                                            className="sa-btn-cancel"
                                            style={{ flex: 1, color: '#ef4444', borderColor: '#fca5a5', background: '#fef2f2' }}
                                            onClick={() => {
                                                handleUpdateRegistrationStatus(viewRegTarget.registrationId, 'Rejected');
                                                setViewRegTarget(null);
                                            }}
                                        >
                                            <X size={18} /> Từ Chối
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* Create/Edit Modal - Also used for registration approval */}
                {modalOpen && (
                    <>
                        <div className="sa-modal-overlay" onClick={() => !saving && setModalOpen(false)} />
                        <div className="sa-modal">
                            <div className="sa-modal-header">
                                <h2>
                                    {editTarget 
                                        ? 'Chỉnh Sửa Trung Tâm' 
                                        : registrationApprovalTarget 
                                            ? 'Phê Duyệt & Tạo Trung Tâm' 
                                            : 'Thêm Trung Tâm Mới'}
                                </h2>
                                <button className="sa-modal-close" onClick={() => !saving && setModalOpen(false)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="sa-modal-form">
                                <div className="sa-form-row">
                                    <div className="sa-form-group">
                                        <label>Tên Trung Tâm *</label>
                                        <input
                                            name="tenantName"
                                            value={form.tenantName}
                                            onChange={handleChange}
                                            placeholder="vd: Trung Tâm Gia Sư Hà Nội"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="sa-form-group">
                                    <label>Domain / Subdomain *</label>
                                    <input
                                        name="subDomain"
                                        value={form.subDomain}
                                        onChange={handleChange}
                                        placeholder="center-a.educen.vn"
                                        required
                                    />
                                </div>
                                <div className="sa-form-row">
                                    <div className="sa-form-group">
                                        <label>Người Liên Hệ</label>
                                        <input
                                            name="contactPerson"
                                            value={form.contactPerson}
                                            onChange={handleChange}
                                            placeholder="Nguyễn Văn A"
                                        />
                                    </div>
                                    <div className="sa-form-group">
                                        <label>Email</label>
                                        <input
                                            name="email"
                                            type="email"
                                            value={form.email}
                                            onChange={handleChange}
                                            placeholder="admin@trungtam.vn"
                                        />
                                    </div>
                                </div>
                                <div className="sa-form-row">
                                    <div className="sa-form-group">
                                        <label>Số Điện Thoại</label>
                                        <input
                                            name="phoneNumber"
                                            value={form.phoneNumber}
                                            onChange={handleChange}
                                            placeholder="0912 345 678"
                                        />
                                    </div>
                                    <div className="sa-form-group">
                                        <label>Địa Chỉ</label>
                                        <input
                                            name="address"
                                            value={form.address}
                                            onChange={handleChange}
                                            placeholder="123 Đường ABC, Hà Nội"
                                        />
                                    </div>
                                </div>
                                {!editTarget && (
                                    <>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginTop: '0.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                                            Tài khoản Admin (bắt buộc)
                                        </div>
                                        <div className="sa-form-row">
                                            <div className="sa-form-group">
                                                <label>Tên đăng nhập Admin *</label>
                                                <input
                                                    name="adminUsername"
                                                    value={form.adminUsername}
                                                    onChange={handleChange}
                                                    placeholder="vd: admin_trungtam"
                                                    required
                                                    minLength={3}
                                                />
                                                <span className="sa-form-hint">Tên đăng nhập sẽ dùng để đăng nhập Admin của trung tâm.</span>
                                            </div>
                                            <div className="sa-form-group">
                                                <label>Mật khẩu Admin *</label>
                                                <input
                                                    name="adminPassword"
                                                    type="password"
                                                    value={form.adminPassword}
                                                    onChange={handleChange}
                                                    placeholder="Tối thiểu 6 ký tự"
                                                    required
                                                    minLength={6}
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                                {!editTarget && (
                                    <div className="sa-form-note">
                                        <CheckCircle size={14} />
                                        Hệ thống sẽ tự động tạo database riêng cho trung tâm này sau khi lưu.
                                    </div>
                                )}
                                <div className="sa-modal-footer">
                                    <button type="button" className="sa-btn-cancel" onClick={() => !saving && setModalOpen(false)}>Hủy</button>
                                    <button type="submit" className="sa-btn-primary" disabled={saving}>
                                        {saving
                                            ? <><Loader2 size={16} className="spin" /> Đang lưu...</>
                                            : editTarget ? 'Cập Nhật' : 'Tạo Trung Tâm'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </>
                )}

                {/* Detail Modal */}
                {viewTarget && (
                    <>
                        <div className="sa-modal-overlay" onClick={() => setViewTarget(null)} />
                        <div className="sa-modal">
                            <div className="sa-modal-header">
                                <h2>Thông Tin Chi Tiết</h2>
                                <button className="sa-modal-close" onClick={() => setViewTarget(null)}><X size={20} /></button>
                            </div>
                            <div className="sa-modal-form" style={{ gap: '1rem', paddingBottom: '1.5rem' }}>
                                {/* Tenant Name + Status */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div className="sa-tenant-avatar" style={{ width: 44, height: 44, fontSize: '1.2rem', borderRadius: 12 }}>
                                        {viewTarget.tenantName?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>{viewTarget.tenantName}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>ID: {viewTarget.tenantId}</div>
                                    </div>
                                    <span className={`sa-status-badge ${viewTarget.isActive ? 'active' : 'inactive'}`} style={{ marginLeft: 'auto' }}>
                                        {viewTarget.isActive ? 'Hoạt động' : 'Tạm dừng'}
                                    </span>
                                </div>

                                {/* Info Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    {[
                                        { label: 'Domain', value: viewTarget.subDomain },
                                        { label: 'Người liên hệ', value: viewTarget.contactPerson },
                                        { label: 'Email', value: viewTarget.email },
                                        { label: 'Số điện thoại', value: viewTarget.phoneNumber },
                                        { label: 'Mã số thuế', value: viewTarget.taxCode },
                                        { label: 'Credit hiện có', value: `${(viewTarget.creditBalance || 0).toLocaleString('vi-VN')} VNĐ` },
                                        { label: 'Địa chỉ', value: viewTarget.address, span: true },
                                    ].map(({ label, value, span }) => (
                                        <div key={label} style={{
                                            background: '#f8fafc', padding: '0.75rem 1rem',
                                            borderRadius: '8px', gridColumn: span ? '1 / -1' : undefined
                                        }}>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.2rem' }}>{label}</div>
                                            <div style={{ fontWeight: 500, color: '#1e293b' }}>{value || '—'}</div>
                                        </div>
                                    ))}
                                </div>

                                {viewTarget.businessLicenseFilePath && (
                                    <div
                                        style={{
                                            marginTop: '0.25rem',
                                            background: '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '10px',
                                            padding: '0.85rem 1rem'
                                        }}
                                    >
                                        <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.55rem', textTransform: 'uppercase' }}>
                                            Giấy phép kinh doanh
                                        </div>
                                        <button
                                            type="button"
                                            style={{
                                                color: '#2563eb',
                                                fontWeight: 600,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: '0.4rem 0.85rem',
                                                borderRadius: '8px',
                                                border: '1px solid #bfdbfe',
                                                background: '#eff6ff',
                                                whiteSpace: 'nowrap',
                                                cursor: 'pointer',
                                                fontSize: '0.95rem',
                                                lineHeight: 1.2
                                            }}
                                            onClick={() => openBusinessLicenseViewer(viewTarget)}
                                        >
                                            Xem giấy phép
                                        </button>
                                    </div>
                                )}

                                {/* Subscription / Usage */}
                                {viewTarget.planName ? (
                                    <>
                                        <div style={{ fontWeight: 600, color: '#1e293b', marginTop: '0.5rem', borderTop: '1px solid #f0f0f0', paddingTop: '0.75rem' }}>
                                            Thông tin gói: <span style={{ color: '#6366f1' }}>{viewTarget.planName}</span>
                                            {viewTarget.expiredAt && (
                                                <span style={{ fontSize: '0.78rem', color: '#94a3b8', marginLeft: 8 }}>
                                                    (Hết hạn: {formatDateOnly(viewTarget.expiredAt)})
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                            <div style={{ background: '#eff6ff', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                                                <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginBottom: '0.2rem' }}>Users (sử dụng / tối đa)</div>
                                                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1d4ed8' }}>
                                                    {viewTarget.totalUsers ?? '—'}
                                                    {viewTarget.limitUsers ? <span style={{ fontWeight: 400, color: '#64748b', fontSize: '0.9rem' }}> / {viewTarget.limitUsers}</span> : ''}
                                                </div>
                                            </div>
                                            <div style={{ background: '#f5f3ff', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                                                <div style={{ fontSize: '0.75rem', color: '#8b5cf6', marginBottom: '0.2rem' }}>Dung lượng (MB sử dụng / tối đa)</div>
                                                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#6d28d9' }}>
                                                    {viewTarget.storageMB ? viewTarget.storageMB.toFixed(1) : '0'}
                                                    {viewTarget.storageLimit ? <span style={{ fontWeight: 400, color: '#64748b', fontSize: '0.9rem' }}> / {viewTarget.storageLimit} MB</span> : ''}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ padding: '0.75rem 1rem', background: '#fffbeb', borderRadius: '8px', color: '#b45309', fontSize: '0.875rem', marginTop: '0.5rem', borderTop: '1px solid #f0f0f0' }}>
                                        Chưa đăng ký gói dịch vụ — Sử dụng nút Package để cấp gói.
                                    </div>
                                )}

                                <div style={{
                                    marginTop: '0.75rem',
                                    borderTop: '1px solid #f0f0f0',
                                    paddingTop: '0.75rem'
                                }}>
                                    <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>Lịch sử credit (20 giao dịch gần nhất)</div>
                                    {loadingCreditLedger ? (
                                        <div className="sa-loading"><Loader2 size={18} className="spin" /> Đang tải...</div>
                                    ) : viewCreditLedger.length === 0 ? (
                                        <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Chưa có giao dịch credit.</div>
                                    ) : (
                                        <div className="sa-table-card" style={{ marginTop: 0, maxHeight: '240px', overflowY: 'auto' }}>
                                            <table className="sa-table">
                                                <thead>
                                                    <tr>
                                                        <th>Thời gian</th>
                                                        <th>Loại</th>
                                                        <th>Số tiền</th>
                                                        <th>Số dư</th>
                                                        <th>Ghi chú</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {viewCreditLedger.map((l) => (
                                                        <tr key={l.ledgerId}>
                                                            <td>{formatFullDateTime(l.createdAt)}</td>
                                                            <td>{l.entryType || '—'}</td>
                                                            <td style={{ color: Number(l.amount || 0) >= 0 ? '#16a34a' : '#dc2626' }}>
                                                                {Number(l.amount || 0).toLocaleString('vi-VN')} VNĐ
                                                            </td>
                                                            <td>{Number(l.balanceAfter || 0).toLocaleString('vi-VN')} VNĐ</td>
                                                            <td>{l.note || '—'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Subscription History Modal */}
                {historyTarget && (
                    <>
                        <div className="sa-modal-overlay" onClick={() => !historyLoading && setHistoryTarget(null)} />
                        <div className="sa-modal" style={{ maxWidth: '900px' }}>
                            <div className="sa-modal-header">
                                <h2>Lịch Sử Mua Gói</h2>
                                <button className="sa-modal-close" onClick={() => !historyLoading && setHistoryTarget(null)}><X size={20} /></button>
                            </div>
                            <div className="sa-modal-form" style={{ gap: '1rem' }}>
                                <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: '8px' }}>
                                    <strong>Trung tâm:</strong> {historyTarget.tenantName} (ID: {historyTarget.tenantId})
                                </div>

                                {historyLoading ? (
                                    <div className="sa-loading"><Loader2 size={20} className="spin" /> Đang tải lịch sử...</div>
                                ) : historyRecords.length === 0 ? (
                                    <div className="sa-empty" style={{ padding: '1.5rem' }}>
                                        <Package size={36} />
                                        <p>Chưa có lịch sử mua gói.</p>
                                    </div>
                                ) : (
                                    <div className="sa-table-card" style={{ marginTop: 0 }}>
                                        <table className="sa-table">
                                            <thead>
                                                <tr>
                                                    <th>Ngày thanh toán</th>
                                                    <th>Số tiền</th>
                                                    <th>Số tháng</th>
                                                    <th>Trạng thái</th>
                                                    <th>Phương thức</th>
                                                    <th>Ghi chú</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {historyRecords.map((record) => (
                                                    <tr key={record.paymentId}>
                                                        <td>{formatFullDateTime(record.paymentDate)}</td>
                                                        <td>{record.amount != null ? `${record.amount.toLocaleString('vi-VN')} VND` : '—'}</td>
                                                        <td>{record.subscriptionMonths || 1}</td>
                                                        <td>{record.status || '—'}</td>
                                                        <td>{record.paymentMethod || '—'}</td>
                                                        <td>{record.description || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* Subscribe Modal */}
                {subscribeTarget && (
                    <>
                        <div className="sa-modal-overlay" onClick={() => !saving && setSubscribeTarget(null)} />
                        <div className="sa-modal">
                            <div className="sa-modal-header">
                                <h2>Cấp Gói Dịch Vụ</h2>
                                <button className="sa-modal-close" onClick={() => !saving && setSubscribeTarget(null)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleSubscribeSubmit} className="sa-modal-form">
                                <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f1f5f9', borderRadius: '8px' }}>
                                    <div><strong>Trung tâm:</strong> {subscribeTarget.tenantName}</div>
                                    <div style={{ marginTop: 4, display: 'flex', gap: '1rem', fontSize: '0.9rem', color: '#475569' }}>
                                        <span>User hiện tại: <strong>{subscribeTarget.totalUsers}</strong></span>
                                        <span>Dung lượng hiện tại: <strong>{subscribeTarget.storageMB ? `${subscribeTarget.storageMB.toFixed(2)} MB` : '0 MB'}</strong></span>
                                    </div>
                                </div>
                                <div className="sa-form-group">
                                    <label>Chọn Gói Dịch Vụ *</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                                        {plans.length === 0 ? (
                                            <div style={{ padding: '1rem', background: '#fffbeb', color: '#b45309', borderRadius: '6px' }}>
                                                Chưa có Gói Dịch Vụ nào trên hệ thống. Vui lòng tạo gói trước.
                                            </div>
                                        ) : plans.map(p => {
                                            const isCurrentPlan = subscribeTarget.planId === p.planId;
                                            const isSelected = selectedPlanId === p.planId;
                                            return (
                                                    <label 
                                                        key={p.planId} 
                                                        style={{ 
                                                            display: 'flex', alignItems: 'flex-start', gap: '1rem', 
                                                            padding: '1rem', 
                                                            border: `1px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}`, 
                                                            borderRadius: '8px', 
                                                            cursor: isCurrentPlan ? 'default' : 'pointer',
                                                            background: isSelected ? '#eff6ff' : '#fff',
                                                        }}
                                                    >
                                                    <input 
                                                        type="radio" 
                                                        name="planSelection" 
                                                        value={p.planId} 
                                                        checked={isSelected}
                                                        onChange={(e) => setSelectedPlanId(e.target.value)}
                                                        style={{ marginTop: '4px' }}
                                                        disabled={isCurrentPlan}
                                                    />
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '1.05rem' }}>{p.planName}</div>
                                                            {isCurrentPlan && (
                                                                <span style={{ fontSize: '0.7rem', background: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>ĐANG SỬ DỤNG</span>
                                                            )}
                                                            {!p.isActive && (
                                                                <span style={{ fontSize: '0.7rem', background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>ĐÃ NGỪNG CẤP</span>
                                                            )}
                                                        </div>
                                                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px', lineHeight: '1.4' }}>
                                                            <div>Giới hạn: <strong>{p.limitUsers}</strong> Users</div>
                                                            <div>Lưu trữ: <strong>{p.storageLimit} MB</strong></div>
                                                            <div style={{ color: '#10b981', fontWeight: 500, marginTop: '2px' }}>{p.price.toLocaleString('vi-VN')} VND / tháng</div>
                                                            {isCurrentPlan && (
                                                                <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '4px' }}>
                                                                    Gói hiện tại không hỗ trợ gia hạn ở đây.
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="sa-modal-footer" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        {subscribeTarget.planName && (
                                            <button 
                                                type="button" 
                                                className="sa-btn-cancel" 
                                                style={{ borderColor: '#ef4444', color: '#ef4444' }}
                                                onClick={() => setConfirmCancelOpen(true)}
                                                disabled={saving}
                                            >
                                                Hủy Gói Hiện Tại
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <button type="button" className="sa-btn-cancel" onClick={() => !saving && setSubscribeTarget(null)}>
                                            Đóng
                                        </button>
                                        <button type="submit" className="sa-btn-primary" disabled={saving || plans.length === 0}>
                                            {saving ? (
                                                <><Loader2 size={16} className="spin" /> Đang lưu...</>
                                            ) : (
                                                selectedPlanId === subscribeTarget.planId ? 'Xác Nhận Gia Hạn' : 
                                                (subscribeTarget.planId ? 'Đổi Gói Dịch Vụ' : 'Kích Hoạt Gói')
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </>
                )}

                {/* Confirm Cancel Modal */}
                {confirmCancelOpen && (
                    <>
                        <div className="sa-modal-overlay" style={{ zIndex: 1100 }} onClick={() => !saving && setConfirmCancelOpen(false)} />
                        <div className="sa-modal" style={{ zIndex: 1101, maxWidth: '400px', textAlign: 'center' }}>
                            <div style={{ padding: '2rem 1.5rem' }}>
                                <div style={{ 
                                    width: 60, height: 60, borderRadius: '50%', background: '#fef2f2', 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                    margin: '0 auto 1.5rem', color: '#ef4444' 
                                }}>
                                    <AlertCircle size={32} />
                                </div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.75rem' }}>
                                    Xác nhận hủy gói?
                                </h2>
                                <p style={{ color: '#64748b', lineHeight: 1.5, fontSize: '0.95rem' }}>
                                    Bạn có chắc chắn muốn hủy gói dịch vụ của <strong>{subscribeTarget?.tenantName}</strong>? 
                                    Hành động này sẽ dừng các quyền lợi của gói ngay lập tức.
                                </p>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                    <button 
                                        className="sa-btn-cancel" 
                                        style={{ flex: 1 }} 
                                        onClick={() => setConfirmCancelOpen(false)}
                                        disabled={saving}
                                    >
                                        Quay Lại
                                    </button>
                                    <button 
                                        className="sa-btn-primary" 
                                        style={{ flex: 1, background: '#ef4444', borderColor: '#ef4444' }}
                                        onClick={handleCancelSubscription}
                                        disabled={saving}
                                    >
                                        {saving ? <Loader2 size={16} className="spin" /> : 'Xác Nhận Hủy'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Lock/Unlock Confirmation Modal */}
                {lockTarget && (
                    <>
                        <div className="sa-modal-overlay" style={{ zIndex: 1100 }} onClick={() => !saving && setLockTarget(null)} />
                        <div className="sa-modal" style={{ zIndex: 1101, maxWidth: '450px', textAlign: 'center' }}>
                            <div style={{ padding: '2.5rem 2rem' }}>
                                <div style={{ 
                                    width: 70, height: 70, borderRadius: '50%', 
                                    background: lockTarget.isActive ? '#fff7ed' : '#f0fdf4', 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                    margin: '0 auto 1.5rem', color: lockTarget.isActive ? '#f97316' : '#10b981'
                                }}>
                                    {lockTarget.isActive ? <Lock size={36} /> : <Unlock size={36} />}
                                </div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginBottom: '1rem' }}>
                                    {lockTarget.isActive ? 'Khóa Trung Tâm?' : 'Mở Khóa Trung Tâm?'}
                                </h2>
                                <p style={{ color: '#64748b', lineHeight: 1.6, fontSize: '1rem', marginBottom: '2rem' }}>
                                    {lockTarget.isActive ? (
                                        <>Bạn có chắc muốn tạm dừng hoạt động của <strong>{lockTarget.tenantName}</strong>? <br/>Mọi người dùng thuộc trung tâm này sẽ <b>không thể đăng nhập</b> vào hệ thống.</>
                                    ) : (
                                        <>Kích hoạt lại <strong>{lockTarget.tenantName}</strong>. <br/>Hệ thống và người dùng có thể truy cập lại bình thường.</>
                                    )}
                                </p>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button 
                                        className="sa-btn-cancel" 
                                        style={{ flex: 1, padding: '0.75rem' }} 
                                        onClick={() => setLockTarget(null)}
                                        disabled={saving}
                                    >
                                        Hủy Bỏ
                                    </button>
                                    <button 
                                        className="sa-btn-primary" 
                                        style={{ 
                                            flex: 1, padding: '0.75rem',
                                            background: lockTarget.isActive ? '#f97316' : '#10b981', 
                                            borderColor: lockTarget.isActive ? '#f97316' : '#10b981' 
                                        }}
                                        onClick={executeToggleActive}
                                        disabled={saving}
                                    >
                                        {saving ? <Loader2 size={18} className="spin" /> : (lockTarget.isActive ? 'Xác Nhận Khóa' : 'Mở Khóa Ngay')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
                {/* Contracts Modal */}
                {contractModalTarget && (
                    <>
                        <div className="sa-modal-overlay" onClick={() => !loadingContracts && setContractModalTarget(null)} />
                        <div className="sa-modal" style={{ maxWidth: '800px' }}>
                            <div className="sa-modal-header">
                                <h2>Quản Lý Hợp Đồng</h2>
                                <button className="sa-modal-close" onClick={() => setContractModalTarget(null)}><X size={20} /></button>
                            </div>
                            <div className="sa-modal-form">
                                <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                                    <strong>Trung tâm:</strong> {contractModalTarget.tenantName}
                                </div>
                                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                                    <button 
                                        className="sa-btn-primary" 
                                        style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                                        onClick={() => setUploadContractModal(contractModalTarget)}
                                    >
                                        <Plus size={16} /> Tải lên hợp đồng
                                    </button>
                                </div>
                                {loadingContracts ? (
                                    <div className="sa-loading"><Loader2 size={20} className="spin" /> Đang tải...</div>
                                ) : contracts.length === 0 ? (
                                    <div className="sa-empty" style={{ padding: '2rem' }}>
                                        <FileText size={40} />
                                        <p>Chưa có hợp đồng nào.</p>
                                    </div>
                                ) : (
                                    <div className="sa-table-card" style={{ marginTop: 0 }}>
                                        <table className="sa-table">
                                            <thead>
                                                <tr>
                                                    <th>Tiêu đề</th>
                                                    <th>Loại file</th>
                                                    <th>Dung lượng</th>
                                                    <th>Ngày tải lên</th>
                                                    <th>Thao tác</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {contracts.map(c => (
                                                    <tr key={c.contractId}>
                                                        <td className="sa-table-title-cell">{c.contractTitle}</td>
                                                        <td>{c.fileType}</td>
                                                        <td>{(c.fileSize / 1024).toFixed(1)} KB</td>
                                                        <td className="sa-date-col">{formatDateOnly(c.createdAt)}</td>
                                                        <td className="sa-actions-col">
                                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                <button 
                                                                    className="sa-btn-primary"
                                                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                                                                    onClick={() => handleViewContract(c)}
                                                                >
                                                                    Xem
                                                                </button>
                                                                <button 
                                                                    className="sa-btn-cancel"
                                                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem', background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5' }}
                                                                    onClick={() => handleDeleteContract(c)}
                                                                >
                                                                    Xóa
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* Upload Contract Modal */}
                {uploadContractModal && (
                    <>
                        <div className="sa-modal-overlay" onClick={() => !uploadingContract && setUploadContractModal(null)} />
                        <div className="sa-modal">
                            <div className="sa-modal-header">
                                <h2>Tải Lên Hợp Đồng</h2>
                                <button className="sa-modal-close" onClick={() => setUploadContractModal(null)}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleUploadContract} className="sa-modal-form">
                                <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                                    <strong>Trung tâm:</strong> {uploadContractModal.tenantName}
                                </div>
                                <div className="sa-form-group">
                                    <label>Chọn file (PDF, JPG, PNG) *</label>
                                    <input type="file" id="contract-file" accept=".pdf,.jpg,.jpeg,.png" required />
                                </div>
                                <div className="sa-form-group">
                                    <label>Tiêu đề hợp đồng *</label>
                                    <input type="text" id="contract-title" placeholder="Hợp đồng dịch vụ 2024" required />
                                </div>
                                <div className="sa-form-group">
                                    <label>Mô tả</label>
                                    <textarea id="contract-desc" rows="2" placeholder="Mô tả thêm..." />
                                </div>
                                <div className="sa-modal-footer">
                                    <button type="button" className="sa-btn-cancel" onClick={() => setUploadContractModal(null)}>
                                        Hủy
                                    </button>
                                    <button type="submit" className="sa-btn-primary" disabled={uploadingContract}>
                                        {uploadingContract ? <><Loader2 size={16} className="spin" /> Đang tải...</> : 'Tải lên'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </>
                )}

                {/* Confirm Delete Contract Modal */}
                {deleteContractTarget && (
                    <>
                        <div className="sa-modal-overlay" style={{ zIndex: 1100 }} onClick={() => !saving && setDeleteContractTarget(null)} />
                        <div className="sa-modal" style={{ zIndex: 1101, maxWidth: '400px', textAlign: 'center' }}>
                            <div style={{ padding: '2rem 1.5rem' }}>
                                <div style={{ 
                                    width: 60, height: 60, borderRadius: '50%', background: '#fef2f2', 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                    margin: '0 auto 1.5rem', color: '#ef4444' 
                                }}>
                                    <AlertCircle size={32} />
                                </div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.75rem' }}>
                                    Xóa hợp đồng?
                                </h2>
                                <p style={{ color: '#64748b', lineHeight: 1.5, fontSize: '0.95rem' }}>
                                    Bạn có chắc chắn muốn xóa hợp đồng <strong>{deleteContractTarget.contractTitle}</strong>? 
                                    Hành động này không thể hoàn tác.
                                </p>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                    <button 
                                        className="sa-btn-cancel" 
                                        style={{ flex: 1 }} 
                                        onClick={() => setDeleteContractTarget(null)}
                                        disabled={saving}
                                    >
                                        Hủy
                                    </button>
                                    <button 
                                        className="sa-btn-primary" 
                                        style={{ flex: 1, background: '#ef4444', borderColor: '#ef4444' }}
                                        onClick={executeDeleteContract}
                                        disabled={saving}
                                    >
                                        {saving ? <Loader2 size={16} className="spin" /> : 'Xác Nhận Xóa'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Package Change Requests Tab */}
                {activeTab === 'package-requests' && (
                    <div className="sa-table-card">
                        {loadingChangeRequests ? (
                            <div className="sa-loading"><Loader2 size={24} className="spin" /> Đang tải...</div>
                        ) : changeRequests.length === 0 ? (
                            <div className="sa-empty">
                                <Package size={40} />
                                <p>Chưa có yêu cầu đổi gói nào.</p>
                            </div>
                        ) : (
                            <table className="sa-table">
                                <thead>
                                    <tr>
                                        <th>Trung tâm</th>
                                        <th>Gói hiện tại</th>
                                        <th>Gói yêu cầu</th>
                                        <th>Số tháng</th>
                                        <th>Lý do</th>
                                        <th>Ngày yêu cầu</th>
                                        <th>Trạng thái</th>
                                        <th>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {changeRequests.map(r => (
                                        <tr key={r.requestId}>
                                            <td>{r.tenant?.tenantName || '—'}</td>
                                            <td>{r.currentPlan?.planName || '—'}</td>
                                            <td>{r.requestedPlan?.planName || '—'}</td>
                                            <td>{r.requestedMonths}</td>
                                            <td>{r.reason || '—'}</td>
                                            <td>{formatFullDateTime(r.requestedAt)}</td>
                                            <td>
                                                <span className={`sa-status-badge ${
                                                    r.status === 'Pending' ? 'pending' : 
                                                    r.status === 'Approved' ? 'active' : 
                                                    r.status === 'Rejected' ? 'rejected' : r.status === 'Completed' ? 'completed' : 'inactive'
                                                }`}>
                                                    {r.status === 'Pending' ? 'Chờ duyệt' : 
                                                     r.status === 'Approved' ? 'Đã duyệt' : 
                                                     r.status === 'Rejected' ? 'Từ chối' : r.status === 'Completed' ? 'Đã thanh toán' : r.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="sa-action-buttons">
                                                    {r.status === 'Pending' && (
                                                        <>
                                                            <button
                                                                className="sa-action-btn"
                                                                title="Duyệt"
                                                                onClick={() => {
                                                                    setReviewRequestTarget(r);
                                                                    setReviewRequestMode('approve');
                                                                    setReviewRequestNote('');
                                                                }}
                                                                style={{ background: '#ecfdf5', border: '1px solid #10b981', color: '#10b981' }}
                                                            >
                                                                <Check size={18} />
                                                            </button>
                                                            <button
                                                                className="sa-action-btn"
                                                                title="Từ chối"
                                                                onClick={() => {
                                                                    setReviewRequestTarget(r);
                                                                    setReviewRequestMode('reject');
                                                                    setReviewRequestNote('');
                                                                }}
                                                                style={{ background: '#fef2f2', border: '1px solid #ef4444', color: '#ef4444' }}
                                                            >
                                                                <X size={18} />
                                                            </button>
                                                        </>
                                                    )}
                                                    
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* Review Request Modal */}
                {reviewRequestTarget && (
                    <>
                        <div className="sa-modal-overlay" onClick={() => setReviewRequestTarget(null)} />
                        <div className="sa-modal">
                            <div className="sa-modal-header">
                                <h2>{reviewRequestMode === 'reject' ? 'Từ Chối Yêu Cầu Đổi Gói' : 'Duyệt Yêu Cầu Đổi Gói'}</h2>
                                <button
                                    className="sa-modal-close"
                                    onClick={() => {
                                        setReviewRequestTarget(null);
                                        setReviewRequestMode('approve');
                                        setReviewRequestNote('');
                                    }}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="sa-modal-form">
                                <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                                    <p><strong>Trung tâm:</strong> {reviewRequestTarget.tenant?.tenantName}</p>
                                    <p><strong>Đổi từ:</strong> {reviewRequestTarget.currentPlan?.planName}</p>
                                    <p><strong>Đổi sang:</strong> {reviewRequestTarget.requestedPlan?.planName}</p>
                                    <p><strong>Lý do:</strong> {reviewRequestTarget.reason || 'Không có'}</p>
                                </div>
                                <div className="sa-form-group">
                                    <label>{reviewRequestMode === 'reject' ? 'Lý do từ chối' : 'Ghi chú (tùy chọn)'}</label>
                                    <input
                                        type="text"
                                        value={reviewRequestNote}
                                        onChange={(e) => setReviewRequestNote(e.target.value)}
                                        placeholder={reviewRequestMode === 'reject' ? 'Nhập lý do từ chối...' : 'Nhập ghi chú...'}
                                    />
                                </div>
                                <div className="sa-modal-footer">
                                    <button
                                        className="sa-btn-cancel"
                                        onClick={() => {
                                            setReviewRequestTarget(null);
                                            setReviewRequestMode('approve');
                                            setReviewRequestNote('');
                                        }}
                                    >
                                        Hủy
                                    </button>
                                    <button 
                                        className="sa-btn-primary" 
                                        style={{ background: reviewRequestMode === 'reject' ? '#ef4444' : '#10b981' }}
                                        onClick={() => handleReviewRequest(reviewRequestTarget.requestId, reviewRequestMode !== 'reject', reviewRequestNote)}
                                    >
                                        {reviewRequestMode === 'reject' ? <X size={16} /> : <Check size={16} />}
                                        {reviewRequestMode === 'reject' ? ' Từ chối yêu cầu' : ' Duyệt & Gửi Hóa Đơn'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Create Invoice Modal */}
                {createInvoiceTarget && (
                    <>
                        <div className="sa-modal-overlay" onClick={() => setCreateInvoiceTarget(null)} />
                        <div className="sa-modal">
                            <div className="sa-modal-header">
                                <h2>Tạo Hóa Đơn</h2>
                                <button className="sa-modal-close" onClick={() => setCreateInvoiceTarget(null)}><X size={20} /></button>
                            </div>
                            <div className="sa-modal-form">
                                <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                                    <p><strong>Trung tâm:</strong> {createInvoiceTarget.tenant?.tenantName}</p>
                                    <p><strong>Gói:</strong> {createInvoiceTarget.requestedPlan?.planName}</p>
                                    <p><strong>Số tháng:</strong> {createInvoiceTarget.requestedMonths}</p>
                                    <p><strong>Số tiền:</strong> {(createInvoiceTarget.requestedPlan?.price || 0) * createInvoiceTarget.requestedMonths} VNĐ</p>
                                </div>
                                <div className="sa-form-group">
                                    <label>Hạn thanh toán (ngày)</label>
                                    <input type="number" id="due-days" defaultValue={7} min={1} max={30} />
                                </div>
                                <div className="sa-modal-footer">
                                    <button className="sa-btn-cancel" onClick={() => setCreateInvoiceTarget(null)}>Hủy</button>
                                    <button 
                                        className="sa-btn-primary" 
                                        onClick={() => {
                                            const dueDays = parseInt(document.getElementById('due-days')?.value || '7');
                                            handleCreateInvoice(createInvoiceTarget.requestId, dueDays);
                                        }}
                                    >
                                        Tạo Hóa Đơn
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}


                {showInvoiceHistory && (
                    <>
                        <div className="sa-modal-overlay" onClick={() => setShowInvoiceHistory(false)} />
                        <div className="sa-modal" style={{ maxWidth: '1400px', width: '95vw' }}>
                            <div className="sa-modal-header">
                                <h2>Lịch Sử Gửi Hóa Đơn</h2>
                                <button className="sa-modal-close" onClick={() => setShowInvoiceHistory(false)}><X size={20} /></button>
                            </div>
                            <div className="sa-modal-form">
                                {loadingInvoiceHistory ? (
                                    <div className="sa-loading"><Loader2 size={20} className="spin" /> Đang tải...</div>
                                ) : invoiceHistory.length === 0 ? (
                                    <div className="sa-empty"><FileText size={36} /><p>Chưa có hóa đơn nào.</p></div>
                                ) : (
                                    <div className="sa-table-card" style={{ marginTop: 0 }}>
                                        <table className="sa-table">
                                            <thead>
                                                <tr>
                                                    <th>Mã hóa đơn</th>
                                                    <th>Trung tâm</th>
                                                    <th>Gói</th>
                                                    <th>Số tiền</th>
                                                    <th>Trạng thái</th>
                                                    <th>Hạn thanh toán</th>
                                                    <th>Ngày tạo</th>
                                                    <th>Thao tác</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {invoiceHistory.map(inv => (
                                                    <tr key={inv.invoiceId}>
                                                        <td>{inv.invoiceNumber}</td>
                                                        <td>{inv.tenant?.tenantName || inv.tenantId}</td>
                                                        <td>{inv.packageChangeRequest?.requestedPlan?.planName || '—'}</td>
                                                        <td>{inv.amount?.toLocaleString('vi-VN')} VNĐ</td>
                                                        <td>
                                                            <span className={`sa-status-badge ${
                                                                inv.status === 'Paid' ? 'active' : 
                                                                inv.status === 'Pending' ? 'pending' : 
                                                                inv.status === 'AwaitingConfirmation' ? 'pending' : 
                                                                inv.status === 'Cancelled' ? 'rejected' : 
                                                                inv.status === 'Expired' ? 'inactive' : 'inactive'
                                                            }`}>
                                                                {inv.status === 'Pending' ? 'Chờ thanh toán' : 
                                                                 inv.status === 'Paid' ? 'Đã thanh toán' : 
                                                                 inv.status === 'Cancelled' ? 'Đã hủy' : 
                                                                 inv.status === 'AwaitingConfirmation' ? 'Chờ xác nhận' : 
                                                                 inv.status === 'Expired' ? 'Hết hạn' : inv.status}
                                                            </span>
                                                        </td>
                                                        <td>{formatDateOnly(inv.dueDate)}</td>
                                                        <td>{formatFullDateTime(inv.createdAt)}</td>
                                                        <td>
                                                            {inv.status === 'AwaitingConfirmation' && inv.paymentMethod === 'Cash' ? (
                                                                <button
                                                                    className="sa-btn-primary"
                                                                    style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                                                                    disabled={saving}
                                                                    onClick={() => handleConfirmCashInvoice(inv)}
                                                                >
                                                                    Duyệt tiền mặt
                                                                </button>
                                                            ) : (
                                                                <span>—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
                {/* View Contract Modal */}
                {viewContractTarget && (
                    <>
                        <div className="sa-modal-overlay" onClick={() => setViewContractTarget(null)} />
                        <div className="sa-modal" style={{ maxWidth: '900px', maxHeight: '90vh' }}>
                            <div className="sa-modal-header">
                                <h2>{viewContractTarget.contractTitle}</h2>
                                <button className="sa-modal-close" onClick={() => setViewContractTarget(null)}><X size={20} /></button>
                            </div>
                            <div className="sa-modal-form" style={{ padding: '0', height: 'calc(90vh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f1f1' }}>
                                <iframe 
                                    src={null}
                                    style={{ display: 'none' }}
                                    title="hidden"
                                />
                                <ContractViewer contract={viewContractTarget} />
                            </div>
                        </div>
                    </>
                )}

                {viewBusinessLicenseTarget && (
                    <>
                        <div className="sa-modal-overlay" onClick={() => setViewBusinessLicenseTarget(null)} />
                        <div className="sa-modal" style={{ maxWidth: '900px', maxHeight: '90vh' }}>
                            <div className="sa-modal-header">
                                <h2>{viewBusinessLicenseTarget.title}</h2>
                                <button className="sa-modal-close" onClick={() => setViewBusinessLicenseTarget(null)}><X size={20} /></button>
                            </div>
                            <div className="sa-modal-form" style={{ padding: '0', height: 'calc(90vh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f1f1' }}>
                                {viewBusinessLicenseTarget.fileType === 'pdf' ? (
                                    <iframe
                                        src={viewBusinessLicenseTarget.fileUrl}
                                        style={{ width: '100%', height: '100%', border: 'none' }}
                                        title={viewBusinessLicenseTarget.title}
                                    />
                                ) : (
                                    <img
                                        src={viewBusinessLicenseTarget.fileUrl}
                                        alt={viewBusinessLicenseTarget.title}
                                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                    />
                                )}
                            </div>
                        </div>
                    </>
                )}

            </main>
        </div>
    );
};

export default TenantManagement;
