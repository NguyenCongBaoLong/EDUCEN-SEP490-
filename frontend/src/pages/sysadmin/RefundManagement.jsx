import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, RotateCcw, Search, Send, ShieldAlert, XCircle } from 'lucide-react';
import SystemAdminSidebar from '../../components/SystemAdminSidebar';
import refundService from '../../services/refundService';
import '../../css/pages/sysadmin/RefundManagement.css';

const STATUS_OPTIONS = ['All', 'Pending', 'Approved', 'Rejected', 'Processing', 'Completed', 'Failed'];

const RefundManagement = () => {
    const [tenants, setTenants] = useState([]);
    const [refunds, setRefunds] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState(null);

    const [filter, setFilter] = useState({ status: 'All', tenantId: '' });
    const [form, setForm] = useState({
        tenantId: '',
        paymentRecordId: '',
        refundAmount: '',
        reason: '',
        refundMethod: 'Credit',
        isServiceIssue: false
    });

    const selectedPayment = useMemo(
        () => payments.find(p => p.paymentId === form.paymentRecordId),
        [payments, form.paymentRecordId]
    );

    const showMessage = (text, type = 'success') => {
        setMessage({ text, type });
        window.setTimeout(() => setMessage(null), 3500);
    };

    const loadInitial = async () => {
        setLoading(true);
        try {
            const [tenantData, refundData] = await Promise.all([
                refundService.getTenants(),
                refundService.getRefunds({})
            ]);
            setTenants(tenantData || []);
            setRefunds(refundData || []);
        } catch (error) {
            showMessage(error.response?.data?.message || 'Không thể tải dữ liệu hoàn tiền.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadRefunds = async () => {
        try {
            const params = {};
            if (filter.status && filter.status !== 'All') params.status = filter.status;
            if (filter.tenantId) params.tenantId = filter.tenantId;
            const data = await refundService.getRefunds(params);
            setRefunds(data || []);
        } catch (error) {
            showMessage(error.response?.data?.message || 'Không thể lọc dữ liệu hoàn tiền.', 'error');
        }
    };

    const loadPaymentsByTenant = async (tenantId) => {
        if (!tenantId) {
            setPayments([]);
            return;
        }

        try {
            const history = await refundService.getSubscriptionHistory(tenantId);
            const eligible = (history || []).filter(p => p.status === 'Paid');
            setPayments(eligible);
        } catch (error) {
            setPayments([]);
            showMessage(error.response?.data?.message || 'Không thể tải lịch sử thanh toán của trung tâm.', 'error');
        }
    };

    useEffect(() => {
        loadInitial();
    }, []);

    useEffect(() => {
        loadRefunds();
    }, [filter.status, filter.tenantId]);

    const onTenantChange = async (tenantId) => {
        setForm(prev => ({
            ...prev,
            tenantId,
            paymentRecordId: '',
            refundAmount: ''
        }));
        await loadPaymentsByTenant(tenantId);
    };

    const onPaymentChange = async (paymentRecordId) => {
        const payment = payments.find(p => p.paymentId === paymentRecordId);
        setForm(prev => ({
            ...prev,
            paymentRecordId,
            refundAmount: payment ? String(payment.amount) : ''
        }));

        if (!paymentRecordId) return;

        try {
            const eligibility = await refundService.canRefund(paymentRecordId);
            if (!eligibility?.canRefund) {
                showMessage('Thanh toán này hiện không đủ điều kiện hoàn tiền.', 'error');
            }
        } catch {
            // Không chặn người dùng, backend sẽ validate lần cuối khi tạo refund
        }
    };

    const createRefund = async (e) => {
        e.preventDefault();
        if (!form.tenantId || !form.paymentRecordId || !form.reason || !form.refundAmount) {
            showMessage('Vui lòng nhập đầy đủ thông tin yêu cầu hoàn tiền.', 'error');
            return;
        }

        setSubmitting(true);
        try {
            await refundService.createRefund({
                tenantId: form.tenantId,
                paymentRecordId: form.paymentRecordId,
                refundAmount: Number(form.refundAmount),
                reason: form.reason,
                refundMethod: form.refundMethod,
                isServiceIssue: form.isServiceIssue
            });

            setForm({
                tenantId: form.tenantId,
                paymentRecordId: '',
                refundAmount: '',
                reason: '',
                refundMethod: 'Credit',
                isServiceIssue: false
            });
            showMessage('Tạo yêu cầu hoàn tiền thành công.');
            await loadRefunds();
        } catch (error) {
            showMessage(error.response?.data?.message || 'Tạo yêu cầu hoàn tiền thất bại.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const executeAction = async (action, refundId, payload) => {
        try {
            if (action === 'approve') {
                await refundService.approveRefund(refundId, payload?.notes || '');
                showMessage('Đã duyệt yêu cầu hoàn tiền.');
            }
            if (action === 'reject') {
                await refundService.rejectRefund(refundId, payload?.reason || 'Không đạt điều kiện hoàn tiền');
                showMessage('Đã từ chối yêu cầu hoàn tiền.');
            }
            if (action === 'process') {
                await refundService.processRefund(refundId);
                showMessage('Đã gửi xử lý hoàn tiền.');
            }
            await loadRefunds();
        } catch (error) {
            showMessage(error.response?.data?.message || 'Thao tác hoàn tiền thất bại.', 'error');
        }
    };

    return (
        <div className="refund-page">
            <SystemAdminSidebar />
            <main className="refund-main">
                <div className="refund-header">
                    <h1>Quản lý hoàn tiền</h1>
                    <p>Theo dõi và xử lý hoàn tiền cho giao dịch gói dịch vụ.</p>
                </div>

                {message && <div className={`refund-alert ${message.type}`}>{message.text}</div>}

                <section className="refund-card">
                    <h2>Tạo yêu cầu hoàn tiền</h2>
                    <form onSubmit={createRefund} className="refund-form">
                        <select value={form.tenantId} onChange={(e) => onTenantChange(e.target.value)} required>
                            <option value="">Chọn trung tâm</option>
                            {tenants.map(t => (
                                <option key={t.tenantId} value={t.tenantId}>{t.tenantName} ({t.subDomain})</option>
                            ))}
                        </select>

                        <select value={form.paymentRecordId} onChange={(e) => onPaymentChange(e.target.value)} required disabled={!form.tenantId}>
                            <option value="">Chọn giao dịch đã thanh toán</option>
                            {payments.map(p => (
                                <option key={p.paymentId} value={p.paymentId}>
                                    {p.paymentId} - {Number(p.amount).toLocaleString('vi-VN')} đ - {new Date(p.paymentDate).toLocaleDateString('vi-VN')}
                                </option>
                            ))}
                        </select>

                        <input
                            type="number"
                            min="1"
                            step="1000"
                            placeholder="Số tiền hoàn"
                            value={form.refundAmount}
                            onChange={(e) => setForm(prev => ({ ...prev, refundAmount: e.target.value }))}
                            required
                        />

                        <select
                            value={form.refundMethod}
                            onChange={(e) => setForm(prev => ({ ...prev, refundMethod: e.target.value }))}
                        >
                            <option value="Credit">Hoàn vào số dư trung tâm</option>
                            <option value="Cash">Hoàn qua VNPay</option>
                        </select>

                        <textarea
                            rows={3}
                            placeholder="Lý do hoàn tiền"
                            value={form.reason}
                            onChange={(e) => setForm(prev => ({ ...prev, reason: e.target.value }))}
                            required
                        />

                        <label className="refund-checkbox">
                            <input
                                type="checkbox"
                                checked={form.isServiceIssue}
                                onChange={(e) => setForm(prev => ({ ...prev, isServiceIssue: e.target.checked }))}
                            />
                            Hoàn tiền do sự cố dịch vụ
                        </label>

                        {selectedPayment && (
                            <div className="refund-hint">
                                Giao dịch chọn: <b>{selectedPayment.paymentId}</b> - {Number(selectedPayment.amount).toLocaleString('vi-VN')} đ
                            </div>
                        )}

                        <button type="submit" disabled={submitting}>
                            <Send size={16} />
                            {submitting ? 'Đang tạo...' : 'Tạo yêu cầu'}
                        </button>
                    </form>
                </section>

                <section className="refund-card">
                    <div className="refund-table-header">
                        <h2>Danh sách yêu cầu hoàn tiền</h2>
                        <div className="refund-filters">
                            <select value={filter.status} onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}>
                                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === 'All' ? 'Tất cả trạng thái' : s}</option>)}
                            </select>
                            <select value={filter.tenantId} onChange={(e) => setFilter(prev => ({ ...prev, tenantId: e.target.value }))}>
                                <option value="">Tất cả trung tâm</option>
                                {tenants.map(t => <option key={t.tenantId} value={t.tenantId}>{t.tenantName}</option>)}
                            </select>
                            <button type="button" onClick={loadRefunds}><Search size={16} /> Lọc</button>
                        </div>
                    </div>

                    <div className="refund-table-wrap">
                        <table className="refund-table">
                            <thead>
                                <tr>
                                    <th>Mã hoàn tiền</th>
                                    <th>Giao dịch</th>
                                    <th>Trung tâm</th>
                                    <th>Số tiền</th>
                                    <th>Phương thức</th>
                                    <th>Trạng thái</th>
                                    <th>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7}>Đang tải dữ liệu...</td></tr>
                                ) : refunds.length === 0 ? (
                                    <tr><td colSpan={7}>Chưa có yêu cầu hoàn tiền.</td></tr>
                                ) : (
                                    refunds.map(r => (
                                        <tr key={r.refundId}>
                                            <td>{r.refundId}</td>
                                            <td>{r.paymentRecordId}</td>
                                            <td>{r.tenantId}</td>
                                            <td>{Number(r.refundAmount).toLocaleString('vi-VN')} đ</td>
                                            <td>{r.refundMethod}</td>
                                            <td><span className={`status ${String(r.status || '').toLowerCase()}`}>{r.status}</span></td>
                                            <td>
                                                <div className="refund-actions">
                                                    {r.status === 'Pending' && (
                                                        <>
                                                            <button type="button" className="approve" onClick={() => executeAction('approve', r.refundId)} title="Duyệt">
                                                                <CheckCircle2 size={16} />
                                                            </button>
                                                            <button type="button" className="reject" onClick={() => executeAction('reject', r.refundId, { reason: 'Không đạt điều kiện hoàn tiền' })} title="Từ chối">
                                                                <XCircle size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                    {r.status === 'Approved' && (
                                                        <button type="button" className="process" onClick={() => executeAction('process', r.refundId)} title="Xử lý hoàn tiền">
                                                            <RotateCcw size={16} />
                                                        </button>
                                                    )}
                                                    {r.status === 'Failed' && (
                                                        <span className="error-note"><ShieldAlert size={14} /> {r.errorMessage || 'Thất bại'}</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default RefundManagement;
